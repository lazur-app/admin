# SEO dashboard (`/dashboard/seo`)

Shows the programmatic SEO pages on lazur.app: how many there are, by type and over time, what they cost to generate, and whether Google has indexed them.

Data flow follows the admin rule (admin → backend → Postgres):

```
website build ──► https://www.lazur.app/seo-stats.json ──┐
Google Search Console API (service account) ─────────────┼─► backend daily job ─► Postgres ─► /admin/seo/* ─► this page
```

The page works before the backend has these routes: a 404 shows a "Not set up yet" card. With no Search Console credentials it shows page counts and cost, plus a "Search Console not connected" banner.

## 1. Website: `/seo-stats.json` (lazur-app/website)

A file generated at build time from `content/seo/<type>/*.json`, `content/blog/*.md`, `/tools/*` and `content-runs/daily-*/usage.jsonl`. It uses `seoPath()` from `src/lib/seo-pages/routes.ts` for URLs.

```jsonc
{
  "generated_at": "2026-11-09T06:00:00Z",
  "pages": [
    { "url": "https://www.lazur.app/how-to/…", "path": "/how-to/…", "type": "howto", "title": "…",
      "role": null, "app": "gmail", "published_at": "2026-11-09", "updated_at": "2026-11-09",
      "word_count": 1180, "image_count": 2, "source_count": 4 }
  ],
  "runs": [ { "date": "2026-11-09", "pages": 402, "cost_usd": 8.44 } ]   // one per content-runs/daily-<date>
}
```

## 2. Backend (lazur-app/backend)

**Tables (one alembic migration):**
- `seo_pages`: `url` (pk), `path`, `type`, `title`, `role`, `app`, `published_at`, `updated_at`, `word_count`, `image_count`, `source_count`, `first_seen_at`, `removed_at`.
- `seo_runs`: `date` (pk), `pages`, `cost_usd`.
- `seo_inspections`: `url` (pk), `verdict`, `coverage_state`, `indexing_state`, `last_crawl_at`, `google_canonical`, `inspected_at`. Holds the latest result for each URL.
- `seo_search_daily`: (`url`, `date`) pk, `clicks`, `impressions`, `ctr`, `position`.
- `seo_index_snapshots`: `date` (pk), `indexed`, `not_indexed`, `not_inspected`. Written once per job run.
- `seo_sync_state`: one row: `inventory_fetched_at`, `inventory_error`, `analytics_synced_at`, `inspection_run_at`, `inspections_today`, `gsc_error`.

**Daily job** (cron, idempotent, upserts only):
1. Fetch `seo-stats.json`, then upsert `seo_pages` and `seo_runs`. Mark pages missing from the file `removed_at`.
2. If `GSC_SERVICE_ACCOUNT_JSON` and `GSC_SITE_URL` are set:
   - Search Analytics `searchanalytics.query` with dimensions `[page, date]` for the last 30 days, paged with `rowLimit=25000`. Upsert into `seo_search_daily`.
   - URL Inspection `urlInspection.index.inspect`, up to 2,000 per day per property. Order: never inspected first (newest `published_at` first), then the oldest `inspected_at`. Stop at quota or on HTTP 429. Index status is `PASS` → indexed; anything else → not indexed, with `coverageState` as the reason.
   - Optional: re-submit `sitemap.xml` with `sitemaps.submit`.
3. Write today's `seo_index_snapshots` row.

Scope: `https://www.googleapis.com/auth/webmasters` (`.readonly` is enough if the sitemap is not submitted).

**Routes** (admin auth, same as the other `/admin/*` routes):
- `GET /admin/seo/overview?days=7|30|90` returns `SeoOverview` (see `src/lib/seo.ts`).
- `GET /admin/seo/pages?limit&offset&q&type&status=indexed|not_indexed|not_inspected&sort=newest|oldest|clicks|impressions|position` returns `SeoPages`.

## 3. What Veer does to switch on Search Console data

1. **Google Cloud Console** → choose or create a project → *APIs & Services → Library* → enable **Google Search Console API**.
2. *IAM & Admin → Service accounts → Create service account* (name it e.g. `lazur-seo-reader`, no roles needed) → open it → *Keys → Add key → JSON*. A JSON file downloads.
3. **Search Console** → the lazur.app property → *Settings → Users and permissions → Add user*: paste the service account's email (`…@….iam.gserviceaccount.com`) and set permission **Full** (needed for URL Inspection; Restricted is enough for clicks only).
4. On the backend host, add env vars (never commit them):
   - `GSC_SERVICE_ACCOUNT_JSON` = the whole JSON file contents (one line)
   - `GSC_SITE_URL` = `sc-domain:lazur.app` for a Domain property, or `https://www.lazur.app/` for a URL-prefix property (match exactly how the property is shown in Search Console)
   - `SEO_STATS_URL` = `https://www.lazur.app/seo-stats.json`
5. Restart the backend. The next daily run fills the dashboard; the inspection backlog clears at about 2,000 pages a day.

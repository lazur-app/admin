# SEO dashboard (`/dashboard/seo`)

The programmatic SEO pages on lazur.app: how many there are, by type and over time, what they cost to
generate, and whether Google has indexed them.

```
website  GET /api/seo-stats  (token) ─┐
Google Search Console API (service account) ─┼─► backend daily job (app/seo.py) ─► Postgres ─► /admin/seo/* ─► this page
```

| Repo | What |
|---|---|
| website | `src/app/api/seo-stats/route.ts`: every SEO page (content/seo/*, blog, /tools) with url, type, role, app, dates, word / image / source counts, plus each `content-runs/daily-<date>` run's pages and cost. Needs `Authorization: Bearer $SEO_STATS_TOKEN`; 503 when the token isn't set. |
| backend | `alembic/versions/029_seo_dashboard.py` (6 `seo_*` tables), `app/gsc.py` (Search Console client, service-account JWT, no Google library), `app/seo.py` (daily job + dashboard queries), routes in `app/routers/admin.py` (`GET /admin/seo/overview`, `GET /admin/seo/pages`, `POST /admin/seo/sync`), scheduler in `app/main.py` (daily 10:15 UTC, advisory lock), `tests/test_seo.py`. |
| admin | `src/app/dashboard/seo/page.tsx`, `src/components/seoCharts.tsx`, `src/lib/seo.ts` (response types), nav item in `Shell.tsx`. |

## The daily job

Runs at 10:15 UTC, or on demand with **Sync now** (`POST /admin/seo/sync`). It is idempotent: everything is an upsert.

1. **Inventory:** reads the website's `/api/seo-stats` and upserts `seo_pages` and `seo_runs`. Pages that are no longer listed get `removed_at`. If the fetch fails, the last good copy stays and the dashboard shows the error.
2. **Search Analytics:** clicks, impressions and position per page per day for the last 30 days, written to `seo_search_daily`. The dashboard shows the latest 28 days of data, because Google's data lags 2 to 3 days.
3. **URL Inspection:** up to `GSC_INSPECTIONS_PER_DAY` pages a day (default 2000, Google's limit per property), counted per Pacific day.
   - Order: never-inspected pages first, newest first; then pages not checked in the last 2 days, oldest check first.
   - Pacing: at most 480 calls a minute (Google's limit is 600).
   - A quota or permission error (429, 403, 401) stops the run for the day.
   - `verdict = PASS` means indexed. Anything else means not indexed, with `coverageState` as the reason (for example "Crawled - currently not indexed").
4. **Snapshot:** today's indexed / not indexed / not checked counts go into `seo_index_snapshots` for the trend chart.
5. **Optional:** with `GSC_SUBMIT_SITEMAP=true` it re-submits `SEO_SITEMAP_URL` (default `https://www.lazur.app/sitemap.xml`). This needs the read-write scope.

At 1,000 new pages a day, 2,000 inspections a day keep up with new pages and re-check about 1,000 older ones.

## What Veer does

### A. Page counts and cost (no Google needed)

1. Make a random token, for example `openssl rand -hex 32`.
2. **Vercel** → `lazur-website` project → Settings → Environment Variables → add `SEO_STATS_TOKEN` = that token (Production) → redeploy.
3. **Backend host** (DigitalOcean app) → environment → add `SEO_STATS_TOKEN` = the same token. `SEO_STATS_URL` defaults to `https://www.lazur.app/api/seo-stats`.
4. Deploy the backend branch `seo-dashboard`. Its pre-deploy job runs `alembic upgrade head`, which applies migration 029.
5. In admin → SEO pages → **Sync now**.

### B. Index status, clicks and impressions (Google Search Console)

1. **Google Cloud Console** → pick or create a project → *APIs & Services → Library* → enable **Google Search Console API**.
2. *IAM & Admin → Service accounts → Create service account*: name it e.g. `lazur-seo-reader`, grant no roles, then Done. Open it → *Keys → Add key → Create new key → JSON*. A file downloads; keep it secret.
3. **Search Console** (search.google.com/search-console) → the lazur.app property → *Settings → Users and permissions → Add user*. Paste the service account's email (`…@….iam.gserviceaccount.com`). Permission: **Full** is needed for URL Inspection; Restricted is enough for clicks only.
4. **Backend host** env:
   - `GSC_SERVICE_ACCOUNT_JSON` = the whole JSON file's contents
   - `GSC_SITE_URL` = exactly the property name shown in Search Console: `sc-domain:lazur.app` for a Domain property, or `https://www.lazur.app/` for a URL-prefix property
   - optional: `GSC_SUBMIT_SITEMAP=true` (then the permission in step 3 must be Full)
5. Restart the backend → **Sync now**. Clicks appear right away. Index status fills in at about 2,000 pages a day, so the current backlog takes 1 to 2 days.

Other env: `GSC_INSPECTIONS_PER_DAY` (default 2000), `ENABLE_SEO_SYNC_SCHEDULER` (default true).

## Screenshots

- `screenshots/seo-real-data-no-gsc.png`: real data (1,260 pages, 4 content runs) through a local website, backend and Postgres, with Search Console not connected yet.
- `screenshots/seo-mock-connected.png`: mock data showing what the Search Console parts look like once connected.

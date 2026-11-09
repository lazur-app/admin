"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { api, ApiError, fmt } from "@/lib/api";
import {
  SEO_TYPES, STATUS_LABEL, typeColor, typeLabel,
  type IndexStatus, type SeoOverview, type SeoPages,
} from "@/lib/seo";
import { Card, CardTitle, Empty, ErrorBox, Loading, PageTitle, Pill, RangePicker, Stat } from "@/components/ui";
import { TrendChart } from "@/components/userTrends";
import { BarList } from "@/components/userCharts";
import { StackedArea, StackedBars } from "@/components/seoCharts";

const control = "h-11 rounded-full bg-card px-5 text-[14px] outline-none";
const LIMIT = 50;

const pct = (part: number, whole: number) => (whole ? Math.round((1000 * part) / whole) / 10 : null);
const usd = (n: number | null | undefined) => fmt.usd(n, n != null && n < 1 ? 3 : 2);
const pos = (n: number | null | undefined) => (n == null ? "–" : n.toFixed(1));

export default function SeoPage() {
  const [days, setDays] = useState(30);
  const q = useQuery({
    queryKey: ["seo-overview", days],
    queryFn: () => api<SeoOverview>(`/admin/seo/overview?days=${days}`),
    retry: (n, e) => !(e instanceof ApiError && e.status === 404) && n < 1,
  });
  return (
    <>
      <PageTitle title="SEO pages" subtitle="Programmatic pages on lazur.app: how many, what kind, and whether Google has indexed them."
        actions={<RangePicker value={days} onChange={setDays} />} />
      {q.isLoading ? <Loading /> : q.error instanceof ApiError && q.error.status === 404 ? (
        <Card>
          <CardTitle>Not set up yet</CardTitle>
          <p className="text-[14px] text-muted">The backend has no <code>/admin/seo/overview</code> route yet. Deploy the SEO stats job in the backend (see <code>docs/seo-dashboard.md</code> in this repo) and this page fills in.</p>
        </Card>
      ) : q.error || !q.data ? <ErrorBox error={q.error} /> : <Body o={q.data} days={days} />}
    </>
  );
}

function Body({ o, days }: { o: SeoOverview; days: number }) {
  const t = o.totals;
  const gsc = o.gsc.connected;
  const inspected = t.indexed + t.not_indexed;
  const known: readonly string[] = SEO_TYPES;
  const seen = new Set(o.per_day.flatMap((d) => Object.keys(d.by_type).filter((k) => d.by_type[k])));
  // Known types in a fixed order (so colours and stacking stay put), then anything new the website adds.
  const types = [...known.filter((k) => seen.has(k)), ...[...seen].filter((k) => !known.includes(k))];
  const perDay = o.per_day.map((d) => ({ date: d.date, ...d.by_type }));
  const typeSeries = types.map((k) => ({ key: k, label: typeLabel(k), color: typeColor(k) }));
  const offGsc = "Search Console not connected";

  return (
    <div className="grid gap-5">
      {!gsc ? (
        <p className="rounded-[20px] bg-peach/60 px-5 py-3 text-[13px]">
          <b className="font-semibold">Search Console not connected.</b> Page counts below come from the website; index status, clicks and impressions appear once the backend has a Google service account
          ({o.gsc.error ?? "set GSC_SERVICE_ACCOUNT_JSON and GSC_SITE_URL"}). Steps: <code>docs/seo-dashboard.md</code>.
        </p>
      ) : o.gsc.error ? (
        <p className="rounded-[20px] bg-rose/50 px-5 py-3 text-[13px]"><b className="font-semibold">Last Search Console sync failed:</b> {o.gsc.error}</p>
      ) : null}
      {!o.inventory.ok ? (
        <p className="rounded-[20px] bg-rose/50 px-5 py-3 text-[13px]">
          <b className="font-semibold">Couldn&apos;t read the page list</b> from {o.inventory.source_url ?? "the website"}: {o.inventory.error ?? "unknown error"}. Showing the last good copy{o.inventory.fetched_at ? ` from ${fmt.ago(o.inventory.fetched_at)}` : ""}.
        </p>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Stat tone="lime" label="SEO pages live" value={fmt.num(t.pages)} hint={`+${fmt.num(t.added_today)} today`} />
        <Stat label="Added, last 7 days" value={fmt.num(t.added_7d)} hint={`${fmt.num(Math.round(t.added_7d / 7))} a day on average`} />
        <Stat label="Added, last 30 days" value={fmt.num(t.added_30d)} hint={`${fmt.num(Math.round(t.added_30d / 30))} a day on average`} />
        <Stat tone="ink" label="Generation cost today" value={usd(o.cost.today_usd)}
          hint={`${usd(o.cost.last_30d_usd)} last 30 days · ${usd(o.cost.per_page_usd)} a page`} />
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Stat label="Indexed by Google" value={gsc ? fmt.num(t.indexed) : "–"}
          hint={gsc ? `${fmt.pct(pct(t.indexed, t.pages))} of all pages · ${fmt.pct(pct(t.indexed, inspected))} of those checked` : offGsc} />
        <Stat label="Not indexed" value={gsc ? fmt.num(t.not_indexed) : "–"} hint={gsc ? "checked, and Google left them out" : offGsc} />
        <Stat label="Not checked yet" value={gsc ? fmt.num(t.not_inspected) : fmt.num(t.pages)}
          hint={gsc ? `${fmt.num(o.gsc.inspections_today)} of ${fmt.num(o.gsc.inspection_quota)} inspections used today` : offGsc} />
        <Stat label="Clicks, last 28 days" value={gsc ? fmt.num(t.clicks_28d) : "–"}
          hint={gsc ? `${fmt.num(t.impressions_28d)} impressions · ${fmt.pct(pct(t.clicks_28d, t.impressions_28d))} CTR` : offGsc} />
      </div>

      <Card>
        <CardTitle aside={<span className="text-[12px] text-muted">by first publish date</span>}>Pages added per day</CardTitle>
        {perDay.some((d) => Object.keys(d).length > 1) ? <StackedBars data={perDay} series={typeSeries} /> : <Empty>No pages published in the last {days} days.</Empty>}
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardTitle>Total pages over time</CardTitle>
          <TrendChart data={o.per_day} series={[{ key: "cumulative", label: "Pages live", color: "#121316" }]} />
        </Card>
        <Card>
          <CardTitle aside={gsc && o.gsc.last_inspection_run ? <span className="text-[12px] text-muted">checked {fmt.ago(o.gsc.last_inspection_run)}</span> : null}>Indexed vs not</CardTitle>
          {gsc && o.index_history.length ? (
            <StackedArea data={o.index_history} series={[
              { key: "indexed", label: "Indexed", color: "#84cc16" },
              { key: "not_indexed", label: "Not indexed", color: "#e11d48" },
              { key: "not_inspected", label: "Not checked yet", color: "#d5d8dc" },
            ]} />
          ) : <Empty>{gsc ? "No inspections yet. The daily job fills this in." : offGsc}</Empty>}
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardTitle aside={gsc && o.gsc.last_analytics_sync ? <span className="text-[12px] text-muted">synced {fmt.ago(o.gsc.last_analytics_sync)}</span> : null}>Search clicks and impressions</CardTitle>
          {gsc && o.search_trend.length ? (
            <TrendChart data={o.search_trend} series={[
              { key: "clicks", label: "Clicks", color: "#2563eb" },
              { key: "impressions", label: "Impressions", color: "#5eb8ae", right: true, dashed: true },
            ]} totals={{
              clicks: fmt.num(o.search_trend.reduce((n, d) => n + d.clicks, 0)),
              impressions: fmt.num(o.search_trend.reduce((n, d) => n + d.impressions, 0)),
            }} />
          ) : <Empty>{gsc ? "No search data yet." : offGsc}</Empty>}
        </Card>
        <Card>
          <CardTitle>Why pages aren&apos;t indexed</CardTitle>
          {gsc && o.not_indexed_reasons.length ? (
            <BarList items={o.not_indexed_reasons.slice(0, 8).map((r) => ({ label: r.reason, value: r.pages }))} />
          ) : <Empty>{gsc ? "Every checked page is indexed." : offGsc}</Empty>}
        </Card>
      </div>

      <Card>
        <CardTitle>By type</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[14px]">
            <thead>
              <tr className="text-left text-[12px] text-muted">
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 text-right font-medium">Pages</th>
                <th className="pb-2 pl-6 font-medium">Indexed</th>
                <th className="pb-2 text-right font-medium">Clicks 28d</th>
                <th className="pb-2 text-right font-medium">Impressions 28d</th>
                <th className="pb-2 text-right font-medium">Avg position</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[...o.by_type].sort((a, b) => b.pages - a.pages).map((r) => {
                const p = pct(r.indexed, r.pages);
                return (
                  <tr key={r.type}>
                    <td className="py-2.5"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: typeColor(r.type) }} />{typeLabel(r.type)}</span></td>
                    <td className="tabular py-2.5 text-right font-semibold">{fmt.num(r.pages)}</td>
                    <td className="py-2.5 pl-6">
                      {gsc ? (
                        <span className="flex items-center gap-3">
                          <span className="h-2 w-28 rounded-full bg-surface"><span className="block h-2 rounded-full bg-lime" style={{ width: `${p ?? 0}%` }} /></span>
                          <span className="tabular text-[13px]">{fmt.pct(p)}</span>
                          <span className="text-[12px] text-faint">{fmt.num(r.not_inspected)} unchecked</span>
                        </span>
                      ) : <span className="text-faint">–</span>}
                    </td>
                    <td className="tabular py-2.5 text-right">{gsc ? fmt.num(r.clicks_28d) : "–"}</td>
                    <td className="tabular py-2.5 text-right">{gsc ? fmt.num(r.impressions_28d) : "–"}</td>
                    <td className="tabular py-2.5 text-right">{gsc ? pos(r.avg_position) : "–"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <PageTable types={o.by_type.map((r) => r.type)} gsc={gsc} />
    </div>
  );
}

const STATUS_TONE: Record<IndexStatus, "lime" | "rose" | "gray"> = { indexed: "lime", not_indexed: "rose", not_inspected: "gray" };

function PageTable({ types, gsc }: { types: string[]; gsc: boolean }) {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => { setSearch(q.trim()); setPage(0); }, 250);
    return () => clearTimeout(id);
  }, [q]);

  const params = new URLSearchParams({ limit: String(LIMIT), offset: String(page * LIMIT), sort });
  if (search) params.set("q", search);
  if (type) params.set("type", type);
  if (status) params.set("status", status);
  const r = useQuery({
    queryKey: ["seo-pages", params.toString()],
    queryFn: () => api<SeoPages>(`/admin/seo/pages?${params}`),
    placeholderData: (prev) => prev,
  });
  const pages = r.data ? Math.max(1, Math.ceil(r.data.total / LIMIT)) : 1;

  return (
    <Card>
      <CardTitle aside={r.data ? <span className="text-[12px] text-muted">{fmt.num(r.data.total)} pages</span> : null}>Every page</CardTitle>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search URL or title" className={`${control} w-[260px] bg-surface placeholder:text-faint`} />
        <select value={type} onChange={(e) => { setType(e.target.value); setPage(0); }} className={`${control} bg-surface pr-10`} aria-label="Type">
          <option value="">All types</option>
          {types.map((t) => <option key={t} value={t}>{typeLabel(t)}</option>)}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className={`${control} bg-surface pr-10`} aria-label="Index status">
          <option value="">Any index status</option>
          {(Object.keys(STATUS_LABEL) as IndexStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(0); }} className={`${control} bg-surface pr-10`} aria-label="Sort">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="clicks">Most clicks</option>
          <option value="impressions">Most impressions</option>
          <option value="position">Best position</option>
        </select>
      </div>
      {r.isLoading ? <div className="h-[300px] animate-pulse rounded-2xl bg-surface" /> : r.error || !r.data ? <ErrorBox error={r.error} /> : r.data.items.length ? (
        <>
          <div className={`overflow-x-auto transition-opacity ${r.isFetching ? "opacity-60" : ""}`}>
            <table className="w-full min-w-[980px] text-[13px]">
              <thead>
                <tr className="text-left text-[12px] text-muted">
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Page</th>
                  <th className="pb-2 font-medium">Published</th>
                  <th className="pb-2 font-medium">Index status</th>
                  <th className="pb-2 font-medium">Last crawl</th>
                  <th className="pb-2 text-right font-medium">Clicks</th>
                  <th className="pb-2 text-right font-medium">Impr.</th>
                  <th className="pb-2 text-right font-medium">Pos.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {r.data.items.map((p) => (
                  <tr key={p.url} className="align-top">
                    <td className="whitespace-nowrap py-2.5 pr-3"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: typeColor(p.type) }} />{typeLabel(p.type)}</span></td>
                    <td className="max-w-[380px] py-2.5 pr-3">
                      <a href={p.url} target="_blank" rel="noreferrer" className="group block hover:opacity-80">
                        <span className="block truncate font-medium">{p.title ?? p.path}</span>
                        <span className="flex items-center gap-1 truncate text-[12px] text-muted">{p.path}<ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100" /></span>
                      </a>
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-3 text-muted">{fmt.date(p.published_at)}</td>
                    <td className="py-2.5 pr-3">
                      {gsc ? (
                        <>
                          <Pill tone={STATUS_TONE[p.index_status]}>{STATUS_LABEL[p.index_status]}</Pill>
                          {p.coverage_state && p.index_status !== "indexed" ? <p className="mt-1 max-w-[220px] text-[11px] text-muted">{p.coverage_state}</p> : null}
                        </>
                      ) : <span className="text-faint">–</span>}
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-3 text-muted">{gsc && p.last_crawl_at ? fmt.ago(p.last_crawl_at) : "–"}</td>
                    <td className="tabular py-2.5 text-right">{gsc ? fmt.num(p.clicks_28d) : "–"}</td>
                    <td className="tabular py-2.5 text-right">{gsc ? fmt.num(p.impressions_28d) : "–"}</td>
                    <td className="tabular py-2.5 text-right">{gsc ? pos(p.position_28d) : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between text-[13px] text-muted">
            <span>{fmt.num(page * LIMIT + 1)}–{fmt.num(Math.min(r.data.total, (page + 1) * LIMIT))} of {fmt.num(r.data.total)}</span>
            <div className="flex gap-2">
              <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-full bg-surface px-4 py-2 disabled:opacity-40">Previous</button>
              <span className="self-center px-1">Page {page + 1} of {fmt.num(pages)}</span>
              <button type="button" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)} className="rounded-full bg-surface px-4 py-2 disabled:opacity-40">Next</button>
            </div>
          </div>
        </>
      ) : <Empty>No pages match.</Empty>}
    </Card>
  );
}

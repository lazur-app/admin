"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchAnalyticsOverview,
  fetchPlatformSummary,
  fetchTimeseries,
  triggerBackfill,
  downloadExport,
  type AdminAnalyticsOverview,
  type PlatformSummary,
} from "@/lib/api";
import {
  StatCard,
  PageHeader,
  ErrorBanner,
  LoadingState,
  DataTable,
  tableHeadClass,
  tableCellClass,
} from "@/components/ui";
import {
  DateRangePicker,
  defaultRange,
  type DateRange,
} from "@/components/DateRangePicker";
import {
  TimeseriesChart,
  BarChartPanel,
  FunnelBarChart,
  HorizontalBarChart,
  ChartSection,
} from "@/components/charts";

type MetricSeries = Record<string, { date: string; value: number }[]>;

const TIMESERIES_METRICS = [
  "dau",
  "sessions",
  "words",
  "commands",
  "signups",
  "errors",
  "llm_cost_usd",
] as const;

export default function AnalyticsPage() {
  const [data, setData] = useState<AdminAnalyticsOverview | null>(null);
  const [summary, setSummary] = useState<PlatformSummary | null>(null);
  const [series, setSeries] = useState<MetricSeries>({});
  const [range, setRange] = useState<DateRange>(defaultRange(30));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [backfillMsg, setBackfillMsg] = useState<string | null>(null);

  const load = useCallback(async (r: DateRange) => {
    setLoading(true);
    setError(null);
    try {
      const [overview, platformSummary, ...metricResults] = await Promise.all([
        fetchAnalyticsOverview(),
        fetchPlatformSummary(r.from, r.to),
        ...TIMESERIES_METRICS.map((metric) =>
          fetchTimeseries({ metric, from: r.from, to: r.to })
        ),
      ]);
      setData(overview);
      setSummary(platformSummary);
      const next: MetricSeries = {};
      TIMESERIES_METRICS.forEach((metric, i) => {
        next[metric] = metricResults[i].series;
      });
      setSeries(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(range);
  }, [range, load]);

  const funnelSteps = useMemo(() => {
    if (!data) return [];
    const f = data.onboarding_funnel_30d;
    const steps = [
      { label: "Signed up", value: f.signed_up },
      ...f.steps.map((s) => ({ label: s.step, value: s.count })),
      { label: "Onboarding completed", value: f.onboarding_completed },
    ];
    return steps.filter((s) => s.value > 0);
  }, [data]);

  const topEventsChart = useMemo(
    () =>
      (data?.top_events_7d ?? []).map((e) => ({
        name: e.event_name,
        value: e.count,
      })),
    [data]
  );

  return (
    <div>
      <PageHeader
        title="Product analytics"
        description="Engagement, funnels, errors, and platform trends."
      />

      <DateRangePicker value={range} onChange={setRange} />

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            downloadExport(
              `/admin/export/timeseries?metric=words&from=${range.from}&to=${range.to}`
            )
          }
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
        >
          Export words CSV
        </button>
        <button
          type="button"
          onClick={() => {
            setBackfillMsg("Backfilling…");
            triggerBackfill(range.from, range.to)
              .then((r) =>
                setBackfillMsg(
                  `Backfilled ${r.days_processed} day(s). Reloading charts…`
                )
              )
              .then(() => load(range))
              .catch((e) =>
                setBackfillMsg(e instanceof Error ? e.message : "Backfill failed")
              );
          }}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
        >
          Backfill rollups for range
        </button>
      </div>
      {backfillMsg && (
        <p className="mt-2 text-xs text-zinc-500">{backfillMsg}</p>
      )}

      {error && <ErrorBanner message={error} />}
      {loading && !data && <LoadingState className="mt-8" />}

      {data && summary && (
        <div className="mt-8 space-y-10">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <StatCard label="DAU (24h)" value={data.dau} />
            <StatCard label="WAU (7d)" value={data.wau} />
            <StatCard label="MAU (30d)" value={data.mau} />
            <StatCard
              label="Avg DAU (range)"
              value={summary.avg_dau}
              sub={`Peak ${summary.peak_dau}`}
            />
            <StatCard
              label="Sessions (range)"
              value={summary.totals.sessions.toLocaleString()}
            />
            <StatCard
              label="Error rate"
              value={
                summary.error_rate_pct != null
                  ? `${summary.error_rate_pct}%`
                  : "—"
              }
              sub={`${data.errors.total_7d} errors / 7d`}
            />
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <ChartSection title="Daily active users">
              <TimeseriesChart data={series.dau} label="DAU" />
            </ChartSection>
            <ChartSection title="Dictation sessions per day">
              <BarChartPanel data={series.sessions} label="Sessions" />
            </ChartSection>
            <ChartSection title="Words dictated per day">
              <TimeseriesChart data={series.words} label="Words" />
            </ChartSection>
            <ChartSection title="Command mode usage per day">
              <BarChartPanel data={series.commands} label="Commands" />
            </ChartSection>
            <ChartSection title="New signups per day">
              <BarChartPanel data={series.signups} label="Signups" />
            </ChartSection>
            <ChartSection title="Client errors per day">
              <TimeseriesChart data={series.errors} label="Errors" />
            </ChartSection>
          </div>

          <ChartSection title="LLM infrastructure cost per day (USD)">
            <TimeseriesChart data={series.llm_cost_usd} label="USD" />
          </ChartSection>

          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <ChartSection title="Onboarding funnel (30 days)">
                {funnelSteps.length > 0 ? (
                  <FunnelBarChart steps={funnelSteps} />
                ) : (
                  <p className="text-sm text-zinc-500">No funnel data yet.</p>
                )}
              </ChartSection>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <StatCard
                  label="Signed up"
                  value={data.onboarding_funnel_30d.signed_up}
                />
                <StatCard
                  label="Completed onboarding"
                  value={data.onboarding_funnel_30d.onboarding_completed}
                />
              </div>
            </div>
            <ChartSection title="Top events (7 days)">
              {topEventsChart.length > 0 ? (
                <HorizontalBarChart data={topEventsChart} />
              ) : (
                <p className="text-sm text-zinc-500">No events yet.</p>
              )}
            </ChartSection>
          </div>

          <section>
            <h2 className="mb-3 text-lg font-medium text-zinc-900">
              Errors by app version (7 days)
            </h2>
            <DataTable>
              <table className="w-full text-left text-sm">
                <thead className={tableHeadClass}>
                  <tr>
                    <th className="px-4 py-3">Version</th>
                    <th className="px-4 py-3">Platform</th>
                    <th className="px-4 py-3 text-right">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {data.errors.by_version.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className={`${tableCellClass} text-zinc-500`}
                      >
                        No errors recorded.
                      </td>
                    </tr>
                  ) : (
                    data.errors.by_version.map((row, i) => (
                      <tr key={i} className="border-t border-zinc-100">
                        <td className={`${tableCellClass} font-mono text-xs`}>
                          {row.app_version ?? "—"}
                        </td>
                        <td className={tableCellClass}>{row.platform ?? "—"}</td>
                        <td className={`${tableCellClass} text-right`}>
                          {row.count.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </DataTable>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-medium text-zinc-900">
              Range totals
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Words (range)"
                value={summary.totals.words.toLocaleString()}
              />
              <StatCard
                label="Commands (range)"
                value={summary.totals.commands.toLocaleString()}
              />
              <StatCard
                label="Signups (range)"
                value={summary.totals.signups.toLocaleString()}
              />
              <StatCard
                label="LLM cost (range)"
                value={`$${summary.totals.llm_cost_usd.toFixed(4)}`}
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

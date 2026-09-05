"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  fetchAnalyticsOverview,
  fetchDashboard,
  downloadExport,
  type AdminAnalyticsOverview,
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
import {
  insightVsAverage,
  prefetchRange,
  rangeInside,
  shareInsight,
  sliceDashboard,
} from "@/lib/dashboard";

export default function AnalyticsPage() {
  const [range, setRange] = useState<DateRange>(defaultRange(30));
  const window = prefetchRange();
  const canSlice = rangeInside(window, range);

  const dashboardQuery = useQuery({
    queryKey: ["admin-dashboard", canSlice ? window : range],
    queryFn: () =>
      fetchDashboard(
        canSlice ? window.from : range.from,
        canSlice ? window.to : range.to
      ),
    placeholderData: keepPreviousData,
  });

  const overviewQuery = useQuery({
    queryKey: ["admin-analytics-overview"],
    queryFn: fetchAnalyticsOverview,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const view = useMemo(() => {
    if (!dashboardQuery.data) return null;
    return canSlice ? sliceDashboard(dashboardQuery.data, range) : dashboardQuery.data;
  }, [dashboardQuery.data, canSlice, range]);

  const data: AdminAnalyticsOverview | undefined = overviewQuery.data;
  const error =
    dashboardQuery.error instanceof Error
      ? dashboardQuery.error.message
      : overviewQuery.error instanceof Error
        ? overviewQuery.error.message
        : null;

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
        actions={
          <button
            type="button"
            onClick={() =>
              downloadExport(
                `/admin/export/timeseries?metric=words&from=${range.from}&to=${range.to}`
              )
            }
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
          >
            Export words CSV
          </button>
        }
      />

      <div className="sticky top-0 z-10 mb-6 border-b border-white/5 bg-zinc-950/80 py-3 backdrop-blur">
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {error && <ErrorBanner message={error} />}
      {!view && !error && <LoadingState className="mt-8" />}

      {view && data && (
        <div className="space-y-10">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <StatCard label="DAU (24h)" value={data.dau} />
            <StatCard label="WAU (7d)" value={data.wau} />
            <StatCard label="MAU (30d)" value={data.mau} />
            <StatCard
              label="Avg DAU (range)"
              value={view.avg_dau}
              sub={`Peak ${view.peak_dau}`}
            />
            <StatCard
              label="Sessions (range)"
              value={(view.totals.sessions ?? 0).toLocaleString()}
            />
            <StatCard
              label="Error rate"
              value={
                view.error_rate_pct != null ? `${view.error_rate_pct}%` : "-"
              }
              sub={`${data.errors.total_7d} errors / 7d`}
            />
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <ChartSection title="Daily active users">
              <p className="mb-2 text-xs text-zinc-500">
                {insightVsAverage(view.series.dau, "DAU")}
              </p>
              <TimeseriesChart data={view.series.dau} label="DAU" />
            </ChartSection>
            <ChartSection title="Dictation sessions per day">
              <p className="mb-2 text-xs text-zinc-500">
                {insightVsAverage(view.series.sessions, "Sessions")}
              </p>
              <BarChartPanel data={view.series.sessions ?? []} label="Sessions" />
            </ChartSection>
            <ChartSection title="Words dictated per day">
              <p className="mb-2 text-xs text-zinc-500">
                {insightVsAverage(view.series.words, "Words")}
              </p>
              <TimeseriesChart data={view.series.words} label="Words" />
            </ChartSection>
            <ChartSection title="Command mode usage per day">
              <p className="mb-2 text-xs text-zinc-500">
                {shareInsight(
                  view.totals.commands ?? 0,
                  view.totals.sessions ?? 0,
                  "Commands"
                )}
              </p>
              <BarChartPanel data={view.series.commands ?? []} label="Commands" />
            </ChartSection>
            <ChartSection title="New signups per day">
              <BarChartPanel data={view.series.signups ?? []} label="Signups" />
            </ChartSection>
            <ChartSection title="Client errors per day">
              <TimeseriesChart data={view.series.errors} label="Errors" />
            </ChartSection>
          </div>

          <ChartSection title="LLM infrastructure cost per day (USD)">
            <TimeseriesChart data={view.series.llm_cost_usd} label="USD" />
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
            <h2 className="mb-3 text-lg font-medium text-zinc-50">
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
                      <tr key={i} className="border-t border-white/5">
                        <td className={`${tableCellClass} font-mono text-xs`}>
                          {row.app_version ?? "-"}
                        </td>
                        <td className={tableCellClass}>{row.platform ?? "-"}</td>
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
            <h2 className="mb-3 text-lg font-medium text-zinc-50">Range totals</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Words (range)"
                value={(view.totals.words ?? 0).toLocaleString()}
              />
              <StatCard
                label="Commands (range)"
                value={(view.totals.commands ?? 0).toLocaleString()}
              />
              <StatCard
                label="Signups (range)"
                value={(view.totals.signups ?? 0).toLocaleString()}
              />
              <StatCard
                label="LLM cost (range)"
                value={`$${(view.totals.llm_cost_usd ?? 0).toFixed(4)}`}
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

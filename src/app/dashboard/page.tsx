"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchOverview, fetchDashboard, downloadExport } from "@/lib/api";
import { StatCard, PageHeader, ErrorBanner, LoadingState } from "@/components/ui";
import { TimeseriesChart, BarChartPanel } from "@/components/charts";
import { defaultRange, DateRangePicker, type DateRange } from "@/components/DateRangePicker";
import {
  insightVsAverage,
  prefetchRange,
  rangeInside,
  sliceDashboard,
} from "@/lib/dashboard";

export default function DashboardOverviewPage() {
  const [range, setRange] = useState<DateRange>(defaultRange(30));
  const window = prefetchRange();
  const canSlice = rangeInside(window, range);

  const overviewQuery = useQuery({
    queryKey: ["admin-overview"],
    queryFn: fetchOverview,
    staleTime: 30_000,
  });

  const dashboardQuery = useQuery({
    queryKey: ["admin-dashboard", canSlice ? window : range],
    queryFn: () =>
      fetchDashboard(
        canSlice ? window.from : range.from,
        canSlice ? window.to : range.to
      ),
    placeholderData: keepPreviousData,
  });

  const view = useMemo(() => {
    if (!dashboardQuery.data) return null;
    return canSlice ? sliceDashboard(dashboardQuery.data, range) : dashboardQuery.data;
  }, [dashboardQuery.data, canSlice, range]);

  const data = overviewQuery.data;
  const error =
    overviewQuery.error instanceof Error
      ? overviewQuery.error.message
      : dashboardQuery.error instanceof Error
        ? dashboardQuery.error.message
        : null;

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Platform metrics, unit economics, and trends."
        actions={
          <button
            type="button"
            onClick={() =>
              downloadExport(
                `/admin/export/timeseries?metric=dau&from=${range.from}&to=${range.to}`
              )
            }
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
          >
            Export DAU CSV
          </button>
        }
      />

      <div className="sticky top-0 z-10 mb-6 border-b border-white/5 bg-zinc-950/80 py-3 backdrop-blur">
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {error && <ErrorBanner message={error} />}
      {!data && !error && <LoadingState />}

      {data && view && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total users" value={data.total_users} />
            <StatCard label="Active subscriptions" value={data.active_subscriptions} />
            <StatCard label="MRR" value={`$${data.mrr_usd.toFixed(2)}`} />
            <StatCard
              label="Gross margin (MTD)"
              value={`$${data.gross_margin_mtd_usd.toFixed(2)}`}
              sub={
                data.gross_margin_pct != null
                  ? `${data.gross_margin_pct}% of MRR`
                  : undefined
              }
            />
            <StatCard label="Dictation sessions (MTD)" value={data.dictation_sessions_mtd} />
            <StatCard label="Words used (MTD)" value={data.words_used_mtd} />
            <StatCard label="Commands used (MTD)" value={data.commands_used_mtd} />
            <StatCard
              label="LLM cost (MTD)"
              value={`$${data.llm_cost_mtd_usd.toFixed(4)}`}
            />
            <StatCard
              label="Open issues"
              value={data.open_issues_count ?? 0}
              sub={
                <Link href="/dashboard/feedback?kind=issue" className="text-violet-300 hover:underline">
                  View in Feedback
                </Link>
              }
            />
            <StatCard
              label="Open feedback"
              value={data.open_feedback_count ?? 0}
              sub={
                <Link href="/dashboard/feedback?kind=feedback" className="text-violet-300 hover:underline">
                  View in Feedback
                </Link>
              }
            />
          </div>

          <div className="mt-10 space-y-8">
            <section>
              <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-zinc-500">
                Daily active users
              </h2>
              <p className="mb-3 text-xs text-zinc-500">
                {insightVsAverage(view.series.dau, "DAU")}
              </p>
              <TimeseriesChart data={view.series.dau} label="DAU" />
            </section>
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
                Dictation sessions per day
              </h2>
              <BarChartPanel data={view.series.sessions ?? []} label="Sessions" />
            </section>
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
                LLM cost per day (USD)
              </h2>
              <TimeseriesChart data={view.series.llm_cost_usd} label="USD" />
            </section>
          </div>
        </>
      )}
    </div>
  );
}

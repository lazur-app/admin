"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchOverview, fetchTimeseries } from "@/lib/api";
import type { AdminOverview } from "@/lib/api";
import { StatCard, PageHeader, ErrorBanner, LoadingState } from "@/components/ui";
import { TimeseriesChart, BarChartPanel } from "@/components/charts";
import { defaultRange, DateRangePicker, type DateRange } from "@/components/DateRangePicker";
import { downloadExport } from "@/lib/api";

export default function DashboardOverviewPage() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [range, setRange] = useState<DateRange>(defaultRange(30));
  const [dauSeries, setDauSeries] = useState<{ date: string; value: number }[]>([]);
  const [sessionSeries, setSessionSeries] = useState<{ date: string; value: number }[]>([]);
  const [costSeries, setCostSeries] = useState<{ date: string; value: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchOverview(),
      fetchTimeseries({ metric: "dau", ...range }),
      fetchTimeseries({ metric: "sessions", ...range }),
      fetchTimeseries({ metric: "llm_cost_usd", ...range }),
    ])
      .then(([overview, dau, sessions, cost]) => {
        setData(overview);
        setDauSeries(dau.series);
        setSessionSeries(sessions.series);
        setCostSeries(cost.series);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [range]);

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Platform metrics, unit economics, and trends."
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <DateRangePicker value={range} onChange={setRange} />
        <button
          type="button"
          onClick={() =>
            downloadExport(
              `/admin/export/timeseries?metric=dau&from=${range.from}&to=${range.to}`
            )
          }
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
        >
          Export DAU CSV
        </button>
      </div>

      {error && <ErrorBanner message={error} />}
      {!data && !error && <LoadingState />}

      {data && (
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
                <Link href="/dashboard/feedback?kind=issue" className="text-violet-700 hover:underline">
                  View in Feedback
                </Link>
              }
            />
            <StatCard
              label="Open feedback"
              value={data.open_feedback_count ?? 0}
              sub={
                <Link href="/dashboard/feedback?kind=feedback" className="text-violet-700 hover:underline">
                  View in Feedback
                </Link>
              }
            />
          </div>

          <div className="mt-10 space-y-8">
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
                Daily active users
              </h2>
              <TimeseriesChart data={dauSeries} label="DAU" />
            </section>
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
                Dictation sessions per day
              </h2>
              <BarChartPanel data={sessionSeries} label="Sessions" />
            </section>
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
                LLM cost per day (USD)
              </h2>
              <TimeseriesChart data={costSeries} label="USD" />
            </section>
          </div>
        </>
      )}
    </div>
  );
}

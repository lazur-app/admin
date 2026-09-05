"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchCostOverview, fetchDashboard } from "@/lib/api";
import {
  PageHeader,
  StatCard,
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
import { BarChartPanel, HorizontalBarChart, ChartSection } from "@/components/charts";
import { prefetchRange, rangeInside, sliceDashboard } from "@/lib/dashboard";

export default function CostPage() {
  const [range, setRange] = useState<DateRange>(defaultRange(30));
  const window = prefetchRange();
  const canSlice = rangeInside(window, range);

  const costQuery = useQuery({
    queryKey: ["admin-cost"],
    queryFn: fetchCostOverview,
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

  const data = costQuery.data;
  const error =
    costQuery.error instanceof Error
      ? costQuery.error.message
      : dashboardQuery.error instanceof Error
        ? dashboardQuery.error.message
        : null;

  if (error && !data) return <ErrorBanner message={error} />;
  if (!data) return <LoadingState />;

  const featureChart = data.by_feature_mtd.map((f) => ({
    name: f.feature,
    value: f.cost_usd,
  }));

  return (
    <div>
      <PageHeader
        title="Unit economics & LLM cost"
        description="MRR, gross margin, token spend, and waste analytics."
      />

      <div className="sticky top-0 z-10 mb-6 border-b border-white/5 bg-zinc-950/80 py-3 backdrop-blur">
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="MRR" value={`$${data.mrr_usd.toFixed(2)}`} />
        <StatCard
          label="LLM cost (MTD)"
          value={`$${data.llm_cost_mtd_usd.toFixed(4)}`}
        />
        <StatCard
          label="Gross margin (MTD)"
          value={`$${data.gross_margin_mtd_usd.toFixed(2)}`}
          sub={
            data.gross_margin_pct != null
              ? `${data.gross_margin_pct}% of MRR`
              : undefined
          }
        />
        <StatCard
          label="Command waste rate"
          value={
            data.waste_mtd.waste_rate_pct != null
              ? `${data.waste_mtd.waste_rate_pct}%`
              : "-"
          }
          sub={`$${data.waste_mtd.wasted_cost_usd.toFixed(4)} unfinalized`}
        />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="LLM latency p50"
          value={
            data.latency_mtd.p50_ms != null
              ? `${data.latency_mtd.p50_ms} ms`
              : "-"
          }
        />
        <StatCard
          label="LLM latency p95"
          value={
            data.latency_mtd.p95_ms != null
              ? `${data.latency_mtd.p95_ms} ms`
              : "-"
          }
          sub={`${data.latency_mtd.sample_count} samples`}
        />
        <StatCard
          label="Unfinalized commands"
          value={data.waste_mtd.unfinalized_calls}
          sub={`of ${data.waste_mtd.command_calls_mtd} command calls MTD`}
        />
        <StatCard
          label="Unfinalized agents"
          value={data.waste_mtd.agent?.unfinalized_calls ?? 0}
          sub={`of ${data.waste_mtd.agent?.calls_mtd ?? 0} agent calls MTD`}
        />
      </div>

      <div className="mt-10 space-y-10">
        <ChartSection title="Daily LLM cost (USD)">
          <BarChartPanel data={view?.series.llm_cost_usd ?? []} label="USD" />
        </ChartSection>

        <div className="grid gap-8 lg:grid-cols-2">
          <ChartSection title="Cost by feature (MTD)">
            {featureChart.length > 0 ? (
              <HorizontalBarChart data={featureChart} label="USD" />
            ) : (
              <p className="text-sm text-zinc-500">No LLM usage recorded yet.</p>
            )}
          </ChartSection>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
              Top costly users (MTD)
            </h2>
            <DataTable>
              <table className="w-full text-left text-sm">
                <thead className={tableHeadClass}>
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3 text-right">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_users_mtd.length === 0 ? (
                    <tr>
                      <td
                        colSpan={2}
                        className={`${tableCellClass} text-zinc-500`}
                      >
                        No usage yet.
                      </td>
                    </tr>
                  ) : (
                    data.top_users_mtd.map((u) => (
                      <tr key={u.user_id} className="border-t border-white/5">
                        <td className={tableCellClass}>
                          <Link
                            href={`/dashboard/users/${u.user_id}`}
                            className="text-zinc-100 hover:underline"
                          >
                            {u.email}
                          </Link>
                        </td>
                        <td className={`${tableCellClass} text-right font-mono text-xs`}>
                          ${u.cost_usd.toFixed(4)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </DataTable>
          </section>
        </div>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Feature breakdown (MTD)
          </h2>
          <DataTable>
            <table className="w-full text-left text-sm">
              <thead className={tableHeadClass}>
                <tr>
                  <th className="px-4 py-3">Feature</th>
                  <th className="px-4 py-3 text-right">Calls</th>
                  <th className="px-4 py-3 text-right">Cost (USD)</th>
                </tr>
              </thead>
              <tbody>
                {data.by_feature_mtd.map((f) => (
                  <tr key={f.feature} className="border-t border-white/5">
                    <td className={`${tableCellClass} font-mono text-xs`}>
                      {f.feature}
                    </td>
                    <td className={`${tableCellClass} text-right`}>
                      {f.call_count.toLocaleString()}
                    </td>
                    <td className={`${tableCellClass} text-right font-mono text-xs`}>
                      ${f.cost_usd.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTable>
        </section>
      </div>
    </div>
  );
}

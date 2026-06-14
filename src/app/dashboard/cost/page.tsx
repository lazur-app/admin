"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchCostOverview, fetchTimeseries, type CostOverview } from "@/lib/api";
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

export default function CostPage() {
  const [data, setData] = useState<CostOverview | null>(null);
  const [costSeries, setCostSeries] = useState<{ date: string; value: number }[]>(
    []
  );
  const [range, setRange] = useState<DateRange>(defaultRange(30));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    Promise.all([
      fetchCostOverview(),
      fetchTimeseries({ metric: "llm_cost_usd", ...range }),
    ])
      .then(([overview, ts]) => {
        setData(overview);
        setCostSeries(ts.series);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [range]);

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

      <DateRangePicker value={range} onChange={setRange} />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              : "—"
          }
          sub={`$${data.waste_mtd.wasted_cost_usd.toFixed(4)} unfinalized`}
        />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="LLM latency p50"
          value={
            data.latency_mtd.p50_ms != null
              ? `${data.latency_mtd.p50_ms} ms`
              : "—"
          }
        />
        <StatCard
          label="LLM latency p95"
          value={
            data.latency_mtd.p95_ms != null
              ? `${data.latency_mtd.p95_ms} ms`
              : "—"
          }
          sub={`${data.latency_mtd.sample_count} samples`}
        />
        <StatCard
          label="Unfinalized commands"
          value={data.waste_mtd.unfinalized_calls}
          sub={`of ${data.waste_mtd.command_calls_mtd} command calls MTD`}
        />
      </div>

      <div className="mt-10 space-y-10">
        <ChartSection title="Daily LLM cost (USD)">
          <BarChartPanel data={costSeries} label="USD" />
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
                      <tr key={u.user_id} className="border-t border-zinc-100">
                        <td className={tableCellClass}>
                          <Link
                            href={`/dashboard/users/${u.user_id}`}
                            className="text-zinc-900 hover:underline"
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
                  <tr key={f.feature} className="border-t border-zinc-100">
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

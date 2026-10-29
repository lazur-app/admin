"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, fmt } from "@/lib/api";
import { COST_PARTS, FEATURES, featureLabel } from "@/lib/features";
import { Card, CardTitle, Empty, ErrorBox, Loading, Pill } from "@/components/ui";
import { TrendChart } from "@/components/userTrends";

type FeatureRow = { feature: string; calls: number; tokens: number; cost_usd: number; avg_usd: number; share_pct: number; last_at: string | null };
type Costs = {
  range_days: number | null; total_usd: number; calls: number; truncated: boolean;
  by_feature: FeatureRow[];
  by_model: { provider: string; model: string; calls: number; tokens: number; cost_usd: number }[];
  parts: Record<string, number>;
  top_features: string[];
  per_day: ({ date: string; total: number; other: number } & Record<string, number | string>)[];
  top_turns: { turn: string; at: string | null; cost_usd: number; calls: number; features: string[] }[];
  top_jobs: { task: string; cost_usd: number; calls: number; status: string | null; steps: number | null; at: string | null }[];
  recent: { at: string | null; feature: string; model: string; provider: string; tokens: number; cost_usd: number; latency_ms: number | null }[];
};

const RANGES = [{ days: 7, label: "7d" }, { days: 30, label: "30d" }, { days: 90, label: "90d" }, { days: 0, label: "All" }];
const LINE_COLORS = ["#2563eb", "#ea580c", "#7c3aed", "#0d9488", "#f59e0b"];
const usd = (n: number) => fmt.usd(n, n && n < 0.1 ? 4 : 2);
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "–");

/** Where one person's AI cost went: by feature, by what the tokens paid for, per day, and the priciest turns and jobs. */
export function UserCosts({ id }: { id: string }) {
  const [days, setDays] = useState(30);
  const q = useQuery({ queryKey: ["user-costs", id, days], queryFn: () => api<Costs>(`/admin/users/${id}/costs?days=${days}`) });
  const c = q.data;

  return (
    <section className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight">Where their AI cost went</h2>
          <p className="text-[13px] text-muted">Every model call this person made, what it was for and what it cost. Counts only, never content.</p>
        </div>
        <div className="flex rounded-full bg-card p-1">
          {RANGES.map((r) => (
            <button key={r.days} type="button" onClick={() => setDays(r.days)}
              className={`rounded-full px-4 py-2 text-[13px] font-medium transition ${days === r.days ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>{r.label}</button>
          ))}
        </div>
      </div>

      {q.isLoading ? <Loading /> : q.error || !c ? <ErrorBox error={q.error} /> : !c.calls ? (
        <Card><Empty>No model calls in this range.</Empty></Card>
      ) : (
        <>
          <div className="grid gap-5 xl:grid-cols-[1.25fr_1fr]">
            <Card>
              <CardTitle aside={<span className="text-[13px] text-muted">{fmt.num(c.calls)} calls{c.truncated ? " (latest 50,000)" : ""}</span>}>
                {usd(c.total_usd)} by feature
              </CardTitle>
              <div className="divide-y divide-line">
                {c.by_feature.map((f) => (
                  <div key={f.feature} className="py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[14px] font-medium">{featureLabel(f.feature)}</span>
                      <span className="tabular text-[14px] font-semibold">{usd(f.cost_usd)}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface">
                      <div className="h-full rounded-full bg-ink" style={{ width: `${Math.max(1, f.share_pct)}%` }} />
                    </div>
                    <p className="mt-1.5 text-[12px] text-muted">
                      {f.share_pct}% · {fmt.num(f.calls)} calls · {usd(f.avg_usd)} each · {fmt.num(f.tokens)} tokens · last {fmt.ago(f.last_at)}
                    </p>
                    {FEATURES[f.feature] ? <p className="text-[12px] text-faint">{FEATURES[f.feature].what}</p> : null}
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid content-start gap-5">
              <Card>
                <CardTitle>What the tokens paid for</CardTitle>
                <PartsBar parts={c.parts} total={c.total_usd} />
              </Card>
              <Card>
                <CardTitle>By model</CardTitle>
                <div className="divide-y divide-line text-[14px]">
                  {c.by_model.map((m) => (
                    <div key={`${m.provider}/${m.model}`} className="flex items-center gap-3 py-2.5">
                      <Pill tone="gray">{m.provider}</Pill>
                      <span className="min-w-0 flex-1 truncate">{m.model}</span>
                      <span className="text-[12px] text-faint">{fmt.num(m.calls)} calls</span>
                      <span className="tabular font-semibold">{usd(m.cost_usd)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          <Card>
            <CardTitle aside={<span className="text-[13px] text-muted">top features, per day</span>}>Cost per day</CardTitle>
            <TrendChart data={c.per_day} height={240} series={[
              ...c.top_features.map((f, i) => ({ key: f, label: featureLabel(f), color: LINE_COLORS[i % LINE_COLORS.length], format: usd })),
              ...(c.by_feature.length > c.top_features.length ? [{ key: "other", label: "Everything else", color: "#94a3b8", dashed: true, format: usd }] : []),
            ]} />
          </Card>

          <div className="grid gap-5 xl:grid-cols-2">
            <Card>
              <CardTitle aside={<span className="text-[13px] text-muted">all calls in one question</span>}>Priciest questions</CardTitle>
              {c.top_turns.length ? (
                <div className="divide-y divide-line text-[14px]">
                  {c.top_turns.map((t) => (
                    <div key={t.turn} className="flex items-center gap-3 py-2.5">
                      <span className="tabular w-[72px] font-semibold">{usd(t.cost_usd)}</span>
                      <span className="min-w-0 flex-1 truncate text-muted">{t.features.map(featureLabel).join(" + ")} · {t.calls} calls</span>
                      <span className="shrink-0 text-[12px] text-faint">{when(t.at)}</span>
                    </div>
                  ))}
                </div>
              ) : <Empty>No voice questions in this range.</Empty>}
            </Card>
            <Card>
              <CardTitle aside={<span className="text-[13px] text-muted">agent thinking per job</span>}>Priciest jobs</CardTitle>
              {c.top_jobs.length ? (
                <div className="divide-y divide-line text-[14px]">
                  {c.top_jobs.map((j) => (
                    <div key={j.task} className="flex items-center gap-3 py-2.5">
                      <span className="tabular w-[72px] font-semibold">{usd(j.cost_usd)}</span>
                      <Pill tone={j.status === "done" ? "lime" : j.status === "failed" ? "rose" : "gray"}>{j.status ?? "job"}</Pill>
                      <span className="min-w-0 flex-1 truncate text-muted">{j.steps != null ? `${j.steps} steps · ` : ""}{j.calls} model calls</span>
                      <span className="shrink-0 text-[12px] text-faint">{when(j.at)}</span>
                    </div>
                  ))}
                </div>
              ) : <Empty>No background jobs in this range.</Empty>}
            </Card>
          </div>

          <Card>
            <CardTitle aside={<span className="text-[13px] text-muted">newest first</span>}>Latest calls</CardTitle>
            <div className="max-h-[360px] overflow-y-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="sticky top-0 bg-card text-[12px] text-muted">
                  <tr><th className="py-2 font-medium">When</th><th className="font-medium">Feature</th><th className="font-medium">Model</th><th className="text-right font-medium">Tokens</th><th className="text-right font-medium">Time</th><th className="text-right font-medium">Cost</th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {c.recent.map((r, i) => (
                    <tr key={i}>
                      <td className="py-2 text-muted">{when(r.at)}</td>
                      <td>{featureLabel(r.feature)}</td>
                      <td className="text-muted">{r.model}</td>
                      <td className="tabular text-right">{fmt.num(r.tokens)}</td>
                      <td className="tabular text-right text-muted">{r.latency_ms != null ? `${(r.latency_ms / 1000).toFixed(1)}s` : "–"}</td>
                      <td className="tabular text-right font-medium">{usd(r.cost_usd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </section>
  );
}

function PartsBar({ parts, total }: { parts: Record<string, number>; total: number }) {
  const sum = Object.values(parts).reduce((a, b) => a + b, 0) || total || 1;
  const shown = COST_PARTS.filter((p) => (parts[p.key] ?? 0) > 0);
  return (
    <div>
      <div className="flex h-4 overflow-hidden rounded-full bg-surface">
        {shown.map((p) => <span key={p.key} title={`${p.label}: ${usd(parts[p.key])}`} style={{ width: `${(100 * parts[p.key]) / sum}%`, background: p.color }} />)}
      </div>
      <div className="mt-4 space-y-2">
        {shown.sort((a, b) => parts[b.key] - parts[a.key]).map((p) => (
          <div key={p.key} className="flex items-center gap-2.5 text-[13px]">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
            <span className="flex-1">{p.label}</span>
            <span className="text-[12px] text-muted">{Math.round((100 * parts[p.key]) / sum)}%</span>
            <span className="tabular w-[72px] text-right font-medium">{usd(parts[p.key])}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[12px] text-faint">Voice and screenshots usually dominate voice questions; long jobs are mostly text in.</p>
    </div>
  );
}

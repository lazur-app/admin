"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, fmt } from "@/lib/api";
import { Card, CardTitle, Empty, ErrorBox, Loading, PageTitle, Pill, RangePicker, Stat, planLabel, planTone } from "@/components/ui";
import { BarList } from "@/components/userCharts";

type PlanLimits = { plans: { slug: string; usd: number; default_usd: number }[]; note: string };
type Overview = {
  days: number;
  buckets: { bucket: string; users: number }[];
  plans: { plan: string; users: number; budget_usd: number; avg_pct: number | null; at_limit: number; near_limit: number;
           avg_cost_usd: number; price_usd: number; avg_margin_usd: number | null }[];
  top: { id: string; email: string; plan: string; pct: number; spent_usd: number; budget_usd: number; bonus_left_usd: number; cost_window_usd: number }[];
  limit_hits: { day: string; count: number }[];
  thresholds: Record<string, number>;
  engines: Record<string, { turns?: number; cost_usd?: number; cost_per_turn_usd?: number | null; commands?: number; avg_first_audio_s?: number | null }>;
  boards: Record<string, { count: number; retried: number }>;
};

const PLAN_NAMES: Record<string, string> = { pro_trial: "Trial", pro: "Pro", power: "Power" };

/** The hidden dollar budget behind every user's "X% used": per-plan budgets, who's near the limit,
 *  cost against price, and how the new voice engine compares with Gemini Live. */
export default function BudgetPage() {
  const [days, setDays] = useState(30);
  const overview = useQuery({ queryKey: ["ai-budget", days], queryFn: () => api<Overview>(`/admin/ai-budget?days=${days}`) });
  const o = overview.data;
  const hits = o ? o.limit_hits.reduce((a, d) => a + d.count, 0) : 0;
  const atLimit = o?.buckets.find((b) => b.bucket === "at limit")?.users ?? 0;
  const near = o?.buckets.find((b) => b.bucket === "80-100")?.users ?? 0;
  const live = o?.engines.live ?? {};
  const fresh = o?.engines.new ?? {};

  return (
    <div className="space-y-6">
      <PageTitle title="AI budget" subtitle="Each plan's hidden monthly AI budget. People only ever see their percentage of it."
        actions={<RangePicker value={days} onChange={setDays} />} />

      <PlanLimitsCard />

      {overview.isLoading ? <Loading /> : overview.error || !o ? <ErrorBox error={overview.error} /> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="At their limit now" value={fmt.num(atLimit)} tone={atLimit ? "ink" : "plain"} />
            <Stat label="Above 80% now" value={fmt.num(near)} />
            <Stat label={`Limit hits (${days}d)`} value={fmt.num(hits)} />
            <Stat label="Crossed 80% / 100%" value={`${fmt.num(o.thresholds["80"] ?? 0)} / ${fmt.num(o.thresholds["100"] ?? 0)}`} hint={`${days} days`} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
            <Card>
              <CardTitle>How far into their budget</CardTitle>
              <BarList items={o.buckets.map((b) => ({ label: b.bucket === "at limit" ? "At the limit" : `${b.bucket}%`, value: b.users }))} />
              <p className="mt-3 text-[12px] text-faint">People with usage this billing period, on an active trial or plan.</p>
            </Card>
            <Card>
              <CardTitle>Cost against price, per plan</CardTitle>
              <div className="overflow-x-auto">
                <table className="w-full text-[14px]">
                  <thead className="text-left text-[12px] text-muted">
                    <tr><th className="pb-2">Plan</th><th className="pb-2 text-right">People</th><th className="pb-2 text-right">Budget</th>
                      <th className="pb-2 text-right">Avg used</th><th className="pb-2 text-right">At limit</th>
                      <th className="pb-2 text-right">AI cost / person</th><th className="pb-2 text-right">Price</th><th className="pb-2 text-right">Margin / person</th></tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {o.plans.map((p) => (
                      <tr key={p.plan}>
                        <td className="py-2.5"><Pill tone={planTone(p.plan)}>{planLabel(p.plan)}</Pill></td>
                        <td className="py-2.5 text-right tabular">{fmt.num(p.users)}</td>
                        <td className="py-2.5 text-right tabular">{fmt.usd(p.budget_usd, 2)}</td>
                        <td className="py-2.5 text-right tabular">{p.avg_pct == null ? "–" : `${p.avg_pct}%`}</td>
                        <td className="py-2.5 text-right tabular">{fmt.num(p.at_limit)}</td>
                        <td className="py-2.5 text-right tabular">{fmt.usd(p.avg_cost_usd, 2)}</td>
                        <td className="py-2.5 text-right tabular">{p.price_usd ? fmt.usd(p.price_usd) : "free"}</td>
                        <td className={`py-2.5 text-right tabular ${p.avg_margin_usd != null && p.avg_margin_usd < 0 ? "text-red-600" : ""}`}>
                          {p.avg_margin_usd == null ? "–" : fmt.usd(p.avg_margin_usd, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[12px] text-faint">AI cost covers every model call in the range (dictation included); price is the monthly list price.</p>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardTitle>Voice: new engine vs Gemini Live ({days}d)</CardTitle>
              <div className="grid grid-cols-2 gap-4">
                {([["New engine", fresh], ["Gemini Live", live]] as const).map(([label, e]) => (
                  <div key={label} className="rounded-2xl bg-surface p-4">
                    <p className="text-[13px] font-medium">{label}</p>
                    <p className="mt-2 text-[24px] font-semibold tabular">{e.cost_per_turn_usd == null ? "–" : `$${e.cost_per_turn_usd.toFixed(4)}`}</p>
                    <p className="text-[12px] text-muted">per turn · {fmt.num(e.turns ?? 0)} turns · {fmt.usd(e.cost_usd ?? 0, 2)}</p>
                    <p className="mt-2 text-[12px] text-muted">First audio {e.avg_first_audio_s == null ? "–" : `${e.avg_first_audio_s}s`} · {fmt.num(e.commands ?? 0)} commands</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[12px] text-faint">Change who gets the new engine on <Link href="/dashboard/voice" className="underline">Voice engine</Link>.</p>
            </Card>
            <Card>
              <CardTitle>Whiteboard ({days}d)</CardTitle>
              {Object.keys(o.boards).length ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {([["board_drawn", "Drawn"], ["board_edited", "Changed"], ["board_refused", "Refused once"], ["board_closed", "Closed"]] as const).map(([k, label]) => (
                    <div key={k} className="rounded-2xl bg-surface px-4 py-3">
                      <p className="text-[12px] text-muted">{label}</p>
                      <p className="mt-0.5 text-[20px] font-semibold tabular">{fmt.num(o.boards[k]?.count ?? 0)}</p>
                      {k === "board_drawn" && o.boards[k]?.count ? <p className="text-[11px] text-faint">{Math.round((100 * (o.boards[k].retried ?? 0)) / o.boards[k].count)}% needed a retry</p> : null}
                    </div>
                  ))}
                </div>
              ) : <Empty>No boards drawn on the new engine yet.</Empty>}
            </Card>
          </div>

          <Card>
            <CardTitle>Limit hits per day</CardTitle>
            <div className="flex h-28 items-end gap-1">
              {o.limit_hits.map((d) => {
                const max = Math.max(1, ...o.limit_hits.map((x) => x.count));
                return <div key={d.day} title={`${fmt.date(d.day)}: ${d.count}`} className="flex-1 rounded-t bg-ink/80" style={{ height: `${(100 * d.count) / max}%`, minHeight: d.count ? 4 : 1 }} />;
              })}
            </div>
          </Card>

          <Card>
            <CardTitle>Closest to their limit</CardTitle>
            {o.top.length ? (
              <div className="divide-y divide-line">
                {o.top.map((t) => (
                  <Link key={t.id} href={`/dashboard/users/${t.id}`} className="flex items-center gap-4 py-3 text-[14px] hover:bg-surface">
                    <span className="min-w-0 flex-1 truncate font-medium">{t.email}</span>
                    <Pill tone={planTone(t.plan)}>{PLAN_NAMES[t.plan] ?? t.plan}</Pill>
                    <span className="w-40">
                      <span className="block h-2 overflow-hidden rounded-full bg-surface">
                        <span className={`block h-full ${t.pct >= 100 ? "bg-red-500" : t.pct >= 80 ? "bg-peach" : "bg-lime"}`} style={{ width: `${Math.min(100, t.pct)}%` }} />
                      </span>
                    </span>
                    <span className="w-16 text-right tabular font-semibold">{Math.round(t.pct)}%</span>
                    <span className="w-36 text-right text-[12px] text-muted tabular">{fmt.usd(t.spent_usd, 2)} of {fmt.usd(t.budget_usd, 2)}</span>
                  </Link>
                ))}
              </div>
            ) : <Empty>No usage this period yet.</Empty>}
          </Card>
        </>
      )}
    </div>
  );
}

function PlanLimitsCard() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["plan-limits"], queryFn: () => api<PlanLimits>("/admin/plan-limits") });
  const [edit, setEdit] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const save = useMutation({
    mutationFn: ({ slug, usd }: { slug: string; usd: number }) =>
      api<PlanLimits>(`/admin/plan-limits/${slug}`, { method: "PUT", body: JSON.stringify({ usd, reason }) }),
    onSuccess: (data, v) => {
      qc.setQueryData(["plan-limits"], data);
      qc.invalidateQueries({ queryKey: ["ai-budget"] });
      setEdit((e) => { const n = { ...e }; delete n[v.slug]; return n; });
      setReason("");
    },
  });
  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <ErrorBox error={q.error} />;
  return (
    <Card>
      <CardTitle>Plan budgets (per billing period)</CardTitle>
      <div className="grid gap-4 md:grid-cols-3">
        {q.data.plans.map((p) => {
          const value = edit[p.slug] ?? String(p.usd);
          const n = Number(value);
          const changed = value !== String(p.usd) && Number.isFinite(n) && n >= 0 && n <= 1000;
          return (
            <div key={p.slug} className="rounded-2xl bg-surface p-4">
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-semibold">{PLAN_NAMES[p.slug] ?? p.slug}</p>
                {p.usd !== p.default_usd ? <span className="text-[12px] text-muted">default ${p.default_usd}</span> : null}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[20px] text-muted">$</span>
                <input type="number" min={0} max={1000} step={0.5} value={value} aria-label={`${p.slug} budget`}
                  onChange={(e) => setEdit((x) => ({ ...x, [p.slug]: e.target.value }))}
                  className="w-24 rounded-lg border border-line bg-card px-2 py-1.5 text-[20px] font-semibold tabular" />
                <button disabled={!changed || save.isPending} onClick={() => save.mutate({ slug: p.slug, usd: n })}
                  className="ml-auto rounded-full bg-lime px-4 py-1.5 text-[13px] font-semibold text-ink disabled:opacity-40">Save</button>
              </div>
            </div>
          );
        })}
      </div>
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (for the audit log)"
        className="mt-4 w-full rounded-lg border border-line px-3 py-2 text-[14px]" />
      {save.error ? <div className="mt-3"><ErrorBox error={save.error} /></div> : null}
      <p className="mt-3 text-[13px] text-muted">{q.data.note}</p>
    </Card>
  );
}

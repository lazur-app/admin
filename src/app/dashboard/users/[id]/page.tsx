"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, fmt } from "@/lib/api";
import type { UserRow } from "@/lib/types";
import { Card, CardTitle, Delta, Empty, ErrorBox, Loading, PageTitle, Pill, RangePicker, Stat, planLabel, planTone } from "@/components/ui";
import { Adoption, BarList, HealthParts, Heatmap, duration } from "@/components/userCharts";
import { EmailComposer, type Audience } from "@/components/EmailComposer";
import { UserTrends, type DayPoint } from "@/components/userTrends";
import { UserCosts } from "@/components/UserCosts";

type Detail = UserRow & {
  history_storage: string;
  subscription: { plan: string; status: string; source: string | null; interval: string | null; period_end: string | null; cancel_at_period_end: boolean; comp_reason: string | null } | null;
  timeline: { event: string; at: string; properties: Record<string, unknown>; app_version: string | null }[];
  jobs: { status: string; steps: number; has_report: boolean; failure_kind: string | null; cost_usd: number | null; started_at: string; finished_at: string | null }[];
  orders: { amount_usd: number; status: string; reason: string | null; paid_at: string | null; invoice_url: string | null }[];
  cost_30d: { feature: string; calls: number; tokens: number; cost_usd: number }[];
  analytics: Analytics;
  emails: { kind: string; subject: string; status: string; error: string | null; sent_by: string; app_version: string | null; at: string }[];
};

type Analytics = {
  series: DayPoint[];
  hours: { at: string; count: number }[];
  kpis: {
    active_days_30: number; active_days_prev_30: number; days_idle: number | null;
    lifetime_words: number; dictations: number; commands: number; avg_words_per_dictation: number | null;
    minutes_saved: number; minutes_to_first_dictation: number | null; retry_rate_pct: number | null;
    capability_gaps: number; failures: number; limits_hit: number;
    upgrade_cards: number; upgrade_clicks: number; checkouts: number;
    jobs: number; jobs_done: number; jobs_failed: number; avg_job_minutes: number | null;
    lifetime_revenue_usd: number; lifetime_cost_usd: number; lifetime_margin_usd: number; cost_per_active_day_usd: number | null;
  };
  health: { score: number; label: string; parts: Record<string, number>; fail_rate_pct: number };
  adoption: { key: string; label: string; at: string | null }[];
  tools: { tool: string; count: number }[];
};

const HEALTH_TONE: Record<string, "lime" | "sky" | "peach" | "rose" | "gray"> = {
  Healthy: "lime", "Needs attention": "peach", "At risk": "rose", Dormant: "gray",
};

const EVENT_TONE: Record<string, "lime" | "sky" | "peach" | "rose" | "gray"> = {
  subscription_started: "lime", trial_started: "sky", app_activated: "sky", capability_gap: "peach",
  action_failed: "rose", job_failed: "rose", limit_hit: "peach", error_occurred: "rose", command_retried: "peach",
};

export default function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const user = useQuery({ queryKey: ["user", id], queryFn: () => api<Detail>(`/admin/users/${id}`) });
  const [notice, setNotice] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [emailing, setEmailing] = useState<Audience | null>(null);
  const action = useMutation({
    mutationFn: (body: Record<string, unknown>) => api(`/admin/users/${id}/plan`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { setNotice("Saved."); qc.invalidateQueries({ queryKey: ["user", id] }); },
    onError: (e) => setNotice(e instanceof Error ? e.message : "Failed"),
  });

  if (user.isLoading) return <Loading />;
  if (user.error || !user.data) return <ErrorBox error={user.error} />;
  const u = user.data;
  const comp = u.subscription?.source === "admin_comp";

  return (
    <>
      <PageTitle title={u.name || u.email.split("@")[0]}
        subtitle={`${u.email} · joined ${fmt.date(u.created_at)} · last active ${fmt.ago(u.last_active_at)} · ${u.app_version ? `app ${u.app_version}` : "app version unknown"}`}
        actions={
          <div className="flex items-center gap-2">
            <Pill tone={planTone(u.plan)}>{planLabel(u.plan)}</Pill>
            <button type="button" onClick={() => setEmailing({ label: u.name || u.email, userIds: [u.id] })}
              className="rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-white">Email</button>
          </div>
        } />
      <div className="grid gap-5">
        <UserAnalytics u={u} days={days} setDays={setDays} />

        <div className="grid gap-5 xl:grid-cols-[1fr_1.3fr]">
          <Card>
            <CardTitle>Plan</CardTitle>
            {u.subscription ? (
              <dl className="grid grid-cols-2 gap-y-3 text-[14px]">
                <dt className="text-muted">Plan</dt><dd>{planLabel(u.subscription.plan)} {u.subscription.interval ? `· ${u.subscription.interval}ly` : ""}</dd>
                <dt className="text-muted">Source</dt><dd>{u.subscription.source ?? "–"}</dd>
                <dt className="text-muted">Status</dt><dd>{u.subscription.status}{u.subscription.cancel_at_period_end ? " · cancels at period end" : ""}</dd>
                <dt className="text-muted">Period ends</dt><dd>{fmt.date(u.subscription.period_end)}</dd>
                <dt className="text-muted">History</dt><dd>{u.history_storage === "cloud" ? "Synced to cloud" : "On their Mac"}</dd>
              </dl>
            ) : <Empty>No subscription yet. Trial starts when they open the app.</Empty>}
            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={() => action.mutate({ action: "extend_trial", days: 3 })} className="rounded-full bg-sky px-4 py-2 text-[13px] font-medium">+3 days trial</button>
              <button onClick={() => action.mutate({ action: "grant_comp", plan: "pro", reason: "admin" })} className="rounded-full bg-lime px-4 py-2 text-[13px] font-medium">Give Pro free</button>
              <button onClick={() => action.mutate({ action: "grant_comp", plan: "power", reason: "admin" })} className="rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-white">Give Power free</button>
              {comp ? <button onClick={() => action.mutate({ action: "revoke_comp" })} className="rounded-full bg-rose px-4 py-2 text-[13px] font-medium">Remove free plan</button> : null}
            </div>
            {notice ? <p className="mt-3 text-[13px] text-muted">{notice}</p> : null}
          </Card>

          <Card>
            <CardTitle aside={<span className="text-[13px] text-muted">latest first, never content</span>}>Timeline</CardTitle>
            <div className="max-h-[420px] space-y-1 overflow-y-auto pr-1">
              {u.timeline.length ? u.timeline.map((e, i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-surface">
                  <Pill tone={EVENT_TONE[e.event] ?? "gray"}>{e.event.replace(/_/g, " ")}</Pill>
                  <span className="min-w-0 flex-1 truncate text-[12px] text-muted">
                    {Object.entries(e.properties).filter(([, v]) => v !== "" && v != null).slice(0, 4).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`).join(" · ")}
                  </span>
                  <span className="shrink-0 text-[12px] text-faint">{fmt.ago(e.at)}</span>
                </div>
              )) : <Empty>No activity recorded yet.</Empty>}
            </div>
          </Card>
        </div>

        <UserCosts id={id} />

        <BonusActions id={id} />

        <div className="grid gap-5 xl:grid-cols-2">
          <Card>
            <CardTitle>Background jobs</CardTitle>
            {u.jobs.length ? (
              <div className="divide-y divide-line text-[14px]">
                {u.jobs.map((j, i) => (
                  <div key={i} className="flex items-center gap-3 py-2.5">
                    <Pill tone={j.status === "done" ? "lime" : j.status === "failed" ? "rose" : "gray"}>{j.status}</Pill>
                    <span className="text-muted">{j.steps} steps{j.has_report ? " · report" : ""}{j.failure_kind ? ` · ${j.failure_kind.replace(/_/g, " ")}` : ""}</span>
                    <span className="ml-auto text-[12px] text-faint">{fmt.ago(j.started_at)}</span>
                  </div>
                ))}
              </div>
            ) : <Empty>No background jobs.</Empty>}
          </Card>
          <Card>
            <CardTitle>Payments</CardTitle>
            {u.orders.length ? (
              <div className="divide-y divide-line text-[14px]">
                {u.orders.map((o, i) => (
                  <div key={i} className="flex items-center gap-3 py-2.5">
                    <span className="tabular font-semibold">{fmt.usd(o.amount_usd, 2)}</span>
                    <span className="text-muted">{o.reason?.replace(/_/g, " ") ?? o.status}</span>
                    <span className="ml-auto text-[12px] text-faint">{fmt.date(o.paid_at)}</span>
                    {o.invoice_url ? <a href={o.invoice_url} target="_blank" rel="noreferrer" className="text-[12px] text-muted underline">invoice</a> : null}
                  </div>
                ))}
              </div>
            ) : <Empty>No payments.</Empty>}
          </Card>
        </div>

        <Card>
          <CardTitle aside={<span className="text-[13px] text-muted">sent from the admin, newest first</span>}>Emails</CardTitle>
          {u.emails.length ? (
            <div className="divide-y divide-line text-[14px]">
              {u.emails.map((e, i) => (
                <div key={i} className="flex flex-wrap items-center gap-3 py-2.5">
                  <Pill tone={e.status === "sent" ? "lime" : "rose"}>{e.status}</Pill>
                  <span className="min-w-0 flex-1 truncate">{e.subject}</span>
                  {e.error ? <span className="max-w-[40%] truncate text-[12px] text-red-600" title={e.error}>{e.error}</span> : null}
                  <span className="text-[12px] text-faint">{e.app_version ? `on ${e.app_version} · ` : ""}{e.sent_by} · {fmt.ago(e.at)}</span>
                </div>
              ))}
            </div>
          ) : <Empty>No emails sent to this person yet.</Empty>}
        </Card>
      </div>
      {emailing ? <EmailComposer audience={emailing} onClose={() => setEmailing(null)} /> : null}
    </>
  );
}

function UserAnalytics({ u, days, setDays }: { u: Detail; days: number; setDays: (d: number) => void }) {
  const a = u.analytics;
  const k = a.kpis;
  const idle = k.days_idle == null ? "never used" : k.days_idle === 0 ? "used today" : `last used ${k.days_idle}d ago`;
  return (
    <>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Stat tone="ink" label="Health score" value={`${a.health.score}/100`}
          delta={<Pill tone={HEALTH_TONE[a.health.label] ?? "gray"}>{a.health.label}</Pill>} hint={idle} />
        <Stat label="Active days, last 30" value={`${k.active_days_30}/30`}
          delta={<Delta now={k.active_days_30} before={k.active_days_prev_30} />} hint={`${k.active_days_prev_30} in the 30 days before`} />
        <Stat label="Words dictated, all time" value={fmt.num(k.lifetime_words)}
          hint={`${fmt.num(k.dictations)} dictations · ${k.avg_words_per_dictation ?? "–"} words each · ~${duration(k.minutes_saved)} saved vs typing`} />
        <Stat tone="lime" label="Lifetime margin" value={fmt.usd(k.lifetime_margin_usd, 2)}
          hint={`${fmt.usd(k.lifetime_revenue_usd, 2)} paid · ${fmt.usd(k.lifetime_cost_usd, 2)} AI cost${k.cost_per_active_day_usd != null ? ` · ${fmt.usd(k.cost_per_active_day_usd, 2)} per active day` : ""}`} />
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Stat label="AI actions, all time" value={fmt.num(k.commands)}
          hint={`${k.retry_rate_pct ?? 0}% asked again · ${k.capability_gaps} couldn't do · ${k.limits_hit} limits hit`} />
        <Stat label="Time to first dictation" value={duration(k.minutes_to_first_dictation)} hint="from first opening the app" />
        <Stat label="Background jobs" value={`${k.jobs_done}/${k.jobs}`}
          hint={`finished · ${k.jobs_failed} failed${k.avg_job_minutes != null ? ` · ${duration(k.avg_job_minutes)} average` : ""}`} />
        <Stat label="Upgrade intent" value={`${k.upgrade_cards} → ${k.upgrade_clicks} → ${k.checkouts}`} hint="upgrade cards seen → clicked → checkouts started" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight">Usage over time</h2>
          <p className="text-[13px] text-muted">Per day, so usage and cost line up. Hover any chart for exact numbers.</p>
        </div>
        <RangePicker value={days} onChange={setDays} />
      </div>
      <UserTrends series={a.series} hours={a.hours} days={days} />

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardTitle aside={<span className="text-[13px] text-muted">last 90 days</span>}>When they use Lazur</CardTitle>
          <Heatmap hours={a.hours} />
        </Card>
        <Card>
          <CardTitle aside={<Pill tone={HEALTH_TONE[a.health.label] ?? "gray"}>{a.health.label}</Pill>}>Why this health score</CardTitle>
          <HealthParts parts={a.health.parts} failRate={a.health.fail_rate_pct} />
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardTitle>Feature adoption</CardTitle>
          <Adoption steps={a.adoption} />
        </Card>
        <Card>
          <CardTitle aside={<span className="text-[13px] text-muted">last 90 days</span>}>What they ask Lazur to do</CardTitle>
          {a.tools.length
            ? <BarList items={a.tools.map((t) => ({ label: t.tool.replace(/_/g, " "), value: t.count }))} />
            : <Empty>No tool use yet.</Empty>}
        </Card>

      </div>
    </>
  );
}


type Budget = {
  available: boolean; applies?: boolean; plan: string; plan_slug: string;
  pct_used: number; metered: boolean; spent_usd: number; budget_usd: number; plan_budget_usd: number;
  left_usd: number; expires_at?: string | null; used_this_period_usd: number; granted_usd: number; removed_usd: number; used_usd: number;
  period_start: string | null; period_end: string | null; actions_this_period: number;
  history: { id: string; entry: "grant" | "remove"; usd: number; reason: string | null; by: string; at: string }[];
};

const USD_PRESETS = [1, 2, 5, 10];
const PCT_PRESETS = [25, 50, 100, 200];

/** Their AI budget this period (what people see as "X% used") and bonus dollars on top of the plan.
 *  The plan's budget is used first; bonus pays only past it and expires when their plan period ends. */
function BonusActions({ id }: { id: string }) {
  const qc = useQueryClient();
  const bonus = useQuery({ queryKey: ["bonus", id], queryFn: () => api<Budget>(`/admin/users/${id}/bonus`) });
  const [mode, setMode] = useState<"usd" | "pct">("usd");
  const [value, setValue] = useState(5);
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const b = bonus.data;
  const asUsd = (v: number) => (mode === "usd" ? v : ((b?.plan_budget_usd ?? 0) * v) / 100);
  const change = useMutation({
    mutationFn: (sign: 1 | -1) => api<Budget>(`/admin/users/${id}/bonus`, {
      method: "POST",
      body: JSON.stringify({ ...(mode === "usd" ? { usd: sign * value } : { pct_of_plan: sign * value }), reason: reason.trim() }),
    }),
    onSuccess: (data, sign) => {
      qc.setQueryData(["bonus", id], data);
      qc.invalidateQueries({ queryKey: ["user", id] });
      const what = mode === "usd" ? fmt.usd(value, 2) : `${value}% of their plan (${fmt.usd(asUsd(value), 2)})`;
      setNotice({ ok: true, text: sign > 0 ? `Gave ${what} of bonus AI budget.` : `Took back ${what} of unused bonus.` });
      setReason("");
    },
    onError: (e) => setNotice({ ok: false, text: e instanceof Error ? e.message : "Failed" }),
  });
  const max = mode === "usd" ? 500 : 1000;
  const valid = value > 0 && value <= max && reason.trim().length > 0 && (mode === "usd" || (b?.plan_budget_usd ?? 0) > 0);
  const presets = mode === "usd" ? USD_PRESETS : PCT_PRESETS;

  return (
    <Card>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-semibold tracking-tight">AI budget</h2>
          <p className="mt-1 text-[13px] text-muted">What they see as &ldquo;% used&rdquo;. Bonus is dollars on top of their plan: used only after the plan&apos;s budget, and it expires when their current plan period ends.</p>
        </div>
        {b?.available ? <Pill tone={b.left_usd ? "lime" : "gray"}>{fmt.usd(b.left_usd, 2)} bonus left{b.expires_at ? ` · expires ${new Date(b.expires_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}` : ""}</Pill> : null}
      </div>
      {bonus.isLoading ? <Loading /> : bonus.error || !b ? <ErrorBox error={bonus.error} /> : !b.available ? (
        <Empty>Bonus credits need migration 028 on the database.</Empty>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
          <div className="space-y-5">
            <PeriodMeter b={b} />
            <div className="grid grid-cols-3 gap-3">
              <MiniStat label="Bonus given, all time" value={fmt.usd(b.granted_usd, 2)} />
              <MiniStat label="Paid from bonus" value={fmt.usd(b.used_usd, 2)} />
              <MiniStat label="Taken back" value={fmt.usd(b.removed_usd, 2)} />
            </div>
            <p className="text-[12px] text-faint">{fmt.num(b.actions_this_period)} AI actions this period · {b.plan} budget {fmt.usd(b.plan_budget_usd, 2)}/period{b.metered ? "" : " · budget not metered yet (migration 031)"}</p>
            {b.applies === false ? (
              <p className="rounded-2xl bg-peach/30 px-4 py-3 text-[13px]">Their trial or plan isn&apos;t active, so bonus won&apos;t be used until it is.</p>
            ) : null}
          </div>

          <div className="rounded-[22px] bg-surface p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] font-medium">Give bonus AI budget</p>
              <div className="flex rounded-full bg-card p-1 text-[12px] font-semibold">
                {(["usd", "pct"] as const).map((m) => (
                  <button key={m} type="button" onClick={() => { setMode(m); setValue(m === "usd" ? 5 : 100); }}
                    className={`h-7 rounded-full px-3 transition ${mode === m ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>
                    {m === "usd" ? "Dollars" : "% of plan"}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {presets.map((n) => (
                <button key={n} type="button" onClick={() => setValue(n)}
                  className={`h-10 min-w-14 rounded-full px-4 text-[14px] font-semibold tabular transition ${value === n ? "bg-ink text-white" : "bg-card hover:bg-white"}`}>
                  +{mode === "usd" ? `$${n}` : `${n}%`}
                </button>
              ))}
              <div className="flex h-10 items-center rounded-full bg-card px-3">
                <span className="text-[14px] text-muted">{mode === "usd" ? "$" : ""}</span>
                <input type="number" min={0} max={max} step={mode === "usd" ? 0.5 : 5} value={value} aria-label="Amount"
                  onChange={(e) => setValue(Math.min(max, Math.max(0, Number(e.target.value) || 0)))}
                  className="w-16 bg-transparent text-center text-[14px] font-semibold tabular outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                <span className="text-[14px] text-muted">{mode === "pct" ? "%" : ""}</span>
              </div>
            </div>
            {mode === "pct" ? <p className="mt-2 text-[12px] text-muted">= {fmt.usd(asUsd(value), 2)} ({value}% of their {fmt.usd(b.plan_budget_usd, 2)} plan budget)</p> : null}
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300}
              placeholder="Reason (saved with it), e.g. ran out testing background jobs"
              className="mt-3 w-full rounded-2xl bg-card px-4 py-3 text-[14px] outline-none placeholder:text-faint" />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" disabled={!valid || change.isPending} onClick={() => change.mutate(1)}
                className="h-10 rounded-full bg-lime px-5 text-[14px] font-semibold text-lime-ink transition disabled:opacity-40">
                {change.isPending ? "Saving…" : `Give ${fmt.usd(asUsd(value), 2)}`}
              </button>
              <button type="button" disabled={!valid || change.isPending || b.left_usd < asUsd(value)} onClick={() => change.mutate(-1)}
                className="h-10 rounded-full px-4 text-[13px] font-medium text-muted transition hover:bg-card hover:text-ink disabled:opacity-40">
                Take back {fmt.usd(asUsd(value), 2)} unused
              </button>
            </div>
            {!reason.trim() ? <p className="mt-2 text-[12px] text-faint">Add a reason to enable the buttons.</p> : null}
            {notice ? <p className={`mt-2 text-[13px] ${notice.ok ? "text-lime-ink" : "text-red-600"}`}>{notice.text}</p> : null}
          </div>

          <div className="xl:col-span-2">
            <p className="mb-2 text-[13px] font-medium text-muted">History</p>
            {b.history.length ? (
              <div className="max-h-[280px] divide-y divide-line overflow-y-auto rounded-[22px] border border-line pr-1">
                {b.history.map((h) => (
                  <div key={h.id} className="flex items-center gap-4 px-4 py-3 text-[14px]">
                    <span className={`grid h-9 min-w-16 place-items-center rounded-full px-3 text-[13px] font-semibold tabular ${h.entry === "grant" ? "bg-lime text-lime-ink" : "bg-rose/40"}`}>
                      {h.usd > 0 ? `+${fmt.usd(h.usd, 2)}` : `−${fmt.usd(-h.usd, 2)}`}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium" title={h.reason ?? ""}>{h.reason || "No reason given"}</span>
                      <span className="block text-[12px] text-faint">{h.entry === "grant" ? "Given" : "Taken back"} by {h.by}</span>
                    </span>
                    <span className="shrink-0 text-[12px] text-muted">{fmt.date(h.at)} · {fmt.ago(h.at)}</span>
                  </div>
                ))}
              </div>
            ) : <Empty>No bonus given yet.</Empty>}
          </div>
        </div>
      )}
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface px-4 py-3">
      <p className="text-[12px] text-muted">{label}</p>
      <p className="mt-0.5 text-[20px] font-semibold tracking-tight tabular">{value}</p>
    </div>
  );
}

/** This billing period as one bar: plan budget spent, bonus spent, bonus still available. */
function PeriodMeter({ b }: { b: Budget }) {
  const total = Math.max(0.0001, b.budget_usd, b.spent_usd);
  const planSpent = Math.min(b.plan_budget_usd, b.spent_usd - b.used_this_period_usd);
  const planLeft = Math.max(0, b.plan_budget_usd - planSpent);
  const pct = (n: number) => `${(100 * Math.max(0, n)) / total}%`;
  return (
    <div className="rounded-[22px] bg-ink p-5 text-white">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[12px] text-white/50">This period{b.period_end ? ` · resets ${fmt.date(b.period_end)}` : ""}</p>
          <p className="mt-1 text-[34px] font-semibold leading-none tracking-tight tabular">
            {Math.round(b.pct_used)}%<span className="text-[18px] text-white/40"> used</span>
          </p>
        </div>
        <p className="text-right text-[13px] text-white/60"><b className="text-white">{fmt.usd(b.spent_usd, 2)}</b> of {fmt.usd(b.budget_usd, 2)}</p>
      </div>
      <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-white/10">
        <span className="h-full bg-white" style={{ width: pct(planSpent) }} />
        <span className="h-full bg-white/25" style={{ width: pct(planLeft) }} />
        <span className="h-full bg-lime" style={{ width: pct(b.used_this_period_usd) }} />
        <span className="h-full bg-lime/35" style={{ width: pct(b.left_usd) }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-white/60">
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-white" />Plan {fmt.usd(planSpent, 2)} of {fmt.usd(b.plan_budget_usd, 2)}</span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-lime" />Bonus used {fmt.usd(b.used_this_period_usd, 2)}</span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-lime/35" />Bonus left {fmt.usd(b.left_usd, 2)}</span>
      </div>
    </div>
  );
}

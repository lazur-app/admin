"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, fmt } from "@/lib/api";
import type { UserRow } from "@/lib/types";
import { Bars, Card, CardTitle, Delta, Empty, ErrorBox, Loading, PageTitle, Pill, RangePicker, Stat, planLabel, planTone } from "@/components/ui";
import { Adoption, BarList, HealthParts, Heatmap, duration } from "@/components/userCharts";
import { EmailComposer, type Audience } from "@/components/EmailComposer";

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
  series: { date: string; words: number; dictations: number; actions: number; jobs: number; cost_usd: number }[];
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
  const range = a.series.slice(-days);
  const day = (d: string) => fmt.date(`${d}T00:00:00`);
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

      <Card>
        <CardTitle aside={<RangePicker value={days} onChange={setDays} />}>Usage over time</CardTitle>
        <div className="grid gap-8 xl:grid-cols-3">
          <div>
            <p className="mb-3 text-[13px] text-muted">Words dictated per day · {fmt.num(range.reduce((n, d) => n + d.words, 0))} total</p>
            <Bars height={120} data={range.map((d) => ({ label: day(d.date), value: d.words }))} />
          </div>
          <div>
            <p className="mb-3 text-[13px] text-muted">AI actions per day · {fmt.num(range.reduce((n, d) => n + d.actions, 0))} total</p>
            <Bars height={120} data={range.map((d) => ({ label: day(d.date), value: d.actions }))} />
          </div>
          <div>
            <p className="mb-3 text-[13px] text-muted">AI cost per day · {fmt.usd(range.reduce((n, d) => n + d.cost_usd, 0), 2)} total</p>
            <Bars height={120} format={(n) => fmt.usd(n, 3)} data={range.map((d) => ({ label: day(d.date), value: d.cost_usd }))} />
          </div>
        </div>
      </Card>

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

      <div className="grid gap-5 xl:grid-cols-3">
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
        <Card>
          <CardTitle aside={<span className="text-[13px] text-muted">last 30 days</span>}>AI cost by feature</CardTitle>
          {u.cost_30d.length
            ? <BarList format={(n) => fmt.usd(n, 3)} items={[...u.cost_30d].sort((x, y) => y.cost_usd - x.cost_usd).map((c) => ({ label: `${c.feature.replace(/_/g, " ")} · ${fmt.num(c.calls)} calls`, value: c.cost_usd }))} />
            : <Empty>No model calls.</Empty>}
        </Card>
      </div>
    </>
  );
}


type Bonus = {
  available: boolean; applies?: boolean; balance: number; granted: number; removed: number; used: number;
  plan: string; plan_limit: number; used_this_period: number; limit_with_bonus: number; bonus_used_this_period: number;
  period_start: string | null; period_end: string | null;
  history: { id: string; entry: "grant" | "remove"; amount: number; reason: string | null; by: string; at: string }[];
};

const BONUS_PRESETS = [20, 50, 100];

/** Extra AI actions on top of the plan. Plan actions are used first; bonus never expires. */
function BonusActions({ id }: { id: string }) {
  const qc = useQueryClient();
  const bonus = useQuery({ queryKey: ["bonus", id], queryFn: () => api<Bonus>(`/admin/users/${id}/bonus`) });
  const [amount, setAmount] = useState(50);
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const change = useMutation({
    mutationFn: (delta: number) => api<Bonus>(`/admin/users/${id}/bonus`, { method: "POST", body: JSON.stringify({ amount: delta, reason: reason.trim() }) }),
    onSuccess: (data, delta) => {
      qc.setQueryData(["bonus", id], data);
      qc.invalidateQueries({ queryKey: ["user", id] });
      setNotice(delta > 0 ? `Gave ${delta} bonus AI actions.` : `Removed ${-delta} bonus AI actions.`);
      setReason("");
    },
    onError: (e) => setNotice(e instanceof Error ? e.message : "Failed"),
  });

  const b = bonus.data;
  const valid = amount >= 1 && amount <= 5000 && reason.trim().length > 0;
  const field = "rounded-2xl bg-surface px-4 py-2.5 text-[14px] outline-none placeholder:text-faint";

  return (
    <Card>
      <CardTitle aside={<span className="text-[13px] text-muted">used after the plan runs out · never expire</span>}>Bonus AI actions</CardTitle>
      {bonus.isLoading ? <Loading /> : bonus.error || !b ? <ErrorBox error={bonus.error} /> : !b.available ? (
        <Empty>Bonus credits need migration 028 on the database.</Empty>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
          <div>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="This period" value={`${fmt.num(b.used_this_period)} / ${fmt.num(b.limit_with_bonus)}`}
                hint={`${fmt.num(b.plan_limit)} plan${b.bonus_used_this_period ? ` · ${fmt.num(b.bonus_used_this_period)} from bonus` : ""}`} />
              <Stat label="Bonus left" value={fmt.num(b.balance)} tone={b.balance ? "lime" : "plain"} />
              <Stat label="Bonus used" value={fmt.num(b.used)} hint={`of ${fmt.num(b.granted)} given`} />
            </div>
            {b.applies === false ? <p className="mt-3 text-[13px] text-muted">Their trial or plan isn&apos;t active, so bonus actions won&apos;t be used until it is.</p> : null}

            <div className="mt-5 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {BONUS_PRESETS.map((n) => (
                  <button key={n} type="button" onClick={() => setAmount(n)}
                    className={`rounded-full px-4 py-2 text-[13px] font-medium ${amount === n ? "bg-ink text-white" : "bg-surface"}`}>+{n}</button>
                ))}
                <input type="number" min={1} max={5000} value={amount} onChange={(e) => setAmount(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                  className={`${field} w-28 tabular`} aria-label="Amount" />
              </div>
              <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300}
                placeholder="Why (saved with the grant), e.g. ran out testing background jobs" className={`${field} w-full`} />
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={!valid || change.isPending} onClick={() => change.mutate(amount)}
                  className="rounded-full bg-lime px-4 py-2 text-[13px] font-medium disabled:opacity-40">Give {amount || ""} AI actions</button>
                <button type="button" disabled={!valid || change.isPending || b.balance < 1} onClick={() => change.mutate(-Math.min(amount, b.balance))}
                  className="rounded-full bg-surface px-4 py-2 text-[13px] font-medium disabled:opacity-40">Remove {Math.min(amount, b.balance) || ""} unused</button>
              </div>
              {notice ? <p className="text-[13px] text-muted">{notice}</p> : null}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-muted">History</p>
            {b.history.length ? (
              <div className="max-h-[300px] divide-y divide-line overflow-y-auto pr-1 text-[14px]">
                {b.history.map((h) => (
                  <div key={h.id} className="flex items-center gap-3 py-2.5">
                    <Pill tone={h.entry === "grant" ? "lime" : "rose"}>{h.amount > 0 ? `+${h.amount}` : h.amount}</Pill>
                    <span className="min-w-0 flex-1 truncate" title={h.reason ?? ""}>{h.reason || "–"}</span>
                    <span className="shrink-0 text-[12px] text-faint">{h.by} · {fmt.date(h.at)}</span>
                  </div>
                ))}
              </div>
            ) : <Empty>No bonus AI actions given yet.</Empty>}
          </div>
        </div>
      )}
    </Card>
  );
}

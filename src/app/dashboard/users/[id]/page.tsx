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
              <button onClick={() => action.mutate({ action: "extend_trial", days: 7 })} className="rounded-full bg-sky px-4 py-2 text-[13px] font-medium">+7 days trial</button>
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

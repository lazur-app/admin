"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, fmt } from "@/lib/api";
import type { UserRow } from "@/lib/types";
import { Card, CardTitle, Empty, ErrorBox, Loading, PageTitle, Pill, Stat, planLabel, planTone } from "@/components/ui";

type Detail = UserRow & {
  history_storage: string;
  subscription: { plan: string; status: string; source: string | null; interval: string | null; period_end: string | null; cancel_at_period_end: boolean; comp_reason: string | null } | null;
  timeline: { event: string; at: string; properties: Record<string, unknown>; app_version: string | null }[];
  jobs: { status: string; steps: number; has_report: boolean; failure_kind: string | null; cost_usd: number | null; started_at: string; finished_at: string | null }[];
  orders: { amount_usd: number; status: string; reason: string | null; paid_at: string | null; invoice_url: string | null }[];
  cost_30d: { feature: string; calls: number; tokens: number; cost_usd: number }[];
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
      <PageTitle title={u.name || u.email.split("@")[0]} subtitle={`${u.email} · joined ${fmt.date(u.created_at)} · last active ${fmt.ago(u.last_active_at)}`}
        actions={<Pill tone={planTone(u.plan)}>{planLabel(u.plan)}</Pill>} />
      <div className="grid gap-5">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Stat tone="lime" label="Words this month" value={fmt.num(u.words_mtd)} />
          <Stat label="AI actions this month" value={fmt.num(u.actions_mtd)} />
          <Stat label="AI cost, 30 days" value={fmt.usd(u.cost_30d_usd, 2)} hint={u.cost_30d.map((c) => `${c.feature} ${fmt.usd(c.cost_usd, 2)}`).join(" · ") || "no model calls"} />
          <Stat tone="ink" label="Background jobs" value={fmt.num(u.jobs.length)} hint={`${u.jobs.filter((j) => j.status === "failed").length} failed`} />
        </div>

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
      </div>
    </>
  );
}

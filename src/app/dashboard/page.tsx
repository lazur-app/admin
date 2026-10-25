"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, fmt } from "@/lib/api";
import type { FunnelStep, Overview } from "@/lib/types";
import { Bars, Card, CardTitle, Delta, ErrorBox, Loading, PageTitle, Pill, RangePicker, Ring, Stat } from "@/components/ui";

const EVENT_LABEL: Record<string, string> = {
  signed_up: "Signed up", app_activated: "Opened the app", trial_started: "Trial started",
  subscription_started: "Subscribed", subscription_canceled: "Canceled", trial_expired: "Trial ended",
};
const EVENT_TONE: Record<string, "lime" | "sky" | "peach" | "rose" | "gray"> = {
  subscription_started: "lime", trial_started: "sky", app_activated: "sky", signed_up: "gray", subscription_canceled: "rose", trial_expired: "peach",
};

export default function OverviewPage() {
  const [days, setDays] = useState(30);
  const overview = useQuery({ queryKey: ["overview", days], queryFn: () => api<Overview>(`/admin/overview?days=${days}`) });
  const funnel = useQuery({ queryKey: ["funnel", days], queryFn: () => api<{ steps: FunnelStep[] }>(`/admin/funnel?days=${days}`) });

  return (
    <>
      <PageTitle title="Overview" subtitle={`Last ${days} days, compared with the ${days} before.`} actions={<RangePicker value={days} onChange={setDays} />} />
      {overview.isLoading ? <Loading /> : overview.error ? <ErrorBox error={overview.error} /> : overview.data ? <Body o={overview.data} funnel={funnel.data?.steps ?? []} /> : null}
    </>
  );
}

function Body({ o, funnel }: { o: Overview; funnel: FunnelStep[] }) {
  const c = o.current, p = o.previous;
  const mix = o.plan_mix;
  return (
    <div className="grid gap-5">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Stat tone="lime" label="Monthly recurring revenue" value={fmt.usd(o.mrr.mrr_usd)} hint={`${o.mrr.paying} subscribers${o.mrr.discounted ? ` (${o.mrr.discounted} on 100% discount)` : ""} · ${fmt.usd(c.revenue_usd)} collected in range`} />
        <Stat label="New signups" value={fmt.num(c.signups)} delta={<Delta now={c.signups} before={p.signups} />} hint={`${fmt.num(c.activations)} of them opened the app`} />
        <Stat label="Active users" value={fmt.num(c.active_users)} delta={<Delta now={c.active_users} before={p.active_users} />} hint="used Lazur at least once" />
        <Stat tone="ink" label="Conversions" value={fmt.num(c.conversions)} delta={<Delta now={c.conversions} before={p.conversions} />}
          hint={`${fmt.num(c.cancellations)} canceled · trial→paid ${fmt.pct(o.trial_to_paid_pct)}`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardTitle aside={<span className="text-[13px] text-muted">daily</span>}>Active users</CardTitle>
          <Bars data={o.series.map((d) => ({ label: fmt.date(d.date), value: d.active_users }))} />
        </Card>
        <Card className="flex flex-col">
          <CardTitle>Where everyone is</CardTitle>
          <div className="flex flex-1 items-center gap-6">
            <Ring pct={mix.total ? Math.round(100 * (mix.pro + mix.power) / mix.total) : 0} label={`${mix.total ? Math.round(100 * (mix.pro + mix.power) / mix.total) : 0}%`} sub="paying" />
            <ul className="flex-1 space-y-2.5 text-[14px]">
              {[["Power", mix.power, "ink"], ["Pro", mix.pro, "lime"], ["On trial", mix.trial, "sky"], ["Trial not started", mix.not_started, "gray"], ["Trial ended, unpaid", mix.lapsed, "peach"]].map(([l, n, t]) => (
                <li key={l as string} className="flex items-center justify-between gap-3">
                  <Pill tone={t as "ink"}>{l as string}</Pill>
                  <span className="tabular font-semibold">{n as number}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardTitle aside={<span className="text-[13px] text-muted">people who signed up in range</span>}>Funnel</CardTitle>
          <div className="space-y-3">
            {funnel.map((s, i) => (
              <div key={s.step} className="grid grid-cols-[150px_1fr_60px] items-center gap-3 text-[14px]">
                <span className="text-muted">{s.step}</span>
                <div className="h-9 overflow-hidden rounded-full bg-surface">
                  <div className={`h-full rounded-full ${i === funnel.length - 1 ? "bg-lime" : "bg-sky"}`} style={{ width: `${Math.max(2, s.pct ?? 0)}%` }} />
                </div>
                <span className="tabular text-right font-semibold">{s.users}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardTitle aside={<Link href="/dashboard/users" className="text-[13px] text-muted hover:text-ink">All users →</Link>}>Recent activity</CardTitle>
          <div className="divide-y divide-line">
            {o.recent.length ? o.recent.map((r, i) => (
              <Link key={i} href={`/dashboard/users/${r.user_id}`} className="flex items-center gap-3 py-3 hover:opacity-80">
                <Pill tone={EVENT_TONE[r.event] ?? "gray"}>{EVENT_LABEL[r.event] ?? r.event}</Pill>
                <span className="min-w-0 flex-1 truncate text-[14px]">{r.name || r.email}</span>
                <span className="shrink-0 text-[12px] text-muted">{fmt.ago(r.at)}</span>
              </Link>
            )) : <p className="py-6 text-center text-[13px] text-muted">Nothing yet in this range.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}

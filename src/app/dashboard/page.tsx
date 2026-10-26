"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, fmt } from "@/lib/api";
import { usersHref } from "@/lib/segments";
import type { FunnelStep, Overview, UserRow } from "@/lib/types";
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
      {overview.isLoading ? <Loading /> : overview.error ? <ErrorBox error={overview.error} /> : overview.data ? <Body o={overview.data} days={days} funnel={funnel.data?.steps ?? []} /> : null}
    </>
  );
}

function Body({ o, days, funnel }: { o: Overview; days: number; funnel: FunnelStep[] }) {
  const c = o.current, p = o.previous;
  const mix = o.plan_mix;
  const [pickedDay, setPickedDay] = useState<number | null>(null);
  const chart = useRef<HTMLDivElement>(null);

  // Close the day popover on a click elsewhere or Escape.
  useEffect(() => {
    if (pickedDay === null) return;
    const onDown = (e: MouseEvent) => {
      if (!chart.current?.contains(e.target as Node)) setPickedDay(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPickedDay(null);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [pickedDay]);
  const picked = pickedDay === null ? null : o.series[pickedDay];
  return (
    <div className="grid gap-5">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Stat tone="lime" href={usersHref("paying")} label="Monthly recurring revenue" value={fmt.usd(o.mrr.mrr_usd)} hint={`${o.mrr.paying} subscribers${o.mrr.discounted ? ` (${o.mrr.discounted} on 100% discount)` : ""} · ${fmt.usd(c.revenue_usd)} collected in range`} />
        <Stat href={usersHref("signed_up", { days })} label="New signups" value={fmt.num(c.signups)} delta={<Delta now={c.signups} before={p.signups} />} hint={`${fmt.num(c.activations)} of them opened the app`} />
        <Stat href={usersHref("active", { days })} label="Active users" value={fmt.num(c.active_users)} delta={<Delta now={c.active_users} before={p.active_users} />} hint="used Lazur at least once" />
        <Stat tone="ink" href={usersHref("converted", { days })} label="Conversions" value={fmt.num(c.conversions)} delta={<Delta now={c.conversions} before={p.conversions} />}
          hint={`${fmt.num(c.cancellations)} canceled · trial→paid ${fmt.pct(o.trial_to_paid_pct)}`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardTitle aside={<span className="text-[13px] text-muted">daily · click a day to see who</span>}>Active users</CardTitle>
          <div ref={chart}>
            <Bars data={o.series.map((d) => ({ label: fmt.date(d.date), value: d.active_users }))}
              onPick={(i) => setPickedDay((cur) => (cur === i ? null : i))} picked={pickedDay}
              popover={picked ? <DayUsers date={picked.date} count={picked.active_users} /> : null} />
          </div>
        </Card>
        <Card className="flex flex-col">
          <CardTitle>Where everyone is</CardTitle>
          <div className="flex flex-1 items-center gap-6">
            <Ring pct={mix.total ? Math.round(100 * (mix.pro + mix.power) / mix.total) : 0} label={`${mix.total ? Math.round(100 * (mix.pro + mix.power) / mix.total) : 0}%`} sub="paying" />
            <ul className="flex-1 space-y-2.5 text-[14px]">
              {([["Power", mix.power, "ink", "power"], ["Pro", mix.pro, "lime", "pro"], ["On trial", mix.trial, "sky", "trial"],
                ["Trial not started", mix.not_started, "gray", "not_started"], ["Trial ended, unpaid", mix.lapsed, "peach", "lapsed"]] as const).map(([l, n, t, seg]) => (
                <li key={l}>
                  <Link href={usersHref(seg)} className="-mx-2 flex items-center justify-between gap-3 rounded-full px-2 py-0.5 hover:bg-surface">
                    <Pill tone={t}>{l}</Pill>
                    <span className="tabular font-semibold">{n}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardTitle aside={<span className="text-[13px] text-muted">people who signed up in range · click a step</span>}>Funnel</CardTitle>
          <div className="space-y-1">
            {funnel.map((s, i) => (
              <Link key={s.step} href={usersHref(s.segment, { days })}
                className="group -mx-2 grid grid-cols-[150px_1fr_60px] items-center gap-3 rounded-2xl px-2 py-1 text-[14px] hover:bg-surface/70">
                <span className="text-muted group-hover:text-ink">{s.step}</span>
                <div className="h-9 overflow-hidden rounded-full bg-surface">
                  <div className={`h-full rounded-full ${i === funnel.length - 1 ? "bg-lime" : "bg-sky"}`} style={{ width: `${Math.max(2, s.pct ?? 0)}%` }} />
                </div>
                <span className="tabular text-right font-semibold">{s.users} <span className="text-muted opacity-0 group-hover:opacity-100">→</span></span>
              </Link>
            ))}
          </div>
          <p className="mt-4 text-[12px] text-muted">
            The funnel follows new signups only. Everyone in range:{" "}
            <Link href={usersHref("active", { days })} className="font-medium text-ink hover:underline">active</Link> ·{" "}
            <Link href={usersHref("jobs", { days })} className="font-medium text-ink hover:underline">ran a job</Link> ·{" "}
            <Link href={usersHref("converted", { days })} className="font-medium text-ink hover:underline">subscribed</Link>
          </p>
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

/** Who was active on one (UTC) day: the first few, with a link to the full list. */
function DayUsers({ date, count }: { date: string; count: number }) {
  const shown = 6;
  const users = useQuery({
    queryKey: ["day-users", date],
    queryFn: () => api<{ total: number; items: UserRow[] }>(`/admin/users?segment=active&from=${date}&to=${date}&limit=${shown}`),
  });
  const total = users.data?.total ?? count;
  return (
    <div className="w-[280px] rounded-2xl bg-ink p-4 text-left text-white shadow-[0_12px_32px_rgba(0,0,0,0.25)]">
      <p className="text-[12px] text-white/60">{fmt.date(`${date}T00:00:00Z`)} · {total} active {total === 1 ? "user" : "users"}</p>
      <div className="mt-2 space-y-0.5">
        {users.isLoading ? <p className="py-2 text-[13px] text-white/50">Loading…</p>
          : users.error ? <p className="py-2 text-[13px] text-rose">Couldn&apos;t load them.</p>
          : users.data?.items.map((u) => (
            <Link key={u.id} href={`/dashboard/users/${u.id}`} className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-white/10">
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium">{u.name || u.email.split("@")[0]}</span>
                <span className="block truncate text-[11px] text-white/50">{u.email}</span>
              </span>
              <span className="shrink-0 text-[11px] text-white/50">{fmt.ago(u.last_active_at)}</span>
            </Link>
          ))}
      </div>
      <Link href={usersHref("active", { from: date })} className="mt-2 block text-[12px] font-medium text-lime hover:underline">
        {total > shown ? `See all ${total} →` : "Open in Users →"}
      </Link>
    </div>
  );
}

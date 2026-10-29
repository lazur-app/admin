"use client";

import type { ReactNode } from "react";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { fmt } from "@/lib/api";

/** One day of a person's usage, from /admin/users/{id} analytics.series. */
export type DayPoint = {
  date: string; words: number; dictations: number; actions: number; jobs: number; cost_usd: number;
  failures?: number; gaps?: number; retries?: number; limits?: number;
};

// One colour per measure, the same on every chart.
export const C = {
  actions: "#2563eb", jobs: "#7c3aed", cost: "#ea580c", words: "#0d9488", dictations: "#5eb8ae",
  failures: "#e11d48", gaps: "#f59e0b", retries: "#a855f7", limits: "#64748b", ink: "#121316",
};

type Series = { key: string; label: string; color: string; right?: boolean; dashed?: boolean; format?: (n: number) => string };

const usd = (n: number) => fmt.usd(n, n && n < 0.1 ? 3 : 2);
const day = (d: string) => fmt.date(`${d}T00:00:00`);
const axis = { fontSize: 11, fill: "#a7abb1" };

function Legend({ series, totals }: { series: Series[]; totals?: Record<string, string> }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-muted">
      {series.map((s) => (
        <span key={s.key} className="flex items-center gap-1.5">
          <span className="h-[3px] w-4 rounded-full" style={{ background: s.color, opacity: s.dashed ? 0.7 : 1 }} />
          {s.label}{totals?.[s.key] ? <b className="font-semibold text-ink">{totals[s.key]}</b> : null}
        </span>
      ))}
    </div>
  );
}

function Tip({ active, payload, label, series, labelFormat }: {
  active?: boolean; payload?: { dataKey: string; value: number | null }[]; label?: string; series: Series[]; labelFormat: (l: string) => string;
}) {
  if (!active || !payload?.length || label == null) return null;
  return (
    <div className="rounded-2xl bg-ink px-3.5 py-2.5 text-[12px] text-white shadow-lg">
      <p className="mb-1 font-medium text-white/60">{labelFormat(label)}</p>
      {series.map((s) => {
        const v = payload.find((p) => p.dataKey === s.key)?.value;
        return (
          <p key={s.key} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            <span className="text-white/70">{s.label}</span>
            <b className="ml-auto pl-4 font-semibold tabular">{v == null ? "–" : (s.format ?? fmt.num)(v)}</b>
          </p>
        );
      })}
    </div>
  );
}

/** Plain line chart: one or two y-axes, dates along the bottom, values on hover. */
export function TrendChart({ data, series, height = 220, xKey = "date", xFormat = day, totals }: {
  data: Record<string, unknown>[]; series: Series[]; height?: number; xKey?: string; xFormat?: (v: string) => string;
  totals?: Record<string, string>;
}) {
  const hasRight = series.some((s) => s.right);
  const fmtLeft = series.find((s) => !s.right)?.format ?? fmt.num;
  const fmtRight = series.find((s) => s.right)?.format ?? fmt.num;
  return (
    <div>
      <Legend series={series} totals={totals} />
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: hasRight ? 0 : 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#eef0f2" />
            <XAxis dataKey={xKey} tickFormatter={xFormat} tick={axis} tickLine={false} axisLine={false} minTickGap={28} />
            <YAxis yAxisId="l" tick={axis} tickLine={false} axisLine={false} width={52} allowDecimals={!!series.find((x) => !x.right)?.format}
              tickFormatter={(n: number) => fmtLeft(n)} />
            {hasRight ? (
              <YAxis yAxisId="r" orientation="right" tick={axis} tickLine={false} axisLine={false} width={52}
                tickFormatter={(n: number) => fmtRight(n)} />
            ) : null}
            <Tooltip cursor={{ stroke: "#d5d8dc", strokeDasharray: "3 3" }}
              content={<Tip series={series} labelFormat={xFormat} />} />
            {series.map((s) => (
              <Line key={s.key} yAxisId={s.right ? "r" : "l"} type="monotone" dataKey={s.key} stroke={s.color}
                strokeWidth={2.25} strokeDasharray={s.dashed ? "5 4" : undefined} dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }} connectNulls={false} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function SimpleBars({ data, xKey, yKey, label, color, height = 180, xFormat = (v: string) => v, format = fmt.num }: {
  data: Record<string, unknown>[]; xKey: string; yKey: string; label: string; color: string; height?: number;
  xFormat?: (v: string) => string; format?: (n: number) => string;
}) {
  const series = [{ key: yKey, label, color, format }];
  return (
    <div>
      <Legend series={series} />
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#eef0f2" />
            <XAxis dataKey={xKey} tickFormatter={xFormat} tick={axis} tickLine={false} axisLine={false} minTickGap={8} />
            <YAxis tick={axis} tickLine={false} axisLine={false} width={44} allowDecimals={false} />
            <Tooltip cursor={{ fill: "#f6f7f8" }} content={<Tip series={series} labelFormat={xFormat} />} />
            <Bar dataKey={yKey} fill={color} radius={[6, 6, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Panel({ title, note, children }: { title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-[28px] bg-card p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[17px] font-semibold tracking-tight">{title}</h3>
        {note ? <span className="text-[12px] text-muted">{note}</span> : null}
      </div>
      {children}
    </section>
  );
}

function Chip({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-2xl bg-surface px-4 py-3">
      <p className="flex items-center gap-1.5 text-[12px] text-muted">
        {color ? <span className="h-2 w-2 rounded-full" style={{ background: color }} /> : null}{label}
      </p>
      <p className="mt-1 text-[20px] font-semibold tracking-tight tabular">{value}</p>
    </div>
  );
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hour = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "am" : "pm"}`;

/** Everything over time for one person: usage against cost, dictation, totals, efficiency, problems, rhythm. */
export function UserTrends({ series, hours, days }: { series: DayPoint[]; hours: { at: string; count: number }[]; days: number }) {
  const range = series.slice(-days);
  const sum = (k: keyof DayPoint) => range.reduce((n, d) => n + (Number(d[k]) || 0), 0);
  const actions = sum("actions"), cost = sum("cost_usd"), words = sum("words"), jobs = sum("jobs");
  const activeDays = range.filter((d) => d.actions || d.dictations || d.jobs).length;

  const running: { date: string; actions: number; cost_usd: number }[] = [];
  for (const d of range) {
    const prev = running.at(-1) ?? { actions: 0, cost_usd: 0 };
    running.push({ date: d.date, actions: prev.actions + d.actions + d.jobs, cost_usd: Number((prev.cost_usd + d.cost_usd).toFixed(4)) });
  }
  const perAction = range.map((d) => ({ date: d.date, per_action: d.actions + d.jobs ? Number((d.cost_usd / (d.actions + d.jobs)).toFixed(4)) : null }));

  // Weeks (Mon start) with how many days they used Lazur.
  const weeks = new Map<string, number>();
  for (const d of range) {
    const at = new Date(`${d.date}T00:00:00`);
    at.setDate(at.getDate() - ((at.getDay() + 6) % 7));
    const key = at.toISOString().slice(0, 10);
    weeks.set(key, (weeks.get(key) ?? 0) + (d.actions || d.dictations || d.jobs ? 1 : 0));
  }
  const weekly = [...weeks].map(([date, n]) => ({ date, active: n }));

  // Rhythm, in the viewer's time zone (hours covers the last 90 days).
  const byHour = Array.from({ length: 24 }, (_, h) => ({ hour: String(h), uses: 0 }));
  const byWeekday = WEEKDAYS.map((w) => ({ day: w, uses: 0 }));
  for (const h of hours) {
    const at = new Date(h.at);
    byHour[at.getHours()].uses += h.count;
    byWeekday[(at.getDay() + 6) % 7].uses += h.count;
  }
  const problems = sum("failures") + sum("gaps") + sum("retries") + sum("limits");

  return (
    <div className="grid gap-5">
      <Panel title="Usage vs AI cost" note={`last ${days} days · hover a day for details`}>
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          <Chip label="AI actions" value={fmt.num(actions)} color={C.actions} />
          <Chip label="Background jobs" value={fmt.num(jobs)} color={C.jobs} />
          <Chip label="AI cost" value={usd(cost)} color={C.cost} />
          <Chip label="Cost per action" value={actions + jobs ? usd(cost / (actions + jobs)) : "–"} />
          <Chip label="Active days" value={`${activeDays}/${range.length}`} />
        </div>
        <TrendChart data={range} height={260} series={[
          { key: "actions", label: "AI actions", color: C.actions },
          { key: "jobs", label: "Background jobs", color: C.jobs },
          { key: "cost_usd", label: "AI cost ($, right axis)", color: C.cost, right: true, dashed: true, format: usd },
        ]} />
      </Panel>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Dictation" note={`${fmt.num(words)} words`}>
          <TrendChart data={range} series={[
            { key: "words", label: "Words per day", color: C.words },
            { key: "dictations", label: "Dictations (right axis)", color: C.dictations, right: true, dashed: true },
          ]} />
        </Panel>
        <Panel title="Running totals" note="how cost grows with use">
          <TrendChart data={running} series={[
            { key: "actions", label: "AI actions + jobs so far", color: C.actions },
            { key: "cost_usd", label: "AI cost so far (right axis)", color: C.cost, right: true, dashed: true, format: usd },
          ]} />
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Cost per AI action" note="days with no actions are left blank">
          <TrendChart data={perAction} series={[{ key: "per_action", label: "AI cost ÷ (actions + jobs)", color: C.cost, format: usd }]} />
        </Panel>
        <Panel title="Problems per day" note={problems ? `${fmt.num(problems)} in this range` : "none in this range"}>
          <TrendChart data={range} series={[
            { key: "failures", label: "Failed", color: C.failures },
            { key: "gaps", label: "Couldn't do", color: C.gaps },
            { key: "retries", label: "Asked again", color: C.retries },
            { key: "limits", label: "Hit a limit", color: C.limits },
          ]} />
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel title="Active days per week" note="out of 7">
          <SimpleBars data={weekly} xKey="date" yKey="active" label="Days used" color={C.ink} xFormat={(d) => `wk ${day(d)}`} />
        </Panel>
        <Panel title="Time of day" note="last 90 days · your time zone">
          <TrendChart data={byHour} xKey="hour" height={180} xFormat={(h) => hour(Number(h))}
            series={[{ key: "uses", label: "Uses by hour", color: C.actions }]} />
        </Panel>
        <Panel title="Day of week" note="last 90 days">
          <SimpleBars data={byWeekday} xKey="day" yKey="uses" label="Uses" color={C.words} />
        </Panel>
      </div>
    </div>
  );
}

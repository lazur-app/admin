"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmt } from "@/lib/api";

type Series = { key: string; label: string; color: string };

const axis = { fontSize: 11, fill: "#a7abb1" };
const day = (d: string) => fmt.date(`${d}T00:00:00`);

function Legend({ series }: { series: Series[] }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-muted">
      {series.map((s) => (
        <span key={s.key} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: s.color }} />{s.label}
        </span>
      ))}
    </div>
  );
}

function Tip({ active, payload, label, series, total }: {
  active?: boolean; payload?: { dataKey: string; value: number | null }[]; label?: string; series: Series[]; total?: boolean;
}) {
  if (!active || !payload?.length || label == null) return null;
  const val = (k: string) => payload.find((p) => p.dataKey === k)?.value ?? 0;
  // Top of the stack first, so the list reads in the same order as the bars.
  const rows = [...series].reverse().filter((s) => val(s.key));
  return (
    <div className="rounded-2xl bg-ink px-3.5 py-2.5 text-[12px] text-white shadow-lg">
      <p className="mb-1 font-medium text-white/60">{day(label)}</p>
      {rows.length ? rows.map((s) => (
        <p key={s.key} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
          <span className="text-white/70">{s.label}</span>
          <b className="ml-auto pl-4 font-semibold tabular">{fmt.num(val(s.key))}</b>
        </p>
      )) : <p className="text-white/70">Nothing</p>}
      {total && rows.length > 1 ? (
        <p className="mt-1 flex border-t border-white/15 pt-1 text-white/70">
          Total<b className="ml-auto pl-4 font-semibold tabular text-white">{fmt.num(series.reduce((n, s) => n + val(s.key), 0))}</b>
        </p>
      ) : null}
    </div>
  );
}

/** Bars per day, stacked by series (e.g. pages published per day, by type). */
export function StackedBars({ data, series, height = 240 }: { data: Record<string, unknown>[]; series: Series[]; height?: number }) {
  return (
    <div>
      <Legend series={series} />
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#eef0f2" />
            <XAxis dataKey="date" tickFormatter={day} tick={axis} tickLine={false} axisLine={false} minTickGap={20} />
            <YAxis tick={axis} tickLine={false} axisLine={false} width={44} allowDecimals={false} />
            <Tooltip cursor={{ fill: "#f6f7f8" }} content={<Tip series={series} total />} />
            {series.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} stackId="a" fill={s.color} maxBarSize={28} isAnimationActive={false}
                radius={i === series.length - 1 ? [6, 6, 0, 0] : undefined} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Stacked areas over time (e.g. indexed / not indexed / not checked). */
export function StackedArea({ data, series, height = 220 }: { data: Record<string, unknown>[]; series: Series[]; height?: number }) {
  return (
    <div>
      <Legend series={series} />
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#eef0f2" />
            <XAxis dataKey="date" tickFormatter={day} tick={axis} tickLine={false} axisLine={false} minTickGap={28} />
            <YAxis tick={axis} tickLine={false} axisLine={false} width={52} allowDecimals={false} tickFormatter={(n: number) => fmt.num(n)} />
            <Tooltip cursor={{ stroke: "#d5d8dc", strokeDasharray: "3 3" }} content={<Tip series={series} total />} />
            {series.map((s) => (
              <Area key={s.key} type="monotone" dataKey={s.key} stackId="a" stroke={s.color} fill={s.color} fillOpacity={0.55}
                strokeWidth={1.5} isAnimationActive={false} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

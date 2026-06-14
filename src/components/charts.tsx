"use client";

import type { ReactNode } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
} from "recharts";

export type SeriesPoint = { date: string; value: number };
export type MultiSeries = {
  key: string;
  label: string;
  color: string;
  points: SeriesPoint[];
};

const COLORS = ["#353538", "#6b4bfc", "#2563eb", "#059669", "#d97706"];

function mergeMultiSeries(series: MultiSeries[]) {
  const dates = new Set<string>();
  series.forEach((s) => s.points.forEach((p) => dates.add(p.date)));
  return [...dates]
    .sort()
    .map((date) => {
      const row: Record<string, string | number> = { date: date.slice(5) };
      series.forEach((s) => {
        row[s.key] = s.points.find((p) => p.date === date)?.value ?? 0;
      });
      return row;
    });
}

export function TimeseriesChart({
  data,
  multi,
  label = "Value",
}: {
  data?: SeriesPoint[];
  multi?: MultiSeries[];
  label?: string;
}) {
  const chartData = multi?.length
    ? mergeMultiSeries(multi)
    : (data ?? []).map((p) => ({ date: p.date.slice(5), value: p.value }));

  return (
    <div className="h-64 w-full rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#71717a" }} />
          <YAxis tick={{ fontSize: 11, fill: "#71717a" }} width={40} />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e4e4e7",
              fontSize: 12,
            }}
          />
          {multi?.length ? (
            <>
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {multi.map((s, i) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color || COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </>
          ) : (
            <Line
              type="monotone"
              dataKey="value"
              name={label}
              stroke="#353538"
              strokeWidth={2}
              dot={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarChartPanel({
  data,
  label = "Count",
}: {
  data: SeriesPoint[];
  label?: string;
}) {
  const chartData = data.map((p) => ({ date: p.date.slice(5), value: p.value }));
  return (
    <div className="h-56 w-full rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#71717a" }} />
          <YAxis tick={{ fontSize: 11, fill: "#71717a" }} width={40} />
          <Tooltip />
          <Bar dataKey="value" name={label} fill="#6b4bfc" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HourlyBarChart({
  hours,
}: {
  hours: { hour: number; sessions: number }[];
}) {
  const chartData = hours.map((h) => ({
    hour: `${h.hour}:00`,
    sessions: h.sessions,
  }));
  return (
    <div className="h-56 w-full rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis
            dataKey="hour"
            tick={{ fontSize: 10, fill: "#71717a" }}
            interval={2}
          />
          <YAxis tick={{ fontSize: 11, fill: "#71717a" }} width={32} />
          <Tooltip />
          <Bar dataKey="sessions" fill="#353538" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PieChartPanel({
  segments,
  title,
}: {
  segments: { name: string; value: number }[];
  title?: string;
}) {
  const COLORS_PIE = ["#353538", "#6b4bfc", "#a1a1aa", "#2563eb", "#059669"];
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      {title && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          {title}
        </p>
      )}
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={segments}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
            >
              {segments.map((_, i) => (
                <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function FunnelBarChart({
  steps,
}: {
  steps: { label: string; value: number }[];
}) {
  const data = steps.map((s) => ({
    step: s.label.length > 18 ? `${s.label.slice(0, 16)}…` : s.label,
    count: s.value,
  }));
  return (
    <div className="h-72 w-full rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#71717a" }} />
          <YAxis
            type="category"
            dataKey="step"
            width={100}
            tick={{ fontSize: 10, fill: "#71717a" }}
          />
          <Tooltip />
          <Bar dataKey="count" fill="#6b4bfc" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HorizontalBarChart({
  data,
  label = "Count",
}: {
  data: { name: string; value: number }[];
  label?: string;
}) {
  const chartData = data.map((d) => ({
    name: d.name.length > 28 ? `${d.name.slice(0, 26)}…` : d.name,
    value: d.value,
  }));
  return (
    <div className="h-80 w-full rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#71717a" }} />
          <YAxis
            type="category"
            dataKey="name"
            width={140}
            tick={{ fontSize: 10, fill: "#71717a" }}
          />
          <Tooltip />
          <Bar dataKey="value" name={label} fill="#353538" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DualAxisBarChart({
  data,
}: {
  data: { name: string; words: number; cost: number }[];
}) {
  const chartData = data.map((d) => ({
    name: d.name.length > 14 ? `${d.name.slice(0, 12)}…` : d.name,
    words: d.words,
    cost: d.cost,
  }));
  return (
    <div className="h-72 w-full rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#71717a" }} />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: "#71717a" }}
            width={48}
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: "#71717a" }}
            width={48}
            tickFormatter={(v) => `$${Number(v).toFixed(3)}`}
          />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="left" dataKey="words" name="Words" fill="#353538" radius={[4, 4, 0, 0]} />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cost"
            name="LLM cost (USD)"
            stroke="#6b4bfc"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChartSection({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

"use client";

import { Check } from "lucide-react";
import { fmt } from "@/lib/api";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// One hue, light to dark (magnitude). Zero stays on the neutral surface.
const HEAT = ["var(--color-surface)", "#d4e9f9", "#a9d6f5", "#5ea6dc", "#2a6aa3"];

function hourLabel(h: number) {
  const s = (n: number) => `${n % 12 === 0 ? 12 : n % 12}${n < 12 || n === 24 ? "am" : "pm"}`;
  return `${s(h)}–${s(h + 1)}`;
}

/** Day-of-week × hour grid of uses, bucketed in the viewer's time zone. */
export function Heatmap({ hours }: { hours: { at: string; count: number }[] }) {
  const grid = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  for (const h of hours) {
    const d = new Date(h.at);
    grid[(d.getDay() + 6) % 7][d.getHours()] += h.count;
  }
  const max = Math.max(0, ...grid.flat());
  const step = (n: number) => (n === 0 || max === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4)));
  const busiest = max ? grid.flatMap((row, d) => row.map((n, h) => ({ n, d, h }))).sort((a, b) => b.n - a.n)[0] : null;

  return (
    <div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[560px] gap-[3px]" style={{ gridTemplateColumns: "34px repeat(24, minmax(0, 1fr))" }}>
          {grid.map((row, d) => (
            <div key={d} className="contents">
              <span className="self-center text-[11px] text-muted">{DAYS[d]}</span>
              {row.map((n, h) => (
                <div key={h} className="group relative aspect-square rounded-[5px]" style={{ background: HEAT[step(n)] }}>
                  <div className="pointer-events-none absolute -top-1 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-[11px] text-white group-hover:block">
                    {DAYS[d]} {hourLabel(h)}: {n} {n === 1 ? "use" : "uses"}
                  </div>
                </div>
              ))}
            </div>
          ))}
          <span />
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h} className="text-center text-[10px] text-faint">{h % 6 === 0 ? hourLabel(h).split("–")[0] : ""}</span>
          ))}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[12px] text-muted">
        <span>{busiest ? `Busiest: ${DAYS[busiest.d]} ${hourLabel(busiest.h)} · your time zone` : "No uses in the last 90 days"}</span>
        <span className="flex items-center gap-1.5">Less {HEAT.map((c) => <span key={c} className="h-3 w-3 rounded-[3px]" style={{ background: c }} />)} More</span>
      </div>
    </div>
  );
}

/** Ranked horizontal bars with the value written out. */
export function BarList({ items, format = fmt.num }: { items: { label: string; value: number }[]; format?: (n: number) => string }) {
  const max = Math.max(0, ...items.map((i) => i.value));
  return (
    <div className="space-y-3">
      {items.map((i) => (
        <div key={i.label}>
          <div className="mb-1 flex justify-between gap-3 text-[13px]">
            <span className="truncate">{i.label}</span>
            <span className="tabular shrink-0 font-medium">{format(i.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-surface">
            <div className="h-2 rounded-full bg-sky" style={{ width: `${max ? Math.max(3, (i.value / max) * 100) : 0}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Which milestones they've reached, and when. */
export function Adoption({ steps }: { steps: { key: string; label: string; at: string | null }[] }) {
  const reached = steps.filter((s) => s.at).length;
  return (
    <div>
      <p className="mb-3 text-[13px] text-muted">{reached} of {steps.length} reached</p>
      <ul className="space-y-1">
        {steps.map((s) => (
          <li key={s.key} className="flex items-center gap-3 rounded-xl px-1 py-1.5 text-[13px]">
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${s.at ? "bg-lime text-lime-ink" : "border border-line"}`}>
              {s.at ? <Check size={12} strokeWidth={3} /> : null}
            </span>
            <span className={s.at ? "" : "text-muted"}>{s.label}</span>
            <span className="ml-auto text-[12px] text-faint">{s.at ? fmt.date(s.at) : "not yet"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const PARTS: { key: "recency" | "frequency" | "trend" | "reliability"; label: string; max: number; hint: string }[] = [
  { key: "recency", label: "Recency", max: 40, hint: "how recently they used Lazur" },
  { key: "frequency", label: "Frequency", max: 30, hint: "active days in the last 14" },
  { key: "trend", label: "Trend", max: 15, hint: "this week vs last week" },
  { key: "reliability", label: "Reliability", max: 15, hint: "few failed actions or errors" },
];

/** What the health score is made of, part by part. */
export function HealthParts({ parts, failRate }: { parts: Record<string, number>; failRate: number }) {
  return (
    <div className="space-y-4">
      {PARTS.map((p) => (
        <div key={p.key}>
          <div className="mb-1 flex justify-between text-[13px]">
            <span>{p.label} <span className="text-faint">· {p.hint}</span></span>
            <span className="tabular font-medium">{parts[p.key] ?? 0}/{p.max}</span>
          </div>
          <div className="h-2 rounded-full bg-surface">
            <div className="h-2 rounded-full bg-ink" style={{ width: `${(100 * (parts[p.key] ?? 0)) / p.max}%` }} />
          </div>
        </div>
      ))}
      <p className="text-[12px] text-muted">{failRate}% of uses in the last 30 days hit a failure or error.</p>
    </div>
  );
}

export function duration(minutes: number | null | undefined) {
  if (minutes == null) return "–";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)} h`;
  return `${(minutes / 1440).toFixed(1)} d`;
}

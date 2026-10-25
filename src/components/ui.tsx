"use client";

import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[28px] bg-card p-6 ${className}`}>{children}</section>;
}

export function CardTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <h2 className="text-[19px] font-semibold tracking-tight">{children}</h2>
      {aside}
    </div>
  );
}

export function PageTitle({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[40px] font-semibold leading-none tracking-[-0.03em]">{title}</h1>
        {subtitle ? <p className="mt-2 text-[14px] text-muted">{subtitle}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function Delta({ now, before, invert = false }: { now: number; before: number; invert?: boolean }) {
  if (!before && !now) return null;
  const change = before ? Math.round(((now - before) / before) * 100) : 100;
  const good = invert ? change <= 0 : change >= 0;
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${good ? "bg-lime text-lime-ink" : "bg-rose/60 text-ink"}`}>
      {change >= 0 ? "↑" : "↓"} {Math.abs(change)}%
    </span>
  );
}

export function Stat({ label, value, hint, delta, tone = "plain" }: {
  label: string; value: ReactNode; hint?: ReactNode; delta?: ReactNode; tone?: "plain" | "lime" | "ink";
}) {
  const tones = { plain: "bg-card", lime: "bg-lime", ink: "bg-ink text-white" };
  return (
    <div className={`rounded-[28px] p-6 ${tones[tone]}`}>
      <p className={`text-[13px] ${tone === "ink" ? "text-white/60" : "text-muted"}`}>{label}</p>
      <div className="mt-3 flex items-end gap-2.5">
        <p className="tabular text-[34px] font-semibold leading-none tracking-[-0.02em]">{value}</p>
        {delta}
      </div>
      {hint ? <p className={`mt-3 text-[12px] ${tone === "ink" ? "text-white/50" : "text-muted"}`}>{hint}</p> : null}
    </div>
  );
}

const PILL = {
  lime: "bg-lime text-lime-ink",
  sky: "bg-sky text-ink",
  peach: "bg-peach text-ink",
  rose: "bg-rose text-ink",
  gray: "bg-surface text-muted",
  ink: "bg-ink text-white",
};

export function Pill({ children, tone = "gray" }: { children: ReactNode; tone?: keyof typeof PILL }) {
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] font-medium ${PILL[tone]}`}>{children}</span>;
}

export function planTone(plan: string): keyof typeof PILL {
  if (plan === "power") return "ink";
  if (plan === "pro") return "lime";
  if (plan === "pro_trial") return "sky";
  return "gray";
}

export function planLabel(plan: string): string {
  return { power: "Power", pro: "Pro", pro_trial: "Trial", expired: "No plan", free: "Free" }[plan] ?? plan;
}

/** Week-style bars: filled where there's data, hatched where it's zero (reference design). */
export function Bars({ data, height = 150, format = (n: number) => String(n) }: {
  data: { label: string; value: number }[]; height?: number; format?: (n: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const step = Math.max(1, Math.ceil(data.length / 10));
  return (
    <div className="flex items-end gap-1.5" style={{ height: height + 22 }}>
      {data.map((d, i) => (
        <div key={i} className="group relative flex h-full flex-1 flex-col items-center justify-end gap-1.5">
          <div className="pointer-events-none absolute -top-1 z-10 hidden -translate-y-full whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-[11px] text-white group-hover:block">
            {d.label}: {format(d.value)}
          </div>
          {d.value > 0 ? (
            <div className="w-full rounded-[10px] bg-sky transition-colors group-hover:bg-ink" style={{ height: Math.max(6, (d.value / max) * height) }} />
          ) : (
            <div className="hatch w-full rounded-[10px]" style={{ height: height * 0.35 }} />
          )}
          <span className="h-3 text-[10px] text-faint">{i % step === 0 ? d.label : ""}</span>
        </div>
      ))}
    </div>
  );
}

/** Donut ring (lime arc on a light track) with a value in the middle. */
export function Ring({ pct, label, sub }: { pct: number | null; label: string; sub?: string }) {
  const r = 70, c = 2 * Math.PI * r, p = Math.max(0, Math.min(100, pct ?? 0));
  return (
    <div className="relative grid h-[180px] w-[180px] place-items-center">
      <svg viewBox="0 0 180 180" className="absolute inset-0 -rotate-90">
        <circle cx="90" cy="90" r={r} fill="none" stroke="var(--color-surface)" strokeWidth="22" />
        <circle cx="90" cy="90" r={r} fill="none" stroke="var(--color-lime)" strokeWidth="22" strokeLinecap="round"
          strokeDasharray={`${(p / 100) * c} ${c}`} />
      </svg>
      <div className="text-center">
        <p className="tabular text-[30px] font-semibold leading-none">{label}</p>
        {sub ? <p className="mt-1 text-[12px] text-muted">{sub}</p> : null}
      </div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl bg-surface px-4 py-6 text-center text-[13px] text-muted">{children}</p>;
}

export function Loading() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {[0, 1, 2, 3].map((i) => <div key={i} className="h-[140px] animate-pulse rounded-[28px] bg-card/70" />)}
    </div>
  );
}

export function ErrorBox({ error }: { error: unknown }) {
  return <Card><p className="text-[14px] text-red-600">{error instanceof Error ? error.message : "Something went wrong"}</p></Card>;
}

export const RANGES = [7, 30, 90] as const;

export function RangePicker({ value, onChange }: { value: number; onChange: (d: number) => void }) {
  return (
    <div className="flex rounded-full bg-card p-1">
      {RANGES.map((d) => (
        <button key={d} type="button" onClick={() => onChange(d)}
          className={`rounded-full px-4 py-2 text-[13px] font-medium transition ${value === d ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>
          {d}d
        </button>
      ))}
    </div>
  );
}

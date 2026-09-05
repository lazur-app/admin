"use client";

const PRESETS = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
] as const;

export type DateRange = { from: string; to: string };

function isoDate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function defaultRange(days = 30): DateRange {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  return { from: isoDate(from), to: isoDate(to) };
}

export function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => (
        <button
          key={p.days}
          type="button"
          onClick={() => onChange(defaultRange(p.days))}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            value.from === defaultRange(p.days).from &&
            value.to === defaultRange(p.days).to
              ? "border-violet-500 bg-violet-600 text-white"
              : "border-white/10 bg-zinc-900 text-zinc-300 hover:border-white/20 hover:bg-zinc-800"
          }`}
        >
          {p.label}
        </button>
      ))}
      <input
        type="date"
        value={value.from}
        onChange={(e) => onChange({ ...value, from: e.target.value })}
        className="rounded-lg border border-white/10 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
      />
      <span className="text-xs text-zinc-400">→</span>
      <input
        type="date"
        value={value.to}
        onChange={(e) => onChange({ ...value, to: e.target.value })}
        className="rounded-lg border border-white/10 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
      />
    </div>
  );
}

"use client";

const PRESETS = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
] as const;

export type DateRange = { from: string; to: string };

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
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
          className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
        >
          {p.label}
        </button>
      ))}
      <input
        type="date"
        value={value.from}
        onChange={(e) => onChange({ ...value, from: e.target.value })}
        className="rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-700"
      />
      <span className="text-xs text-zinc-400">→</span>
      <input
        type="date"
        value={value.to}
        onChange={(e) => onChange({ ...value, to: e.target.value })}
        className="rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-700"
      />
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchCompare, fetchUsers, downloadExport, type CompareResponse } from "@/lib/api";
import {
  PageHeader,
  ErrorBanner,
  LoadingState,
  DataTable,
  tableHeadClass,
  tableCellClass,
} from "@/components/ui";
import {
  DateRangePicker,
  defaultRange,
  type DateRange,
} from "@/components/DateRangePicker";
import { TimeseriesChart, PieChartPanel, DualAxisBarChart } from "@/components/charts";

const COHORTS = [
  { id: "paid", label: "Paid (Pro + Power)" },
  { id: "free", label: "Free plan" },
  { id: "pro_trial", label: "Pro trial" },
  { id: "trial_expired", label: "Trial expired" },
  { id: "onboarding_done", label: "Onboarding completed" },
] as const;

const COLORS = ["#8b5cf6", "#6b4bfc", "#38bdf8", "#34d399", "#f59e0b"];

export default function ComparePage() {
  const [range, setRange] = useState<DateRange>(defaultRange(30));
  const [cohort, setCohort] = useState<string | null>("paid");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<
    { id: string; email: string }[]
  >([]);
  const [data, setData] = useState<CompareResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchCompare({
        cohort: selectedUsers.length ? undefined : cohort ?? undefined,
        user_ids: selectedUsers.length ? selectedUsers.join(",") : undefined,
        from: range.from,
        to: range.to,
        metric: "sessions",
      });
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [range, cohort, selectedUsers]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      fetchUsers({ search: search.trim(), limit: 8 })
        .then((r) =>
          setSearchResults(r.items.map((u) => ({ id: u.id, email: u.email })))
        )
        .catch(() => setSearchResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const multiSeries = (data?.series ?? []).map((s, i) => ({
    key: s.user_id,
    label: s.email,
    color: COLORS[i % COLORS.length],
    points: s.points,
  }));

  return (
    <div>
      <PageHeader
        title="Compare users & cohorts"
        description="Overlay activity, words, and usage by plan segment."
      />

      <DateRangePicker value={range} onChange={setRange} />

      <div className="mt-4 flex flex-wrap gap-2">
        {COHORTS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              setCohort(c.id);
              setSelectedUsers([]);
            }}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              cohort === c.id && selectedUsers.length === 0
                ? "border-violet-500 bg-violet-600 text-white"
                : "border-white/10 text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            const params = new URLSearchParams({ from: range.from, to: range.to });
            if (selectedUsers.length) {
              params.set("user_ids", selectedUsers.join(","));
            } else if (cohort) {
              params.set("cohort", cohort);
            }
            downloadExport(`/admin/export/compare?${params.toString()}`);
          }}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
        >
          Export compare CSV
        </button>
      </div>

      <div className="relative mt-4 max-w-md">
        <input
          type="search"
          placeholder="Add user by email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
        />
        {searchResults.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 shadow-lg">
            {searchResults.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                  onClick={() => {
                    if (!selectedUsers.includes(u.id) && selectedUsers.length < 5) {
                      setSelectedUsers([...selectedUsers, u.id]);
                      setCohort(null);
                    }
                    setSearch("");
                    setSearchResults([]);
                  }}
                >
                  {u.email}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedUsers.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {selectedUsers.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-200"
            >
              {data?.rows.find((r) => r.user_id === id)?.email ?? id.slice(0, 8)}
              <button
                type="button"
                className="text-zinc-500 hover:text-zinc-100"
                onClick={() =>
                  setSelectedUsers(selectedUsers.filter((x) => x !== id))
                }
              >
                ×
              </button>
            </span>
          ))}
          <button
            type="button"
            className="text-xs text-zinc-500 hover:text-zinc-100"
            onClick={() => {
              setSelectedUsers([]);
              setCohort("paid");
            }}
          >
            Clear users
          </button>
        </div>
      )}

      {error && <ErrorBanner message={error} />}
      {loading && <LoadingState className="mt-6" />}

      {data && !loading && (
        <div className="mt-8 space-y-8">
          {data.cohort_summary && (
            <div className="rounded-xl border border-white/10 bg-zinc-900 p-4 text-sm text-zinc-300">
              Cohort <strong>{data.cohort_summary.cohort}</strong>:{" "}
              {data.cohort_summary.user_count} users · avg{" "}
              {data.cohort_summary.avg_sessions} sessions · avg{" "}
              {data.cohort_summary.avg_words.toLocaleString()} words · avg LLM $
              {data.cohort_summary.avg_llm_cost_usd?.toFixed(4) ?? "0"}
            </div>
          )}

          <TimeseriesChart multi={multiSeries} />

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
              Words vs LLM cost
            </h2>
            <DualAxisBarChart
              data={data.rows.map((row) => ({
                name: row.email.split("@")[0],
                words: row.words,
                cost: row.llm_cost_usd ?? 0,
              }))}
            />
          </section>

          {data.rows.some((r) => r.breakdown.length > 0) && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
                Dictation vs command split
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {data.rows.map((row) => (
                  <PieChartPanel
                    key={row.user_id}
                    title={row.email}
                    segments={row.breakdown.map((b) => ({
                      name: b.name,
                      value: b.value,
                    }))}
                  />
                ))}
              </div>
            </section>
          )}

          <DataTable>
            <table className="w-full text-left text-sm">
              <thead className={tableHeadClass}>
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Words</th>
                  <th className="px-4 py-3">LLM cost</th>
                  <th className="px-4 py-3">Sessions</th>
                  <th className="px-4 py-3">Commands</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.user_id} className="border-t border-white/5">
                    <td className={tableCellClass}>{row.email}</td>
                    <td className={tableCellClass}>{row.plan ?? "-"}</td>
                    <td className={tableCellClass}>{row.words.toLocaleString()}</td>
                    <td className={tableCellClass}>
                      {row.llm_cost_usd != null
                        ? `$${row.llm_cost_usd.toFixed(4)}`
                        : "$0.0000"}
                    </td>
                    <td className={tableCellClass}>{row.sessions}</td>
                    <td className={tableCellClass}>{row.commands}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTable>
        </div>
      )}
    </div>
  );
}

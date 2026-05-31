"use client";

import { useEffect, useState } from "react";
import { fetchOverview, type AdminOverview } from "@/lib/api";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-white">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

export default function DashboardOverviewPage() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOverview()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Overview</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Platform metrics from the Lazur API (month-to-date where noted).
      </p>

      {error && (
        <p className="mt-6 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {!data && !error && (
        <p className="mt-8 text-sm text-zinc-500">Loading metrics…</p>
      )}

      {data && (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Total users" value={data.total_users} />
            <StatCard label="Active subscriptions" value={data.active_subscriptions} />
            <StatCard
              label="Dictation sessions (MTD)"
              value={data.dictation_sessions_mtd}
            />
            <StatCard label="Words used (MTD)" value={data.words_used_mtd} />
            <StatCard label="Commands used (MTD)" value={data.commands_used_mtd} />
            <StatCard
              label="LLM cost (MTD)"
              value={
                data.llm_cost_mtd_usd != null
                  ? `$${data.llm_cost_mtd_usd.toFixed(4)}`
                  : "—"
              }
            />
          </div>
          {data.note && (
            <p className="mt-6 text-xs text-zinc-500">{data.note}</p>
          )}
        </>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  fetchAnalyticsOverview,
  type AdminAnalyticsOverview,
} from "@/lib/api";

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

export default function AnalyticsPage() {
  const [data, setData] = useState<AdminAnalyticsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalyticsOverview()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Product analytics</h1>
      <p className="mt-1 text-sm text-zinc-400">
        DAU/WAU/MAU from <code className="text-zinc-300">users.last_active_at</code>;
        events from <code className="text-zinc-300">analytics_events</code> (last 7–30 days).
      </p>

      {error && (
        <p className="mt-6 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {!data && !error && (
        <p className="mt-8 text-sm text-zinc-500">Loading analytics…</p>
      )}

      {data && (
        <div className="mt-8 space-y-10">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="DAU (24h)" value={data.dau} />
            <StatCard label="WAU (7d)" value={data.wau} />
            <StatCard label="MAU (30d)" value={data.mau} />
          </div>

          <section>
            <h2 className="text-lg font-medium text-white">Top events (7 days)</h2>
            <div className="mt-3 overflow-hidden rounded-xl border border-zinc-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-900/80 text-xs uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3 text-right">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_events_7d.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-4 py-6 text-zinc-500">
                        No events yet — deploy desktop app + backend batch ingest.
                      </td>
                    </tr>
                  ) : (
                    data.top_events_7d.map((row) => (
                      <tr
                        key={row.event_name}
                        className="border-t border-zinc-800/80 text-zinc-300"
                      >
                        <td className="px-4 py-2.5 font-mono text-xs">
                          {row.event_name}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {row.count.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white">
              Onboarding funnel (30 days)
            </h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Signed up" value={data.onboarding_funnel_30d.signed_up} />
              <StatCard
                label="Onboarding completed"
                value={data.onboarding_funnel_30d.onboarding_completed}
              />
            </div>
            {data.onboarding_funnel_30d.steps.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-xl border border-zinc-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-900/80 text-xs uppercase tracking-wider text-zinc-500">
                    <tr>
                      <th className="px-4 py-3">Step viewed</th>
                      <th className="px-4 py-3 text-right">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.onboarding_funnel_30d.steps.map((row) => (
                      <tr
                        key={row.step}
                        className="border-t border-zinc-800/80 text-zinc-300"
                      >
                        <td className="px-4 py-2.5">{row.step}</td>
                        <td className="px-4 py-2.5 text-right">
                          {row.count.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h2 className="text-lg font-medium text-white">Errors (7 days)</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Client <code className="text-zinc-400">error_occurred</code> events —{" "}
              {data.errors.total_7d.toLocaleString()} total
            </p>
            {data.errors.by_version.length > 0 && (
              <div className="mt-3 overflow-hidden rounded-xl border border-zinc-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-900/80 text-xs uppercase tracking-wider text-zinc-500">
                    <tr>
                      <th className="px-4 py-3">Version</th>
                      <th className="px-4 py-3">Platform</th>
                      <th className="px-4 py-3 text-right">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.errors.by_version.map((row, i) => (
                      <tr
                        key={`${row.app_version}-${row.platform}-${i}`}
                        className="border-t border-zinc-800/80 text-zinc-300"
                      >
                        <td className="px-4 py-2.5 font-mono text-xs">
                          {row.app_version ?? "—"}
                        </td>
                        <td className="px-4 py-2.5">{row.platform ?? "—"}</td>
                        <td className="px-4 py-2.5 text-right">
                          {row.count.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {data.errors.recent.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-xl border border-zinc-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-900/80 text-xs uppercase tracking-wider text-zinc-500">
                    <tr>
                      <th className="px-4 py-3">When</th>
                      <th className="px-4 py-3">Message</th>
                      <th className="px-4 py-3">Version</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.errors.recent.map((row, i) => (
                      <tr
                        key={`${row.occurred_at}-${i}`}
                        className="border-t border-zinc-800/80 text-zinc-300"
                      >
                        <td className="px-4 py-2.5 whitespace-nowrap text-xs text-zinc-500">
                          {row.occurred_at
                            ? new Date(row.occurred_at).toLocaleString()
                            : "—"}
                        </td>
                        <td className="max-w-md truncate px-4 py-2.5 text-xs">
                          {String(row.properties?.message ?? "—")}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs">
                          {row.app_version ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

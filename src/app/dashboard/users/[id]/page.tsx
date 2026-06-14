"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  fetchUserDetail,
  fetchUserActivity,
  fetchUserHourly,
  fetchUserBreakdown,
  type AdminUserDetail,
} from "@/lib/api";
import { StatCard, ErrorBanner, LoadingState } from "@/components/ui";
import {
  DateRangePicker,
  defaultRange,
  type DateRange,
} from "@/components/DateRangePicker";
import { TimeseriesChart, HourlyBarChart, PieChartPanel } from "@/components/charts";

export default function UserDetailPage() {
  const params = useParams();
  const userId = params.id as string;
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [range, setRange] = useState<DateRange>(defaultRange(30));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<{ date: string; value: number }[]>([]);
  const [hourly, setHourly] = useState<{ hour: number; sessions: number }[]>([]);
  const [pie, setPie] = useState<{ name: string; value: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [detail, activity, breakdown] = await Promise.all([
        fetchUserDetail(userId),
        fetchUserActivity({
          user_ids: userId,
          from: range.from,
          to: range.to,
          metric: "sessions",
        }),
        fetchUserBreakdown(userId, range.from, range.to),
      ]);
      setUser(detail);
      setTimeline(activity.series[0]?.points ?? []);
      setPie(breakdown.pie.map((p) => ({ name: p.name, value: p.value })));

      const day = selectedDay ?? range.to;
      const hourlyRes = await fetchUserHourly(userId, day);
      setHourly(hourlyRes.hours.map((h) => ({ hour: h.hour, sessions: h.sessions })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [userId, range, selectedDay]);

  useEffect(() => {
    load();
  }, [load]);

  if (error && !user) return <ErrorBanner message={error} />;
  if (!user) return <LoadingState />;

  const quotaPct = user.word_quota_limit
    ? Math.round((100 * user.word_quota_used) / user.word_quota_limit)
    : 0;

  return (
    <div>
      <Link
        href="/dashboard/users"
        className="text-sm text-zinc-500 hover:text-zinc-900"
      >
        ← Users
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-zinc-900">{user.email}</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {user.plan} · {user.word_quota_used.toLocaleString()} /{" "}
        {user.word_quota_limit.toLocaleString()} words
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Lifetime sessions" value={user.dictation_sessions} />
        <StatCard
          label="Last active"
          value={
            user.last_active_at
              ? new Date(user.last_active_at).toLocaleDateString()
              : "—"
          }
        />
        <StatCard label="Trial status" value={user.trial_status} />
      </div>

      <div className="mt-8">
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Daily sessions — click a point day in range picker below
        </h2>
        <TimeseriesChart
          data={timeline}
          label="Sessions"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {timeline.slice(-7).map((p) => (
            <button
              key={p.date}
              type="button"
              onClick={() => setSelectedDay(p.date)}
              className={`rounded-full border px-3 py-1 text-xs ${
                (selectedDay ?? range.to) === p.date
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {p.date}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Hourly dictation — {selectedDay ?? range.to}
        </h2>
        <HourlyBarChart hours={hourly} />
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Dictation vs command
          </h2>
          <PieChartPanel segments={pie} />
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Quota utilization
          </h2>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
              <div
                className="h-full bg-zinc-900"
                style={{ width: `${Math.min(quotaPct, 100)}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-zinc-600">
              {quotaPct}% of word limit used ({user.word_quota_used.toLocaleString()}{" "}
              words)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

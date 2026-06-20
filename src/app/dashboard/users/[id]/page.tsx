"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  adminUserPlanAction,
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
import { UserFeedbackSection } from "@/components/UserFeedbackSection";

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
  const [planAction, setPlanAction] = useState<"grant_comp" | "revoke_comp" | "extend_comp" | null>(
    null,
  );
  const [compPlan, setCompPlan] = useState<"pro" | "power">("pro");
  const [compReason, setCompReason] = useState("Beta tester");
  const [compExpires, setCompExpires] = useState("");
  const [planMessage, setPlanMessage] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(false);

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

  const handlePlanAction = async () => {
    if (!planAction) return;
    setPlanLoading(true);
    setPlanMessage(null);
    try {
      const result = await adminUserPlanAction(userId, {
        action: planAction,
        plan: planAction === "grant_comp" ? compPlan : undefined,
        reason: planAction === "grant_comp" ? compReason : undefined,
        expires_at:
          planAction === "grant_comp" || planAction === "extend_comp"
            ? compExpires
              ? new Date(compExpires).toISOString()
              : undefined
            : undefined,
      });
      setPlanMessage(`Updated to ${result.plan}`);
      setPlanAction(null);
      await load();
    } catch (e) {
      setPlanMessage(e instanceof Error ? e.message : "Plan update failed");
    } finally {
      setPlanLoading(false);
    }
  };

  if (error && !user) return <ErrorBanner message={error} />;
  if (!user) return <LoadingState />;

  const quotaPct = user.word_quota_limit
    ? Math.round((100 * user.word_quota_used) / user.word_quota_limit)
    : 0;

  const billingSourceLabel =
    user.billing_source === "admin_comp"
      ? "Complimentary"
      : user.billing_source === "polar"
        ? "Polar (paid)"
        : user.billing_source === "trial"
          ? "Trial"
          : "—";

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

      <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Plan management
        </h2>
        <p className="mt-2 text-sm text-zinc-600">
          Billing source: <span className="font-medium text-zinc-900">{billingSourceLabel}</span>
          {user.comp_reason ? ` · ${user.comp_reason}` : ""}
          {user.cancel_at_period_end ? " · cancellation scheduled" : ""}
        </p>

        {planAction ? (
          <div className="mt-4 space-y-3 rounded-lg border border-zinc-100 bg-zinc-50 p-4">
            {planAction === "grant_comp" && (
              <>
                <label className="block text-sm text-zinc-600">
                  Plan
                  <select
                    value={compPlan}
                    onChange={(e) => setCompPlan(e.target.value as "pro" | "power")}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  >
                    <option value="pro">Pro</option>
                    <option value="power">Power</option>
                  </select>
                </label>
                <label className="block text-sm text-zinc-600">
                  Reason
                  <input
                    value={compReason}
                    onChange={(e) => setCompReason(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  />
                </label>
              </>
            )}
            {(planAction === "grant_comp" || planAction === "extend_comp") && (
              <label className="block text-sm text-zinc-600">
                Expires at (optional for grant — defaults to 1 year)
                <input
                  type="datetime-local"
                  value={compExpires}
                  onChange={(e) => setCompExpires(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                />
              </label>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handlePlanAction}
                disabled={planLoading}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {planLoading ? "Saving…" : "Confirm"}
              </button>
              <button
                type="button"
                onClick={() => setPlanAction(null)}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPlanAction("grant_comp")}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Grant complimentary plan
            </button>
            {user.billing_source === "admin_comp" && (
              <>
                <button
                  type="button"
                  onClick={() => setPlanAction("extend_comp")}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  Extend comp access
                </button>
                <button
                  type="button"
                  onClick={() => setPlanAction("revoke_comp")}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                >
                  Revoke comp access
                </button>
              </>
            )}
          </div>
        )}
        {planMessage && (
          <p className="mt-3 text-sm text-zinc-600">{planMessage}</p>
        )}
      </section>

      <UserFeedbackSection userId={userId} />

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

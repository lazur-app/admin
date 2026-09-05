"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminUserPlanAction,
  fetchUserDetail,
  fetchUserChart,
  fetchUserHourly,
} from "@/lib/api";
import { StatCard, ErrorBanner, LoadingState, Badge } from "@/components/ui";
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
  const queryClient = useQueryClient();
  const [range, setRange] = useState<DateRange>(defaultRange(30));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [planAction, setPlanAction] = useState<"grant_comp" | "revoke_comp" | "extend_comp" | null>(
    null,
  );
  const [compPlan, setCompPlan] = useState<"pro" | "power">("pro");
  const [compReason, setCompReason] = useState("Beta tester");
  const [compExpires, setCompExpires] = useState("");
  const [planMessage, setPlanMessage] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(false);

  const userQuery = useQuery({
    queryKey: ["admin-user", userId],
    queryFn: () => fetchUserDetail(userId),
    staleTime: 30_000,
  });

  const chartQuery = useQuery({
    queryKey: ["admin-user-chart", userId, range.from, range.to],
    queryFn: () => fetchUserChart(userId, range.from, range.to),
    placeholderData: keepPreviousData,
  });

  const day = selectedDay ?? range.to;
  const hourlyQuery = useQuery({
    queryKey: ["admin-user-hourly", userId, day],
    queryFn: () => fetchUserHourly(userId, day),
    placeholderData: keepPreviousData,
  });

  const user = userQuery.data;
  const timeline = chartQuery.data?.timeline ?? [];
  const pie = (chartQuery.data?.breakdown.pie ?? []).map((p) => ({
    name: p.name,
    value: p.value,
  }));
  const hourly = (hourlyQuery.data?.hours ?? []).map((h) => ({
    hour: h.hour,
    sessions: h.sessions,
  }));

  const error =
    userQuery.error instanceof Error
      ? userQuery.error.message
      : chartQuery.error instanceof Error
        ? chartQuery.error.message
        : null;

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
      await queryClient.invalidateQueries({ queryKey: ["admin-user", userId] });
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
          : "-";

  return (
    <div>
      <Link
        href="/dashboard/users"
        className="text-sm text-zinc-500 hover:text-zinc-100"
      >
        ← Users
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-zinc-50">{user.email}</h1>
        <Badge tone="primary">{user.plan}</Badge>
      </div>
      <p className="mt-1 text-sm text-zinc-500">
        {user.word_quota_used.toLocaleString()} /{" "}
        {user.word_quota_limit.toLocaleString()} words
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Dictation sessions" value={user.dictation_sessions} />
        <StatCard
          label="Commands used"
          value={`${user.command_quota_used} / ${user.command_quota_limit}`}
        />
        <StatCard
          label="Agents used"
          value={`${user.agent_quota_used ?? 0} / ${user.agent_quota_limit ?? 0}`}
        />
        <StatCard
          label="Last active"
          value={
            user.last_active_at
              ? new Date(user.last_active_at).toLocaleDateString()
              : "-"
          }
        />
      </div>

      <section className="mt-8 rounded-xl border border-white/10 bg-zinc-900 p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Plan management
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          Billing source: <span className="font-medium text-zinc-100">{billingSourceLabel}</span>
          {user.comp_reason ? ` · ${user.comp_reason}` : ""}
          {user.cancel_at_period_end ? " · cancellation scheduled" : ""}
        </p>

        {planAction ? (
          <div className="mt-4 space-y-3 rounded-lg border border-white/10 bg-zinc-950 p-4">
            {planAction === "grant_comp" && (
              <>
                <label className="block text-sm text-zinc-400">
                  Plan
                  <select
                    value={compPlan}
                    onChange={(e) => setCompPlan(e.target.value as "pro" | "power")}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                  >
                    <option value="pro">Pro</option>
                    <option value="power">Power</option>
                  </select>
                </label>
                <label className="block text-sm text-zinc-400">
                  Reason
                  <input
                    value={compReason}
                    onChange={(e) => setCompReason(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                  />
                </label>
              </>
            )}
            {(planAction === "grant_comp" || planAction === "extend_comp") && (
              <label className="block text-sm text-zinc-400">
                Expires at (optional for grant, defaults to 1 year)
                <input
                  type="datetime-local"
                  value={compExpires}
                  onChange={(e) => setCompExpires(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                />
              </label>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handlePlanAction}
                disabled={planLoading}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {planLoading ? "Saving…" : "Confirm"}
              </button>
              <button
                type="button"
                onClick={() => setPlanAction(null)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300"
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
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              Grant complimentary plan
            </button>
            {user.billing_source === "admin_comp" && (
              <>
                <button
                  type="button"
                  onClick={() => setPlanAction("extend_comp")}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
                >
                  Extend comp access
                </button>
                <button
                  type="button"
                  onClick={() => setPlanAction("revoke_comp")}
                  className="rounded-lg border border-red-500/30 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/10"
                >
                  Revoke comp access
                </button>
              </>
            )}
          </div>
        )}
        {planMessage && (
          <p className="mt-3 text-sm text-zinc-400">{planMessage}</p>
        )}
      </section>

      <UserFeedbackSection userId={userId} />

      <div className="mt-8">
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Daily sessions
        </h2>
        <TimeseriesChart data={timeline} label="Sessions" />
        <div className="mt-3 flex flex-wrap gap-2">
          {timeline.slice(-7).map((p) => (
            <button
              key={p.date}
              type="button"
              onClick={() => setSelectedDay(p.date)}
              className={`rounded-full border px-3 py-1 text-xs ${
                (selectedDay ?? range.to) === p.date
                  ? "border-violet-500 bg-violet-600 text-white"
                  : "border-white/10 text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              {p.date}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Hourly dictation, {day}
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
          <div className="rounded-xl border border-white/10 bg-zinc-900 p-6 shadow-sm">
            <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full bg-violet-500"
                style={{ width: `${Math.min(quotaPct, 100)}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-zinc-400">
              {quotaPct}% of word limit used ({user.word_quota_used.toLocaleString()}{" "}
              words)
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              Commands {user.command_quota_used} / {user.command_quota_limit} · Agents{" "}
              {user.agent_quota_used ?? 0} / {user.agent_quota_limit ?? 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

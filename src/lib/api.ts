import { apiBase, getAccessToken } from "./auth";

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("unauthorized");
  }

  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (res.status === 403) {
    const body = await res.json().catch(() => ({}));
    if (body?.detail === "Admin access required") {
      throw new Error("not_admin");
    }
  }
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }

  return res.json() as Promise<T>;
}

function qs(params: Record<string, string | number | undefined | null>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export type AdminOverview = {
  total_users: number;
  active_subscriptions: number;
  dictation_sessions_mtd: number;
  words_used_mtd: number;
  commands_used_mtd: number;
  llm_cost_mtd_usd: number;
  mrr_usd: number;
  gross_margin_mtd_usd: number;
  gross_margin_pct: number | null;
};

export type AdminUserRow = {
  id: string;
  email: string;
  name: string | null;
  created_at: string | null;
  is_admin: boolean;
  plan: string;
  word_quota_used: number;
  word_quota_limit: number;
  command_quota_used: number;
  command_quota_limit: number;
};

export type AdminUsersResponse = {
  total: number;
  limit: number;
  offset: number;
  items: AdminUserRow[];
};

export type AdminUserDetail = AdminUserRow & {
  avatar_url: string | null;
  onboarding_completed: boolean;
  command_mode_enabled: boolean;
  dictation_sessions: number;
  last_active_at: string | null;
  trial_status: string;
};

export type TimeseriesResponse = {
  metric: string;
  from: string;
  to: string;
  granularity: string;
  series: { date: string; value: number }[];
};

export type AdminAnalyticsOverview = {
  dau: number;
  wau: number;
  mau: number;
  top_events_7d: { event_name: string; count: number }[];
  onboarding_funnel_30d: {
    signed_up: number;
    onboarding_completed: number;
    steps: { step: string; count: number }[];
    window_days: number;
  };
  errors: {
    total_7d: number;
    by_version: { app_version: string | null; platform: string | null; count: number }[];
    recent: {
      user_id: string;
      occurred_at: string | null;
      app_version: string | null;
      platform: string | null;
      properties: Record<string, unknown> | null;
    }[];
  };
};

export type CompareResponse = {
  metric: string;
  from: string;
  to: string;
  series: { user_id: string; email: string; points: { date: string; value: number }[] }[];
  rows: {
    user_id: string;
    email: string;
    plan: string | null;
    words: number;
    llm_cost_usd: number | null;
    sessions: number;
    commands: number;
    breakdown: { name: string; value: number; pct: number }[];
  }[];
  cohort: string | null;
  cohort_summary: {
    cohort: string;
    user_count: number;
    avg_words: number;
    avg_sessions: number;
    avg_commands: number;
    avg_llm_cost_usd: number;
  } | null;
};

export function fetchOverview() {
  return adminFetch<AdminOverview>("/admin/overview");
}

export function fetchAnalyticsOverview() {
  return adminFetch<AdminAnalyticsOverview>("/admin/analytics/overview");
}

export type PlatformSummary = {
  from: string;
  to: string;
  totals: Record<string, number>;
  avg_dau: number;
  peak_dau: number;
  error_rate_pct: number | null;
};

export type CostOverview = {
  mrr_usd: number;
  llm_cost_mtd_usd: number;
  gross_margin_mtd_usd: number;
  gross_margin_pct: number | null;
  by_feature_mtd: { feature: string; cost_usd: number; call_count: number }[];
  top_users_mtd: { user_id: string; email: string; cost_usd: number }[];
  latency_mtd: { p50_ms: number | null; p95_ms: number | null; sample_count: number };
  waste_mtd: {
    unfinalized_calls: number;
    wasted_cost_usd: number;
    command_calls_mtd: number;
    waste_rate_pct: number | null;
  };
};

export type WebhookLogResponse = {
  total: number;
  limit: number;
  offset: number;
  items: {
    id: string;
    provider: string;
    external_event_id: string;
    event_type: string;
    processed_at: string | null;
    error: string | null;
    created_at: string | null;
  }[];
};

export function fetchPlatformSummary(from?: string, to?: string) {
  return adminFetch<PlatformSummary>(
    `/admin/analytics/platform/summary${qs({ from, to })}`
  );
}

export function fetchCostOverview() {
  return adminFetch<CostOverview>("/admin/analytics/cost/overview");
}

export function fetchWebhookLog(params?: { limit?: number; offset?: number }) {
  return adminFetch<WebhookLogResponse>(
    `/admin/ops/webhooks${qs({ limit: params?.limit, offset: params?.offset })}`
  );
}

export function fetchTimeseries(params: {
  metric: string;
  from?: string;
  to?: string;
  granularity?: string;
}) {
  return adminFetch<TimeseriesResponse>(
    `/admin/analytics/timeseries${qs(params)}`
  );
}

export function fetchUsers(params?: { search?: string; limit?: number; offset?: number }) {
  return adminFetch<AdminUsersResponse>(
    `/admin/users${qs({
      search: params?.search,
      limit: params?.limit,
      offset: params?.offset,
    })}`
  );
}

export function fetchUserDetail(id: string) {
  return adminFetch<AdminUserDetail>(`/admin/users/${id}`);
}

export function fetchUserActivity(params: {
  user_ids: string;
  from?: string;
  to?: string;
  metric?: string;
}) {
  return adminFetch<{
    metric: string;
    from: string;
    to: string;
    series: { user_id: string; email: string; points: { date: string; value: number }[] }[];
  }>(`/admin/analytics/users/activity${qs(params)}`);
}

export function fetchUserHourly(userId: string, date?: string) {
  return adminFetch<{
    user_id: string;
    date: string | null;
    hours: { hour: number; sessions: number; words: number; commands: number }[];
  }>(`/admin/analytics/users/${userId}/hourly${qs({ date })}`);
}

export function fetchUserBreakdown(userId: string, from?: string, to?: string) {
  return adminFetch<{
    dictation: number;
    commands: number;
    pie: { name: string; value: number; pct: number }[];
  }>(`/admin/analytics/users/${userId}/breakdown${qs({ from, to })}`);
}

export function fetchCompare(params: {
  user_ids?: string;
  cohort?: string;
  from?: string;
  to?: string;
  metric?: string;
}) {
  return adminFetch<CompareResponse>(`/admin/analytics/compare${qs(params)}`);
}

export function fetchCohortSummary(cohort: string, from?: string, to?: string) {
  return adminFetch<CompareResponse["cohort_summary"]>(
    `/admin/analytics/cohorts/summary${qs({ cohort, from, to })}`
  );
}

export function downloadExport(path: string) {
  const token = localStorage.getItem("lazur_admin_access_token");
  if (!token) return;
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";
  fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${token}` } })
    .then((r) => r.blob())
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = path.includes("users") ? "lazur_users.csv" : "lazur_export.csv";
      a.click();
      URL.revokeObjectURL(url);
    });
}

export async function triggerBackfill(from: string, to?: string) {
  return adminFetch<{ days_processed: number }>(
    `/admin/analytics/backfill?from=${from}${to ? `&to=${to}` : ""}`,
    { method: "POST" }
  );
}

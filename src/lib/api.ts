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

export type AdminOverview = {
  total_users: number;
  active_subscriptions: number;
  dictation_sessions_mtd: number;
  words_used_mtd: number;
  commands_used_mtd: number;
  llm_cost_mtd_usd: number | null;
  note?: string;
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

export function fetchOverview() {
  return adminFetch<AdminOverview>("/admin/overview");
}

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

export function fetchAnalyticsOverview() {
  return adminFetch<AdminAnalyticsOverview>("/admin/analytics/overview");
}

export function fetchUsers(params?: { search?: string; limit?: number; offset?: number }) {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const qs = q.toString();
  return adminFetch<AdminUsersResponse>(`/admin/users${qs ? `?${qs}` : ""}`);
}

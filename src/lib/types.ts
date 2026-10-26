export type Period = { signups: number; activations: number; conversions: number; cancellations: number; active_users: number; revenue_usd: number; cost_usd: number };
export type Overview = {
  range_days: number; current: Period; previous: Period;
  mrr: { mrr_usd: number; by_plan: Record<string, number>; paying: number; discounted?: number };
  plan_mix: { trial: number; pro: number; power: number; not_started: number; lapsed: number; total: number };
  trial_to_paid_pct: number | null;
  series: { date: string; signups: number; active_users: number; revenue_usd: number }[];
  recent: { event: string; at: string; user_id: string; email: string; name: string | null; plan?: string }[];
};
export type FunnelStep = { step: string; segment: string; users: number; pct: number | null };
export type UserRow = {
  id: string; email: string; name: string | null; avatar_url: string | null; plan: string; plan_name: string;
  trial_status: string; trial_ends_at: string | null; words_mtd: number; actions_mtd: number; cost_30d_usd: number;
  onboarding_completed: boolean; last_active_at: string | null; created_at: string | null;
  app_version: string | null; app_version_seen_at: string | null; last_emailed_at: string | null;
};
export type AppVersions = {
  latest: string | null; unknown: number; outdated: number;
  versions: { version: string; users: number; last_seen_at: string | null; outdated: boolean; latest: boolean }[];
};
/** Users page filters, as the API takes them (also the audience of a bulk email). */
export type UserFilter = {
  q?: string; segment?: string; days?: number; from?: string; to?: string; onboarding?: boolean; version?: string;
};

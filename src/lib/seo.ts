/** SEO dashboard data, from the backend's /admin/seo/* routes (see docs/seo-dashboard.md). */

export type IndexStatus = "indexed" | "not_indexed" | "not_inspected";

export type SeoOverview = {
  generated_at: string;
  /** Where the page inventory comes from (the website's /seo-stats.json) and whether the last fetch worked. */
  inventory: { source_url: string | null; fetched_at: string | null; ok: boolean; error: string | null };
  gsc: {
    connected: boolean; site_url: string | null; error: string | null;
    last_analytics_sync: string | null; last_inspection_run: string | null;
    inspections_today: number; inspection_quota: number;
  };
  totals: {
    pages: number; added_today: number; added_7d: number; added_30d: number;
    indexed: number; not_indexed: number; not_inspected: number;
    clicks_28d: number; impressions_28d: number;
  };
  cost: { today_usd: number | null; last_30d_usd: number | null; per_page_usd: number | null };
  /** One row per day in range: pages first published that day, by type, and the running total. */
  per_day: { date: string; total: number; cumulative: number; by_type: Record<string, number>; cost_usd: number | null }[];
  /** Daily snapshot of index coverage (written by the inspection job). */
  index_history: { date: string; indexed: number; not_indexed: number; not_inspected: number }[];
  search_trend: { date: string; clicks: number; impressions: number }[];
  by_type: {
    type: string; pages: number; indexed: number; not_indexed: number; not_inspected: number;
    clicks_28d: number; impressions_28d: number; avg_position: number | null;
  }[];
  not_indexed_reasons: { reason: string; pages: number }[];
};

export type SeoPageRow = {
  url: string; path: string; type: string; title: string | null;
  published_at: string | null; updated_at: string | null; word_count: number | null;
  index_status: IndexStatus; coverage_state: string | null;
  last_crawl_at: string | null; inspected_at: string | null;
  clicks_28d: number; impressions_28d: number; position_28d: number | null;
};

export type SeoPages = { items: SeoPageRow[]; total: number; limit: number; offset: number };

export const SEO_TYPES = ["howto", "apps", "roles", "role-apps", "problems", "compare", "alternatives", "blog", "tools"] as const;

export const TYPE_LABEL: Record<string, string> = {
  howto: "How-to", apps: "Apps", roles: "Roles", "role-apps": "Role × app", problems: "Problems",
  compare: "Compare", alternatives: "Alternatives", blog: "Blog", tools: "Tools",
};

// One colour per page type, the same on every chart.
export const TYPE_COLOR: Record<string, string> = {
  howto: "#2563eb", apps: "#0d9488", roles: "#7c3aed", "role-apps": "#a78bfa", problems: "#ea580c",
  compare: "#f59e0b", alternatives: "#e11d48", blog: "#5eb8ae", tools: "#64748b",
};

export const typeLabel = (t: string) => TYPE_LABEL[t] ?? t;
export const typeColor = (t: string) => TYPE_COLOR[t] ?? "#a7abb1";

export const STATUS_LABEL: Record<IndexStatus, string> = { indexed: "Indexed", not_indexed: "Not indexed", not_inspected: "Not checked" };

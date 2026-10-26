/** The people behind each overview number. Keys match the API's `segment` (app/admin_metrics.py SEGMENTS). */

export type Segment = { key: string; label: string; range: boolean };

export const SEGMENT_GROUPS: { title: string; items: Segment[] }[] = [
  {
    title: "Signed up in range",
    items: [
      { key: "signed_up", label: "Signed up", range: true },
      { key: "activated", label: "…and opened the app", range: true },
      { key: "onboarded", label: "…and finished onboarding", range: true },
      { key: "dictated", label: "…and dictated", range: true },
      { key: "asked", label: "…and asked Lazur", range: true },
      { key: "ran_job", label: "…and ran a job", range: true },
      { key: "paid", label: "…and paid", range: true },
    ],
  },
  {
    title: "Did something in range",
    items: [
      { key: "active", label: "Active users", range: true },
      { key: "jobs", label: "Ran a job", range: true },
      { key: "converted", label: "Subscribed", range: true },
      { key: "canceled", label: "Canceled", range: true },
    ],
  },
  {
    title: "Right now",
    items: [
      { key: "paying", label: "Paying", range: false },
      { key: "power", label: "On Power", range: false },
      { key: "pro", label: "On Pro", range: false },
      { key: "trial", label: "On trial", range: false },
      { key: "not_started", label: "Trial not started", range: false },
      { key: "lapsed", label: "Trial ended, unpaid", range: false },
    ],
  },
];

export const SEGMENTS: Record<string, Segment> = Object.fromEntries(
  SEGMENT_GROUPS.flatMap((g) => g.items).map((s) => [s.key, s]),
);

/** Link to the Users page filtered to one segment (and range). */
export function usersHref(segment: string, range?: { days?: number; from?: string; to?: string }): string {
  const p = new URLSearchParams({ segment });
  if (range?.from) {
    p.set("from", range.from);
    p.set("to", range.to ?? range.from);
  } else if (range?.days) {
    p.set("days", String(range.days));
  }
  return `/dashboard/users?${p}`;
}

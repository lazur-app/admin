import type { DashboardResponse } from "./api";
import { defaultRange, type DateRange } from "@/components/DateRangePicker";

export const PREFETCH_DAYS = 90;

export function prefetchRange(): DateRange {
  return defaultRange(PREFETCH_DAYS);
}

export function sliceSeries(
  points: { date: string; value: number }[] | undefined,
  range: DateRange
) {
  return (points ?? []).filter((p) => p.date >= range.from && p.date <= range.to);
}

export function sliceDashboard(
  data: DashboardResponse,
  range: DateRange
): DashboardResponse {
  const series: DashboardResponse["series"] = {};
  const totals: Record<string, number> = {};
  for (const [metric, points] of Object.entries(data.series)) {
    const sliced = sliceSeries(points, range);
    series[metric] = sliced;
    totals[metric] = Number(
      sliced.reduce((sum, p) => sum + p.value, 0).toFixed(4)
    );
  }
  const dau = series.dau ?? [];
  const dauValues = dau.map((p) => p.value).filter((v) => v > 0);
  const avg_dau = dauValues.length
    ? Math.round((dauValues.reduce((a, b) => a + b, 0) / dauValues.length) * 10) /
      10
    : 0;
  const peak_dau = Math.max(0, ...dau.map((p) => p.value));
  const error_rate_pct =
    totals.app_opens > 0
      ? Math.round((100 * (totals.errors ?? 0) / totals.app_opens) * 100) / 100
      : null;

  return {
    from: range.from,
    to: range.to,
    series,
    totals,
    avg_dau,
    peak_dau,
    error_rate_pct,
  };
}

export function rangeInside(outer: DateRange, inner: DateRange) {
  return inner.from >= outer.from && inner.to <= outer.to;
}

export function insightVsAverage(
  points: { date: string; value: number }[] | undefined,
  label: string
) {
  const values = (points ?? []).map((p) => p.value);
  if (values.length < 2) return `${label} — not enough days yet.`;
  const last = values[values.length - 1] ?? 0;
  const prior = values.slice(0, -1);
  const avg = prior.reduce((a, b) => a + b, 0) / prior.length;
  if (avg <= 0) return `${label} is ${Math.round(last)} today.`;
  const delta = ((last - avg) / avg) * 100;
  const direction = delta >= 0 ? "above" : "below";
  return `${label} is ${Math.abs(delta).toFixed(0)}% ${direction} the period average.`;
}

export function shareInsight(part: number, whole: number, label: string) {
  if (whole <= 0) return `${label} — no sessions in range.`;
  return `${label} are ${Math.round((100 * part) / whole)}% of sessions.`;
}

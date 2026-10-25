"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, fmt } from "@/lib/api";
import { Bars, Card, CardTitle, Empty, ErrorBox, Loading, PageTitle, RangePicker, Stat } from "@/components/ui";

type Row = { calls: number; tokens: number; cost_usd: number };
type Costs = {
  revenue_usd: number; cost_usd: number; margin_usd: number; margin_pct: number | null; unpriced_tokens: number;
  by_feature: (Row & { feature: string })[]; by_model: (Row & { provider: string; model: string })[];
  per_day: { date: string; cost_usd: number }[];
  top_users: (Row & { user_id: string; email: string })[];
};

const FEATURE: Record<string, string> = { command: "Commands", guide_step: "Guide steps", agent_task: "Background jobs", task_notification: "Job updates", onboarding: "Onboarding" };

export default function CostsPage() {
  const [days, setDays] = useState(30);
  const q = useQuery({ queryKey: ["costs", days], queryFn: () => api<Costs>(`/admin/costs?days=${days}`) });
  return (
    <>
      <PageTitle title="Cost & margin" subtitle="AI model spend against revenue collected." actions={<RangePicker value={days} onChange={setDays} />} />
      {q.isLoading ? <Loading /> : q.error || !q.data ? <ErrorBox error={q.error} /> : (
        <div className="grid gap-5">
          {q.data.unpriced_tokens > 0 ? (
            <p className="rounded-[20px] bg-peach/60 px-5 py-3 text-[13px]">
              {fmt.num(q.data.unpriced_tokens)} Gemini tokens have no price yet, so the cost below is too low. Add verified rates in backend/app/llm_usage.py (GEMINI_PRICING_PER_1M).
            </p>
          ) : null}
          <div className="grid gap-5 md:grid-cols-3">
            <Stat label="Revenue" value={fmt.usd(q.data.revenue_usd, 2)} />
            <Stat label="AI cost" value={fmt.usd(q.data.cost_usd, 2)} />
            <Stat tone={q.data.margin_usd < 0 ? "plain" : "lime"} label="Gross margin" value={fmt.usd(q.data.margin_usd, 2)} hint={q.data.margin_pct == null ? "no revenue in range" : `${q.data.margin_pct}% of revenue`} />
          </div>
          <Card>
            <CardTitle>Cost per day</CardTitle>
            <Bars data={q.data.per_day.map((d) => ({ label: fmt.date(d.date), value: d.cost_usd }))} format={(n) => fmt.usd(n, 3)} />
          </Card>
          <div className="grid gap-5 xl:grid-cols-3">
            <Card>
              <CardTitle>By feature</CardTitle>
              {q.data.by_feature.length ? q.data.by_feature.map((r) => (
                <div key={r.feature} className="flex items-center justify-between border-b border-line py-2.5 text-[14px] last:border-0">
                  <span>{FEATURE[r.feature] ?? r.feature}</span>
                  <span className="text-right"><span className="tabular font-semibold">{fmt.usd(r.cost_usd, 3)}</span><span className="ml-2 text-[12px] text-muted">{fmt.num(r.calls)} calls</span></span>
                </div>
              )) : <Empty>No model calls.</Empty>}
            </Card>
            <Card>
              <CardTitle>By model</CardTitle>
              {q.data.by_model.map((r) => (
                <div key={r.provider + r.model} className="flex items-center justify-between border-b border-line py-2.5 text-[14px] last:border-0">
                  <span className="min-w-0 truncate">{r.model.replace("models/", "")}</span>
                  <span className="shrink-0 text-right"><span className="tabular font-semibold">{fmt.num(r.tokens)}</span><span className="ml-2 text-[12px] text-muted">tokens</span></span>
                </div>
              ))}
            </Card>
            <Card>
              <CardTitle>Heaviest users</CardTitle>
              {q.data.top_users.map((r) => (
                <Link key={r.user_id} href={`/dashboard/users/${r.user_id}`} className="flex items-center justify-between border-b border-line py-2.5 text-[14px] last:border-0 hover:opacity-80">
                  <span className="min-w-0 truncate">{r.email}</span>
                  <span className="tabular shrink-0 font-semibold">{fmt.num(r.tokens)}</span>
                </Link>
              ))}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

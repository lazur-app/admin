"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, fmt } from "@/lib/api";
import { Card, CardTitle, Delta, Empty, ErrorBox, Loading, PageTitle, Pill, RangePicker, Stat } from "@/components/ui";

type Revenue = {
  mrr: { mrr_usd: number; by_plan: Record<string, number>; paying: number; discounted?: number };
  revenue_usd: number; previous_revenue_usd: number;
  orders: { user_id: string; email: string; amount_usd: number; status: string; reason: string | null; paid_at: string | null; created_at: string | null }[];
};

const PLAN = (k: string) => {
  const [plan, interval] = k.split("_");
  return `${plan === "power" ? "Power" : "Pro"} · ${interval === "year" ? "yearly" : "monthly"}`;
};

export default function RevenuePage() {
  const [days, setDays] = useState(30);
  const q = useQuery({ queryKey: ["revenue", days], queryFn: () => api<Revenue>(`/admin/revenue?days=${days}`) });
  return (
    <>
      <PageTitle title="Revenue" subtitle="From Polar orders and active subscriptions." actions={<RangePicker value={days} onChange={setDays} />} />
      {q.isLoading ? <Loading /> : q.error || !q.data ? <ErrorBox error={q.error} /> : (
        <div className="grid gap-5">
          <div className="grid gap-5 md:grid-cols-3">
            <Stat tone="lime" label="MRR" value={fmt.usd(q.data.mrr.mrr_usd)} hint="yearly plans counted per month" />
            <Stat label="Subscribers" value={fmt.num(q.data.mrr.paying)} hint={q.data.mrr.discounted ? `${q.data.mrr.discounted} on a 100% discount, counted as $0` : undefined} />
            <Stat tone="ink" label={`Collected, last ${days} days`} value={fmt.usd(q.data.revenue_usd, 2)}
              delta={<Delta now={q.data.revenue_usd} before={q.data.previous_revenue_usd} />} />
          </div>
          <div className="grid gap-5 xl:grid-cols-[1fr_1.6fr]">
            <Card>
              <CardTitle>MRR by plan</CardTitle>
              {Object.keys(q.data.mrr.by_plan).length ? (
                <ul className="space-y-3">
                  {Object.entries(q.data.mrr.by_plan).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                    <li key={k} className="flex items-center justify-between"><Pill tone={k.startsWith("power") ? "ink" : "lime"}>{PLAN(k)}</Pill><span className="tabular font-semibold">{fmt.usd(v)}</span></li>
                  ))}
                </ul>
              ) : <Empty>No paying customers yet.</Empty>}
            </Card>
            <Card>
              <CardTitle>Orders</CardTitle>
              {q.data.orders.length ? (
                <div className="divide-y divide-line text-[14px]">
                  {q.data.orders.map((o, i) => (
                    <Link key={i} href={`/dashboard/users/${o.user_id}`} className="flex items-center gap-3 py-2.5 hover:opacity-80">
                      <span className="tabular w-20 font-semibold">{fmt.usd(o.amount_usd, 2)}</span>
                      <Pill tone={o.status === "paid" ? "lime" : o.status === "refunded" ? "rose" : "gray"}>{o.status}</Pill>
                      <span className="min-w-0 flex-1 truncate">{o.email}</span>
                      <span className="text-[12px] text-muted">{o.reason?.replace(/_/g, " ")}</span>
                      <span className="w-16 text-right text-[12px] text-faint">{fmt.date(o.paid_at ?? o.created_at)}</span>
                    </Link>
                  ))}
                </div>
              ) : <Empty>No orders in this range.</Empty>}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

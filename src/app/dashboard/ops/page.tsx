"use client";

import { useQuery } from "@tanstack/react-query";
import { api, fmt } from "@/lib/api";
import { Card, CardTitle, Empty, ErrorBox, Loading, PageTitle, Pill } from "@/components/ui";

type Webhooks = { items: { event_type: string; error: string | null; processed_at: string | null; created_at: string | null }[] };
type Audit = { items: { admin: string; action: string; target: string | null; at: string | null }[] };

export default function OpsPage() {
  const hooks = useQuery({ queryKey: ["webhooks"], queryFn: () => api<Webhooks>("/admin/ops/webhooks?limit=50") });
  const audit = useQuery({ queryKey: ["audit"], queryFn: () => api<Audit>("/admin/audit?limit=100") });
  return (
    <>
      <PageTitle title="Ops & audit" subtitle="Billing webhooks, and every admin sign-in and change." />
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardTitle>Billing webhooks</CardTitle>
          {hooks.isLoading ? <Loading /> : hooks.error ? <ErrorBox error={hooks.error} /> : hooks.data?.items.length ? (
            <div className="divide-y divide-line text-[14px]">
              {hooks.data.items.map((h, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5">
                  <Pill tone={h.error ? "rose" : h.processed_at ? "lime" : "gray"}>{h.error ? "error" : h.processed_at ? "ok" : "pending"}</Pill>
                  <span className="min-w-0 flex-1 truncate">{h.event_type}</span>
                  <span className="text-[12px] text-faint">{fmt.ago(h.created_at)}</span>
                </div>
              ))}
            </div>
          ) : <Empty>No webhooks received.</Empty>}
        </Card>
        <Card>
          <CardTitle>Admin audit log</CardTitle>
          {audit.isLoading ? <Loading /> : audit.error ? <ErrorBox error={audit.error} /> : audit.data?.items.length ? (
            <div className="divide-y divide-line text-[14px]">
              {audit.data.items.map((a, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5">
                  <Pill tone={a.action.includes("denied") || a.action.includes("failed") ? "rose" : a.action.startsWith("plan_") ? "peach" : "gray"}>{a.action.replace(/_/g, " ")}</Pill>
                  <span className="min-w-0 flex-1 truncate text-muted">{a.admin}{a.target ? ` → ${a.target.slice(0, 8)}` : ""}</span>
                  <span className="text-[12px] text-faint">{fmt.ago(a.at)}</span>
                </div>
              ))}
            </div>
          ) : <Empty>No admin activity yet.</Empty>}
        </Card>
      </div>
    </>
  );
}

"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, fmt } from "@/lib/api";
import { Card, CardTitle, Empty, ErrorBox, Loading, PageTitle, Pill, RangePicker, Stat } from "@/components/ui";

type Item = { label: string; count: number; users?: number };
type Gaps = {
  capability_gaps: Item[]; failed_actions: Item[]; limits: Item[]; errors: AppError[];
  retries: number; commands: number; jobs: Record<string, number>; job_failures: Item[];
};

type AppError = { label: string; component: string; count: number; users: number; last_at: string | null; app_version: string | null };

/** App errors by message: what broke, where, how often, for how many people, last seen. */
function Errors({ items }: { items: AppError[] }) {
  if (!items.length) return <Empty>No errors reported by the app.</Empty>;
  return (
    <div className="divide-y divide-line">
      {items.map((e, i) => (
        <div key={i} className="flex items-start gap-3 py-2.5">
          <Pill tone={e.component === "promise" ? "peach" : "rose"}>{e.component}</Pill>
          <code className="min-w-0 flex-1 break-words font-mono text-[12.5px] leading-relaxed">{e.label}</code>
          <span className="shrink-0 text-right text-[12px] text-muted">
            <span className="tabular font-semibold text-ink">{e.count}</span> times · {e.users} people
            <br />last {fmt.ago(e.last_at)}{e.app_version ? ` · ${e.app_version}` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

function Ranked({ items, empty, unit = "times" }: { items: Item[]; empty: string; unit?: string }) {
  if (!items.length) return <Empty>{empty}</Empty>;
  const max = Math.max(...items.map((i) => i.count));
  return (
    <div className="space-y-2.5">
      {items.map((i) => (
        <div key={i.label}>
          <div className="mb-1 flex items-center justify-between text-[14px]">
            <span className="capitalize">{i.label.replace(/_/g, " ")}</span>
            <span className="text-[12px] text-muted"><span className="tabular font-semibold text-ink">{i.count}</span> {unit}{i.users != null ? ` · ${i.users} people` : ""}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full bg-peach" style={{ width: `${(i.count / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

export default function GapsPage() {
  const [days, setDays] = useState(30);
  const q = useQuery({ queryKey: ["gaps", days], queryFn: () => api<Gaps>(`/admin/gaps?days=${days}`) });
  return (
    <>
      <PageTitle title="Where we fall short" subtitle="Things people asked for that Lazur couldn't do, plus failures and limits. Categories only, never what anyone said."
        actions={<RangePicker value={days} onChange={setDays} />} />
      {q.isLoading ? <Loading /> : q.error || !q.data ? <ErrorBox error={q.error} /> : (() => {
        const d = q.data;
        const started = Object.values(d.jobs).reduce((a, b) => a + b, 0);
        return (
          <div className="grid gap-5">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              <Stat tone="lime" label="Commands" value={fmt.num(d.commands)} />
              <Stat label="Asked again mid-answer" value={fmt.num(d.retries)} hint={d.commands ? `${Math.round((100 * d.retries) / d.commands)}% of commands` : undefined} />
              <Stat label="Background jobs" value={fmt.num(started)} hint={`${d.jobs.done ?? 0} done · ${d.jobs.failed ?? 0} failed`} />
              <Stat tone="ink" label="Couldn't do it" value={fmt.num(d.capability_gaps.reduce((a, b) => a + b.count, 0))} hint={`${d.capability_gaps.length} kinds of request`} />
            </div>
            <div className="grid gap-5 xl:grid-cols-2">
              <Card><CardTitle>Most wanted, not possible yet</CardTitle><Ranked items={d.capability_gaps} empty="Nothing yet. Lazur hasn't had to say no." /></Card>
              <Card><CardTitle>Why jobs failed</CardTitle><Ranked items={d.job_failures} empty="No failed jobs." unit="jobs" /></Card>
              <Card><CardTitle>Actions that failed</CardTitle><Ranked items={d.failed_actions} empty="No failed actions." /></Card>
              <Card><CardTitle>Limits hit</CardTitle><Ranked items={d.limits} empty="Nobody hit a limit." /></Card>
            </div>
            <Card><CardTitle aside={<span className="text-[13px] text-muted">by message, most frequent first</span>}>App errors</CardTitle><Errors items={d.errors} /></Card>
          </div>
        );
      })()}
    </>
  );
}

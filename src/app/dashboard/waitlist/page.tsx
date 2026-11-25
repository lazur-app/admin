"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, fmt } from "@/lib/api";
import { Bars, Card, CardTitle, Empty, ErrorBox, Loading, PageTitle, Pill, RangePicker, Stat } from "@/components/ui";

type Summary = {
  total: number; last_7_days: number; in_period: number;
  reached: number; email_failed: number; not_emailed: number;
  contacted: number; replied: number;
  made_account: number; made_account_after: number; opened_app: number; paid: number;
  rates: { reached: number; replied: number; made_account: number; opened_app: number; paid: number };
  per_day: { day: string; count: number }[];
  by_platform: { key: string; count: number }[];
  by_source: { key: string; count: number }[];
};

type Lead = {
  id: string; email: string; platform: string | null; source: string | null;
  excited_to_use_for: string | null; created_at: string | null;
  email_status: string | null; emailed_at: string | null; email_error: string | null;
  status: string; replied_at: string | null; admin_notes: string | null;
  user_id: string | null; signed_up_at: string | null; app_opened_at: string | null; paid_at: string | null;
};

const STATUSES = ["new", "contacted", "replied", "not_interested"] as const;
const label = (s: string) => s.replace("_", " ");
const pct = (r: number) => `${Math.round(r * 1000) / 10}%`;
// The short forms send a placeholder answer ("windows waitlist"); don't show it as theirs.
const realAnswer = (a: string | null) => (a && !a.endsWith(" waitlist") ? a : null);

export default function WaitlistPage() {
  const qc = useQueryClient();
  const [days, setDays] = useState(30);
  const [status, setStatus] = useState<string>("");
  const [converted, setConverted] = useState<string>("");
  const [search, setSearch] = useState("");

  const summary = useQuery({ queryKey: ["waitlist-summary", days], queryFn: () => api<Summary>(`/admin/waitlist/summary?days=${days}`) });
  const params = new URLSearchParams({ limit: "200" });
  if (status) params.set("status", status);
  if (converted) params.set("converted", converted);
  if (search.trim()) params.set("q", search.trim());
  const list = useQuery({ queryKey: ["waitlist", params.toString()], queryFn: () => api<{ total: number; items: Lead[] }>(`/admin/waitlist?${params}`) });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { status?: string; admin_notes?: string } }) =>
      api(`/admin/waitlist/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["waitlist"] });
      qc.invalidateQueries({ queryKey: ["waitlist-summary"] });
    },
  });

  const s = summary.data;
  return (
    <>
      <PageTitle title="Waitlist" subtitle="Everyone who left their email on the website, whether we reached them, and what they did next."
        actions={<RangePicker value={days} onChange={setDays} />} />

      {summary.isLoading ? <Loading /> : summary.error || !s ? <ErrorBox error={summary.error} /> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat tone="ink" label="Signed up" value={fmt.num(s.total)} hint={`${fmt.num(s.last_7_days)} this week · ${fmt.num(s.in_period)} in ${days} days`} />
            <Stat label="Reached by email" value={fmt.num(s.reached)} hint={`${pct(s.rates.reached)} · ${fmt.num(s.email_failed)} failed · ${fmt.num(s.not_emailed)} never emailed`} />
            <Stat label="Replied" value={fmt.num(s.replied)} hint={`${pct(s.rates.replied)} · ${fmt.num(s.contacted)} followed up`} />
            <Stat tone="lime" label="Paid" value={fmt.num(s.paid)} hint={`${pct(s.rates.paid)} of the waitlist`} />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Card className="p-6 lg:col-span-2">
              <CardTitle>Signups per day</CardTitle>
              <Bars data={s.per_day.map((d) => ({ label: fmt.date(d.day), value: d.count }))} />
            </Card>
            <Card className="p-6">
              <CardTitle>Conversion</CardTitle>
              <Funnel steps={[
                ["On the waitlist", s.total],
                ["Reached by email", s.reached],
                ["Made an account", s.made_account],
                ["Opened the app", s.opened_app],
                ["Paid", s.paid],
              ]} />
              <p className="mt-3 text-[12px] text-muted">{fmt.num(s.made_account_after)} of the accounts were made after joining the waitlist.</p>
            </Card>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Breakdown title="By platform" rows={s.by_platform} />
            <Breakdown title="By form" rows={s.by_source} />
          </div>
        </>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search email"
          className="h-10 rounded-full bg-card px-4 text-[14px] outline-none" />
        <Filter value={status} onChange={setStatus} options={[["", "Any status"], ...STATUSES.map((x) => [x, label(x)] as [string, string])]} />
        <Filter value={converted} onChange={setConverted} options={[["", "Anyone"], ["none", "No account yet"], ["account", "Made an account"], ["app", "Opened the app"], ["paid", "Paid"]]} />
        {list.data ? <span className="ml-auto text-[13px] text-muted">{fmt.num(list.data.total)} people</span> : null}
      </div>

      <div className="mt-4">
        {list.isLoading ? <Loading /> : list.error || !list.data ? <ErrorBox error={list.error} /> : list.data.items.length ? (
          <div className="grid gap-3">
            {list.data.items.map((l) => <Row key={l.id} lead={l} onUpdate={(body) => update.mutate({ id: l.id, body })} />)}
          </div>
        ) : <Empty>No one matches.</Empty>}
      </div>
    </>
  );
}

function Row({ lead: l, onUpdate }: { lead: Lead; onUpdate: (b: { status?: string; admin_notes?: string }) => void }) {
  const [notes, setNotes] = useState(l.admin_notes ?? "");
  const answer = realAnswer(l.excited_to_use_for);
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[14px] font-semibold">{l.email}</span>
        {l.platform ? <Pill tone="sky">{l.platform}</Pill> : null}
        {l.source ? <Pill>{l.source}</Pill> : null}
        <span className="text-[12px] text-faint">joined {fmt.ago(l.created_at)}</span>
        <select value={l.status} onChange={(e) => onUpdate({ status: e.target.value })}
          className="ml-auto h-8 rounded-full bg-surface px-3 text-[12px] capitalize">
          {STATUSES.map((x) => <option key={x} value={x}>{label(x)}</option>)}
        </select>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
        {l.email_status === "sent" ? <Pill tone="lime">emailed {fmt.ago(l.emailed_at)}</Pill>
          : l.email_status === "failed" ? <span title={l.email_error ?? ""}><Pill tone="rose">email failed</Pill></span>
          : <Pill>not emailed</Pill>}
        {l.replied_at ? <Pill tone="lime">replied {fmt.ago(l.replied_at)}</Pill> : null}
        {l.user_id ? <Link href={`/dashboard/users/${l.user_id}`}><Pill tone="sky">account {fmt.ago(l.signed_up_at)}</Pill></Link> : null}
        {l.app_opened_at ? <Pill tone="sky">opened the app</Pill> : null}
        {l.paid_at ? <Pill tone="ink">paid {fmt.ago(l.paid_at)}</Pill> : null}
      </div>
      {answer ? <p className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed">“{answer}”</p> : null}
      <input value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== (l.admin_notes ?? "") && onUpdate({ admin_notes: notes })}
        placeholder="Notes (saved when you click away)" className="mt-3 h-9 w-full rounded-xl bg-surface px-3 text-[13px] outline-none" />
    </Card>
  );
}

function Funnel({ steps }: { steps: [string, number][] }) {
  const top = Math.max(1, steps[0][1]);
  return (
    <div className="grid gap-2.5">
      {steps.map(([name, n]) => (
        <div key={name}>
          <div className="flex justify-between text-[13px]"><span>{name}</span><span className="tabular text-muted">{fmt.num(n)} · {pct(n / top)}</span></div>
          <div className="mt-1 h-2 rounded-full bg-surface"><div className="h-2 rounded-full bg-ink" style={{ width: `${(n / top) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

function Breakdown({ title, rows }: { title: string; rows: { key: string; count: number }[] }) {
  return (
    <Card className="p-6">
      <CardTitle>{title}</CardTitle>
      {rows.length ? rows.map((r) => (
        <div key={r.key} className="flex justify-between border-b border-line py-2 text-[13px] last:border-0">
          <span>{r.key}</span><span className="tabular text-muted">{fmt.num(r.count)}</span>
        </div>
      )) : <p className="text-[13px] text-muted">Nothing yet.</p>}
    </Card>
  );
}

function Filter({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 rounded-full bg-card px-4 text-[13px] capitalize">
      {options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
    </select>
  );
}

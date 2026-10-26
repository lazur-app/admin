"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api, fmt } from "@/lib/api";
import { SEGMENT_GROUPS, SEGMENTS } from "@/lib/segments";
import type { UserRow } from "@/lib/types";
import { Card, ErrorBox, Loading, PageTitle, Pill, planLabel, planTone } from "@/components/ui";

type UsersResponse = { total: number; items: UserRow[]; segment: string | null; segment_label: string | null; from: string | null; to: string | null };

const LIMIT = 50;
const PRESETS = [7, 30, 90] as const;
const control = "h-11 rounded-full bg-card px-5 text-[14px] outline-none";

function Users() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const segment = params.get("segment") ?? "";
  const days = params.get("days") ?? "";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const onboarding = params.get("onboarding") ?? "";
  const sort = params.get("sort") ?? "last_active";
  const page = Number(params.get("page") ?? 0);
  const [q, setQ] = useState(params.get("q") ?? "");
  const seg = SEGMENTS[segment];
  const custom = Boolean(from);
  // A range segment with no range picked uses 30 days (as the API does), so say so.
  const shownDays = !custom && (days || (seg?.range ? "30" : ""));

  /** Update the URL (the filters live there, so links and reloads keep them). */
  const set = (next: Record<string, string | null>, keepPage = false) => {
    // Read the live URL, not this render's params: the search debounce can fire after other changes.
    const p = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(next)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    if (!keepPage) p.delete("page");
    router.replace(`${pathname}?${p}`, { scroll: false });
  };

  // The top bar's search also lands here via ?q=.
  const urlQ = params.get("q") ?? "";
  const [seenUrlQ, setSeenUrlQ] = useState(urlQ);
  if (urlQ !== seenUrlQ) {
    setSeenUrlQ(urlQ);
    if (q.trim() !== urlQ) setQ(urlQ);
  }

  useEffect(() => {
    const t = setTimeout(() => {
      if (q.trim() !== (new URLSearchParams(window.location.search).get("q") ?? "")) set({ q: q.trim() || null });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const query = new URLSearchParams({ limit: String(LIMIT), offset: String(page * LIMIT), sort });
  for (const [k, v] of Object.entries({ segment, days, from, to, onboarding, q: params.get("q") ?? "" })) if (v) query.set(k, v);
  const users = useQuery({
    queryKey: ["users", query.toString()],
    queryFn: () => api<UsersResponse>(`/admin/users?${query}`),
    placeholderData: (prev) => prev,
  });
  const data = users.data;

  const rangeText = data?.from
    ? data.from === data.to ? fmt.date(`${data.from}T00:00:00Z`) : `${fmt.date(`${data.from}T00:00:00Z`)} – ${fmt.date(`${data.to}T00:00:00Z`)}`
    : null;
  const filtered = Boolean(segment || days || from || onboarding || params.get("q"));
  const subtitle = data
    ? [`${fmt.num(data.total)} ${data.total === 1 ? "person" : "people"}`, seg?.label ?? (data.from ? "Joined" : null), rangeText].filter(Boolean).join(" · ")
    : undefined;

  const copyEmails = () => {
    if (data) void navigator.clipboard.writeText(data.items.map((u) => u.email).join(", "));
  };

  return (
    <>
      <PageTitle title="Users" subtitle={subtitle}
        actions={filtered ? <button type="button" onClick={() => { setQ(""); router.replace(pathname); }} className="rounded-full bg-card px-4 py-2 text-[13px] text-muted hover:text-ink">Clear filters</button> : null} />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search email or name" className={`${control} w-[260px] placeholder:text-faint`} />
        <select value={segment} onChange={(e) => set({ segment: e.target.value || null })} className={`${control} pr-10`} aria-label="Who">
          <option value="">Everyone</option>
          {SEGMENT_GROUPS.map((g) => (
            <optgroup key={g.title} label={g.title}>
              {g.items.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </optgroup>
          ))}
        </select>

        {!seg || seg.range ? (
          <div className="flex items-center rounded-full bg-card p-1" role="group" aria-label="Date range">
            {!seg ? (
              <button type="button" onClick={() => set({ days: null, from: null, to: null })}
                className={`rounded-full px-4 py-2 text-[13px] font-medium ${!shownDays && !custom ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>All time</button>
            ) : null}
            {PRESETS.map((d) => (
              <button key={d} type="button" onClick={() => set({ days: String(d), from: null, to: null })}
                className={`rounded-full px-4 py-2 text-[13px] font-medium ${shownDays === String(d) ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>{d}d</button>
            ))}
            <button type="button" onClick={() => {
              const today = new Date().toISOString().slice(0, 10);
              set({ days: null, from: from || today, to: to || today });
            }} className={`rounded-full px-4 py-2 text-[13px] font-medium ${custom ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>Dates</button>
          </div>
        ) : null}
        {custom ? (
          <div className="flex items-center gap-2 text-[13px] text-muted">
            <input type="date" value={from} max={to || undefined} onChange={(e) => set({ from: e.target.value || null })} className={`${control} px-4`} aria-label="From" />
            to
            <input type="date" value={to} min={from || undefined} onChange={(e) => set({ to: e.target.value || null })} className={`${control} px-4`} aria-label="To" />
            <span className="text-[12px] text-faint">UTC days</span>
          </div>
        ) : null}

        <select value={onboarding} onChange={(e) => set({ onboarding: e.target.value || null })} className={`${control} pr-10`} aria-label="Onboarding">
          <option value="">Any onboarding</option>
          <option value="true">Finished onboarding</option>
          <option value="false">Not finished</option>
        </select>
        <select value={sort} onChange={(e) => set({ sort: e.target.value === "last_active" ? null : e.target.value })} className={`${control} pr-10`} aria-label="Sort">
          <option value="last_active">Last active first</option>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
        {data?.items.length ? (
          <button type="button" onClick={copyEmails} className="ml-auto rounded-full bg-card px-4 py-2 text-[13px] text-muted hover:text-ink">
            Copy {data.items.length} emails
          </button>
        ) : null}
      </div>

      {users.isLoading ? <Loading /> : users.error ? <ErrorBox error={users.error} /> : data ? (
        <Card className={`overflow-x-auto p-0 transition-opacity ${users.isFetching ? "opacity-60" : ""}`}>
          {data.items.length === 0 ? (
            <p className="px-6 py-10 text-center text-[14px] text-muted">No one matches these filters.</p>
          ) : (
            <table className="w-full min-w-[900px] text-[14px]">
              <thead>
                <tr className="text-left text-[12px] text-muted">
                  {["Person", "Plan", "Words (month)", "AI actions (month)", "AI cost (30d)", "Onboarding", "Last active", "Joined"].map((h) => (
                    <th key={h} className="bg-surface px-5 py-3.5 font-medium first:rounded-tl-[28px] last:rounded-tr-[28px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((u) => (
                  <tr key={u.id} className="hover:bg-surface/60">
                    <td className="px-5 py-3.5">
                      <Link href={`/dashboard/users/${u.id}`} className="flex items-center gap-3">
                        {u.avatar_url ? <img src={u.avatar_url} alt="" className="h-9 w-9 rounded-full" /> : <span className="grid h-9 w-9 place-items-center rounded-full bg-surface text-[12px] font-semibold">{(u.name || u.email)[0].toUpperCase()}</span>}
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{u.name || u.email.split("@")[0]}</span>
                          <span className="block truncate text-[12px] text-muted">{u.email}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5"><Pill tone={planTone(u.plan)}>{planLabel(u.plan)}</Pill>
                      {u.plan === "pro_trial" && u.trial_ends_at ? <span className="ml-2 text-[12px] text-muted">ends {fmt.date(u.trial_ends_at)}</span> : null}</td>
                    <td className="tabular px-5 py-3.5">{fmt.num(u.words_mtd)}</td>
                    <td className="tabular px-5 py-3.5">{fmt.num(u.actions_mtd)}</td>
                    <td className="tabular px-5 py-3.5">{fmt.usd(u.cost_30d_usd, 2)}</td>
                    <td className="px-5 py-3.5">{u.onboarding_completed ? <Pill tone="lime">Done</Pill> : <Pill>Not yet</Pill>}</td>
                    <td className="px-5 py-3.5 text-muted">{fmt.ago(u.last_active_at)}</td>
                    <td className="px-5 py-3.5 text-muted">{fmt.date(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {data.total > LIMIT ? (
            <div className="flex items-center justify-end gap-2 p-4 text-[13px] text-muted">
              {page * LIMIT + 1}–{Math.min(data.total, (page + 1) * LIMIT)} of {fmt.num(data.total)}
              <button disabled={page === 0} onClick={() => set({ page: page - 1 ? String(page - 1) : null }, true)} className="rounded-full bg-surface px-4 py-2 text-ink disabled:opacity-40">Previous</button>
              <button disabled={(page + 1) * LIMIT >= data.total} onClick={() => set({ page: String(page + 1) }, true)} className="rounded-full bg-surface px-4 py-2 text-ink disabled:opacity-40">Next</button>
            </div>
          ) : null}
        </Card>
      ) : null}
    </>
  );
}

export default function UsersPage() {
  return <Suspense fallback={<Loading />}><Users /></Suspense>;
}

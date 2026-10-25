"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api, fmt } from "@/lib/api";
import type { UserRow } from "@/lib/types";
import { Card, ErrorBox, Loading, PageTitle, Pill, planLabel, planTone } from "@/components/ui";

function Users() {
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [page, setPage] = useState(0);
  const limit = 50;
  const users = useQuery({
    queryKey: ["users", q, page],
    queryFn: () => api<{ total: number; items: UserRow[] }>(`/admin/users?limit=${limit}&offset=${page * limit}${q ? `&q=${encodeURIComponent(q)}` : ""}`),
  });

  return (
    <>
      <PageTitle title="Users" subtitle={users.data ? `${users.data.total} people` : undefined}
        actions={<input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Filter by email or name"
          className="h-11 w-[280px] rounded-full bg-card px-5 text-[14px] outline-none placeholder:text-faint" />} />
      {users.isLoading ? <Loading /> : users.error ? <ErrorBox error={users.error} /> : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-[14px]">
            <thead>
              <tr className="text-left text-[12px] text-muted">
                {["Person", "Plan", "Words (month)", "AI actions (month)", "AI cost (30d)", "Onboarding", "Last active", "Joined"].map((h) => (
                  <th key={h} className="bg-surface px-5 py-3.5 font-medium first:rounded-tl-[28px] last:rounded-tr-[28px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.data?.items.map((u) => (
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
          {users.data && users.data.total > limit ? (
            <div className="flex items-center justify-end gap-2 p-4">
              <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded-full bg-surface px-4 py-2 text-[13px] disabled:opacity-40">Previous</button>
              <button disabled={(page + 1) * limit >= users.data.total} onClick={() => setPage((p) => p + 1)} className="rounded-full bg-surface px-4 py-2 text-[13px] disabled:opacity-40">Next</button>
            </div>
          ) : null}
        </Card>
      )}
    </>
  );
}

export default function UsersPage() {
  return <Suspense fallback={<Loading />}><Users /></Suspense>;
}

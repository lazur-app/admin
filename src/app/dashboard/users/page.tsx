"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchUsers, downloadExport } from "@/lib/api";
import {
  PageHeader,
  ErrorBanner,
  DataTable,
  Badge,
  tableHeadClass,
  tableCellClass,
} from "@/components/ui";

function planTone(plan: string) {
  const name = plan.toLowerCase();
  if (name.includes("power")) return "primary" as const;
  if (name.includes("pro")) return "success" as const;
  if (name.includes("trial")) return "warn" as const;
  return "muted" as const;
}

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 200);
    return () => clearTimeout(t);
  }, [search]);

  const usersQuery = useQuery({
    queryKey: ["admin-users", query],
    queryFn: () => fetchUsers({ search: query || undefined, limit: 50 }),
    placeholderData: keepPreviousData,
  });

  const items = usersQuery.data?.items ?? [];
  const total = usersQuery.data?.total ?? 0;
  const error =
    usersQuery.error instanceof Error ? usersQuery.error.message : null;

  return (
    <div>
      <PageHeader title="Users" description={`${total.toLocaleString()} total`} />

      <form
        className="mb-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(search.trim());
        }}
      >
        <input
          type="search"
          placeholder="Search by email or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => downloadExport("/admin/export/users")}
          className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
        >
          Export CSV
        </button>
      </form>

      {error && <ErrorBanner message={error} />}

      <DataTable>
        <table className="w-full text-left text-sm">
          <thead className={tableHeadClass}>
            <tr>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Words</th>
              <th className="px-4 py-3 font-medium">Commands</th>
              <th className="px-4 py-3 font-medium">Admin</th>
            </tr>
          </thead>
          <tbody>
            {usersQuery.isLoading && (
              <tr>
                <td colSpan={5} className={`${tableCellClass} text-center text-zinc-500`}>
                  Loading…
                </td>
              </tr>
            )}
            {!usersQuery.isLoading &&
              items.map((u) => (
                <tr key={u.id} className="border-t border-white/5 hover:bg-zinc-800/50">
                  <td className={tableCellClass}>
                    <Link
                      href={`/dashboard/users/${u.id}`}
                      className="font-medium text-zinc-100 hover:underline"
                    >
                      {u.email}
                    </Link>
                    {u.name && (
                      <p className="text-xs text-zinc-500">{u.name}</p>
                    )}
                  </td>
                  <td className={tableCellClass}>
                    <Badge tone={planTone(u.plan)}>{u.plan}</Badge>
                  </td>
                  <td className={`${tableCellClass} text-zinc-400`}>
                    {u.word_quota_used.toLocaleString()} /{" "}
                    {u.word_quota_limit.toLocaleString()}
                  </td>
                  <td className={`${tableCellClass} text-zinc-400`}>
                    {u.command_quota_used} / {u.command_quota_limit}
                  </td>
                  <td className={tableCellClass}>
                    {u.is_admin ? (
                      <Badge tone="primary">Admin</Badge>
                    ) : (
                      <span className="text-zinc-600">-</span>
                    )}
                  </td>
                </tr>
              ))}
            {!usersQuery.isLoading && items.length === 0 && (
              <tr>
                <td colSpan={5} className={`${tableCellClass} text-center text-zinc-500`}>
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </DataTable>
    </div>
  );
}

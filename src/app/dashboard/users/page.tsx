"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { fetchUsers, type AdminUserRow, downloadExport } from "@/lib/api";
import {
  PageHeader,
  ErrorBanner,
  DataTable,
  tableHeadClass,
  tableCellClass,
} from "@/components/ui";

export default function UsersPage() {
  const [items, setItems] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (searchTerm: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchUsers({ search: searchTerm || undefined, limit: 50 });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(query);
  }, [query, load]);

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
          className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => downloadExport("/admin/export/users")}
          className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
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
            {loading && (
              <tr>
                <td colSpan={5} className={`${tableCellClass} text-center text-zinc-500`}>
                  Loading…
                </td>
              </tr>
            )}
            {!loading &&
              items.map((u) => (
                <tr key={u.id} className="border-t border-zinc-100 hover:bg-zinc-50">
                  <td className={tableCellClass}>
                    <Link
                      href={`/dashboard/users/${u.id}`}
                      className="font-medium text-zinc-900 hover:underline"
                    >
                      {u.email}
                    </Link>
                    {u.name && (
                      <p className="text-xs text-zinc-500">{u.name}</p>
                    )}
                  </td>
                  <td className={tableCellClass}>{u.plan}</td>
                  <td className={`${tableCellClass} text-zinc-600`}>
                    {u.word_quota_used.toLocaleString()} /{" "}
                    {u.word_quota_limit.toLocaleString()}
                  </td>
                  <td className={`${tableCellClass} text-zinc-600`}>
                    {u.command_quota_used} / {u.command_quota_limit}
                  </td>
                  <td className={tableCellClass}>
                    {u.is_admin ? (
                      <span className="text-zinc-900 font-medium">Yes</span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            {!loading && items.length === 0 && (
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

"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchUsers, type AdminUserRow } from "@/lib/api";

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
      <h1 className="text-2xl font-semibold text-white">Users</h1>
      <p className="mt-1 text-sm text-zinc-400">{total.toLocaleString()} total</p>

      <form
        className="mt-6 flex gap-2"
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
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
        >
          Search
        </button>
      </form>

      {error && (
        <p className="mt-4 text-sm text-red-300">{error}</p>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-800 bg-zinc-900/80 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Words</th>
              <th className="px-4 py-3 font-medium">Commands</th>
              <th className="px-4 py-3 font-medium">Admin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/80">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  Loading…
                </td>
              </tr>
            )}
            {!loading &&
              items.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-900/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-100">{u.email}</p>
                    {u.name && (
                      <p className="text-xs text-zinc-500">{u.name}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{u.plan}</td>
                  <td className="px-4 py-3 text-zinc-400">
                    {u.word_quota_used.toLocaleString()} /{" "}
                    {u.word_quota_limit.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {u.command_quota_used} / {u.command_quota_limit}
                  </td>
                  <td className="px-4 py-3">
                    {u.is_admin ? (
                      <span className="text-violet-400">Yes</span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

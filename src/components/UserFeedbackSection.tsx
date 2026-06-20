"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchFeedback, type AdminFeedbackRow } from "@/lib/api";
import { LoadingState } from "@/components/ui";

function kindLabel(kind: AdminFeedbackRow["kind"]) {
  return kind === "issue" ? "Issue" : "Feedback";
}

export function UserFeedbackSection({ userId }: { userId: string }) {
  const [items, setItems] = useState<AdminFeedbackRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeedback({ user_id: userId, limit: 5 })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch(() => {
        setItems([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Feedback & issues
        </h2>
        {total > 0 && (
          <Link
            href={`/dashboard/feedback?user_id=${userId}`}
            className="text-sm font-medium text-violet-700 hover:underline"
          >
            View all ({total})
          </Link>
        )}
      </div>

      {loading ? (
        <LoadingState className="mt-4" />
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">No submissions from this user yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-zinc-100">
          {items.map((item) => (
            <li key={item.id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900">
                    {kindLabel(item.kind)}
                    {item.category ? ` · ${item.category}` : ""}
                  </p>
                  <p className="mt-1 truncate text-sm text-zinc-600">{item.message}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {item.created_at
                      ? new Date(item.created_at).toLocaleString()
                      : "—"}
                    {item.attachment_count > 0
                      ? ` · ${item.attachment_count} file${item.attachment_count === 1 ? "" : "s"}`
                      : ""}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs capitalize text-zinc-600">
                  {item.status}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

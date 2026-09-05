"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  fetchFeedback,
  fetchFeedbackDetail,
  fetchFeedbackSummary,
  updateFeedback,
  type AdminFeedbackDetail,
  type AdminFeedbackRow,
  type AdminFeedbackSummary,
} from "@/lib/api";
import { FeedbackAttachments } from "@/components/FeedbackAttachments";
import {
  PageHeader,
  ErrorBanner,
  LoadingState,
  DataTable,
  StatCard,
  tableHeadClass,
  tableCellClass,
} from "@/components/ui";

const STATUS_OPTIONS = ["open", "read", "resolved", "archived"] as const;

function kindLabel(kind: AdminFeedbackRow["kind"]) {
  return kind === "issue" ? "Issue" : "Feedback";
}

function categoryLabel(category: string | null) {
  if (!category) return "-";
  if (category === "account") return "Account & Data";
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function statusBadge(status: AdminFeedbackRow["status"]) {
  const styles: Record<AdminFeedbackRow["status"], string> = {
    open: "bg-amber-500/15 text-amber-300",
    read: "bg-sky-500/15 text-sky-300",
    resolved: "bg-emerald-500/15 text-emerald-300",
    archived: "bg-zinc-800 text-zinc-400",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[status]}`}>
      {status}
    </span>
  );
}

export default function FeedbackPageClient() {
  const searchParams = useSearchParams();
  const userIdFilter = searchParams.get("user_id") || "";
  const initialKind = searchParams.get("kind");

  const [items, setItems] = useState<AdminFeedbackRow[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<AdminFeedbackSummary | null>(null);
  const [kindFilter, setKindFilter] = useState<"" | "feedback" | "issue">(
    initialKind === "issue" || initialKind === "feedback" ? initialKind : ""
  );
  const [statusFilter, setStatusFilter] = useState<"" | AdminFeedbackRow["status"]>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminFeedbackDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusDraft, setStatusDraft] = useState<AdminFeedbackRow["status"]>("open");
  const [notesDraft, setNotesDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, summaryRes] = await Promise.all([
        fetchFeedback({
          kind: kindFilter || undefined,
          status: statusFilter || undefined,
          user_id: userIdFilter || undefined,
          limit: 100,
        }),
        fetchFeedbackSummary(),
      ]);
      setItems(listRes.items);
      setTotal(listRes.total);
      setSummary(summaryRes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load feedback");
    } finally {
      setLoading(false);
    }
  }, [kindFilter, statusFilter, userIdFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const row = await fetchFeedbackDetail(id);
      setDetail(row);
      setStatusDraft(row.status);
      setNotesDraft(row.admin_notes || "");

      if (row.status === "open") {
        await updateFeedback(id, { status: "read" });
        setStatusDraft("read");
        setDetail({ ...row, status: "read" });
        void load();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load feedback detail");
      setSelectedId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedId(null);
    setDetail(null);
  };

  const saveDetail = async () => {
    if (!selectedId) return;
    setSaving(true);
    setError(null);
    try {
      await updateFeedback(selectedId, {
        status: statusDraft,
        admin_notes: notesDraft,
      });
      await load();
      closeDetail();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update feedback");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Feedback & issues"
        description="User-submitted product feedback and bug reports from the Lazur app."
      />

      {error && <ErrorBanner message={error} />}

      {summary && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Open issues" value={summary.open_issues} />
          <StatCard label="Open feedback" value={summary.open_feedback} />
          <StatCard label="Total open" value={summary.open} />
          <StatCard label="All submissions" value={summary.total} />
        </div>
      )}

      {userIdFilter && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm text-violet-200">
          <span>Filtering by user</span>
          <Link
            href="/dashboard/feedback"
            className="font-medium underline hover:no-underline"
          >
            Clear filter
          </Link>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value as "" | "feedback" | "issue")}
          className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
        >
          <option value="">All types</option>
          <option value="feedback">Feedback</option>
          <option value="issue">Issues</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "" | AdminFeedbackRow["status"])
          }
          className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            setKindFilter("");
            setStatusFilter("open");
          }}
          className="rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
        >
          Open only
        </button>
        <p className="text-sm text-zinc-500">
          {total.toLocaleString()} result{total === 1 ? "" : "s"}
        </p>
      </div>

      {loading ? (
        <LoadingState />
      ) : (
        <DataTable>
          <table className="w-full text-left text-sm">
            <thead className={tableHeadClass}>
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Message</th>
                <th className="px-4 py-3">Files</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className={`${tableCellClass} text-zinc-500`}>
                    No feedback yet.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    className="cursor-pointer border-t border-white/5 hover:bg-zinc-800/50"
                    onClick={() => void openDetail(item.id)}
                  >
                    <td className={`${tableCellClass} whitespace-nowrap text-xs text-zinc-500`}>
                      {item.created_at
                        ? new Date(item.created_at).toLocaleString()
                        : "-"}
                    </td>
                    <td className={tableCellClass}>
                      <Link
                        href={`/dashboard/users/${item.user_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium text-zinc-100 hover:underline"
                      >
                        {item.user_email}
                      </Link>
                      {item.user_name && (
                        <p className="text-xs text-zinc-500">{item.user_name}</p>
                      )}
                    </td>
                    <td className={tableCellClass}>{kindLabel(item.kind)}</td>
                    <td className={tableCellClass}>{categoryLabel(item.category)}</td>
                    <td className={`${tableCellClass} max-w-[280px]`}>
                      <p className="truncate text-zinc-400">{item.message}</p>
                    </td>
                    <td className={`${tableCellClass} text-zinc-500`}>
                      {item.attachment_count > 0 ? item.attachment_count : "-"}
                    </td>
                    <td className={tableCellClass}>{statusBadge(item.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DataTable>
      )}

      {selectedId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-end bg-black/60"
          onClick={closeDetail}
        >
          <div
            className="h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-zinc-950 p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-semibold text-zinc-50">
                  {detail ? kindLabel(detail.kind) : "Submission"}
                </h2>
                {detail && (
                  <>
                    <p className="text-sm text-zinc-500 mt-1">
                      <Link
                        href={`/dashboard/users/${detail.user_id}`}
                        className="font-medium text-violet-300 hover:underline"
                      >
                        {detail.user_email}
                      </Link>
                      {detail.user_name ? ` · ${detail.user_name}` : ""}
                    </p>
                    {detail.created_at && (
                      <p className="text-xs text-zinc-400 mt-1">
                        Submitted {new Date(detail.created_at).toLocaleString()}
                      </p>
                    )}
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800"
              >
                Close
              </button>
            </div>

            {detailLoading || !detail ? (
              <LoadingState />
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-zinc-500">Category</p>
                    <p className="mt-1 text-zinc-200">{categoryLabel(detail.category)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-zinc-500">Platform</p>
                    <p className="mt-1 text-zinc-200">
                      {detail.platform || "-"}
                      {detail.app_version ? ` · v${detail.app_version}` : ""}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Message</p>
                  <div className="whitespace-pre-wrap rounded-xl border border-white/10 bg-zinc-900 p-4 text-sm text-zinc-200">
                    {detail.message}
                  </div>
                </div>

                <FeedbackAttachments attachments={detail.attachments} />

                <div>
                  <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">
                    Status
                  </label>
                  <select
                    value={statusDraft}
                    onChange={(e) =>
                      setStatusDraft(e.target.value as AdminFeedbackRow["status"])
                    }
                    className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">
                    Admin notes
                  </label>
                  <textarea
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                    placeholder="Internal notes about this report…"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => void saveDetail()}
                  disabled={saving}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

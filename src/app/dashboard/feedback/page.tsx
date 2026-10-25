"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, fmt } from "@/lib/api";
import { Card, Empty, ErrorBox, Loading, PageTitle, Pill } from "@/components/ui";

type Item = { id: string; user_id: string; user_email: string; kind: string; category: string | null; message: string; status: string; app_version: string | null; created_at: string | null; attachment_count: number };
const STATUSES = ["open", "read", "resolved", "archived"] as const;

export default function FeedbackPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("open");
  const q = useQuery({ queryKey: ["feedback", status], queryFn: () => api<{ total: number; items: Item[] }>(`/admin/feedback?limit=100${status ? `&status=${status}` : ""}`) });
  const update = useMutation({
    mutationFn: ({ id, next }: { id: string; next: string }) => api(`/admin/feedback/${id}`, { method: "PATCH", body: JSON.stringify({ status: next }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feedback"] }),
  });
  return (
    <>
      <PageTitle title="Feedback" subtitle="Reports and ideas sent from the app."
        actions={
          <div className="flex rounded-full bg-card p-1">
            {STATUSES.map((s) => (
              <button key={s} onClick={() => setStatus(s)} className={`rounded-full px-4 py-2 text-[13px] font-medium capitalize ${status === s ? "bg-ink text-white" : "text-muted"}`}>{s}</button>
            ))}
          </div>
        } />
      {q.isLoading ? <Loading /> : q.error || !q.data ? <ErrorBox error={q.error} /> : q.data.items.length ? (
        <div className="grid gap-4">
          {q.data.items.map((f) => (
            <Card key={f.id} className="p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Pill tone={f.kind === "issue" ? "rose" : "sky"}>{f.kind === "issue" ? "Issue" : "Feedback"}</Pill>
                {f.category ? <Pill>{f.category}</Pill> : null}
                <Link href={`/dashboard/users/${f.user_id}`} className="text-[13px] text-muted hover:text-ink">{f.user_email}</Link>
                <span className="text-[12px] text-faint">{fmt.ago(f.created_at)}{f.app_version ? ` · v${f.app_version}` : ""}{f.attachment_count ? ` · ${f.attachment_count} attachment(s)` : ""}</span>
                <div className="ml-auto flex gap-1.5">
                  {STATUSES.filter((s) => s !== f.status).map((s) => (
                    <button key={s} onClick={() => update.mutate({ id: f.id, next: s })} className="rounded-full bg-surface px-3 py-1 text-[12px] capitalize hover:bg-line">{s}</button>
                  ))}
                </div>
              </div>
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed">{f.message}</p>
            </Card>
          ))}
        </div>
      ) : <Empty>No {status} feedback.</Empty>}
    </>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { ApiError, api, fmt } from "@/lib/api";
import type { UserFilter } from "@/lib/types";
import { Pill } from "@/components/ui";

type Kind = "app_update" | "custom";
type Template = { label: string; subject: string; body: string; button: string };
type Templates = {
  templates: Record<Kind, Template>; placeholders: string[]; recent_days: number; configured: boolean; missing: string[];
};
type Preview = {
  matched: number; recipients: number;
  skipped: { recently_emailed: number; up_to_date: number; invalid_email: number };
  sample: { id: string; email: string; name: string | null; app_version: string | null }[];
  rendered: { to: string | null; subject: string; html: string; text: string };
  latest_version: string | null; confirm_token: string; configured: boolean; missing: string[];
};
type SendResult = { sent: number; failed: number; errors: string[]; skipped: Preview["skipped"] };

/** Who the email goes to: specific people (one click) or everyone matching the Users filters (bulk). */
export type Audience = { label: string; userIds?: string[]; filter?: UserFilter };

const field = "w-full rounded-2xl bg-surface px-4 py-3 text-[14px] outline-none placeholder:text-faint";

function skippedText(s: Preview["skipped"], recentDays: number): string[] {
  const out: string[] = [];
  if (s.up_to_date) out.push(`${s.up_to_date} already on the latest version`);
  if (s.recently_emailed) out.push(`${s.recently_emailed} got this kind of email in the last ${recentDays} days`);
  if (s.invalid_email) out.push(`${s.invalid_email} without a valid email address`);
  return out;
}

export function EmailComposer({ audience, initialKind = "app_update", onClose }: { audience: Audience; initialKind?: Kind; onClose: () => void }) {
  const qc = useQueryClient();
  const templates = useQuery({ queryKey: ["email-templates"], queryFn: () => api<Templates>("/admin/emails/templates"), staleTime: 60_000 });
  const [kind, setKind] = useState<Kind>(initialKind);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [button, setButton] = useState("");
  const [includeRecent, setIncludeRecent] = useState(false);
  const [loadedKind, setLoadedKind] = useState<Kind | null>(null);
  const [stage, setStage] = useState<"compose" | "confirm" | "done">("compose");
  const [notice, setNotice] = useState<string | null>(null);
  // One id per send: the server refuses a second send with the same id (double clicks, retries).
  const campaignId = useRef(crypto.randomUUID());

  // Fill in the template the first time it loads and whenever the type changes.
  const t = templates.data?.templates[kind];
  if (t && loadedKind !== kind) {
    setLoadedKind(kind);
    setSubject(t.subject);
    setBody(t.body);
    setButton(t.button);
  }

  const request = useMemo(() => ({
    kind, subject, body, button, include_recent: includeRecent,
    ...(audience.userIds ? { user_ids: audience.userIds } : { filter: audience.filter ?? {} }),
  }), [kind, subject, body, button, includeRecent, audience]);

  // Preview follows the edits (debounced), and is what "Send" must match.
  const [debounced, setDebounced] = useState(request);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(request), 400);
    return () => clearTimeout(id);
  }, [request]);
  const ready = Boolean(debounced.subject.trim() && debounced.body.trim());
  const preview = useQuery({
    queryKey: ["email-preview", JSON.stringify(debounced)],
    queryFn: () => api<Preview>("/admin/emails/preview", { method: "POST", body: JSON.stringify(debounced) }),
    enabled: ready && stage !== "done",
    placeholderData: (prev) => prev,
  });
  const p = preview.data;
  const stale = request !== debounced || preview.isFetching;

  const test = useMutation({
    mutationFn: () => api<{ sent_to: string }>("/admin/emails/test", {
      method: "POST",
      body: JSON.stringify({ kind, subject, body, button, as_user_id: p?.sample[0]?.id ?? audience.userIds?.[0] ?? null }),
    }),
    onSuccess: (r) => setNotice(`Test sent to ${r.sent_to}.`),
    onError: (e) => setNotice(e instanceof Error ? e.message : "Test failed"),
  });

  const send = useMutation({
    mutationFn: () => api<SendResult>("/admin/emails/send", {
      method: "POST",
      body: JSON.stringify({ ...debounced, campaign_id: campaignId.current, confirm_token: p!.confirm_token }),
    }),
    onSuccess: () => {
      setStage("done");
      void qc.invalidateQueries({ queryKey: ["users"] });
      void qc.invalidateQueries({ queryKey: ["user"] });
      void qc.invalidateQueries({ queryKey: ["app-versions"] });
      void qc.invalidateQueries({ queryKey: ["emails"] });
    },
    onError: (e) => {
      setStage("compose");
      if (e instanceof ApiError && e.status === 409) void preview.refetch();
      setNotice(e instanceof Error ? e.message : "Sending failed");
    },
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !send.isPending) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, send.isPending]);

  const configured = p?.configured ?? templates.data?.configured ?? true;
  const missing = p?.missing ?? templates.data?.missing ?? [];
  const recentDays = templates.data?.recent_days ?? 7;
  const canSend = configured && ready && !stale && Boolean(p?.recipients) && !preview.error;
  const result = send.data;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/30 p-3 md:p-8" onMouseDown={(e) => { if (e.target === e.currentTarget && !send.isPending) onClose(); }}>
      <div className="w-full max-w-[1100px] rounded-[28px] bg-card p-5 shadow-[0_24px_80px_rgba(0,0,0,0.25)] md:p-7">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[24px] font-semibold tracking-tight">Email {audience.label}</h2>
            <p className="mt-1 text-[13px] text-muted">
              {p ? `${fmt.num(p.recipients)} ${p.recipients === 1 ? "person gets" : "people get"} this` : "Working out who gets this…"}
              {p && p.matched !== p.recipients ? ` · ${fmt.num(p.matched - p.recipients)} skipped` : ""}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={send.isPending} className="rounded-full bg-surface p-2.5 text-muted hover:text-ink disabled:opacity-40" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!configured ? (
          <p className="mb-5 rounded-2xl bg-peach/50 px-4 py-3 text-[13px]">
            Email isn&apos;t set up on the server yet, so you can preview but not send. Add {missing.join(" and ")} to the backend&apos;s environment
            (DigitalOcean), with lazur.app verified in Resend.
          </p>
        ) : null}

        {stage === "done" && result ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Pill tone="lime">{fmt.num(result.sent)} sent</Pill>
              {result.failed ? <Pill tone="rose">{fmt.num(result.failed)} failed</Pill> : null}
            </div>
            {result.errors.length ? (
              <div className="rounded-2xl bg-rose/30 px-4 py-3 text-[13px]">
                <p className="font-medium">Why some failed</p>
                <ul className="mt-1 list-disc pl-5 text-muted">{result.errors.map((e) => <li key={e}>{e}</li>)}</ul>
                <p className="mt-2 text-muted">Failed people weren&apos;t marked as emailed, so you can send to them again later.</p>
              </div>
            ) : null}
            {skippedText(result.skipped, recentDays).length ? <p className="text-[13px] text-muted">Skipped: {skippedText(result.skipped, recentDays).join(" · ")}.</p> : null}
            <button type="button" onClick={onClose} className="rounded-full bg-ink px-5 py-2.5 text-[14px] font-medium text-white">Done</button>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="flex rounded-full bg-surface p-1" role="group" aria-label="Type">
                {(["app_update", "custom"] as const).map((k) => (
                  <button key={k} type="button" disabled={stage === "confirm"} onClick={() => { setKind(k); setStage("compose"); }}
                    className={`flex-1 rounded-full px-4 py-2 text-[13px] font-medium ${kind === k ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>
                    {templates.data?.templates[k].label ?? k}
                  </button>
                ))}
              </div>
              <label className="block">
                <span className="mb-1.5 block text-[12px] text-muted">Subject</span>
                <input value={subject} onChange={(e) => { setSubject(e.target.value); setStage("compose"); }} maxLength={200} className={field} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] text-muted">Message (a blank line starts a new paragraph)</span>
                <textarea value={body} onChange={(e) => { setBody(e.target.value); setStage("compose"); }} rows={11} maxLength={10000} className={`${field} resize-y leading-relaxed`} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] text-muted">Button (links to the download page; leave empty for none)</span>
                <input value={button} onChange={(e) => { setButton(e.target.value); setStage("compose"); }} maxLength={80} className={field} />
              </label>
              <p className="text-[12px] text-faint">
                Fills in per person: {(templates.data?.placeholders ?? []).map((ph) => `{${ph}}`).join(" ")}
              </p>
              <label className="flex items-center gap-2 text-[13px] text-muted">
                <input type="checkbox" checked={includeRecent} onChange={(e) => { setIncludeRecent(e.target.checked); setStage("compose"); }} />
                Also email people who got this kind of email in the last {recentDays} days
              </label>
            </div>

            <div className="flex min-w-0 flex-col gap-4">
              {preview.error ? (
                <p className="rounded-2xl bg-rose/30 px-4 py-3 text-[13px]">{preview.error instanceof Error ? preview.error.message : "Preview failed"}</p>
              ) : null}
              {p ? (
                <>
                  {skippedText(p.skipped, recentDays).length ? (
                    <p className="rounded-2xl bg-surface px-4 py-3 text-[13px] text-muted">Skipped: {skippedText(p.skipped, recentDays).join(" · ")}.</p>
                  ) : null}
                  <div className={`overflow-hidden rounded-2xl border border-line transition-opacity ${stale ? "opacity-60" : ""}`}>
                    <div className="border-b border-line bg-surface px-4 py-2.5 text-[12px] text-muted">
                      <p className="truncate"><span className="text-faint">To</span> {p.rendered.to ?? "nobody matches"}</p>
                      <p className="truncate font-medium text-ink">{p.rendered.subject}</p>
                    </div>
                    <iframe title="Email preview" sandbox="" srcDoc={p.rendered.html} className="h-[340px] w-full bg-white" />
                  </div>
                  {p.sample.length ? (
                    <div className="text-[12px] text-muted">
                      <p className="mb-1.5 text-faint">Who gets it{p.recipients > p.sample.length ? ` (first ${p.sample.length} of ${fmt.num(p.recipients)})` : ""}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {p.sample.map((r) => (
                          <span key={r.id} className="rounded-full bg-surface px-2.5 py-1">{r.email}{r.app_version ? ` · ${r.app_version}` : ""}</span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : !ready ? <p className="text-[13px] text-muted">Write a subject and a message to see the preview.</p> : null}

              {notice ? <p className="text-[13px] text-muted">{notice}</p> : null}

              <div className="mt-auto flex flex-wrap items-center justify-end gap-2 pt-2">
                <button type="button" disabled={!configured || !ready || test.isPending} onClick={() => { setNotice(null); test.mutate(); }}
                  className="rounded-full bg-surface px-4 py-2.5 text-[13px] font-medium disabled:opacity-40">
                  {test.isPending ? "Sending test…" : "Send test to me"}
                </button>
                {stage === "confirm" ? (
                  <>
                    <button type="button" disabled={send.isPending} onClick={() => setStage("compose")} className="rounded-full px-4 py-2.5 text-[13px] text-muted hover:text-ink">Back</button>
                    <button type="button" disabled={!canSend || send.isPending} onClick={() => { setNotice(null); send.mutate(); }}
                      className="rounded-full bg-rose px-5 py-2.5 text-[13px] font-semibold disabled:opacity-40">
                      {send.isPending ? "Sending…" : `Yes, send to ${fmt.num(p?.recipients ?? 0)} now`}
                    </button>
                  </>
                ) : (
                  <button type="button" disabled={!canSend} onClick={() => { setNotice(null); setStage("confirm"); }}
                    className="rounded-full bg-ink px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-40">
                    Send to {fmt.num(p?.recipients ?? 0)} {p?.recipients === 1 ? "person" : "people"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

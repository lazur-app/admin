"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, fmt } from "@/lib/api";
import type { AppVersions } from "@/lib/types";
import { Card, CardTitle, Empty, ErrorBox, Loading, PageTitle, Pill, Stat } from "@/components/ui";
import { EmailComposer, type Audience } from "@/components/EmailComposer";

type EmailLog = {
  items: { campaign_id: string; kind: string; subject: string; sent_by: string; at: string; recipients: number; sent: number; failed: number }[];
};

const usersOn = (version: string) => `/dashboard/users?version=${encodeURIComponent(version)}`;

export default function VersionsPage() {
  const versions = useQuery({ queryKey: ["app-versions"], queryFn: () => api<AppVersions>("/admin/app-versions") });
  const emails = useQuery({ queryKey: ["emails"], queryFn: () => api<EmailLog>("/admin/emails?limit=30") });
  const [emailing, setEmailing] = useState<Audience | null>(null);

  if (versions.isLoading) return <Loading />;
  if (versions.error || !versions.data) return <ErrorBox error={versions.error} />;
  const v = versions.data;
  const known = v.versions.reduce((n, r) => n + r.users, 0);

  return (
    <>
      <PageTitle title="App versions" subtitle="Who runs which Mac app version, and the emails you sent them."
        actions={v.latest && v.outdated ? (
          <button type="button" onClick={() => setEmailing({ label: `everyone older than ${v.latest}`, filter: { version: "older" } })}
            className="rounded-full bg-ink px-5 py-2.5 text-[14px] font-medium text-white">
            Email all {fmt.num(v.outdated)} on an old version
          </button>
        ) : null} />

      <div className="grid gap-5">
        <div className="grid gap-5 md:grid-cols-3">
          <Stat tone="lime" label="Latest release" value={v.latest ?? "–"} hint={v.latest ? "from the updater manifest (latest.json)" : "couldn't read latest.json"} />
          <Stat label="On an old version" value={fmt.num(v.outdated)} href={v.outdated ? usersOn("older") : undefined}
            hint={known ? `${Math.round((v.outdated / known) * 100)}% of people with a known version` : undefined} />
          <Stat label="Version unknown" value={fmt.num(v.unknown)} href={v.unknown ? usersOn("unknown") : undefined}
            hint="never opened the app, or haven't since versions were tracked" />
        </div>

        <Card className="p-0">
          <div className="px-6 pt-6"><CardTitle>By version</CardTitle></div>
          {v.versions.length ? (
            <table className="w-full text-[14px]">
              <thead>
                <tr className="text-left text-[12px] text-muted">
                  {["Version", "People", "Last seen", ""].map((h) => <th key={h} className="bg-surface px-6 py-3 font-medium">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {v.versions.map((r) => (
                  <tr key={r.version} className="hover:bg-surface/60">
                    <td className="px-6 py-3.5">
                      <span className="font-medium">{r.version}</span>
                      {r.latest ? <span className="ml-2"><Pill tone="lime">latest</Pill></span> : r.outdated ? <span className="ml-2"><Pill tone="peach">old</Pill></span> : null}
                    </td>
                    <td className="tabular px-6 py-3.5">{fmt.num(r.users)}</td>
                    <td className="px-6 py-3.5 text-muted">{fmt.ago(r.last_seen_at)}</td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={usersOn(r.version)} className="rounded-full bg-surface px-3.5 py-1.5 text-[12px] font-medium text-muted hover:text-ink">See people</Link>
                        <button type="button" onClick={() => setEmailing({ label: `everyone on ${r.version}`, filter: { version: r.version } })}
                          className="rounded-full bg-surface px-3.5 py-1.5 text-[12px] font-medium text-muted hover:text-ink">Email</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="p-6"><Empty>No app versions recorded yet.</Empty></div>}
        </Card>

        <Card>
          <CardTitle aside={<span className="text-[13px] text-muted">newest first</span>}>Emails sent</CardTitle>
          {emails.error ? <p className="text-[13px] text-red-600">{emails.error instanceof Error ? emails.error.message : "Couldn't load"}</p>
            : emails.data?.items.length ? (
              <div className="divide-y divide-line text-[14px]">
                {emails.data.items.map((e) => (
                  <div key={e.campaign_id} className="flex flex-wrap items-center gap-3 py-3">
                    <Pill tone={e.kind === "app_update" ? "sky" : "gray"}>{e.kind === "app_update" ? "update" : "custom"}</Pill>
                    <span className="min-w-0 flex-1 truncate">{e.subject}</span>
                    <span className="text-muted">{fmt.num(e.sent)} sent{e.failed ? <span className="text-red-600"> · {fmt.num(e.failed)} failed</span> : null}</span>
                    <span className="text-[12px] text-faint">{e.sent_by} · {fmt.ago(e.at)}</span>
                  </div>
                ))}
              </div>
            ) : <Empty>No emails sent yet.</Empty>}
        </Card>
      </div>

      {emailing ? <EmailComposer audience={emailing} onClose={() => setEmailing(null)} /> : null}
    </>
  );
}

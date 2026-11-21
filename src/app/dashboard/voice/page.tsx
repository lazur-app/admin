"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardTitle, ErrorBox, Loading, PageTitle, Pill, Stat } from "@/components/ui";

type VoiceEngine = {
  percent: number; users: string[]; off_users: string[];
  keys_ready: boolean; env_override: string | null;
  last_7_days: { people?: number; turns?: number; avg_brain_usd?: number };
  note: string;
};

const STEPS = [0, 10, 50, 100];
const lines = (s: string) => s.split(/[\n,]/).map((x) => x.trim().toLowerCase()).filter(Boolean);

/** Who talks to the 0.1.14 voice engine (speech to text → Claude → voice) instead of Gemini Live. */
export default function VoicePage() {
  const q = useQuery({ queryKey: ["voice-engine"], queryFn: () => api<VoiceEngine>("/admin/voice-engine") });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  // Keyed by the saved setting, so the form starts over from what the server now holds.
  return <VoiceForm key={JSON.stringify([q.data!.percent, q.data!.users, q.data!.off_users])} d={q.data!} />;
}

function VoiceForm({ d }: { d: VoiceEngine }) {
  const qc = useQueryClient();
  const [percent, setPercent] = useState(d.percent);
  const [users, setUsers] = useState(d.users.join("\n"));
  const [offUsers, setOffUsers] = useState(d.off_users.join("\n"));
  const [reason, setReason] = useState("");

  const save = useMutation({
    mutationFn: () => api<VoiceEngine>("/admin/voice-engine", {
      method: "PUT",
      body: JSON.stringify({ percent, users: lines(users), off_users: lines(offUsers), reason }),
    }),
    onSuccess: (data) => { qc.setQueryData(["voice-engine"], data); setReason(""); },
  });

  const changed = percent !== d.percent
    || [...lines(users)].sort().join() !== d.users.join()
    || [...lines(offUsers)].sort().join() !== d.off_users.join();

  return (
    <div className="space-y-6">
      <PageTitle title="Voice engine" subtitle="Who gets the new voice engine instead of Gemini Live. Applies to new sessions within 30 seconds." />

      {(!d.keys_ready || d.env_override === "off" || d.env_override === "cascade") && (
        <Card>
          <div className="flex flex-wrap gap-2 text-[14px]">
            {!d.keys_ready && <Pill tone="rose">Anthropic or Sarvam key missing on the server: everyone is on Live</Pill>}
            {d.env_override === "off" && <Pill tone="rose">VOICE_ENGINE=off: everyone is on Live</Pill>}
            {d.env_override === "cascade" && <Pill tone="peach">VOICE_ENGINE=cascade: everyone is on the new engine</Pill>}
          </div>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="People on it (7 days)" value={String(d.last_7_days.people ?? 0)} />
        <Stat label="Turns (7 days)" value={String(d.last_7_days.turns ?? 0)} />
        <Stat label="Avg brain cost per turn" value={`$${(d.last_7_days.avg_brain_usd ?? 0).toFixed(4)}`} />
      </div>

      <Card>
        <CardTitle>Share of everyone else</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          {STEPS.map((p) => (
            <button key={p} onClick={() => setPercent(p)}
              className={`rounded-full px-4 py-1.5 text-[14px] font-semibold ${percent === p ? "bg-ink text-white" : "bg-surface"}`}>
              {p}%
            </button>
          ))}
          <input type="number" min={0} max={100} value={percent}
            onChange={(e) => setPercent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
            className="w-20 rounded-lg border border-line px-2 py-1.5 text-[14px]" />
        </div>
        <p className="mt-2 text-[13px] text-muted">Stable per person: anyone on it at 10% stays on it at 50%.</p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>Always on the new engine</CardTitle>
          <textarea value={users} onChange={(e) => setUsers(e.target.value)} rows={6}
            placeholder="One email or user id per line" className="w-full rounded-lg border border-line p-2 font-mono text-[13px]" />
        </Card>
        <Card>
          <CardTitle>Never (always Live)</CardTitle>
          <textarea value={offUsers} onChange={(e) => setOffUsers(e.target.value)} rows={6}
            placeholder="One email or user id per line" className="w-full rounded-lg border border-line p-2 font-mono text-[13px]" />
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (for the audit log)"
            className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-[14px]" />
          <button disabled={!changed || save.isPending} onClick={() => save.mutate()}
            className="rounded-full bg-lime px-5 py-2 text-[14px] font-semibold text-ink disabled:opacity-40">
            {save.isPending ? "Saving…" : "Save"}
          </button>
        </div>
        {save.error && <div className="mt-3"><ErrorBox error={save.error} /></div>}
        <p className="mt-3 text-[13px] text-muted">{d.note}</p>
      </Card>
    </div>
  );
}

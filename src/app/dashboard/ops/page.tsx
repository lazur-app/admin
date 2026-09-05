"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchWebhookLog, triggerBackfill } from "@/lib/api";
import { defaultRange } from "@/components/DateRangePicker";
import {
  PageHeader,
  ErrorBanner,
  LoadingState,
  DataTable,
  tableHeadClass,
  tableCellClass,
} from "@/components/ui";

export default function OpsPage() {
  const [backfillMsg, setBackfillMsg] = useState<string | null>(null);
  const webhooks = useQuery({
    queryKey: ["admin-webhooks"],
    queryFn: () => fetchWebhookLog({ limit: 100 }),
  });

  const data = webhooks.data;
  const error = webhooks.error instanceof Error ? webhooks.error.message : null;

  if (error && !data) return <ErrorBanner message={error} />;
  if (!data) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Ops"
        description="Webhook delivery and analytics rollup backfill."
      />

      <section className="mb-10 rounded-xl border border-white/10 bg-zinc-900 p-5">
        <h2 className="text-sm font-semibold text-zinc-100">Analytics backfill</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Rebuild platform daily rollups for the last 90 days. Use after a deploy or gap.
        </p>
        <button
          type="button"
          onClick={() => {
            const range = defaultRange(90);
            setBackfillMsg("Backfilling…");
            triggerBackfill(range.from, range.to)
              .then((r) =>
                setBackfillMsg(`Backfilled ${r.days_processed} day(s).`)
              )
              .catch((e) =>
                setBackfillMsg(e instanceof Error ? e.message : "Backfill failed")
              );
          }}
          className="mt-4 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
        >
          Backfill last 90 days
        </button>
        {backfillMsg && <p className="mt-2 text-xs text-zinc-500">{backfillMsg}</p>}
      </section>

      <p className="mb-6 text-sm text-zinc-500">
        {data.total.toLocaleString()} webhook events total · showing latest{" "}
        {data.items.length}
      </p>

      <DataTable>
        <table className="w-full text-left text-sm">
          <thead className={tableHeadClass}>
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Event type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">External ID</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 ? (
              <tr>
                <td colSpan={5} className={`${tableCellClass} text-zinc-500`}>
                  No webhook events yet.
                </td>
              </tr>
            ) : (
              data.items.map((e) => (
                <tr key={e.id} className="border-t border-white/5">
                  <td className={`${tableCellClass} whitespace-nowrap text-xs text-zinc-500`}>
                    {e.created_at
                      ? new Date(e.created_at).toLocaleString()
                      : "-"}
                  </td>
                  <td className={tableCellClass}>{e.provider}</td>
                  <td className={`${tableCellClass} font-mono text-xs`}>
                    {e.event_type}
                  </td>
                  <td className={tableCellClass}>
                    {e.error ? (
                      <span className="text-red-300" title={e.error}>
                        Error
                      </span>
                    ) : e.processed_at ? (
                      <span className="text-emerald-300">Processed</span>
                    ) : (
                      <span className="text-zinc-500">Pending</span>
                    )}
                  </td>
                  <td
                    className={`${tableCellClass} max-w-[200px] truncate font-mono text-xs text-zinc-500`}
                    title={e.external_event_id}
                  >
                    {e.external_event_id}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </DataTable>
    </div>
  );
}

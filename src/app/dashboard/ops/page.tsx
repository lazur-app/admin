"use client";

import { useEffect, useState } from "react";
import { fetchWebhookLog, type WebhookLogResponse } from "@/lib/api";
import {
  PageHeader,
  ErrorBanner,
  LoadingState,
  DataTable,
  tableHeadClass,
  tableCellClass,
} from "@/components/ui";

export default function OpsPage() {
  const [data, setData] = useState<WebhookLogResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWebhookLog({ limit: 100 })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  if (error && !data) return <ErrorBanner message={error} />;
  if (!data) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Billing ops"
        description="Webhook delivery log from Polar and other billing providers."
      />

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
                <tr key={e.id} className="border-t border-zinc-100">
                  <td className={`${tableCellClass} whitespace-nowrap text-xs text-zinc-500`}>
                    {e.created_at
                      ? new Date(e.created_at).toLocaleString()
                      : "—"}
                  </td>
                  <td className={tableCellClass}>{e.provider}</td>
                  <td className={`${tableCellClass} font-mono text-xs`}>
                    {e.event_type}
                  </td>
                  <td className={tableCellClass}>
                    {e.error ? (
                      <span className="text-red-600" title={e.error}>
                        Error
                      </span>
                    ) : e.processed_at ? (
                      <span className="text-emerald-700">Processed</span>
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

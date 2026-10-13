"use client";

import { ErrorNote, Loading, StatusBadge } from "@/components/app/kit";
import { SelectInput } from "@/components/app/kit";
import { Card } from "@/components/tailgrids/core/card";
import { apiFetch } from "@/lib/api";
import { type ClientRecord, contactLine, isFollowUpDue, LEAD_STATUS_OPTIONS, sourceLabel } from "@/lib/leads";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

/** Open leads in a column per status. Move a lead by changing the status on its card. */
export function LeadBoard() {
  const [rows, setRows] = useState<ClientRecord[] | null>(null);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: ClientRecord[] }>("/client-records?stage=lead&limit=100");
      setRows(res.data);
      setError(null);
    } catch (err) {
      setError(err);
      setRows([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function move(lead: ClientRecord, leadStatus: string) {
    // Optimistic: the card jumps columns at once and goes back if the API says no.
    setRows((prev) => prev?.map((r) => (r.id === lead.id ? { ...r, leadStatus } : r)) ?? prev);
    try {
      await apiFetch(`/client-records/${lead.id}`, { method: "PATCH", body: JSON.stringify({ leadStatus }) });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not move the lead");
      await load();
    }
  }

  if (rows === null) return <Loading />;

  return (
    <div className="space-y-4">
      {error != null && <ErrorNote error={error} onRetry={load} />}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {LEAD_STATUS_OPTIONS.map((column) => {
          const cards = rows.filter((r) => (r.leadStatus ?? "new") === column.value);
          return (
            <section key={column.value} aria-label={column.label} className="min-w-0 space-y-3">
              <h2 className="flex items-center justify-between text-xs font-medium tracking-wide text-text-tertiary uppercase">
                {column.label}
                <StatusBadge color="gray">{cards.length}</StatusBadge>
              </h2>
              {cards.length === 0 ? (
                <p className="rounded-lg border border-dashed border-card-border p-4 text-center text-xs text-text-tertiary">Nothing here</p>
              ) : (
                cards.map((lead) => (
                  <Card key={lead.id} className="space-y-2 p-3">
                    <Link href={`/dashboard/leads/${lead.id}`} className="block min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">{lead.company || lead.name}</p>
                      {lead.company && <p className="truncate text-xs text-text-secondary">{lead.name}</p>}
                      <p className="truncate text-xs text-text-tertiary">{contactLine(lead) || sourceLabel(lead.source)}</p>
                    </Link>
                    <div className="flex items-center justify-between gap-2">
                      {isFollowUpDue(lead.nextFollowUpAt) ? (
                        <StatusBadge color="error">Follow-up due</StatusBadge>
                      ) : (
                        <span className="text-xs text-text-tertiary">{sourceLabel(lead.source)}</span>
                      )}
                      <SelectInput
                        value={lead.leadStatus ?? "new"}
                        onChange={(v) => move(lead, v)}
                        options={LEAD_STATUS_OPTIONS}
                        className="w-32"
                      />
                    </div>
                  </Card>
                ))
              )}
            </section>
          );
        })}
      </div>
      {rows.length >= 100 && (
        <p className="text-xs text-text-tertiary">Showing the first 100 leads. Use the list view to filter and page through the rest.</p>
      )}
    </div>
  );
}

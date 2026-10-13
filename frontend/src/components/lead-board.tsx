"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/toast";
import { Alert, Badge, Card, NativeSelect } from "@/components/ui";
import { LEAD_STATUS_OPTIONS, type ClientRecord, contactLine, isFollowUpDue, sourceLabel } from "@/lib/leads";

/** Open leads in a column per status. Move a lead by changing the status on its card. */
export function LeadBoard() {
  const { error: showError } = useToast();
  const [rows, setRows] = useState<ClientRecord[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: ClientRecord[] }>("/client-records?stage=lead&limit=100");
      setRows(res.data);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leads");
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
      showError(err instanceof Error ? err.message : "Could not move the lead");
      await load();
    }
  }

  if (rows === null) return <p className="py-10 text-center text-sm text-text-tertiary">Loading...</p>;

  return (
    <div className="space-y-4">
      {error && <Alert status="error">{error}</Alert>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {LEAD_STATUS_OPTIONS.map((column) => {
          const cards = rows.filter((r) => (r.leadStatus ?? "new") === column.value);
          return (
            <section key={column.value} aria-label={column.label} className="min-w-0 space-y-3">
              <h2 className="flex items-center justify-between text-xs font-medium tracking-wide text-text-tertiary uppercase">
                {column.label}
                <Badge color="gray">{cards.length}</Badge>
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
                      {isFollowUpDue(lead.nextFollowUpAt) ? <Badge color="error">Follow-up due</Badge> : <span className="text-xs text-text-tertiary">{sourceLabel(lead.source)}</span>}
                      <NativeSelect
                        value={lead.leadStatus ?? "new"}
                        onChange={(e) => move(lead, e.target.value)}
                        aria-label={`Move ${lead.company || lead.name}`}
                        className="h-8 w-32 py-0 text-xs"
                      >
                        {LEAD_STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                  </Card>
                ))
              )}
            </section>
          );
        })}
      </div>
      {rows.length >= 100 && <p className="text-xs text-text-tertiary">Showing the first 100 leads. Use the list view to filter and page through the rest.</p>}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Badge, Card, CardHeader, CardTitle } from "@/components/ui";
import { CONTRACT_STATUS_COLOR, CONTRACT_STATUS_LABEL, type ContractSummary } from "@/lib/contracts";

/** Contracts written for one lead or client. Staff only. Hidden until there is one. */
export function LeadContracts({ clientId, onLoaded }: { clientId: string; onLoaded?: (rows: ContractSummary[]) => void }) {
  const [rows, setRows] = useState<ContractSummary[]>([]);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<ContractSummary[]>(`/client-records/${clientId}/contracts`);
      setRows(data);
      onLoaded?.(data);
    } catch {
      setRows([]);
    }
  }, [clientId, onLoaded]);

  useEffect(() => {
    load();
  }, [load]);

  if (rows.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contracts</CardTitle>
      </CardHeader>
      <ul className="divide-y divide-card-border border-t border-card-border">
        {rows.map((c) => (
          <li key={c.id}>
            <Link href={`/dashboard/contracts/${c.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-background-gray-secondary_alt_2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text-primary">{c.title}</p>
                <p className="text-xs text-text-tertiary">
                  {c.signedAt
                    ? `Signed ${new Date(c.signedAt).toLocaleDateString()} by ${c.signedByName}`
                    : c.sentAt
                      ? `Sent ${new Date(c.sentAt).toLocaleDateString()}`
                      : `Created ${new Date(c.createdAt).toLocaleDateString()}`}
                </p>
              </div>
              <Badge color={CONTRACT_STATUS_COLOR[c.status] ?? "gray"}>{CONTRACT_STATUS_LABEL[c.status] ?? c.status}</Badge>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

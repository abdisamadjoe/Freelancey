"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FilePlus2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, CardHeader, CardTitle, EmptyState } from "@/components/ui";
import {
  PROPOSAL_STATUS_COLOR,
  PROPOSAL_STATUS_LABEL,
  type ProposalSummary,
  formatMoney,
} from "@/lib/proposals";

interface Props {
  clientId: string;
  /** Pre-fills a new proposal so nothing from the lead is typed twice. */
  prefill: { title: string; scope?: string; timeline?: string };
  canCreate: boolean;
  onLoaded?: (rows: ProposalSummary[]) => void;
}

/** Proposals for one lead or client, plus the "Create proposal" action. Staff only. */
export function LeadProposals({ clientId, prefill, canCreate, onLoaded }: Props) {
  const router = useRouter();
  const { error: showError } = useToast();
  const [rows, setRows] = useState<ProposalSummary[] | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: ProposalSummary[] }>(`/proposals?clientId=${clientId}&limit=50`);
      setRows(res.data);
      onLoaded?.(res.data);
    } catch {
      setRows([]);
    }
  }, [clientId, onLoaded]);

  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    setCreating(true);
    try {
      const created = await apiFetch<{ id: string }>("/proposals", {
        method: "POST",
        body: JSON.stringify({
          clientId,
          title: prefill.title,
          scope: prefill.scope,
          timeline: prefill.timeline,
          items: [],
        }),
      });
      router.push(`/dashboard/proposals/${created.id}`);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not create the proposal");
      setCreating(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Proposals</CardTitle>
        {canCreate && (
          <Button size="sm" iconOnly={false} loading={creating} onClick={create}>
            <FilePlus2 />
            <span>Create proposal</span>
          </Button>
        )}
      </CardHeader>
      {rows === null ? (
        <p className="px-5 pb-5 text-sm text-text-tertiary">Loading...</p>
      ) : rows.length === 0 ? (
        <EmptyState
          variant="plain"
          title="No proposals yet"
          description="Once the lead is qualified, create a proposal. Their details and discovery notes carry over."
        />
      ) : (
        <ul className="divide-y divide-card-border border-t border-card-border">
          {rows.map((p) => (
            <li key={p.id}>
              <Link href={`/dashboard/proposals/${p.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-background-gray-secondary_alt_2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">{p.title}</p>
                  <p className="text-xs text-text-tertiary">
                    {p.sentAt ? `Sent ${new Date(p.sentAt).toLocaleDateString()}` : `Created ${new Date(p.createdAt).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-text-secondary">{formatMoney(p.totalCents, p.currency)}</span>
                  <Badge color={PROPOSAL_STATUS_COLOR[p.status] ?? "gray"}>{PROPOSAL_STATUS_LABEL[p.status] ?? p.status}</Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

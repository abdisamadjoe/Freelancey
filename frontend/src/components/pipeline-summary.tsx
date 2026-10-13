"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { OverviewStatsGrid, type OverviewStat, type OverviewStatStyle } from "@/components/common/overview-stats";
import { LEAD_STATUS_OPTIONS } from "@/lib/leads";
import { formatMoney } from "@/lib/proposals";

interface Summary {
  leadsByStatus: { status: string; count: number }[];
  totalLeads: number;
  activeClients: number;
  followUpsDue: number;
  proposalsAwaiting: {
    count: number;
    items: { id: string; title: string; status: string; sentAt: string | null; currency: string; totalCents: number; client: { id: string; name: string } }[];
  };
  contractsAwaiting: {
    count: number;
    items: { id: string; title: string; status: string; sentAt: string | null; clientRecord: { id: string; name: string } | null }[];
  };
  deliverables: { inReview: number; changesRequested: number };
  openTickets: number;
}

/** Where every lead, proposal, contract, deliverable and ticket stands. Staff only. */
export function PipelineSummary() {
  const [data, setData] = useState<Summary | null>(null);

  useEffect(() => {
    apiFetch<Summary>("/pipeline/summary").then(setData).catch(() => setData(null));
  }, []);

  if (!data) return null;

  const statuses: OverviewStatStyle[] = ["blue", "green", "orange", "purple", "blue"];
  const leadStats: OverviewStat[] = data.leadsByStatus.map((s, i) => ({
    id: `lead-${s.status}`,
    title: LEAD_STATUS_OPTIONS.find((o) => o.value === s.status)?.label ?? s.status,
    value: s.count,
    style: statuses[i % statuses.length],
    href: "/dashboard/leads",
  }));
  const workStats: OverviewStat[] = [
    { id: "follow-ups", title: "Follow-ups due", value: data.followUpsDue, style: "orange", href: "/dashboard/leads" },
    { id: "proposals", title: "Proposals awaiting answer", value: data.proposalsAwaiting.count, style: "blue" },
    { id: "contracts", title: "Contracts awaiting signature", value: data.contractsAwaiting.count, style: "purple" },
    { id: "client-work", title: "Work with the client", value: data.deliverables.inReview, style: "green" },
    { id: "tickets", title: "Open support tickets", value: data.openTickets, style: "orange", href: "/dashboard/support" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="leading-6 font-semibold tracking-[-0.2px] text-text-primary">Pipeline</h2>
        <p className="mt-0.5 text-sm leading-5 text-text-tertiary">What needs a response or a next step.</p>
      </div>

      <OverviewStatsGrid stats={leadStats} columns="five" />
      <OverviewStatsGrid stats={workStats} columns="five" />

      {(data.proposalsAwaiting.items.length > 0 || data.contractsAwaiting.items.length > 0) && (
        <Card className="p-0">
          <ul className="divide-y divide-card-border">
            {data.proposalsAwaiting.items.map((p) => (
              <li key={p.id}>
                <Link href={`/dashboard/proposals/${p.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-background-gray-secondary_alt_2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">{p.title}</p>
                    <p className="text-xs text-text-tertiary">
                      Proposal · {p.client.name}
                      {p.sentAt ? ` · sent ${new Date(p.sentAt).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-text-secondary">{formatMoney(p.totalCents, p.currency)}</span>
                    <Badge color={p.status === "viewed" ? "violet" : "blue"}>{p.status === "viewed" ? "Viewed" : "Sent"}</Badge>
                  </div>
                </Link>
              </li>
            ))}
            {data.contractsAwaiting.items.map((c) => (
              <li key={c.id}>
                <Link href={`/dashboard/contracts/${c.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-background-gray-secondary_alt_2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">{c.title}</p>
                    <p className="text-xs text-text-tertiary">
                      Contract · {c.clientRecord?.name ?? "Client"}
                      {c.sentAt ? ` · sent ${new Date(c.sentAt).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  <Badge color={c.status === "viewed" ? "violet" : "blue"}>{c.status === "viewed" ? "Viewed" : "Sent"}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {data.deliverables.changesRequested > 0 && (
        <p className="text-sm text-text-secondary">
          {data.deliverables.changesRequested} {data.deliverables.changesRequested === 1 ? "deliverable has" : "deliverables have"} changes requested. Open the
          project&apos;s Deliverables tab.
        </p>
      )}
    </div>
  );
}

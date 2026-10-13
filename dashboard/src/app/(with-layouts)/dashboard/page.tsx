"use client";

import {
  Empty,
  ErrorNote,
  fmtDate,
  ListRow,
  ListRows,
  money,
  Page,
  PageBody,
  PageHeader,
  Panel,
  StatCard,
  StatGrid,
  StatGridSkeleton,
  StatusPill,
} from "@/components/app/kit";
import { buttonStyles } from "@/components/tailgrids/core/button";
import { Badge } from "@/components/tailgrids/core/badge";
import { CollectedStatIcon, InProgressStatIcon, ProjectsStatIcon, ReceivablesStatIcon } from "@/components/app/stat-icons";
import { useApi } from "@/lib/query";
import { useSession } from "@/lib/session";
import Link from "next/link";
import InventoryOverview from "@/app/(with-layouts)/(dashboard)/(home)/_component/inventory-overview";
import TrafficSources from "@/app/(with-layouts)/(dashboard)/(home)/_component/traffic-sources";

interface Project {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}
interface Paginated<T> {
  data: T[];
  meta: { total: number };
}
interface Stats {
  total: number;
  inProgress: number;
  completed: number;
}
interface InvoiceStats {
  outstandingAmount: number;
  totalInvoices: number;
  paidAmount: number;
}
interface DueLead {
  id: string;
  name: string;
  company: string | null;
  nextFollowUpAt: string | null;
}
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

const STAT_ICON_CLASS = "bg-primary-50 text-primary-500";

export default function DashboardPage() {
  const { user } = useSession();
  const stats = useApi<Stats>("/projects/stats");
  const invoices = useApi<InvoiceStats>("/invoices/stats");
  const recent = useApi<Paginated<Project>>("/projects?limit=5");
  const due = useApi<Paginated<DueLead>>("/client-records?stage=lead&followUpDue=true&limit=5");
  const summary = useApi<Summary>("/pipeline/summary");

  const countFor = (status: string) => summary.data?.leadsByStatus.find((l) => l.status === status)?.count ?? 0;
  const advanced = countFor("qualified") + countFor("proposal_sent");
  const attention = summary.data
    ? [
        { name: "Follow-ups due", count: summary.data.followUpsDue },
        { name: "Proposals awaiting answer", count: summary.data.proposalsAwaiting.count },
        { name: "Contracts awaiting signature", count: summary.data.contractsAwaiting.count },
        { name: "Work with the client", count: summary.data.deliverables.inReview },
        { name: "Open support tickets", count: summary.data.openTickets },
      ]
    : [];
  const maxAttention = Math.max(1, ...attention.map((a) => a.count));

  const firstName = user.name ? user.name.split(" ")[0] : "User";

  return (
    <Page>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Your current portfolio summary and activity."
        actions={
          <Link href="/dashboard/projects/new" className={buttonStyles({ size: "md" })}>
            New Project
          </Link>
        }
      />

      <PageBody>
        {stats.error && <ErrorNote error={stats.error} onRetry={() => stats.refetch()} />}

        {stats.isLoading ? (
          <StatGridSkeleton />
        ) : stats.data ? (
          <StatGrid>
            <StatCard label="Total Projects" value={stats.data.total} iconClass={STAT_ICON_CLASS} icon={<ProjectsStatIcon />} />
            <StatCard label="In Progress" value={stats.data.inProgress} iconClass={STAT_ICON_CLASS} icon={<InProgressStatIcon />} />
            <StatCard
              label="Outstanding Receivables"
              value={invoices.data ? money(invoices.data.outstandingAmount) : "$0.00"}
              iconClass={STAT_ICON_CLASS}
              icon={<ReceivablesStatIcon />}
            />
            <StatCard
              label="Total Collected"
              value={invoices.data ? money(invoices.data.paidAmount) : "$0.00"}
              iconClass={STAT_ICON_CLASS}
              icon={<CollectedStatIcon />}
            />
          </StatGrid>
        ) : null}

        {summary.data && (
          <>
            <div>
              <h2 className="leading-6 font-semibold tracking-[-0.2px] text-text-primary">Pipeline</h2>
              <p className="mt-0.5 text-sm leading-5 text-text-tertiary">What needs a response or a next step.</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <InventoryOverview
                title="Lead progress"
                gaugeLabel="Qualified or beyond"
                overview={{
                  availablePercent: summary.data.totalLeads
                    ? Math.round((advanced / summary.data.totalLeads) * 100)
                    : 0,
                  summary: [
                    { label: "Total leads", value: summary.data.totalLeads },
                    { label: "Qualified", value: countFor("qualified") },
                    { label: "Proposal sent", value: countFor("proposal_sent") },
                  ],
                }}
              />
              <TrafficSources
                title="Needs attention"
                valueHeading="Items"
                sources={attention.map((a) => ({
                  name: a.name,
                  value: String(a.count),
                  percentage: Math.round((a.count / maxAttention) * 100),
                }))}
              />
            </div>

            {(summary.data.proposalsAwaiting.items.length > 0 || summary.data.contractsAwaiting.items.length > 0) && (
              <Panel flush>
                <ListRows>
                  {summary.data.proposalsAwaiting.items.map((p) => (
                    <ListRow key={p.id} href={`/dashboard/proposals/${p.id}`}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text-primary">{p.title}</p>
                        <p className="text-xs text-text-tertiary">
                          Proposal · {p.client.name}
                          {p.sentAt ? ` · sent ${fmtDate(p.sentAt)}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-text-secondary">{money(p.totalCents, p.currency)}</span>
                        <Badge color={p.status === "viewed" ? "violet" : "blue"}>{p.status === "viewed" ? "Viewed" : "Sent"}</Badge>
                      </div>
                    </ListRow>
                  ))}
                  {summary.data.contractsAwaiting.items.map((c) => (
                    <ListRow key={c.id} href={`/dashboard/contracts/${c.id}`}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text-primary">{c.title}</p>
                        <p className="text-xs text-text-tertiary">
                          Contract · {c.clientRecord?.name ?? "Client"}
                          {c.sentAt ? ` · sent ${fmtDate(c.sentAt)}` : ""}
                        </p>
                      </div>
                      <Badge color={c.status === "viewed" ? "violet" : "blue"}>{c.status === "viewed" ? "Viewed" : "Sent"}</Badge>
                    </ListRow>
                  ))}
                </ListRows>
              </Panel>
            )}

            {summary.data.deliverables.changesRequested > 0 && (
              <p className="text-sm text-text-secondary">
                {summary.data.deliverables.changesRequested}{" "}
                {summary.data.deliverables.changesRequested === 1 ? "deliverable has" : "deliverables have"} changes requested. Open the
                project&apos;s Deliverables tab.
              </p>
            )}
          </>
        )}

        {due.data && due.data.meta.total > 0 && (
          <Panel
            flush
            title="Follow-ups due"
            description={`${due.data.meta.total} ${due.data.meta.total === 1 ? "lead is" : "leads are"} waiting to hear from you`}
            action={
              <Link href="/dashboard/leads" className="text-sm font-medium text-neutral-brand-color">
                View all
              </Link>
            }
          >
            <ListRows className="border-t border-card-border">
              {due.data.data.map((lead) => (
                <ListRow key={lead.id} href={`/dashboard/leads/${lead.id}`}>
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-medium text-text-primary">{lead.name}</span>
                    {lead.company && <span className="truncate text-xs text-text-tertiary">{lead.company}</span>}
                  </span>
                  <span className="shrink-0 text-xs text-alert-danger-title">{fmtDate(lead.nextFollowUpAt)}</span>
                </ListRow>
              ))}
            </ListRows>
          </Panel>
        )}

        <Panel
          flush
          title="Recent Projects"
          description="Latest transaction activity & workspace status"
          action={
            <Link href="/dashboard/projects" className="text-sm font-medium text-neutral-brand-color">
              View all
            </Link>
          }
        >
          {recent.data && recent.data.data.length > 0 ? (
            <ListRows className="mt-4 border-t border-card-border">
              {recent.data.data.map((p) => (
                <ListRow key={p.id} href={`/dashboard/projects/${p.id}`}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">{p.name}</p>
                    <p className="text-xs text-text-tertiary">{fmtDate(p.createdAt)}</p>
                  </div>
                  <StatusPill status={p.status} />
                </ListRow>
              ))}
            </ListRows>
          ) : (
            !recent.isLoading && (
              <div className="px-5">
                <Empty>No projects created yet. Get started by creating your first project workspace.</Empty>
              </div>
            )
          )}
        </Panel>
      </PageBody>
    </Page>
  );
}

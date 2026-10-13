import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { proposalTotalCents } from "../proposals/proposals.totals";

const LEAD_STATUSES = ["new", "contacted", "discovery", "qualified", "proposal_sent"] as const;

@Injectable()
export class PipelineService {
  constructor(private prisma: PrismaService) {}

  /** One round trip for the dashboard: where every lead, proposal, contract, project and ticket stands. */
  async summary(orgId: string) {
    const now = new Date();
    const [grouped, activeClients, followUpsDue, proposals, contracts, inReview, changesRequested, openTickets] = await Promise.all([
      this.prisma.client.groupBy({
        by: ["leadStatus"],
        where: { organizationId: orgId, stage: "lead", archivedAt: null },
        _count: { _all: true },
      }),
      this.prisma.client.count({ where: { organizationId: orgId, stage: "active", archivedAt: null } }),
      this.prisma.client.count({ where: { organizationId: orgId, stage: "lead", archivedAt: null, nextFollowUpAt: { lte: now } } }),
      this.prisma.proposal.findMany({
        where: { organizationId: orgId, status: { in: ["sent", "viewed"] } },
        orderBy: { sentAt: "asc" },
        take: 5,
        include: { items: true, client: { select: { id: true, name: true } } },
      }),
      this.prisma.contract.findMany({
        where: { organizationId: orgId, status: { in: ["sent", "viewed"] }, clientRecordId: { not: null } },
        orderBy: { sentAt: "asc" },
        take: 5,
        select: { id: true, title: true, status: true, sentAt: true, clientRecord: { select: { id: true, name: true } } },
      }),
      this.prisma.deliverable.count({ where: { organizationId: orgId, status: "in_review" } }),
      this.prisma.deliverable.count({ where: { organizationId: orgId, status: "changes_requested" } }),
      this.prisma.supportTicket.count({ where: { organizationId: orgId, status: { not: "resolved" } } }),
    ]);

    // A lead with no status counts as new, so rows for null and "new" add up rather than overwrite.
    const counts = new Map<string, number>();
    for (const g of grouped) {
      const key = g.leadStatus ?? "new";
      counts.set(key, (counts.get(key) ?? 0) + g._count._all);
    }
    const [proposalsAwaiting, contractsAwaiting] = await Promise.all([
      this.prisma.proposal.count({ where: { organizationId: orgId, status: { in: ["sent", "viewed"] } } }),
      this.prisma.contract.count({
        where: { organizationId: orgId, status: { in: ["sent", "viewed"] }, clientRecordId: { not: null } },
      }),
    ]);

    return {
      leadsByStatus: LEAD_STATUSES.map((status) => ({ status, count: counts.get(status) ?? 0 })),
      totalLeads: grouped.reduce((sum, g) => sum + g._count._all, 0),
      activeClients,
      followUpsDue,
      proposalsAwaiting: {
        count: proposalsAwaiting,
        items: proposals.map((p) => ({
          id: p.id,
          title: p.title,
          status: p.status,
          sentAt: p.sentAt,
          currency: p.currency,
          totalCents: proposalTotalCents(p.items),
          client: p.client,
        })),
      },
      contractsAwaiting: { count: contractsAwaiting, items: contracts },
      deliverables: { inReview, changesRequested },
      openTickets,
    };
  }
}

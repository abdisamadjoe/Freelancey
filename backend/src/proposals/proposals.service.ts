import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { render } from "@react-email/render";
import { ProposalSentEmail } from "@/email";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { ActivityService } from "../activity/activity.service";
import { NotificationsService } from "../notifications/notifications.service";
import { generateToken, hashToken, paginatedResponse, paginationArgs, plainText } from "../common";
import { LOCKED_STATUSES, OPEN_STATUSES } from "./proposals.constants";
import { proposalTotalCents } from "./proposals.totals";
import {
  AcceptProposalDto,
  CreateProposalDto,
  ProposalLineItemDto,
  ProposalListQueryDto,
  RejectProposalDto,
  SendProposalDto,
  UpdateProposalDto,
} from "./proposals.dto";

interface ItemRow {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  optional: boolean;
  selected: boolean;
  order: number;
}

function formatMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

function itemsData(items: ProposalLineItemDto[]) {
  return items.map((item, index) => ({
    description: item.description.trim(),
    quantity: item.quantity,
    unitPriceCents: item.unitPriceCents,
    optional: item.optional ?? false,
    // Optional items start unselected; the client picks them when accepting.
    selected: !(item.optional ?? false),
    order: index,
  }));
}

@Injectable()
export class ProposalsService {
  private readonly logger = new Logger(ProposalsService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private mail: MailService,
    private activity: ActivityService,
    private notifications: NotificationsService,
  ) {}

  // ----- staff -----

  async list(orgId: string, query: ProposalListQueryDto) {
    const { page = 1, limit = 20, clientId, status } = query;
    const where: Record<string, unknown> = { organizationId: orgId };
    if (clientId) where.clientId = clientId;
    if (status) where.status = status;

    const [rows, total] = await Promise.all([
      this.prisma.proposal.findMany({
        where,
        include: { items: true, client: { select: { id: true, name: true, company: true } } },
        orderBy: { createdAt: "desc" },
        ...paginationArgs(page, limit),
      }),
      this.prisma.proposal.count({ where }),
    ]);
    const data = rows.map(({ tokenHash: _t, ...p }) => {
      void _t;
      return { ...p, totalCents: proposalTotalCents(p.items) };
    });
    return paginatedResponse(data, total, page, limit);
  }

  async findOne(id: string, orgId: string) {
    const proposal = await this.prisma.proposal.findFirst({
      where: { id, organizationId: orgId },
      include: {
        items: { orderBy: { order: "asc" } },
        client: { select: { id: true, name: true, company: true, email: true, stage: true } },
      },
    });
    if (!proposal) throw new NotFoundException("Proposal not found");
    const { tokenHash: _t, ...rest } = proposal;
    void _t;
    return { ...rest, totalCents: proposalTotalCents(proposal.items) };
  }

  async create(dto: CreateProposalDto, orgId: string, userId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, organizationId: orgId },
      select: { id: true },
    });
    if (!client) throw new NotFoundException("Client not found");

    const proposal = await this.prisma.proposal.create({
      data: {
        organizationId: orgId,
        clientId: dto.clientId,
        title: dto.title.trim(),
        scope: dto.scope,
        deliverables: dto.deliverables,
        timeline: dto.timeline,
        paymentTerms: dto.paymentTerms,
        revisionLimit: dto.revisionLimit,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        currency: (dto.currency ?? "USD").toUpperCase(),
        createdById: userId,
        items: { create: itemsData(dto.items) },
      },
    });
    await this.activity.createForClient({
      clientId: dto.clientId,
      organizationId: orgId,
      actorId: userId,
      kind: "system",
      action: "proposal_created",
      summary: `Proposal drafted: ${proposal.title}`,
    });
    return this.findOne(proposal.id, orgId);
  }

  async update(id: string, dto: UpdateProposalDto, orgId: string, userId: string) {
    const existing = await this.prisma.proposal.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) throw new NotFoundException("Proposal not found");
    if (LOCKED_STATUSES.includes(existing.status)) {
      throw new BadRequestException("An accepted proposal can no longer be edited");
    }

    const { items, validUntil, ...rest } = dto;
    // Editing a proposal that was already sent invalidates the old link and returns it to draft.
    const reopen = existing.status !== "draft";

    await this.prisma.$transaction(async (tx) => {
      if (items) {
        await tx.proposalLineItem.deleteMany({ where: { proposalId: id } });
        await tx.proposalLineItem.createMany({ data: itemsData(items).map((i) => ({ ...i, proposalId: id })) });
      }
      await tx.proposal.update({
        where: { id },
        data: {
          ...rest,
          ...(dto.title ? { title: dto.title.trim() } : {}),
          ...(dto.currency ? { currency: dto.currency.toUpperCase() } : {}),
          ...(validUntil !== undefined ? { validUntil: validUntil ? new Date(validUntil) : null } : {}),
          ...(reopen
            ? {
                status: "draft",
                tokenHash: null,
                sentAt: null,
                viewedAt: null,
                respondedAt: null,
                rejectionReason: null,
              }
            : {}),
        },
      });
    });

    if (reopen) {
      await this.activity.createForClient({
        clientId: existing.clientId,
        organizationId: orgId,
        actorId: userId,
        kind: "system",
        action: "proposal_revised",
        summary: `Proposal revised and back to draft: ${existing.title}`,
      });
    }
    return this.findOne(id, orgId);
  }

  async remove(id: string, orgId: string) {
    const result = await this.prisma.proposal.deleteMany({ where: { id, organizationId: orgId, status: "draft" } });
    if (result.count === 0) {
      const exists = await this.prisma.proposal.findFirst({ where: { id, organizationId: orgId }, select: { id: true } });
      if (!exists) throw new NotFoundException("Proposal not found");
      throw new BadRequestException("Only drafts can be deleted");
    }
  }

  /** Issues a fresh secure link (replacing any earlier one) and marks the proposal as sent. */
  async send(id: string, dto: SendProposalDto, orgId: string, userId: string) {
    const proposal = await this.prisma.proposal.findFirst({
      where: { id, organizationId: orgId },
      include: { items: true, client: { select: { id: true, name: true, email: true, stage: true, leadStatus: true } } },
    });
    if (!proposal) throw new NotFoundException("Proposal not found");
    if (LOCKED_STATUSES.includes(proposal.status)) {
      throw new BadRequestException("This proposal was already accepted");
    }
    if (!proposal.items.some((i) => !i.optional)) {
      throw new BadRequestException("Add at least one required line item before sending");
    }
    if (proposal.validUntil && proposal.validUntil.getTime() < Date.now()) {
      throw new BadRequestException("The valid-until date has passed. Pick a later date first");
    }
    const wantsEmail = dto.email ?? false;
    if (wantsEmail && !proposal.client.email) {
      throw new BadRequestException("This lead has no email address. Copy the link instead");
    }

    const token = generateToken();
    await this.prisma.proposal.update({
      where: { id },
      data: {
        status: "sent",
        tokenHash: hashToken(token),
        sentAt: new Date(),
        viewedAt: null,
        respondedAt: null,
        rejectionReason: null,
        acceptedByName: null,
      },
    });

    if (proposal.client.stage === "lead" && proposal.client.leadStatus !== "proposal_sent") {
      await this.prisma.client.update({ where: { id: proposal.clientId }, data: { leadStatus: "proposal_sent" } });
    }

    const link = `${this.config.get("WEB_URL", "http://localhost:3000")}/proposal/${token}`;
    let emailed = false;
    if (wantsEmail && proposal.client.email) {
      emailed = await this.emailProposal(orgId, proposal, link);
    }

    await this.activity.createForClient({
      clientId: proposal.clientId,
      organizationId: orgId,
      actorId: userId,
      kind: "system",
      action: "proposal_sent",
      summary: `Proposal sent: ${proposal.title}${emailed ? " (emailed)" : ""}`,
    });
    return { link, emailed };
  }

  private async emailProposal(
    orgId: string,
    proposal: { title: string; currency: string; validUntil: Date | null; items: ItemRow[]; client: { name: string; email: string | null } },
    link: string,
  ): Promise<boolean> {
    if (!proposal.client.email) return false;
    try {
      const org = await this.prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } });
      const orgName = org?.name ?? "Your freelancer";
      const html = await render(
        ProposalSentEmail({
          clientName: proposal.client.name,
          organizationName: orgName,
          proposalTitle: proposal.title,
          total: formatMoney(proposalTotalCents(proposal.items), proposal.currency),
          validUntil: proposal.validUntil?.toLocaleDateString("en-US", { dateStyle: "long" }),
          proposalUrl: link,
        }),
      );
      const result = await this.mail.send(proposal.client.email, `${orgName} sent you a proposal`, html, orgId);
      return result.sent;
    } catch (err) {
      this.logger.warn(`Proposal email failed: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }

  // ----- public, token scoped -----

  private async findByToken(token: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { items: { orderBy: { order: "asc" } }, client: { select: { id: true, name: true } } },
    });
    if (!proposal) throw new NotFoundException("Proposal not found");
    return proposal;
  }

  private isOverdue(p: { status: string; validUntil: Date | null }): boolean {
    return OPEN_STATUSES.includes(p.status) && p.validUntil !== null && p.validUntil.getTime() < Date.now();
  }

  /** Public view. The first open marks it viewed. */
  async getPublic(token: string) {
    let proposal = await this.findByToken(token);

    if (this.isOverdue(proposal)) {
      await this.markExpired(proposal.id, proposal.organizationId, proposal.clientId, proposal.title);
      proposal = { ...proposal, status: "expired" };
    } else if (proposal.status === "sent") {
      const flipped = await this.prisma.proposal.updateMany({
        where: { id: proposal.id, status: "sent" },
        data: { status: "viewed", viewedAt: new Date() },
      });
      if (flipped.count > 0) {
        proposal = { ...proposal, status: "viewed" };
        await this.activity.createForClient({
          clientId: proposal.clientId,
          organizationId: proposal.organizationId,
          actorId: "public",
          kind: "system",
          action: "proposal_viewed",
          summary: `${proposal.client.name} viewed the proposal: ${proposal.title}`,
        });
        this.notifications.notifyAdmins(
          proposal.organizationId,
          "proposal_viewed",
          `${proposal.client.name} opened your proposal`,
          proposal.title,
          `/dashboard/leads/${proposal.clientId}`,
        );
      }
    }

    const [org, branding] = await Promise.all([
      this.prisma.organization.findUnique({ where: { id: proposal.organizationId }, select: { name: true } }),
      this.prisma.branding.findUnique({
        where: { organizationId: proposal.organizationId },
        select: { primaryColor: true, logoUrl: true },
      }),
    ]);

    return {
      organizationName: org?.name ?? "",
      primaryColor: branding?.primaryColor ?? null,
      logoUrl: branding?.logoUrl ?? null,
      clientName: proposal.client.name,
      title: proposal.title,
      scope: proposal.scope,
      deliverables: proposal.deliverables,
      timeline: proposal.timeline,
      paymentTerms: proposal.paymentTerms,
      revisionLimit: proposal.revisionLimit,
      validUntil: proposal.validUntil,
      currency: proposal.currency,
      status: proposal.status,
      respondedAt: proposal.respondedAt,
      acceptedByName: proposal.acceptedByName,
      items: proposal.items.map((i) => ({
        id: i.id,
        description: i.description,
        quantity: i.quantity,
        unitPriceCents: i.unitPriceCents,
        optional: i.optional,
        selected: i.selected,
      })),
      totalCents: proposalTotalCents(proposal.items),
    };
  }

  async accept(token: string, dto: AcceptProposalDto) {
    const proposal = await this.findByToken(token);
    if (this.isOverdue(proposal)) {
      await this.markExpired(proposal.id, proposal.organizationId, proposal.clientId, proposal.title);
      throw new ConflictException("This proposal has expired");
    }
    if (!OPEN_STATUSES.includes(proposal.status)) {
      throw new ConflictException("This proposal has already been answered");
    }

    const name = plainText(dto.name, 200);
    if (!name) throw new BadRequestException("Type your full name to accept");

    const picked = new Set(dto.optionalItemIds ?? []);
    const optionalIds = new Set(proposal.items.filter((i) => i.optional).map((i) => i.id));
    for (const id of picked) {
      if (!optionalIds.has(id)) throw new BadRequestException("Unknown optional item");
    }

    const accepted = await this.prisma.$transaction(async (tx) => {
      // The status condition makes a double click or two tabs resolve to a single answer.
      const claimed = await tx.proposal.updateMany({
        where: { id: proposal.id, status: { in: [...OPEN_STATUSES] } },
        data: { status: "accepted", respondedAt: new Date(), acceptedByName: name },
      });
      if (claimed.count === 0) return false;
      for (const id of optionalIds) {
        await tx.proposalLineItem.update({ where: { id }, data: { selected: picked.has(id) } });
      }
      return true;
    });
    if (!accepted) throw new ConflictException("This proposal has already been answered");

    await this.activity.createForClient({
      clientId: proposal.clientId,
      organizationId: proposal.organizationId,
      actorId: "public",
      kind: "system",
      action: "proposal_accepted",
      summary: `${name} accepted the proposal: ${proposal.title}`,
    });
    this.notifications.notifyAdmins(
      proposal.organizationId,
      "proposal_accepted",
      `${proposal.client.name} accepted your proposal`,
      `${proposal.title}. Next step: create the contract.`,
      `/dashboard/leads/${proposal.clientId}`,
    );
    return { ok: true };
  }

  async reject(token: string, dto: RejectProposalDto) {
    const proposal = await this.findByToken(token);
    if (!OPEN_STATUSES.includes(proposal.status)) {
      throw new ConflictException("This proposal has already been answered");
    }
    const reason = plainText(dto.reason, 1000);

    const claimed = await this.prisma.proposal.updateMany({
      where: { id: proposal.id, status: { in: [...OPEN_STATUSES] } },
      data: { status: "rejected", respondedAt: new Date(), rejectionReason: reason ?? null },
    });
    if (claimed.count === 0) throw new ConflictException("This proposal has already been answered");

    await this.activity.createForClient({
      clientId: proposal.clientId,
      organizationId: proposal.organizationId,
      actorId: "public",
      kind: "system",
      action: "proposal_rejected",
      summary: `${proposal.client.name} declined the proposal: ${proposal.title}${reason ? ` (${reason})` : ""}`,
    });
    this.notifications.notifyAdmins(
      proposal.organizationId,
      "proposal_rejected",
      `${proposal.client.name} declined your proposal`,
      reason ?? proposal.title,
      `/dashboard/leads/${proposal.clientId}`,
    );
    return { ok: true };
  }

  // ----- expiry -----

  private async markExpired(id: string, orgId: string, clientId: string, title: string): Promise<boolean> {
    const result = await this.prisma.proposal.updateMany({
      where: { id, status: { in: [...OPEN_STATUSES] } },
      data: { status: "expired" },
    });
    if (result.count === 0) return false;
    await this.activity.createForClient({
      clientId,
      organizationId: orgId,
      actorId: "system",
      kind: "system",
      action: "proposal_expired",
      summary: `Proposal expired without an answer: ${title}`,
    });
    this.notifications.notifyAdmins(orgId, "proposal_expired", "A proposal expired", title, `/dashboard/leads/${clientId}`);
    return true;
  }

  /** Called on a schedule. Returns how many proposals were expired. */
  async expireOverdue(): Promise<number> {
    const overdue = await this.prisma.proposal.findMany({
      where: { status: { in: [...OPEN_STATUSES] }, validUntil: { lt: new Date() } },
      select: { id: true, organizationId: true, clientId: true, title: true },
    });
    let count = 0;
    for (const p of overdue) {
      if (await this.markExpired(p.id, p.organizationId, p.clientId, p.title)) count += 1;
    }
    return count;
  }
}

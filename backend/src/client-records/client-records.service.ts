import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ActivityService } from "../activity/activity.service";
import { paginatedResponse, paginationArgs } from "../common";
import {
  ClientRecordListQueryDto,
  CreateClientActivityDto,
  CreateClientRecordDto,
  UpdateClientRecordDto,
} from "./client-records.dto";

const STAGE_LABEL: Record<string, string> = {
  lead: "Lead",
  active: "Active client",
  past: "Past client",
  lost: "Lost",
};

/** A lead needs some way to be reached. */
function hasContactMethod(c: { email?: string | null; phone?: string | null; whatsapp?: string | null }) {
  return Boolean(c.email?.trim() || c.phone?.trim() || c.whatsapp?.trim());
}

@Injectable()
export class ClientRecordsService {
  constructor(
    private prisma: PrismaService,
    private activity: ActivityService,
  ) {}

  async list(orgId: string, query: ClientRecordListQueryDto) {
    const { page = 1, limit = 20, stage, leadStatus, source, search, followUpDue, archived } = query;
    const where: Record<string, unknown> = { organizationId: orgId };
    if (archived !== "true") where.archivedAt = null;
    if (stage) where.stage = stage;
    if (leadStatus) where.leadStatus = leadStatus;
    if (source) where.source = source;
    if (followUpDue) where.nextFollowUpAt = { lte: new Date() };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { company: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { whatsapp: { contains: search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        orderBy: [{ nextFollowUpAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
        ...paginationArgs(page, limit),
      }),
      this.prisma.client.count({ where }),
    ]);
    return paginatedResponse(data, total, page, limit);
  }

  async findOne(id: string, orgId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, organizationId: orgId },
      include: {
        contacts: true,
        projects: { select: { id: true, name: true, status: true, archivedAt: true } },
        invoices: { select: { id: true, invoiceNumber: true, status: true, dueDate: true } },
      },
    });
    if (!client) throw new NotFoundException("Client not found");
    return client;
  }

  async create(dto: CreateClientRecordDto, orgId: string, userId: string) {
    if (!hasContactMethod(dto)) {
      throw new BadRequestException("Provide at least one of email, phone or WhatsApp");
    }
    const stage = dto.stage ?? "lead";
    if (stage === "lost") {
      throw new BadRequestException("Create the record first, then mark it lost with a reason");
    }

    const client = await this.prisma.client.create({
      data: {
        organizationId: orgId,
        name: dto.name.trim(),
        company: dto.company,
        email: dto.email?.trim().toLowerCase(),
        phone: dto.phone,
        whatsapp: dto.whatsapp,
        website: dto.website,
        industry: dto.industry,
        location: dto.location,
        stage,
        leadStatus: stage === "lead" ? (dto.leadStatus ?? "new") : null,
        source: dto.source,
        interestedIn: dto.interestedIn,
        estimatedBudgetCents: dto.estimatedBudgetCents,
        priority: dto.priority,
        nextFollowUpAt: dto.nextFollowUpAt ? new Date(dto.nextFollowUpAt) : undefined,
        notes: dto.notes,
        ownerId: userId,
      },
    });

    await this.activity.createForClient({
      clientId: client.id,
      organizationId: orgId,
      actorId: userId,
      kind: "system",
      action: "created",
      summary: `${STAGE_LABEL[stage]} created${dto.source ? ` (source: ${dto.source})` : ""}`,
    });

    return client;
  }

  async update(id: string, dto: UpdateClientRecordDto, orgId: string, userId: string) {
    const existing = await this.prisma.client.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) throw new NotFoundException("Client not found");

    const email = dto.email !== undefined ? (dto.email?.trim().toLowerCase() ?? null) : existing.email;
    const phone = dto.phone !== undefined ? dto.phone : existing.phone;
    const whatsapp = dto.whatsapp !== undefined ? dto.whatsapp : existing.whatsapp;
    if (!hasContactMethod({ email, phone, whatsapp })) {
      throw new BadRequestException("Keep at least one of email, phone or WhatsApp");
    }

    const stage = dto.stage ?? existing.stage;
    const stageChanged = stage !== existing.stage;
    if (stage === "lost" && stageChanged && !dto.lostReason?.trim()) {
      throw new BadRequestException("A lost reason is required");
    }

    // leadStatus only means something while stage is "lead".
    let leadStatus = existing.leadStatus;
    if (stage !== "lead") leadStatus = null;
    else if (dto.leadStatus) leadStatus = dto.leadStatus;
    else if (stageChanged) leadStatus = "new";

    const { stage: _s, leadStatus: _l, nextFollowUpAt, lostReason, email: _e, ...rest } = dto;
    void _s; void _l; void _e;

    const updated = await this.prisma.client.update({
      where: { id },
      data: {
        ...rest,
        ...(dto.email !== undefined ? { email } : {}),
        stage,
        leadStatus,
        lostReason: stage === "lost" ? (lostReason?.trim() || existing.lostReason) : null,
        ...(nextFollowUpAt !== undefined
          ? { nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : null }
          : {}),
      },
    });

    if (stageChanged) {
      await this.activity.createForClient({
        clientId: id,
        organizationId: orgId,
        actorId: userId,
        kind: "system",
        action: "stage_changed",
        summary:
          `Stage changed: ${STAGE_LABEL[existing.stage] ?? existing.stage} → ${STAGE_LABEL[stage] ?? stage}` +
          (stage === "lost" ? ` (${updated.lostReason})` : ""),
      });
    } else if (leadStatus !== existing.leadStatus && leadStatus) {
      await this.activity.createForClient({
        clientId: id,
        organizationId: orgId,
        actorId: userId,
        kind: "system",
        action: "status_changed",
        summary: `Lead status: ${existing.leadStatus ?? "none"} → ${leadStatus}`,
      });
    }

    return updated;
  }

  async setArchived(id: string, orgId: string, archived: boolean) {
    const result = await this.prisma.client.updateMany({
      where: { id, organizationId: orgId },
      data: { archivedAt: archived ? new Date() : null },
    });
    if (result.count === 0) throw new NotFoundException("Client not found");
  }

  async addActivity(id: string, dto: CreateClientActivityDto, orgId: string, userId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    });
    if (!client) throw new NotFoundException("Client not found");

    return this.activity.createForClient({
      clientId: id,
      organizationId: orgId,
      actorId: userId,
      kind: dto.kind,
      action: dto.kind,
      summary: dto.summary.trim(),
      occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
    });
  }

  async listActivity(id: string, orgId: string, page = 1, limit = 20) {
    const client = await this.prisma.client.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    });
    if (!client) throw new NotFoundException("Client not found");
    return this.activity.findByClient(id, orgId, page, limit);
  }
}

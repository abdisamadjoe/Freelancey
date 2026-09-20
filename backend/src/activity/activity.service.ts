import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NeonAuthUsersRepository } from "../auth/neon-auth-users.repository";
import { paginationArgs, paginatedResponse } from "../common";

export interface CreateActivityDto {
  type: "document_response" | "decision_vote" | "decision_closed" | "contract_response";
  action: string;
  actorId: string;
  targetId: string;
  targetTitle: string;
  detail?: string;
  projectId: string;
  organizationId: string;
}

export interface CreateClientActivityInput {
  clientId: string;
  organizationId: string;
  actorId: string;
  /** "note" | "call" | "whatsapp" | "email" | "meeting" | "system" */
  kind: string;
  action: string;
  summary: string;
  occurredAt?: Date;
}

@Injectable()
export class ActivityService {
  constructor(
    private prisma: PrismaService,
    private neonAuthUsers: NeonAuthUsersRepository,
  ) {}

  async create(dto: CreateActivityDto) {
    return this.prisma.activityLog.create({
      data: {
        type: dto.type,
        action: dto.action,
        actorId: dto.actorId,
        targetId: dto.targetId,
        targetTitle: dto.targetTitle,
        detail: dto.detail,
        projectId: dto.projectId,
        organizationId: dto.organizationId,
      },
    });
  }

  async findByProject(
    projectId: string,
    organizationId: string,
    page = 1,
    limit = 20,
  ) {
    const where = { projectId, organizationId };
    const [data, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...paginationArgs(page, limit),
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    // Batch-resolve actor names
    const actorIds = [...new Set(data.map((a) => a.actorId))];
    const actors = await this.neonAuthUsers.findMany(actorIds);
    const actorMap = new Map(actors.map((a) => [a.id, a]));

    const enriched = data.map((a) => ({
      ...a,
      actor: actorMap.get(a.actorId) ?? { id: a.actorId, name: "Unknown" },
    }));

    return paginatedResponse(enriched, total, page, limit);
  }

  /** Timeline entry on a client/lead (manual entries and system events). */
  async createForClient(input: CreateClientActivityInput) {
    return this.prisma.activityLog.create({
      data: {
        type: "client_activity",
        action: input.action,
        kind: input.kind,
        actorId: input.actorId,
        targetId: input.clientId,
        targetTitle: "client",
        detail: input.summary,
        clientId: input.clientId,
        organizationId: input.organizationId,
        ...(input.occurredAt ? { occurredAt: input.occurredAt } : {}),
      },
    });
  }

  async findByClient(clientId: string, organizationId: string, page = 1, limit = 20) {
    const where = { clientId, organizationId };
    const [data, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        orderBy: { occurredAt: "desc" },
        ...paginationArgs(page, limit),
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    const actorIds = [...new Set(data.map((a) => a.actorId))];
    const actors = await this.neonAuthUsers.findMany(actorIds);
    const actorMap = new Map(actors.map((a) => [a.id, a]));

    const enriched = data.map((a) => ({
      ...a,
      actor: actorMap.get(a.actorId) ?? { id: a.actorId, name: a.actorId === "system" ? "System" : "Unknown" },
    }));

    return paginatedResponse(enriched, total, page, limit);
  }
}

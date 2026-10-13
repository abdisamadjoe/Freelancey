import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { render } from "@react-email/render";
import { FormRequestEmail } from "@/email";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { ActivityService } from "../activity/activity.service";
import { generateToken, hashToken } from "../common";
import { DEFAULT_HANDOVER_ITEMS } from "./handover.constants";
import { AddHandoverItemDto, ShareHandoverDto, UpdateHandoverItemDto } from "./handover.dto";

export interface Blocker {
  kind: "tasks" | "milestones" | "deliverables";
  label: string;
  count: number;
}

@Injectable()
export class HandoverService {
  private readonly logger = new Logger(HandoverService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private mail: MailService,
    private activity: ActivityService,
  ) {}

  private async assertProject(projectId: string, orgId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId: orgId },
      select: { id: true, name: true, status: true, clientId: true },
    });
    if (!project) throw new NotFoundException("Project not found");
    return project;
  }

  private async log(clientId: string | null, orgId: string, actorId: string, action: string, summary: string) {
    if (!clientId) return;
    await this.activity.createForClient({ clientId, organizationId: orgId, actorId, kind: "system", action, summary });
  }

  // ----- completion gate -----

  /** Open work that should be finished before a project is marked complete. */
  async blockers(projectId: string, orgId: string): Promise<Blocker[]> {
    const [tasks, milestones, deliverables] = await Promise.all([
      this.prisma.task.count({ where: { projectId, organizationId: orgId, status: { in: ["open", "in_progress"] } } }),
      this.prisma.milestone.count({ where: { projectId, organizationId: orgId, status: { not: "done" } } }),
      this.prisma.deliverable.count({ where: { projectId, organizationId: orgId, status: { not: "approved" } } }),
    ]);
    const out: Blocker[] = [];
    if (tasks > 0) out.push({ kind: "tasks", label: `${tasks} open ${tasks === 1 ? "task" : "tasks"}`, count: tasks });
    if (milestones > 0) out.push({ kind: "milestones", label: `${milestones} unfinished ${milestones === 1 ? "milestone" : "milestones"}`, count: milestones });
    if (deliverables > 0) {
      out.push({ kind: "deliverables", label: `${deliverables} ${deliverables === 1 ? "deliverable" : "deliverables"} not approved by the client`, count: deliverables });
    }
    return out;
  }

  async completionCheck(projectId: string, orgId: string) {
    const project = await this.assertProject(projectId, orgId);
    const blockers = await this.blockers(projectId, orgId);
    return { completed: project.status === "completed", blockers, canComplete: blockers.length === 0 };
  }

  /** Marks the project completed. Open work needs an explicit reason, which is recorded. */
  async completeProject(projectId: string, overrideReason: string | undefined, orgId: string, userId: string) {
    const project = await this.assertProject(projectId, orgId);
    if (project.status === "completed") throw new BadRequestException("This project is already completed");

    const blockers = await this.blockers(projectId, orgId);
    if (blockers.length > 0 && !overrideReason?.trim()) {
      throw new BadRequestException({
        message: `Open work remains: ${blockers.map((b) => b.label).join(", ")}. Finish it or give a reason to complete anyway`,
        blockers,
      });
    }
    await this.prisma.project.update({ where: { id: projectId }, data: { status: "completed" } });
    await this.log(
      project.clientId,
      orgId,
      userId,
      "project_completed",
      blockers.length > 0
        ? `Project completed with open work (${blockers.map((b) => b.label).join(", ")}). Reason: ${overrideReason?.trim()}`
        : `Project completed: ${project.name}`,
    );
    return { ok: true, overridden: blockers.length > 0 };
  }

  // ----- handover -----

  async get(projectId: string, orgId: string) {
    await this.assertProject(projectId, orgId);
    const handover = await this.prisma.handover.findFirst({
      where: { projectId, organizationId: orgId },
      include: { items: { orderBy: { order: "asc" } } },
    });
    if (!handover) return null;
    const { tokenHash: _t, ...rest } = handover;
    return { ...rest, shared: Boolean(_t) };
  }

  /** Starts the handover once the project is completed. Safe to call twice. */
  async start(projectId: string, orgId: string, userId: string) {
    const project = await this.assertProject(projectId, orgId);
    if (project.status !== "completed") throw new BadRequestException("Complete the project before starting the handover");

    const existing = await this.prisma.handover.findFirst({ where: { projectId, organizationId: orgId }, select: { id: true } });
    if (!existing) {
      await this.prisma.handover.create({
        data: {
          projectId,
          organizationId: orgId,
          items: { create: DEFAULT_HANDOVER_ITEMS.map((item, order) => ({ ...item, order })) },
        },
      });
      await this.log(project.clientId, orgId, userId, "handover_started", `Handover started: ${project.name}`);
    }
    return this.get(projectId, orgId);
  }

  private async assertOpenHandover(projectId: string, orgId: string) {
    const handover = await this.prisma.handover.findFirst({ where: { projectId, organizationId: orgId } });
    if (!handover) throw new NotFoundException("Handover has not been started");
    return handover;
  }

  async addItem(projectId: string, dto: AddHandoverItemDto, orgId: string) {
    const handover = await this.assertOpenHandover(projectId, orgId);
    const last = await this.prisma.handoverItem.aggregate({ where: { handoverId: handover.id }, _max: { order: true } });
    return this.prisma.handoverItem.create({
      data: {
        handoverId: handover.id,
        kind: dto.kind ?? "custom",
        title: dto.title.trim(),
        details: dto.details,
        linkUrl: dto.linkUrl,
        order: (last._max.order ?? -1) + 1,
      },
    });
  }

  async updateItem(projectId: string, itemId: string, dto: UpdateHandoverItemDto, orgId: string) {
    const handover = await this.assertOpenHandover(projectId, orgId);
    const item = await this.prisma.handoverItem.findFirst({ where: { id: itemId, handoverId: handover.id } });
    if (!item) throw new NotFoundException("Handover item not found");
    const { done, title, ...rest } = dto;
    return this.prisma.handoverItem.update({
      where: { id: itemId },
      data: {
        ...rest,
        ...(title ? { title: title.trim() } : {}),
        ...(done !== undefined ? { done, doneAt: done ? new Date() : null } : {}),
      },
    });
  }

  async removeItem(projectId: string, itemId: string, orgId: string) {
    const handover = await this.assertOpenHandover(projectId, orgId);
    const result = await this.prisma.handoverItem.deleteMany({ where: { id: itemId, handoverId: handover.id } });
    if (result.count === 0) throw new NotFoundException("Handover item not found");
  }

  /** Creates the link the client reads the handover through. A new link replaces the old one. */
  async share(projectId: string, dto: ShareHandoverDto, orgId: string, userId: string) {
    const project = await this.assertProject(projectId, orgId);
    const handover = await this.assertOpenHandover(projectId, orgId);

    const client = project.clientId
      ? await this.prisma.client.findFirst({ where: { id: project.clientId, organizationId: orgId }, select: { name: true, email: true } })
      : null;
    const wantsEmail = dto.email ?? false;
    if (wantsEmail && !client?.email) throw new BadRequestException("This client has no email address. Copy the link instead");

    const token = generateToken();
    await this.prisma.handover.update({ where: { id: handover.id }, data: { tokenHash: hashToken(token) } });
    const link = `${this.config.get("WEB_URL", "http://localhost:3000")}/handover/${token}`;

    let emailed = false;
    if (wantsEmail && client?.email) {
      emailed = await this.emailLink(orgId, client.name, client.email, project.name, link);
    }
    await this.log(project.clientId, orgId, userId, "handover_shared", `Handover shared with the client${emailed ? " (emailed)" : ""}`);
    return { link, emailed };
  }

  private async emailLink(orgId: string, clientName: string, to: string, projectName: string, link: string) {
    try {
      const org = await this.prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } });
      const orgName = org?.name ?? "Your freelancer";
      const html = await render(
        FormRequestEmail({
          clientName,
          organizationName: orgName,
          heading: `Your ${projectName} handover`,
          description: `${orgName} has put together everything you need for ${projectName}: files, documentation, access and training.`,
          buttonLabel: "Open the handover",
          formUrl: link,
        }),
      );
      const result = await this.mail.send(to, `${orgName}: your ${projectName} handover`, html, orgId);
      return result.sent;
    } catch (err) {
      this.logger.warn(`Handover email failed: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }

  /** "Handover complete". Every item must be done first. */
  async complete(projectId: string, orgId: string, userId: string) {
    const project = await this.assertProject(projectId, orgId);
    const handover = await this.prisma.handover.findFirst({
      where: { projectId, organizationId: orgId },
      include: { items: { select: { done: true } } },
    });
    if (!handover) throw new NotFoundException("Handover has not been started");
    if (handover.status === "completed") throw new BadRequestException("The handover is already complete");
    const open = handover.items.filter((i) => !i.done).length;
    if (open > 0) throw new BadRequestException(`${open} handover ${open === 1 ? "item is" : "items are"} not done yet`);

    await this.prisma.handover.update({
      where: { id: handover.id },
      data: { status: "completed", completedAt: new Date(), completedById: userId },
    });
    await this.log(project.clientId, orgId, userId, "handover_completed", `Handover complete: ${project.name}`);
    return { ok: true };
  }

  // ----- public, token scoped -----

  async getPublic(token: string) {
    const handover = await this.prisma.handover.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { items: { orderBy: { order: "asc" } }, project: { select: { name: true } } },
    });
    if (!handover) throw new NotFoundException("Handover not found");
    const [org, branding] = await Promise.all([
      this.prisma.organization.findUnique({ where: { id: handover.organizationId }, select: { name: true } }),
      this.prisma.branding.findUnique({ where: { organizationId: handover.organizationId }, select: { primaryColor: true, logoUrl: true } }),
    ]);
    return {
      organizationName: org?.name ?? "",
      primaryColor: branding?.primaryColor ?? null,
      logoUrl: branding?.logoUrl ?? null,
      projectName: handover.project.name,
      status: handover.status,
      completedAt: handover.completedAt,
      items: handover.items.map((i) => ({
        id: i.id,
        kind: i.kind,
        title: i.title,
        details: i.details,
        linkUrl: i.linkUrl,
        done: i.done,
      })),
    };
  }
}

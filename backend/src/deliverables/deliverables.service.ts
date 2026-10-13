import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { render } from "@react-email/render";
import { FormRequestEmail } from "@/email";
import type { ContractContent } from "@/shared";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { ActivityService } from "../activity/activity.service";
import { NotificationsService } from "../notifications/notifications.service";
import { generateToken, hashToken, plainText } from "../common";
import {
  CreateDeliverableDto,
  DeliverableLinkDto,
  RequestChangesDto,
  SendDeliverableDto,
  UpdateDeliverableDto,
} from "./deliverables.dto";

/** A deliverable can be edited and (re)sent from these states. */
const EDITABLE = ["draft", "changes_requested"];

function cleanLinks(links: DeliverableLinkDto[] | undefined) {
  return (links ?? []).map((l) => ({ label: plainText(l.label, 100) ?? "Link", url: l.url }));
}

@Injectable()
export class DeliverablesService {
  private readonly logger = new Logger(DeliverablesService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private mail: MailService,
    private activity: ActivityService,
    private notifications: NotificationsService,
  ) {}

  private async assertProject(projectId: string, orgId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId: orgId },
      select: { id: true, name: true, clientId: true },
    });
    if (!project) throw new NotFoundException("Project not found");
    return project;
  }

  private async assertMilestone(milestoneId: string, projectId: string, orgId: string) {
    const milestone = await this.prisma.milestone.findFirst({
      where: { id: milestoneId, projectId, organizationId: orgId },
      select: { id: true },
    });
    if (!milestone) throw new BadRequestException("Milestone not found on this project");
  }

  private async logForClient(clientId: string | null, orgId: string, actorId: string, action: string, summary: string) {
    if (!clientId) return;
    await this.activity.createForClient({ clientId, organizationId: orgId, actorId, kind: "system", action, summary });
  }

  // ----- staff -----

  /** Revisions allowed by the signed contract (null = not agreed), against change requests raised so far. */
  private async revisionsFor(projectId: string, orgId: string) {
    const [contract, used] = await Promise.all([
      this.prisma.contract.findFirst({
        where: { organizationId: orgId, projectId, status: "signed" },
        select: { content: true },
      }),
      this.prisma.changeRequest.count({ where: { organizationId: orgId, deliverable: { projectId } } }),
    ]);
    const raw = (contract?.content as unknown as ContractContent | undefined)?.scope?.revisionsCount;
    const allowed = raw === undefined || raw === "" ? null : Number(raw);
    return { used, allowed: allowed !== null && Number.isFinite(allowed) ? allowed : null };
  }

  async list(projectId: string, orgId: string) {
    await this.assertProject(projectId, orgId);
    const [rows, revisions] = await Promise.all([
      this.prisma.deliverable.findMany({
        where: { projectId, organizationId: orgId },
        orderBy: { createdAt: "desc" },
        include: { changeRequests: { orderBy: { createdAt: "desc" } } },
      }),
      this.revisionsFor(projectId, orgId),
    ]);
    const data = rows.map(({ tokenHash: _t, ...d }) => {
      void _t;
      return d;
    });
    return { data, revisions, overLimit: revisions.allowed !== null && revisions.used > revisions.allowed };
  }

  async create(projectId: string, dto: CreateDeliverableDto, orgId: string, userId: string) {
    const project = await this.assertProject(projectId, orgId);
    if (dto.milestoneId) await this.assertMilestone(dto.milestoneId, projectId, orgId);
    const deliverable = await this.prisma.deliverable.create({
      data: {
        projectId,
        organizationId: orgId,
        milestoneId: dto.milestoneId,
        title: dto.title.trim(),
        description: dto.description,
        links: cleanLinks(dto.links),
        createdById: userId,
      },
    });
    await this.logForClient(project.clientId, orgId, userId, "deliverable_created", `Deliverable drafted: ${deliverable.title} (${project.name})`);
    return deliverable;
  }

  async update(projectId: string, id: string, dto: UpdateDeliverableDto, orgId: string) {
    const existing = await this.prisma.deliverable.findFirst({ where: { id, projectId, organizationId: orgId } });
    if (!existing) throw new NotFoundException("Deliverable not found");
    if (!EDITABLE.includes(existing.status)) {
      throw new BadRequestException("This deliverable is with the client or already approved");
    }
    if (dto.milestoneId) await this.assertMilestone(dto.milestoneId, projectId, orgId);
    const { links, title, ...rest } = dto;
    return this.prisma.deliverable.update({
      where: { id },
      data: {
        ...rest,
        ...(title ? { title: title.trim() } : {}),
        ...(links ? { links: cleanLinks(links) } : {}),
      },
    });
  }

  async remove(projectId: string, id: string, orgId: string) {
    const result = await this.prisma.deliverable.deleteMany({ where: { id, projectId, organizationId: orgId, status: "draft" } });
    if (result.count === 0) {
      const exists = await this.prisma.deliverable.findFirst({ where: { id, projectId, organizationId: orgId }, select: { id: true } });
      if (!exists) throw new NotFoundException("Deliverable not found");
      throw new BadRequestException("Only drafts can be deleted");
    }
  }

  /** Sends for review. After changes were requested, resending starts the next version. */
  async send(projectId: string, id: string, dto: SendDeliverableDto, orgId: string, userId: string) {
    const project = await this.assertProject(projectId, orgId);
    const deliverable = await this.prisma.deliverable.findFirst({ where: { id, projectId, organizationId: orgId } });
    if (!deliverable) throw new NotFoundException("Deliverable not found");
    if (deliverable.status === "approved") throw new BadRequestException("This deliverable was already approved");

    const links = deliverable.links as unknown as { url: string }[];
    if (links.length === 0 && !deliverable.description?.trim()) {
      throw new BadRequestException("Add a link or a description so the client has something to review");
    }

    const client = project.clientId
      ? await this.prisma.client.findFirst({
          where: { id: project.clientId, organizationId: orgId },
          select: { name: true, email: true },
        })
      : null;
    const wantsEmail = dto.email ?? false;
    if (wantsEmail && !client?.email) {
      throw new BadRequestException("This client has no email address. Copy the link instead");
    }

    const nextVersion = deliverable.status === "changes_requested" ? deliverable.version + 1 : deliverable.version;
    const token = generateToken();
    await this.prisma.$transaction([
      this.prisma.deliverable.update({
        where: { id },
        data: { status: "in_review", version: nextVersion, tokenHash: hashToken(token), sentAt: new Date() },
      }),
      // Sending the revised work closes the requests it answers.
      this.prisma.changeRequest.updateMany({
        where: { deliverableId: id, status: "open" },
        data: { status: "resolved", resolvedAt: new Date() },
      }),
    ]);

    const link = `${this.config.get("WEB_URL", "http://localhost:3000")}/review/${token}`;
    let emailed = false;
    if (wantsEmail && client?.email) {
      emailed = await this.emailLink(orgId, client.name, client.email, deliverable.title, nextVersion, link);
    }
    await this.logForClient(
      project.clientId,
      orgId,
      userId,
      "deliverable_sent",
      `${deliverable.title} v${nextVersion} sent for review${emailed ? " (emailed)" : ""}`,
    );
    return { link, emailed, version: nextVersion };
  }

  private async emailLink(orgId: string, clientName: string, to: string, title: string, version: number, link: string) {
    try {
      const org = await this.prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } });
      const orgName = org?.name ?? "Your freelancer";
      const html = await render(
        FormRequestEmail({
          clientName,
          organizationName: orgName,
          heading: `Please review: ${title}`,
          description: `${orgName} sent you "${title}" (version ${version}) to review. You can approve it or ask for changes.`,
          buttonLabel: "Review now",
          formUrl: link,
        }),
      );
      const result = await this.mail.send(to, `${orgName}: please review ${title}`, html, orgId);
      return result.sent;
    } catch (err) {
      this.logger.warn(`Deliverable email failed: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }

  // ----- public, token scoped -----

  private async findByToken(token: string) {
    const deliverable = await this.prisma.deliverable.findUnique({
      where: { tokenHash: hashToken(token) },
      include: {
        project: { select: { id: true, name: true, clientId: true } },
        changeRequests: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!deliverable) throw new NotFoundException("Deliverable not found");
    return deliverable;
  }

  async getPublic(token: string) {
    const d = await this.findByToken(token);
    const [org, branding] = await Promise.all([
      this.prisma.organization.findUnique({ where: { id: d.organizationId }, select: { name: true } }),
      this.prisma.branding.findUnique({ where: { organizationId: d.organizationId }, select: { primaryColor: true, logoUrl: true } }),
    ]);
    return {
      organizationName: org?.name ?? "",
      primaryColor: branding?.primaryColor ?? null,
      logoUrl: branding?.logoUrl ?? null,
      projectName: d.project.name,
      title: d.title,
      description: d.description,
      links: d.links as unknown as { label: string; url: string }[],
      version: d.version,
      status: d.status,
      approvedAt: d.approvedAt,
      approvedByName: d.approvedByName,
      changeRequests: d.changeRequests.map((c) => ({ version: c.version, message: c.message, createdAt: c.createdAt, status: c.status })),
    };
  }

  async approve(token: string, name: string) {
    const d = await this.findByToken(token);
    if (d.status !== "in_review") throw new ConflictException("This deliverable is not waiting for review");
    const signer = plainText(name, 200);
    if (!signer) throw new BadRequestException("Type your full name to approve");

    const claimed = await this.prisma.deliverable.updateMany({
      where: { id: d.id, status: "in_review" },
      data: { status: "approved", approvedAt: new Date(), approvedByName: signer },
    });
    if (claimed.count === 0) throw new ConflictException("This deliverable was already answered");

    await this.logForClient(d.project.clientId, d.organizationId, "public", "deliverable_approved", `Client approved ${d.title} v${d.version}`);
    this.notifications.notifyAdmins(
      d.organizationId,
      "deliverable_approved",
      `${signer} approved ${d.title}`,
      `${d.project.name}, version ${d.version}`,
      `/dashboard/projects/${d.projectId}?tab=deliverables`,
    );
    return { ok: true };
  }

  async requestChanges(token: string, dto: RequestChangesDto) {
    const d = await this.findByToken(token);
    if (d.status !== "in_review") throw new ConflictException("This deliverable is not waiting for review");
    const message = plainText(dto.message, 3000);
    if (!message) throw new BadRequestException("Describe the changes you would like");

    const claimed = await this.prisma.deliverable.updateMany({
      where: { id: d.id, status: "in_review" },
      data: { status: "changes_requested" },
    });
    if (claimed.count === 0) throw new ConflictException("This deliverable was already answered");

    // The request becomes a task on the project so it cannot be forgotten.
    const last = await this.prisma.task.aggregate({ where: { projectId: d.projectId }, _max: { order: true } });
    const task = await this.prisma.task.create({
      data: {
        projectId: d.projectId,
        organizationId: d.organizationId,
        milestoneId: d.milestoneId,
        title: `Changes requested: ${d.title} v${d.version}`,
        description: message,
        order: (last._max.order ?? -1) + 1,
      },
    });
    await this.prisma.changeRequest.create({
      data: { deliverableId: d.id, organizationId: d.organizationId, version: d.version, message, taskId: task.id },
    });

    await this.logForClient(d.project.clientId, d.organizationId, "public", "changes_requested", `Client requested changes to ${d.title} v${d.version}: ${message}`);
    this.notifications.notifyAdmins(
      d.organizationId,
      "changes_requested",
      `Changes requested on ${d.title}`,
      message.slice(0, 140),
      `/dashboard/projects/${d.projectId}?tab=deliverables`,
    );
    return { ok: true };
  }
}

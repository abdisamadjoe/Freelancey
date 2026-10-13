import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { render } from "@react-email/render";
import { FormRequestEmail } from "@/email";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { ActivityService } from "../activity/activity.service";
import { NotificationsService } from "../notifications/notifications.service";
import { generateToken, hashToken, paginatedResponse, paginationArgs, plainText } from "../common";
import { CreateTicketDto, ReplyDto, SubmitTicketDto, TicketListQueryDto, UpdateTicketDto } from "./support.dto";

/** Stop accepting public tickets for a client past this many in an hour. */
const HOURLY_CAP = 10;

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private mail: MailService,
    private activity: ActivityService,
    private notifications: NotificationsService,
  ) {}

  // ----- staff -----

  /** Creates or replaces the client's private support link. The old link stops working. */
  async createSupportLink(clientId: string, orgId: string, userId: string) {
    const client = await this.prisma.client.findFirst({ where: { id: clientId, organizationId: orgId }, select: { id: true } });
    if (!client) throw new NotFoundException("Client not found");
    const token = generateToken();
    await this.prisma.client.update({ where: { id: clientId }, data: { supportTokenHash: hashToken(token) } });
    await this.activity.createForClient({
      clientId,
      organizationId: orgId,
      actorId: userId,
      kind: "system",
      action: "support_link_created",
      summary: "Support link created",
    });
    return { link: `${this.config.get("WEB_URL", "http://localhost:3000")}/support/${token}` };
  }

  async list(orgId: string, query: TicketListQueryDto) {
    const { page = 1, limit = 20, status, clientId, projectId } = query;
    const where = {
      organizationId: orgId,
      ...(status ? { status } : {}),
      ...(clientId ? { clientId } : {}),
      ...(projectId ? { projectId } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        include: { client: { select: { id: true, name: true, company: true } }, _count: { select: { replies: true } } },
        orderBy: [{ createdAt: "desc" }],
        ...paginationArgs(page, limit),
      }),
      this.prisma.supportTicket.count({ where }),
    ]);
    return paginatedResponse(data, total, page, limit);
  }

  async findOne(id: string, orgId: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, organizationId: orgId },
      include: {
        client: { select: { id: true, name: true, company: true, email: true } },
        replies: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!ticket) throw new NotFoundException("Ticket not found");
    let projectName: string | null = null;
    if (ticket.projectId) {
      const project = await this.prisma.project.findFirst({ where: { id: ticket.projectId, organizationId: orgId }, select: { name: true } });
      projectName = project?.name ?? null;
    }
    return { ...ticket, projectName };
  }

  private async assertProjectOfClient(projectId: string, clientId: string, orgId: string) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, organizationId: orgId, clientId }, select: { id: true } });
    if (!project) throw new BadRequestException("That project does not belong to this client");
  }

  /** A ticket the freelancer logs on a client's behalf (a phone call, a WhatsApp message). */
  async create(dto: CreateTicketDto, orgId: string, userId: string) {
    const client = await this.prisma.client.findFirst({ where: { id: dto.clientId, organizationId: orgId }, select: { id: true } });
    if (!client) throw new NotFoundException("Client not found");
    if (dto.projectId) await this.assertProjectOfClient(dto.projectId, dto.clientId, orgId);
    const ticket = await this.prisma.supportTicket.create({
      data: {
        organizationId: orgId,
        clientId: dto.clientId,
        projectId: dto.projectId,
        subject: dto.subject.trim(),
        message: dto.message.trim(),
        priority: dto.priority ?? "normal",
        source: "staff",
      },
    });
    await this.activity.createForClient({
      clientId: dto.clientId,
      organizationId: orgId,
      actorId: userId,
      kind: "system",
      action: "ticket_created",
      summary: `Support ticket logged: ${ticket.subject}`,
    });
    return ticket;
  }

  async update(id: string, dto: UpdateTicketDto, orgId: string, userId: string) {
    const existing = await this.prisma.supportTicket.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) throw new NotFoundException("Ticket not found");
    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: {
        ...(dto.priority ? { priority: dto.priority } : {}),
        ...(dto.status ? { status: dto.status, resolvedAt: dto.status === "resolved" ? new Date() : null } : {}),
      },
    });
    if (dto.status && dto.status !== existing.status) {
      await this.activity.createForClient({
        clientId: existing.clientId,
        organizationId: orgId,
        actorId: userId,
        kind: "system",
        action: "ticket_status_changed",
        summary: `Support ticket "${existing.subject}": ${existing.status} → ${dto.status}`,
      });
    }
    return updated;
  }

  async reply(id: string, dto: ReplyDto, orgId: string, userId: string, authorName: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, organizationId: orgId },
      include: { client: { select: { name: true, email: true } } },
    });
    if (!ticket) throw new NotFoundException("Ticket not found");
    const message = dto.message.trim();

    const reply = await this.prisma.supportReply.create({
      data: { ticketId: id, organizationId: orgId, authorKind: "staff", authorName, message },
    });
    // A first answer means the ticket is being worked on.
    if (ticket.status === "open") {
      await this.prisma.supportTicket.update({ where: { id }, data: { status: "in_progress" } });
    }

    const to = ticket.client.email ?? ticket.submittedByEmail;
    let emailed = false;
    if ((dto.email ?? true) && to) emailed = await this.emailReply(orgId, ticket.client.name, to, ticket.subject, message);
    await this.activity.createForClient({
      clientId: ticket.clientId,
      organizationId: orgId,
      actorId: userId,
      kind: "system",
      action: "ticket_replied",
      summary: `Replied to "${ticket.subject}"${emailed ? " (emailed)" : ""}`,
    });
    return { ...reply, emailed };
  }

  private async emailReply(orgId: string, clientName: string, to: string, subject: string, message: string) {
    try {
      const org = await this.prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } });
      const orgName = org?.name ?? "Your freelancer";
      const html = await render(
        FormRequestEmail({
          clientName,
          organizationName: orgName,
          heading: `Re: ${subject}`,
          description: message,
          buttonLabel: "Open your support page",
          formUrl: this.config.get("WEB_URL", "http://localhost:3000"),
        }),
      );
      const result = await this.mail.send(to, `${orgName}: Re: ${subject}`, html, orgId);
      return result.sent;
    } catch (err) {
      this.logger.warn(`Support reply email failed: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }

  // ----- public, token scoped -----

  private async findClientByToken(token: string) {
    const client = await this.prisma.client.findUnique({
      where: { supportTokenHash: hashToken(token) },
      select: { id: true, name: true, organizationId: true, archivedAt: true },
    });
    if (!client || client.archivedAt) throw new NotFoundException("Support page not found");
    return client;
  }

  async getPublicForm(token: string) {
    const client = await this.findClientByToken(token);
    const [org, branding, projects] = await Promise.all([
      this.prisma.organization.findUnique({ where: { id: client.organizationId }, select: { name: true } }),
      this.prisma.branding.findUnique({ where: { organizationId: client.organizationId }, select: { primaryColor: true, logoUrl: true } }),
      this.prisma.project.findMany({
        where: { organizationId: client.organizationId, clientId: client.id, archivedAt: null },
        select: { id: true, name: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return {
      organizationName: org?.name ?? "",
      primaryColor: branding?.primaryColor ?? null,
      logoUrl: branding?.logoUrl ?? null,
      clientName: client.name,
      projects,
    };
  }

  /** Always resolves the same way for bots and capped clients; only validation problems throw. */
  async submit(token: string, dto: SubmitTicketDto): Promise<{ ok: true }> {
    if (dto.hp?.trim()) return { ok: true };
    const client = await this.findClientByToken(token);

    const subject = plainText(dto.subject, 200);
    const message = plainText(dto.message, 5000);
    if (!subject || !message) throw new BadRequestException("Add a subject and describe the problem");
    if (dto.projectId) await this.assertProjectOfClient(dto.projectId, client.id, client.organizationId);

    const recent = await this.prisma.supportTicket.count({
      where: { clientId: client.id, source: "public", createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
    });
    if (recent >= HOURLY_CAP) return { ok: true };

    const ticket = await this.prisma.supportTicket.create({
      data: {
        organizationId: client.organizationId,
        clientId: client.id,
        projectId: dto.projectId,
        subject,
        message,
        submittedByName: plainText(dto.name, 200),
        submittedByEmail: dto.email?.trim().toLowerCase(),
      },
    });
    await this.activity.createForClient({
      clientId: client.id,
      organizationId: client.organizationId,
      actorId: "public",
      kind: "system",
      action: "ticket_created",
      summary: `Support request: ${subject}`,
    });
    this.notifications.notifyAdmins(
      client.organizationId,
      "support_ticket",
      `Support request from ${client.name}`,
      subject,
      `/dashboard/support/${ticket.id}`,
    );
    return { ok: true };
  }
}

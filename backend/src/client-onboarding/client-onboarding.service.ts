import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { render } from "@react-email/render";
import { InvitationEmail } from "@/email";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { ActivityService } from "../activity/activity.service";
import { NotificationsService } from "../notifications/notifications.service";
import { NeonAuthUsersRepository } from "../auth/neon-auth-users.repository";
import {
  DEFAULT_INTAKE_FIELDS,
  DEFAULT_INTAKE_KEY,
  DEFAULT_INTAKE_NAME,
  DEFAULT_ONBOARDING_ITEMS,
  type IntakeField,
} from "./intake-template";
import { AddOnboardingItemDto, SaveIntakeDto, UpdateOnboardingItemDto } from "./client-onboarding.dto";

const MAX_ANSWER_LENGTH = 5000;
/** Items a client may tick themselves: nothing they could check off would prove a signature or a payment. */
const CLIENT_TOGGLEABLE = new Set(["upload_assets", "custom"]);

interface ItemRow {
  id: string;
  clientId: string;
  projectId: string | null;
  title: string;
  description: string | null;
  kind: string;
  order: number;
  done: boolean;
  doneAt: Date | null;
  linkedType: string | null;
  linkedId: string | null;
}

@Injectable()
export class ClientOnboardingService {
  private readonly logger = new Logger(ClientOnboardingService.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private config: ConfigService,
    private activity: ActivityService,
    private notifications: NotificationsService,
    private neonAuthUsers: NeonAuthUsersRepository,
  ) {}

  // ─── helpers ───

  private async assertClient(clientId: string, orgId: string) {
    const client = await this.prisma.client.findFirst({ where: { id: clientId, organizationId: orgId } });
    if (!client) throw new NotFoundException("Client not found");
    return client;
  }

  private async ensureTemplate(orgId: string) {
    return this.prisma.formTemplate.upsert({
      where: { organizationId_key: { organizationId: orgId, key: DEFAULT_INTAKE_KEY } },
      create: {
        organizationId: orgId,
        key: DEFAULT_INTAKE_KEY,
        name: DEFAULT_INTAKE_NAME,
        fields: DEFAULT_INTAKE_FIELDS as unknown as object,
      },
      update: {},
    });
  }

  /**
   * Done state is read from the linked object instead of stored, so signing a
   * document or paying an invoice ticks the checklist without any hook in
   * those services and it can never go stale.
   */
  private async withState(items: ItemRow[], orgId: string) {
    const idsOf = (type: string) =>
      items.filter((i) => i.linkedType === type && i.linkedId).map((i) => i.linkedId as string);

    const [docs, invoices, forms] = await Promise.all([
      idsOf("document").length
        ? this.prisma.document.findMany({
            where: { id: { in: idsOf("document") }, organizationId: orgId },
            select: { id: true, title: true, status: true },
          })
        : [],
      idsOf("invoice").length
        ? this.prisma.invoice.findMany({
            where: { id: { in: idsOf("invoice") }, organizationId: orgId },
            select: { id: true, invoiceNumber: true, status: true },
          })
        : [],
      idsOf("form").length
        ? this.prisma.formResponse.findMany({
            where: { id: { in: idsOf("form") }, organizationId: orgId },
            select: { id: true, status: true },
          })
        : [],
    ]);
    const doc = new Map(docs.map((d) => [d.id, d]));
    const inv = new Map(invoices.map((d) => [d.id, d]));
    const form = new Map(forms.map((d) => [d.id, d]));

    return items.map((item) => {
      let done = item.done;
      let linkedLabel: string | null = null;
      let linkedStatus: string | null = null;
      if (item.linkedType === "document" && item.linkedId) {
        const d = doc.get(item.linkedId);
        done = d ? ["signed", "accepted"].includes(d.status) : false;
        linkedLabel = d?.title ?? null;
        linkedStatus = d?.status ?? null;
      } else if (item.linkedType === "invoice" && item.linkedId) {
        const d = inv.get(item.linkedId);
        done = d ? d.status === "paid" : false;
        linkedLabel = d?.invoiceNumber ?? null;
        linkedStatus = d?.status ?? null;
      } else if (item.linkedType === "form" && item.linkedId) {
        const d = form.get(item.linkedId);
        done = d ? d.status === "submitted" : false;
        linkedStatus = d?.status ?? null;
      }
      return { ...item, done, linkedLabel, linkedStatus };
    });
  }

  private summarise<T extends { done: boolean }>(items: T[]) {
    const done = items.filter((i) => i.done).length;
    return { done, total: items.length, complete: items.length > 0 && done === items.length };
  }

  // ─── owner side ───

  /** Creates the default checklist and a draft questionnaire. Safe to call again: nothing is duplicated. */
  async start(clientId: string, orgId: string, actorId: string, projectId?: string) {
    await this.assertClient(clientId, orgId);
    if (projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: projectId, organizationId: orgId },
        select: { id: true },
      });
      if (!project) throw new BadRequestException("Project does not belong to this organization");
    }

    const existing = await this.prisma.onboardingItem.count({ where: { clientId, organizationId: orgId } });
    if (existing === 0) {
      const template = await this.ensureTemplate(orgId);
      const response = await this.prisma.formResponse.upsert({
        where: { templateId_clientId: { templateId: template.id, clientId } },
        create: { organizationId: orgId, templateId: template.id, clientId, projectId: projectId ?? null },
        update: {},
      });
      await this.prisma.onboardingItem.createMany({
        data: DEFAULT_ONBOARDING_ITEMS.map((item, index) => ({
          organizationId: orgId,
          clientId,
          projectId: projectId ?? null,
          kind: item.kind,
          title: item.title,
          description: item.description,
          order: index,
          ...(item.kind === "intake" ? { linkedType: "form", linkedId: response.id } : {}),
        })),
      });
      await this.activity.createForClient({
        clientId,
        organizationId: orgId,
        actorId,
        kind: "system",
        action: "onboarding_started",
        summary: "Onboarding checklist created",
      });
    }
    return this.getForClient(clientId, orgId);
  }

  async getForClient(clientId: string, orgId: string) {
    await this.assertClient(clientId, orgId);
    const rows = await this.prisma.onboardingItem.findMany({
      where: { clientId, organizationId: orgId },
      orderBy: { order: "asc" },
    });
    const items = await this.withState(rows, orgId);
    const response = await this.prisma.formResponse.findFirst({
      where: { clientId, organizationId: orgId },
      include: { template: { select: { name: true, fields: true } } },
    });
    const contacts = await this.prisma.clientContact.findMany({
      where: { clientId },
      select: { id: true, name: true, email: true, userId: true, isPrimary: true },
    });
    return {
      started: rows.length > 0,
      items,
      progress: this.summarise(items),
      contacts,
      intake: response
        ? {
            id: response.id,
            name: response.template.name,
            fields: response.template.fields as unknown as IntakeField[],
            answers: response.answers as Record<string, string>,
            status: response.status,
            submittedAt: response.submittedAt,
          }
        : null,
    };
  }

  async addItem(clientId: string, orgId: string, dto: AddOnboardingItemDto) {
    await this.assertClient(clientId, orgId);
    const last = await this.prisma.onboardingItem.aggregate({
      where: { clientId, organizationId: orgId },
      _max: { order: true },
    });
    return this.prisma.onboardingItem.create({
      data: {
        organizationId: orgId,
        clientId,
        kind: "custom",
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        order: (last._max.order ?? -1) + 1,
      },
    });
  }

  async updateItem(clientId: string, itemId: string, orgId: string, dto: UpdateOnboardingItemDto) {
    await this.assertClient(clientId, orgId);
    const item = await this.prisma.onboardingItem.findFirst({ where: { id: itemId, clientId, organizationId: orgId } });
    if (!item) throw new NotFoundException("Checklist item not found");

    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.description !== undefined) data.description = dto.description.trim() || null;

    if (dto.linkedType !== undefined || dto.linkedId !== undefined) {
      if (item.linkedType === "form") throw new BadRequestException("The questionnaire item cannot be relinked");
      if (dto.linkedType === null || dto.linkedId === null) {
        data.linkedType = null;
        data.linkedId = null;
      } else {
        if (!dto.linkedType || !dto.linkedId) throw new BadRequestException("Provide both linkedType and linkedId");
        await this.assertLinkable(dto.linkedType, dto.linkedId, clientId, orgId);
        data.linkedType = dto.linkedType;
        data.linkedId = dto.linkedId;
      }
    }

    if (dto.done !== undefined) {
      const linkedAfter = "linkedType" in data ? data.linkedType : item.linkedType;
      if (linkedAfter) throw new BadRequestException("This item completes on its own when the linked item is finished");
      data.done = dto.done;
      data.doneAt = dto.done ? new Date() : null;
    }

    return this.prisma.onboardingItem.update({ where: { id: itemId }, data });
  }

  /** A link must point at something in this workspace that belongs to this client. */
  private async assertLinkable(type: "document" | "invoice", id: string, clientId: string, orgId: string) {
    const projects = await this.prisma.project.findMany({
      where: { organizationId: orgId, clientId },
      select: { id: true },
    });
    const projectIds = projects.map((p) => p.id);
    if (type === "document") {
      const doc = await this.prisma.document.findFirst({
        where: { id, organizationId: orgId, projectId: { in: projectIds } },
        select: { id: true },
      });
      if (!doc) throw new BadRequestException("Document not found for this client");
    } else {
      const inv = await this.prisma.invoice.findFirst({
        where: { id, organizationId: orgId, OR: [{ clientId }, { projectId: { in: projectIds } }] },
        select: { id: true },
      });
      if (!inv) throw new BadRequestException("Invoice not found for this client");
    }
  }

  async removeItem(clientId: string, itemId: string, orgId: string) {
    await this.assertClient(clientId, orgId);
    const item = await this.prisma.onboardingItem.findFirst({ where: { id: itemId, clientId, organizationId: orgId } });
    if (!item) throw new NotFoundException("Checklist item not found");
    await this.prisma.onboardingItem.delete({ where: { id: itemId } });
  }

  /** Documents and invoices of this client's projects, for choosing what an item links to. */
  async linkables(clientId: string, orgId: string) {
    await this.assertClient(clientId, orgId);
    const projects = await this.prisma.project.findMany({
      where: { organizationId: orgId, clientId },
      select: { id: true },
    });
    const projectIds = projects.map((p) => p.id);
    const [documents, invoices] = await Promise.all([
      this.prisma.document.findMany({
        where: { organizationId: orgId, projectId: { in: projectIds } },
        select: { id: true, title: true, type: true, status: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      this.prisma.invoice.findMany({
        where: { organizationId: orgId, OR: [{ clientId }, { projectId: { in: projectIds } }] },
        select: { id: true, invoiceNumber: true, status: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);
    return { documents, invoices };
  }

  /** Invites the client to the portal, or links them straight away if they already have a login here. */
  async sendInvite(
    clientId: string,
    orgId: string,
    inviter: { id: string; name: string },
    orgName: string,
    projectId?: string,
  ): Promise<{ status: "invited" | "linked"; email: string; inviteLink?: string }> {
    const client = await this.assertClient(clientId, orgId);
    const email = client.email?.trim().toLowerCase();
    if (!email) throw new BadRequestException("Add an email address to this client before inviting them");

    let projectName: string | undefined;
    if (projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: projectId, organizationId: orgId },
        select: { name: true },
      });
      if (!project) throw new BadRequestException("Project does not belong to this organization");
      projectName = project.name;
    }

    const existingUser = await this.neonAuthUsers.findByEmail(email);
    if (existingUser) {
      const membership = await this.prisma.member.findFirst({
        where: { userId: existingUser.id, organizationId: orgId },
        select: { role: true },
      });
      if (membership && membership.role !== "member") {
        throw new BadRequestException("This email belongs to a team member of this workspace");
      }
      if (membership) {
        await this.linkContact(client.id, orgId, existingUser.id, existingUser.name ?? client.name, email);
        return { status: "linked", email };
      }
    }

    const invitation = await this.prisma.invitation.create({
      data: {
        organizationId: orgId,
        email,
        role: "member",
        status: "pending",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        inviterId: inviter.id,
      },
    });

    const inviteLink = `${this.config.get("WEB_URL", "http://localhost:3000")}/accept-invite?id=${invitation.id}`;
    const html = await render(
      InvitationEmail({ inviteUrl: inviteLink, organizationName: orgName, inviterName: inviter.name, projectName }),
    );
    await this.mail.send(email, `You've been invited to ${orgName}`, html, orgId);

    const hasContact = await this.prisma.clientContact.findFirst({ where: { clientId, email }, select: { id: true } });
    if (!hasContact) {
      await this.prisma.clientContact.create({
        data: { clientId, name: client.name, email, phone: client.phone, isPrimary: true },
      });
    }

    await this.activity.createForClient({
      clientId,
      organizationId: orgId,
      actorId: inviter.id,
      kind: "system",
      action: "invite_sent",
      summary: `Portal invitation sent to ${email}`,
    });
    return { status: "invited", email, inviteLink };
  }

  private async linkContact(clientId: string, orgId: string, userId: string, name: string, email: string) {
    const contact = await this.prisma.clientContact.findFirst({ where: { clientId, email } });
    if (contact) {
      if (contact.userId !== userId) {
        await this.prisma.clientContact.update({ where: { id: contact.id }, data: { userId } });
      }
    } else {
      await this.prisma.clientContact.create({ data: { clientId, userId, name, email, isPrimary: true } });
    }
    const projects = await this.prisma.project.findMany({
      where: { organizationId: orgId, clientId, archivedAt: null },
      select: { id: true },
    });
    if (projects.length) {
      await this.prisma.projectClient.createMany({
        data: projects.map((p) => ({ projectId: p.id, userId })),
        skipDuplicates: true,
      });
    }
  }

  /**
   * Called when an invitation is accepted. Never throws: a hiccup here must not
   * stop someone from getting into the portal.
   */
  async onInvitationAccepted(input: { userId: string; userName: string | null; email: string; orgId: string; role: string }) {
    if (input.role !== "member") return;
    try {
      const clients = await this.prisma.client.findMany({
        where: { organizationId: input.orgId, email: { equals: input.email, mode: "insensitive" } },
        select: { id: true, name: true },
      });
      for (const client of clients) {
        await this.linkContact(client.id, input.orgId, input.userId, input.userName ?? client.name, input.email.toLowerCase());
        this.notifications.notifyClientJoined(input.orgId, client.id, client.name);
      }
    } catch (err) {
      this.logger.warn({ err }, "Failed to link accepted invitation to a client record");
    }
  }

  /** Copies the questionnaire answers into an internal project note, ready to build from. */
  async intakeToNote(clientId: string, orgId: string, authorId: string, projectId: string) {
    await this.assertClient(clientId, orgId);
    const project = await this.prisma.project.findFirst({ where: { id: projectId, organizationId: orgId }, select: { id: true } });
    if (!project) throw new BadRequestException("Project does not belong to this organization");
    const response = await this.prisma.formResponse.findFirst({
      where: { clientId, organizationId: orgId },
      include: { template: { select: { name: true, fields: true } } },
    });
    if (!response || response.status !== "submitted") throw new BadRequestException("The questionnaire has not been submitted yet");

    const fields = response.template.fields as unknown as IntakeField[];
    const answers = response.answers as Record<string, string>;
    let section = "";
    const lines: string[] = [response.template.name];
    for (const f of fields) {
      const value = answers[f.key]?.toString().trim();
      if (!value) continue;
      if (f.section !== section) {
        section = f.section;
        lines.push("", section.toUpperCase());
      }
      lines.push(`${f.label}: ${value}`);
    }
    return this.prisma.projectNote.create({
      data: { content: lines.join("\n"), projectId, organizationId: orgId, authorId },
    });
  }

  // ─── portal side (the signed-in client) ───

  private async myClientIds(userId: string, orgId: string): Promise<string[]> {
    const contacts = await this.prisma.clientContact.findMany({
      where: { userId, client: { organizationId: orgId } },
      select: { clientId: true },
    });
    return [...new Set(contacts.map((c) => c.clientId))];
  }

  async getMine(userId: string, orgId: string) {
    const clientIds = await this.myClientIds(userId, orgId);
    if (clientIds.length === 0) return { items: [], progress: { done: 0, total: 0, complete: false }, intake: null };

    const rows = await this.prisma.onboardingItem.findMany({
      where: { clientId: { in: clientIds }, organizationId: orgId },
      orderBy: { order: "asc" },
    });
    const items = (await this.withState(rows, orgId)).map((i) => ({
      id: i.id,
      title: i.title,
      description: i.description,
      kind: i.kind,
      done: i.done,
      linkedType: i.linkedType,
      linkedId: i.linkedType === "form" ? null : i.linkedId,
      projectId: i.projectId,
      canToggle: !i.linkedType && CLIENT_TOGGLEABLE.has(i.kind),
    }));

    const response = await this.prisma.formResponse.findFirst({
      where: { clientId: { in: clientIds }, organizationId: orgId },
      include: { template: { select: { name: true, fields: true } } },
    });
    return {
      items,
      progress: this.summarise(items),
      intake: response
        ? {
            name: response.template.name,
            fields: response.template.fields as unknown as IntakeField[],
            answers: response.answers as Record<string, string>,
            status: response.status,
          }
        : null,
    };
  }

  async toggleMine(itemId: string, userId: string, orgId: string, done: boolean) {
    const clientIds = await this.myClientIds(userId, orgId);
    const item = await this.prisma.onboardingItem.findFirst({
      where: { id: itemId, organizationId: orgId, clientId: { in: clientIds } },
    });
    if (!item) throw new NotFoundException("Checklist item not found");
    if (item.linkedType || !CLIENT_TOGGLEABLE.has(item.kind)) {
      throw new BadRequestException("This step completes on its own");
    }
    return this.prisma.onboardingItem.update({
      where: { id: itemId },
      data: { done, doneAt: done ? new Date() : null },
    });
  }

  async saveIntake(userId: string, orgId: string, dto: SaveIntakeDto) {
    const clientIds = await this.myClientIds(userId, orgId);
    const response = await this.prisma.formResponse.findFirst({
      where: { clientId: { in: clientIds }, organizationId: orgId },
      include: { template: { select: { fields: true } }, client: { select: { id: true, name: true } } },
    });
    if (!response) throw new NotFoundException("No questionnaire for this account");
    if (response.status === "submitted") throw new BadRequestException("The questionnaire was already submitted");

    const fields = response.template.fields as unknown as IntakeField[];
    const known = new Map(fields.map((f) => [f.key, f]));
    const answers: Record<string, string> = {};
    for (const [key, raw] of Object.entries(dto.answers)) {
      const field = known.get(key);
      if (!field || raw === null || raw === undefined) continue; // unknown keys are dropped, not stored
      const text = String(raw).trim().slice(0, MAX_ANSWER_LENGTH);
      if (field.type === "select" && text && !field.options?.includes(text)) continue;
      if (text) answers[key] = text;
    }

    if (dto.submit) {
      const missing = fields.filter((f) => f.required && !answers[f.key]).map((f) => f.label);
      if (missing.length) throw new BadRequestException(`Please answer: ${missing.join(", ")}`);
    }

    const updated = await this.prisma.formResponse.update({
      where: { id: response.id },
      data: {
        answers,
        ...(dto.submit ? { status: "submitted", submittedAt: new Date(), submittedById: userId } : {}),
      },
    });

    if (dto.submit) {
      await this.activity.createForClient({
        clientId: response.client.id,
        organizationId: orgId,
        actorId: userId,
        kind: "system",
        action: "intake_submitted",
        summary: "Completed the project questionnaire",
      });
      this.notifications.notifyIntakeSubmitted(orgId, response.client.id, response.client.name);
    }
    return { status: updated.status };
  }
}

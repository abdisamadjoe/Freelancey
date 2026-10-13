import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { render } from "@react-email/render";
import { FormRequestEmail } from "@/email";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { ActivityService } from "../activity/activity.service";
import { NotificationsService } from "../notifications/notifications.service";
import { ClientOnboardingService } from "../client-onboarding/client-onboarding.service";
import type { IntakeField } from "../client-onboarding/intake-template";
import { generateToken, hashToken } from "../common";
import { cleanAnswers } from "./form-answers";
import { BRIEF_TITLE, LINK_TTL_DAYS, PROJECT_BRIEF_FIELDS } from "./form-links.constants";
import { CreateFormLinkDto, FormLinkListQueryDto } from "./form-links.dto";

const DAY_MS = 24 * 60 * 60 * 1000;

const COPY = {
  onboarding: {
    heading: "Tell us about your business",
    description: "please take a few minutes to tell us about your business, your audience and your goals so we can get started.",
    button: "Fill in the form",
    path: "onboarding",
    subject: "Please tell us about your business",
  },
  project_brief: {
    heading: "Tell us about your project",
    description: "please tell us what this project needs: the goals, pages, features and anything else we should know.",
    button: "Fill in the project brief",
    path: "brief",
    subject: "Please fill in your project brief",
  },
} as const;

type Kind = keyof typeof COPY;

@Injectable()
export class FormLinksService {
  private readonly logger = new Logger(FormLinksService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private mail: MailService,
    private activity: ActivityService,
    private notifications: NotificationsService,
    private onboarding: ClientOnboardingService,
  ) {}

  private async fieldsFor(kind: Kind, orgId: string): Promise<{ title: string; fields: IntakeField[] }> {
    if (kind === "project_brief") return { title: BRIEF_TITLE, fields: PROJECT_BRIEF_FIELDS };
    const template = await this.onboarding.ensureTemplate(orgId);
    return { title: template.name, fields: template.fields as unknown as IntakeField[] };
  }

  // ----- staff -----

  /** Issues a fresh secure link (replacing any earlier pending one). A completed form is not reopened. */
  async createLink(dto: CreateFormLinkDto, orgId: string, userId: string) {
    const kind = dto.kind as Kind;
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, organizationId: orgId },
      select: { id: true, name: true, email: true },
    });
    if (!client) throw new NotFoundException("Client not found");

    let projectId: string | null = null;
    if (kind === "project_brief") {
      if (!dto.projectId) throw new BadRequestException("A project brief needs a project");
      const project = await this.prisma.project.findFirst({
        where: { id: dto.projectId, organizationId: orgId, clientId: client.id },
        select: { id: true },
      });
      if (!project) throw new NotFoundException("Project not found for this client");
      projectId = project.id;
    } else if (dto.projectId) {
      throw new BadRequestException("Client onboarding is not tied to a project");
    }

    const wantsEmail = dto.email ?? false;
    if (wantsEmail && !client.email) {
      throw new BadRequestException("This client has no email address. Copy the link instead");
    }

    const existing = await this.prisma.formLink.findFirst({
      where: { organizationId: orgId, clientId: client.id, kind, projectId },
      orderBy: { createdAt: "desc" },
    });
    if (existing?.status === "completed") {
      throw new BadRequestException("This form has already been completed");
    }

    const token = generateToken();
    const data = { tokenHash: hashToken(token), expiresAt: new Date(Date.now() + LINK_TTL_DAYS * DAY_MS) };
    if (existing) {
      await this.prisma.formLink.update({ where: { id: existing.id }, data });
    } else {
      await this.prisma.formLink.create({
        data: { ...data, organizationId: orgId, clientId: client.id, projectId, kind, createdById: userId },
      });
    }

    const link = `${this.config.get("WEB_URL", "http://localhost:3000")}/${COPY[kind].path}/${token}`;
    let emailed = false;
    if (wantsEmail && client.email) {
      emailed = await this.emailLink(orgId, kind, client.name, client.email, link);
    }

    await this.activity.createForClient({
      clientId: client.id,
      organizationId: orgId,
      actorId: userId,
      kind: "system",
      action: "form_link_sent",
      summary: `${kind === "onboarding" ? "Client onboarding form" : "Project brief"} sent${emailed ? " (emailed)" : ""}`,
    });
    return { link, emailed };
  }

  private async emailLink(orgId: string, kind: Kind, clientName: string, to: string, link: string): Promise<boolean> {
    try {
      const org = await this.prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } });
      const orgName = org?.name ?? "Your freelancer";
      const copy = COPY[kind];
      const html = await render(
        FormRequestEmail({
          clientName,
          organizationName: orgName,
          heading: copy.heading,
          description: copy.description,
          buttonLabel: copy.button,
          formUrl: link,
        }),
      );
      const result = await this.mail.send(to, `${orgName}: ${copy.subject}`, html, orgId);
      return result.sent;
    } catch (err) {
      this.logger.warn(`Form link email failed: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }

  async list(query: FormLinkListQueryDto, orgId: string) {
    const rows = await this.prisma.formLink.findMany({
      where: {
        organizationId: orgId,
        clientId: query.clientId,
        ...(query.kind ? { kind: query.kind } : {}),
        ...(query.projectId ? { projectId: query.projectId } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, kind: true, projectId: true, status: true, expiresAt: true, completedAt: true, createdAt: true },
    });
    return rows.map((r) => ({
      ...r,
      status: r.status === "pending" && r.expiresAt.getTime() < Date.now() ? "expired" : r.status,
    }));
  }

  /** The answers a client gave, with the question labels, for the freelancer to read. */
  async getAnswers(id: string, orgId: string) {
    const link = await this.prisma.formLink.findFirst({ where: { id, organizationId: orgId } });
    if (!link) throw new NotFoundException("Form not found");
    const { title, fields } = await this.fieldsFor(link.kind as Kind, orgId);
    return {
      id: link.id,
      kind: link.kind,
      title,
      status: link.status,
      completedAt: link.completedAt,
      fields,
      answers: (link.answers ?? {}) as Record<string, string>,
    };
  }

  // ----- public, token scoped -----

  private async findByToken(token: string) {
    const link = await this.prisma.formLink.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { client: { select: { id: true, name: true } } },
    });
    if (!link) throw new NotFoundException("Form not found");
    return link;
  }

  async getPublic(token: string) {
    const link = await this.findByToken(token);
    const expired = link.status === "pending" && link.expiresAt.getTime() < Date.now();
    const kind = link.kind as Kind;

    const [org, branding] = await Promise.all([
      this.prisma.organization.findUnique({ where: { id: link.organizationId }, select: { name: true } }),
      this.prisma.branding.findUnique({
        where: { organizationId: link.organizationId },
        select: { primaryColor: true, logoUrl: true },
      }),
    ]);
    const base = {
      kind,
      organizationName: org?.name ?? "",
      primaryColor: branding?.primaryColor ?? null,
      logoUrl: branding?.logoUrl ?? null,
      clientName: link.client.name,
      status: expired ? "expired" : link.status,
    };
    if (expired || link.status === "completed") return { ...base, title: COPY[kind].heading, fields: [] as IntakeField[] };

    const { fields } = await this.fieldsFor(kind, link.organizationId);
    return { ...base, title: COPY[kind].heading, fields };
  }

  async submit(token: string, input: Record<string, unknown>) {
    const link = await this.findByToken(token);
    if (link.status === "completed") throw new ConflictException("This form has already been submitted");
    if (link.expiresAt.getTime() < Date.now()) {
      throw new ConflictException("This link has expired. Ask for a new one");
    }
    const kind = link.kind as Kind;
    const { fields } = await this.fieldsFor(kind, link.organizationId);
    const answers = cleanAnswers(fields, input);

    // The status condition makes a double click or two tabs resolve to a single submission.
    const claimed = await this.prisma.formLink.updateMany({
      where: { id: link.id, status: "pending" },
      data: { status: "completed", completedAt: new Date(), answers },
    });
    if (claimed.count === 0) throw new ConflictException("This form has already been submitted");

    if (kind === "onboarding") {
      // Mirror into the questionnaire record so the existing client view and checklist item stay in step.
      const template = await this.onboarding.ensureTemplate(link.organizationId);
      await this.prisma.formResponse.upsert({
        where: { templateId_clientId: { templateId: template.id, clientId: link.clientId } },
        create: {
          organizationId: link.organizationId,
          templateId: template.id,
          clientId: link.clientId,
          answers,
          status: "submitted",
          submittedAt: new Date(),
        },
        update: { answers, status: "submitted", submittedAt: new Date() },
      });
    }

    await this.activity.createForClient({
      clientId: link.clientId,
      organizationId: link.organizationId,
      actorId: "public",
      kind: "system",
      action: "form_completed",
      summary: kind === "onboarding" ? "Completed the client onboarding form" : "Completed the project brief",
    });
    if (kind === "onboarding") {
      this.notifications.notifyIntakeSubmitted(link.organizationId, link.clientId, link.client.name);
    } else {
      this.notifications.notifyAdmins(
        link.organizationId,
        "brief_submitted",
        `${link.client.name} completed the project brief`,
        "Their answers are ready to review.",
        link.projectId ? `/dashboard/projects/${link.projectId}` : `/dashboard/leads/${link.clientId}`,
      );
    }
    return { ok: true };
  }
}

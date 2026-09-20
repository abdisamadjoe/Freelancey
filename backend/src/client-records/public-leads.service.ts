import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import sanitizeHtml from "sanitize-html";
import { PrismaService } from "../prisma/prisma.service";
import { ActivityService } from "../activity/activity.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PublicLeadDto } from "./public-leads.dto";

const SOURCE = "website form";
/** Stop creating records if a single workspace receives this many form leads in an hour. */
const HOURLY_CAP = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Plain text only: form input is untrusted and ends up in emails, notifications and the UI. */
function clean(value: string | undefined, max: number): string | undefined {
  if (!value) return undefined;
  // sanitize-html returns HTML-escaped text; "&" must read as "&" when shown as plain text.
  // "<" and ">" stay escaped on purpose so stored values can never be mistaken for markup.
  const text = sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).replace(/&amp;/g, "&").trim();
  return text ? text.slice(0, max) : undefined;
}

@Injectable()
export class PublicLeadsService {
  constructor(
    private prisma: PrismaService,
    private activity: ActivityService,
    private notifications: NotificationsService,
  ) {}

  /** Minimal info for rendering the public form. Unknown and disabled forms look identical. */
  async getForm(slug: string) {
    const org = await this.prisma.organization.findUnique({
      where: { slug },
      select: { id: true, name: true, systemSettings: { select: { leadFormEnabled: true } } },
    });
    if (!org || !org.systemSettings?.leadFormEnabled) {
      throw new NotFoundException("Contact form unavailable");
    }
    const branding = await this.prisma.branding.findUnique({
      where: { organizationId: org.id },
      select: { primaryColor: true, logoUrl: true },
    });
    return { name: org.name, primaryColor: branding?.primaryColor ?? null, logoUrl: branding?.logoUrl ?? null };
  }

  /**
   * Always resolves the same way for the caller (no hints about duplicates,
   * bots or caps); only validation problems and an unavailable form throw.
   */
  async submit(slug: string, dto: PublicLeadDto): Promise<{ ok: true }> {
    if (dto.hp?.trim()) return { ok: true }; // bot

    const org = await this.prisma.organization.findUnique({
      where: { slug },
      select: { id: true, systemSettings: { select: { leadFormEnabled: true } } },
    });
    if (!org || !org.systemSettings?.leadFormEnabled) {
      throw new NotFoundException("Contact form unavailable");
    }
    const orgId = org.id;

    const name = clean(dto.name, 200);
    const email = clean(dto.email, 320)?.toLowerCase();
    const phone = clean(dto.phone, 50);
    const whatsapp = clean(dto.whatsapp, 50);
    if (!name) throw new BadRequestException("Name is required");
    if (!email && !phone && !whatsapp) {
      throw new BadRequestException("Provide an email, phone or WhatsApp number");
    }

    const message = clean(dto.message, 3000);
    const budget = clean(dto.budget, 100);
    const interestedIn = clean(dto.interestedIn, 200);
    const summary = [
      message,
      interestedIn ? `Interested in: ${interestedIn}` : undefined,
      budget ? `Budget: ${budget}` : undefined,
    ]
      .filter(Boolean)
      .join("\n");

    const existing = email
      ? await this.prisma.client.findFirst({
          where: { organizationId: orgId, email, archivedAt: null },
          select: { id: true, name: true },
        })
      : null;

    if (existing) {
      await this.activity.createForClient({
        clientId: existing.id,
        organizationId: orgId,
        actorId: "public",
        kind: "note",
        action: "form_submitted",
        summary: `Submitted the contact form again${summary ? `:\n${summary}` : ""}`,
      });
      this.notifications.notifyNewLead(orgId, existing.id, existing.name, "Contacted you again via the form");
      return { ok: true };
    }

    const recent = await this.prisma.client.count({
      where: { organizationId: orgId, source: SOURCE, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
    });
    if (recent >= HOURLY_CAP) return { ok: true };

    const client = await this.prisma.client.create({
      data: {
        organizationId: orgId,
        name,
        company: clean(dto.company, 200),
        email,
        phone,
        whatsapp,
        website: clean(dto.website, 300),
        stage: "lead",
        leadStatus: "new",
        source: SOURCE,
        interestedIn,
        nextFollowUpAt: new Date(Date.now() + DAY_MS),
      },
    });

    await this.activity.createForClient({
      clientId: client.id,
      organizationId: orgId,
      actorId: "public",
      kind: "note",
      action: "form_submitted",
      summary: `Submitted the contact form${summary ? `:\n${summary}` : ""}`,
    });
    this.notifications.notifyNewLead(orgId, client.id, name, message?.slice(0, 140) ?? "Submitted the contact form");
    return { ok: true };
  }

  async getFormSettings(orgId: string) {
    const settings = await this.prisma.systemSettings.findUnique({
      where: { organizationId: orgId },
      select: { leadFormEnabled: true },
    });
    const org = await this.prisma.organization.findUnique({ where: { id: orgId }, select: { slug: true } });
    return { enabled: settings?.leadFormEnabled ?? false, slug: org?.slug ?? null };
  }

  async setFormEnabled(orgId: string, enabled: boolean) {
    await this.prisma.systemSettings.upsert({
      where: { organizationId: orgId },
      create: { organizationId: orgId, leadFormEnabled: enabled },
      update: { leadFormEnabled: enabled },
    });
    return this.getFormSettings(orgId);
  }
}

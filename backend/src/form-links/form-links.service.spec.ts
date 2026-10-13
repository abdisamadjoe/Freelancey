import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { FormLinksService } from "./form-links.service";
import { DEFAULT_INTAKE_FIELDS } from "../client-onboarding/intake-template";
import { hashToken } from "../common";
import type { PrismaService } from "../prisma/prisma.service";
import type { ConfigService } from "@nestjs/config";
import type { MailService } from "../mail/mail.service";
import type { ActivityService } from "../activity/activity.service";
import type { NotificationsService } from "../notifications/notifications.service";
import type { ClientOnboardingService } from "../client-onboarding/client-onboarding.service";

const ORG = "org-1";
const USER = "user-1";
const FUTURE = () => new Date(Date.now() + 86_400_000);

const linkRow = (overrides: Record<string, unknown> = {}) => ({
  id: "f1",
  organizationId: ORG,
  clientId: "c1",
  projectId: null,
  kind: "onboarding",
  status: "pending",
  expiresAt: FUTURE(),
  client: { id: "c1", name: "Acme" },
  ...overrides,
});

const validOnboarding = {
  businessName: "Acme",
  overview: "We sell things",
  targetAudience: "Everyone",
  websiteGoal: "Sales",
};

describe("FormLinksService", () => {
  let service: FormLinksService;
  let db: Record<string, Record<string, ReturnType<typeof vi.fn>>>;
  let activity: { createForClient: ReturnType<typeof vi.fn> };
  let notifications: { notifyAdmins: ReturnType<typeof vi.fn>; notifyIntakeSubmitted: ReturnType<typeof vi.fn> };
  let mail: { send: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    db = {
      client: { findFirst: vi.fn().mockResolvedValue({ id: "c1", name: "Acme", email: "a@acme.com" }) },
      project: { findFirst: vi.fn().mockResolvedValue({ id: "pr1" }) },
      formLink: {
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      formResponse: { upsert: vi.fn().mockResolvedValue({}) },
      organization: { findUnique: vi.fn().mockResolvedValue({ name: "Studio" }) },
      branding: { findUnique: vi.fn().mockResolvedValue(null) },
    };
    activity = { createForClient: vi.fn().mockResolvedValue({}) };
    notifications = { notifyAdmins: vi.fn(), notifyIntakeSubmitted: vi.fn() };
    mail = { send: vi.fn().mockResolvedValue({ sent: true, viaOrgConfig: false }) };
    const onboarding = {
      ensureTemplate: vi.fn().mockResolvedValue({ id: "t1", name: "Questionnaire", fields: DEFAULT_INTAKE_FIELDS }),
    };
    service = new FormLinksService(
      db as unknown as PrismaService,
      { get: (_k: string, d: string) => d } as unknown as ConfigService,
      mail as unknown as MailService,
      activity as unknown as ActivityService,
      notifications as unknown as NotificationsService,
      onboarding as unknown as ClientOnboardingService,
    );
  });

  describe("createLink", () => {
    it("404s for a client in another workspace", async () => {
      db.client.findFirst.mockResolvedValue(null);
      await expect(service.createLink({ clientId: "x", kind: "onboarding" }, ORG, USER)).rejects.toBeInstanceOf(NotFoundException);
      expect(db.client.findFirst.mock.calls[0][0].where).toEqual({ id: "x", organizationId: ORG });
    });

    it("needs a project for a brief, and it must belong to the client", async () => {
      await expect(service.createLink({ clientId: "c1", kind: "project_brief" }, ORG, USER)).rejects.toBeInstanceOf(BadRequestException);
      db.project.findFirst.mockResolvedValue(null);
      await expect(
        service.createLink({ clientId: "c1", kind: "project_brief", projectId: "other" }, ORG, USER),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(db.project.findFirst.mock.calls[0][0].where).toEqual({ id: "other", organizationId: ORG, clientId: "c1" });
    });

    it("rejects a project on onboarding", async () => {
      await expect(
        service.createLink({ clientId: "c1", kind: "onboarding", projectId: "pr1" }, ORG, USER),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("refuses to email a client without an address", async () => {
      db.client.findFirst.mockResolvedValue({ id: "c1", name: "A", email: null });
      await expect(service.createLink({ clientId: "c1", kind: "onboarding", email: true }, ORG, USER)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("does not reopen a completed form", async () => {
      db.formLink.findFirst.mockResolvedValue({ id: "f1", status: "completed" });
      await expect(service.createLink({ clientId: "c1", kind: "onboarding" }, ORG, USER)).rejects.toBeInstanceOf(BadRequestException);
    });

    it("stores only the token hash and returns an /onboarding link", async () => {
      const { link, emailed } = await service.createLink({ clientId: "c1", kind: "onboarding", email: true }, ORG, USER);
      const token = link.split("/onboarding/")[1];
      expect(emailed).toBe(true);
      const data = db.formLink.create.mock.calls[0][0].data;
      expect(data).toMatchObject({ organizationId: ORG, clientId: "c1", kind: "onboarding", projectId: null });
      expect(data.tokenHash).toBe(hashToken(token));
      expect(JSON.stringify(data)).not.toContain(token);
    });

    it("rotates the token on an existing pending link instead of adding another", async () => {
      db.formLink.findFirst.mockResolvedValue({ id: "f1", status: "pending" });
      const { link } = await service.createLink({ clientId: "c1", kind: "project_brief", projectId: "pr1" }, ORG, USER);
      expect(link).toContain("/brief/");
      expect(db.formLink.create).not.toHaveBeenCalled();
      expect(db.formLink.update.mock.calls[0][0].data.tokenHash).toBe(hashToken(link.split("/brief/")[1]));
    });
  });

  describe("public form", () => {
    it("404s for an unknown token", async () => {
      await expect(service.getPublic("nope")).rejects.toBeInstanceOf(NotFoundException);
      expect(db.formLink.findUnique.mock.calls[0][0].where).toEqual({ tokenHash: hashToken("nope") });
    });

    it("returns the fields while pending, and none once completed or expired", async () => {
      db.formLink.findUnique.mockResolvedValue(linkRow());
      const open = await service.getPublic("tok");
      expect(open.fields.length).toBeGreaterThan(0);
      expect(open).not.toHaveProperty("organizationId");

      db.formLink.findUnique.mockResolvedValue(linkRow({ status: "completed" }));
      expect((await service.getPublic("tok")).fields).toEqual([]);

      db.formLink.findUnique.mockResolvedValue(linkRow({ expiresAt: new Date(Date.now() - 1000) }));
      const expired = await service.getPublic("tok");
      expect(expired.status).toBe("expired");
      expect(expired.fields).toEqual([]);
    });
  });

  describe("submit", () => {
    it("refuses a completed or expired form", async () => {
      db.formLink.findUnique.mockResolvedValue(linkRow({ status: "completed" }));
      await expect(service.submit("tok", validOnboarding)).rejects.toBeInstanceOf(ConflictException);
      db.formLink.findUnique.mockResolvedValue(linkRow({ expiresAt: new Date(Date.now() - 1000) }));
      await expect(service.submit("tok", validOnboarding)).rejects.toBeInstanceOf(ConflictException);
    });

    it("validates required answers before claiming the link", async () => {
      db.formLink.findUnique.mockResolvedValue(linkRow());
      await expect(service.submit("tok", { businessName: "Acme" })).rejects.toBeInstanceOf(BadRequestException);
      expect(db.formLink.updateMany).not.toHaveBeenCalled();
    });

    it("loses the race gracefully", async () => {
      db.formLink.findUnique.mockResolvedValue(linkRow());
      db.formLink.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.submit("tok", validOnboarding)).rejects.toBeInstanceOf(ConflictException);
      expect(activity.createForClient).not.toHaveBeenCalled();
    });

    it("saves onboarding answers, mirrors them to the questionnaire and notifies", async () => {
      db.formLink.findUnique.mockResolvedValue(linkRow());
      await service.submit("tok", { ...validOnboarding, junk: "dropped" });
      expect(db.formLink.updateMany.mock.calls[0][0].data).toMatchObject({ status: "completed", answers: validOnboarding });
      expect(db.formResponse.upsert.mock.calls[0][0].where).toEqual({ templateId_clientId: { templateId: "t1", clientId: "c1" } });
      expect(db.formResponse.upsert.mock.calls[0][0].update).toMatchObject({ status: "submitted", answers: validOnboarding });
      expect(notifications.notifyIntakeSubmitted).toHaveBeenCalledOnce();
    });

    it("saves a project brief on the link only", async () => {
      db.formLink.findUnique.mockResolvedValue(linkRow({ kind: "project_brief", projectId: "pr1" }));
      await service.submit("tok", { goals: "More leads", successCriteria: "10 enquiries a month" });
      expect(db.formResponse.upsert).not.toHaveBeenCalled();
      expect(notifications.notifyAdmins).toHaveBeenCalledOnce();
      expect(notifications.notifyAdmins.mock.calls[0][4]).toBe("/dashboard/projects/pr1");
    });
  });

  describe("getAnswers", () => {
    it("is scoped to the workspace", async () => {
      await expect(service.getAnswers("f1", ORG)).rejects.toBeInstanceOf(NotFoundException);
      expect(db.formLink.findFirst.mock.calls[0][0].where).toEqual({ id: "f1", organizationId: ORG });
    });
  });
});

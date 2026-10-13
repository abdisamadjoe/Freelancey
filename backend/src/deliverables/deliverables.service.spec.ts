import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { DeliverablesService } from "./deliverables.service";
import { hashToken } from "../common";
import type { PrismaService } from "../prisma/prisma.service";
import type { ConfigService } from "@nestjs/config";
import type { MailService } from "../mail/mail.service";
import type { ActivityService } from "../activity/activity.service";
import type { NotificationsService } from "../notifications/notifications.service";

const ORG = "org-1";
const USER = "user-1";

const row = (overrides: Record<string, unknown> = {}) => ({
  id: "d1",
  projectId: "pr1",
  organizationId: ORG,
  milestoneId: "m1",
  title: "Homepage",
  description: "First pass",
  links: [{ label: "Figma", url: "https://figma.com/x" }],
  version: 1,
  status: "draft",
  project: { id: "pr1", name: "Site", clientId: "c1" },
  changeRequests: [],
  ...overrides,
});

describe("DeliverablesService", () => {
  let service: DeliverablesService;
  let db: Record<string, Record<string, ReturnType<typeof vi.fn>>> & { $transaction: ReturnType<typeof vi.fn> };
  let activity: { createForClient: ReturnType<typeof vi.fn> };
  let notifications: { notifyAdmins: ReturnType<typeof vi.fn> };
  let mail: { send: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    db = {
      project: { findFirst: vi.fn().mockResolvedValue({ id: "pr1", name: "Site", clientId: "c1" }) },
      milestone: { findFirst: vi.fn().mockResolvedValue({ id: "m1" }) },
      client: { findFirst: vi.fn().mockResolvedValue({ name: "Acme", email: "a@acme.com" }) },
      contract: { findFirst: vi.fn().mockResolvedValue(null) },
      deliverable: {
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn((a: { data: Record<string, unknown> }) => Promise.resolve({ id: "d1", ...a.data })),
        update: vi.fn().mockResolvedValue({}),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      changeRequest: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockResolvedValue({}),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      task: { aggregate: vi.fn().mockResolvedValue({ _max: { order: 1 } }), create: vi.fn().mockResolvedValue({ id: "t1" }) },
      organization: { findUnique: vi.fn().mockResolvedValue({ name: "Studio" }) },
      branding: { findUnique: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    } as never;
    activity = { createForClient: vi.fn().mockResolvedValue({}) };
    notifications = { notifyAdmins: vi.fn() };
    mail = { send: vi.fn().mockResolvedValue({ sent: true, viaOrgConfig: false }) };
    service = new DeliverablesService(
      db as unknown as PrismaService,
      { get: (_k: string, d: string) => d } as unknown as ConfigService,
      mail as unknown as MailService,
      activity as unknown as ActivityService,
      notifications as unknown as NotificationsService,
    );
  });

  it("404s for a project in another workspace", async () => {
    db.project.findFirst.mockResolvedValue(null);
    await expect(service.list("x", ORG)).rejects.toBeInstanceOf(NotFoundException);
    expect(db.project.findFirst.mock.calls[0][0].where).toEqual({ id: "x", organizationId: ORG });
  });

  describe("create / update / remove", () => {
    it("rejects a milestone from another project", async () => {
      db.milestone.findFirst.mockResolvedValue(null);
      await expect(service.create("pr1", { title: "T", milestoneId: "foreign" }, ORG, USER)).rejects.toBeInstanceOf(BadRequestException);
      expect(db.deliverable.create).not.toHaveBeenCalled();
    });

    it("creates a draft with trimmed title and cleaned links", async () => {
      await service.create("pr1", { title: " Homepage ", links: [{ label: "<b>Figma</b>", url: "https://figma.com/x" }] }, ORG, USER);
      const data = db.deliverable.create.mock.calls[0][0].data;
      expect(data).toMatchObject({ projectId: "pr1", organizationId: ORG, title: "Homepage" });
      expect(data.links).toEqual([{ label: "Figma", url: "https://figma.com/x" }]);
    });

    it("cannot edit a deliverable that is with the client or approved", async () => {
      db.deliverable.findFirst.mockResolvedValue(row({ status: "in_review" }));
      await expect(service.update("pr1", "d1", { title: "New" }, ORG)).rejects.toBeInstanceOf(BadRequestException);
      db.deliverable.findFirst.mockResolvedValue(row({ status: "approved" }));
      await expect(service.update("pr1", "d1", { title: "New" }, ORG)).rejects.toBeInstanceOf(BadRequestException);
    });

    it("only deletes drafts", async () => {
      await service.remove("pr1", "d1", ORG);
      expect(db.deliverable.deleteMany.mock.calls[0][0].where).toEqual({ id: "d1", projectId: "pr1", organizationId: ORG, status: "draft" });
      db.deliverable.deleteMany.mockResolvedValue({ count: 0 });
      db.deliverable.findFirst.mockResolvedValue({ id: "d1" });
      await expect(service.remove("pr1", "d1", ORG)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("send", () => {
    it("refuses approved work and empty deliverables", async () => {
      db.deliverable.findFirst.mockResolvedValue(row({ status: "approved" }));
      await expect(service.send("pr1", "d1", {}, ORG, USER)).rejects.toBeInstanceOf(BadRequestException);
      db.deliverable.findFirst.mockResolvedValue(row({ links: [], description: "  " }));
      await expect(service.send("pr1", "d1", {}, ORG, USER)).rejects.toBeInstanceOf(BadRequestException);
    });

    it("refuses to email a client without an address", async () => {
      db.deliverable.findFirst.mockResolvedValue(row());
      db.client.findFirst.mockResolvedValue({ name: "A", email: null });
      await expect(service.send("pr1", "d1", { email: true }, ORG, USER)).rejects.toBeInstanceOf(BadRequestException);
    });

    it("stores only the token hash and keeps version 1 on first send", async () => {
      db.deliverable.findFirst.mockResolvedValue(row());
      const { link, version, emailed } = await service.send("pr1", "d1", { email: true }, ORG, USER);
      const token = link.split("/review/")[1];
      expect(version).toBe(1);
      expect(emailed).toBe(true);
      const data = db.deliverable.update.mock.calls[0][0].data;
      expect(data).toMatchObject({ status: "in_review", version: 1, tokenHash: hashToken(token) });
      expect(JSON.stringify(data)).not.toContain(token);
    });

    it("bumps the version and resolves open requests when resending after changes", async () => {
      db.deliverable.findFirst.mockResolvedValue(row({ status: "changes_requested", version: 2 }));
      const { version } = await service.send("pr1", "d1", {}, ORG, USER);
      expect(version).toBe(3);
      expect(db.changeRequest.updateMany.mock.calls[0][0]).toMatchObject({ where: { deliverableId: "d1", status: "open" } });
    });
  });

  describe("revisions", () => {
    it("compares change requests with the revisions in the signed contract", async () => {
      db.contract.findFirst.mockResolvedValue({ content: { scope: { revisionsCount: 2 } } });
      db.changeRequest.count.mockResolvedValue(3);
      const res = await service.list("pr1", ORG);
      expect(res.revisions).toEqual({ used: 3, allowed: 2 });
      expect(res.overLimit).toBe(true);
    });

    it("has no limit when no contract states one", async () => {
      db.changeRequest.count.mockResolvedValue(5);
      const res = await service.list("pr1", ORG);
      expect(res.revisions).toEqual({ used: 5, allowed: null });
      expect(res.overLimit).toBe(false);
    });

    it("never exposes the token hash", async () => {
      db.deliverable.findMany.mockResolvedValue([{ id: "d1", tokenHash: "secret", changeRequests: [] }]);
      const res = await service.list("pr1", ORG);
      expect(res.data[0]).not.toHaveProperty("tokenHash");
    });
  });

  describe("public review", () => {
    it("404s for an unknown token", async () => {
      await expect(service.getPublic("nope")).rejects.toBeInstanceOf(NotFoundException);
      expect(db.deliverable.findUnique.mock.calls[0][0].where).toEqual({ tokenHash: hashToken("nope") });
    });

    it("approves once, with a typed name, and tells the freelancer", async () => {
      db.deliverable.findUnique.mockResolvedValue(row({ status: "in_review" }));
      await expect(service.approve("tok", "  ")).rejects.toBeInstanceOf(BadRequestException);
      await service.approve("tok", " Ann Lee ");
      expect(db.deliverable.updateMany.mock.calls[0][0].data).toMatchObject({ status: "approved", approvedByName: "Ann Lee" });
      expect(notifications.notifyAdmins).toHaveBeenCalledOnce();
    });

    it("cannot answer when not in review, or lose a race", async () => {
      db.deliverable.findUnique.mockResolvedValue(row({ status: "approved" }));
      await expect(service.approve("tok", "Ann")).rejects.toBeInstanceOf(ConflictException);
      db.deliverable.findUnique.mockResolvedValue(row({ status: "in_review" }));
      db.deliverable.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.approve("tok", "Ann")).rejects.toBeInstanceOf(ConflictException);
      await expect(service.requestChanges("tok", { message: "x" })).rejects.toBeInstanceOf(ConflictException);
      expect(db.task.create).not.toHaveBeenCalled();
    });

    it("turns a change request into a task on the same milestone", async () => {
      db.deliverable.findUnique.mockResolvedValue(row({ status: "in_review", version: 2 }));
      await service.requestChanges("tok", { message: "<b>Bigger</b> hero" });
      expect(db.task.create.mock.calls[0][0].data).toMatchObject({
        projectId: "pr1",
        milestoneId: "m1",
        title: "Changes requested: Homepage v2",
        description: "Bigger hero",
      });
      expect(db.changeRequest.create.mock.calls[0][0].data).toMatchObject({ deliverableId: "d1", version: 2, taskId: "t1" });
    });

    it("needs a message", async () => {
      db.deliverable.findUnique.mockResolvedValue(row({ status: "in_review" }));
      await expect(service.requestChanges("tok", { message: "   " })).rejects.toBeInstanceOf(BadRequestException);
    });

    it("exposes nothing internal on the public view", async () => {
      db.deliverable.findUnique.mockResolvedValue(row({ status: "in_review" }));
      const view = await service.getPublic("tok");
      expect(view).not.toHaveProperty("organizationId");
      expect(view).not.toHaveProperty("tokenHash");
      expect(view).toMatchObject({ projectName: "Site", title: "Homepage", status: "in_review" });
    });
  });
});

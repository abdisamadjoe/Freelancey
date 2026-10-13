import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { HandoverService } from "./handover.service";
import { DEFAULT_HANDOVER_ITEMS } from "./handover.constants";
import { hashToken } from "../common";
import type { PrismaService } from "../prisma/prisma.service";
import type { ConfigService } from "@nestjs/config";
import type { MailService } from "../mail/mail.service";
import type { ActivityService } from "../activity/activity.service";

const ORG = "org-1";
const USER = "user-1";

describe("HandoverService", () => {
  let service: HandoverService;
  let db: Record<string, Record<string, ReturnType<typeof vi.fn>>>;
  let activity: { createForClient: ReturnType<typeof vi.fn> };
  let mail: { send: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    db = {
      project: {
        findFirst: vi.fn().mockResolvedValue({ id: "pr1", name: "Site", status: "in_progress", clientId: "c1" }),
        update: vi.fn().mockResolvedValue({}),
      },
      task: { count: vi.fn().mockResolvedValue(0) },
      milestone: { count: vi.fn().mockResolvedValue(0) },
      deliverable: { count: vi.fn().mockResolvedValue(0) },
      handover: {
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
      },
      handoverItem: {
        findFirst: vi.fn().mockResolvedValue(null),
        aggregate: vi.fn().mockResolvedValue({ _max: { order: 4 } }),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      client: { findFirst: vi.fn().mockResolvedValue({ name: "Acme", email: "a@acme.com" }) },
      organization: { findUnique: vi.fn().mockResolvedValue({ name: "Studio" }) },
      branding: { findUnique: vi.fn().mockResolvedValue(null) },
    };
    activity = { createForClient: vi.fn().mockResolvedValue({}) };
    mail = { send: vi.fn().mockResolvedValue({ sent: true, viaOrgConfig: false }) };
    service = new HandoverService(
      db as unknown as PrismaService,
      { get: (_k: string, d: string) => d } as unknown as ConfigService,
      mail as unknown as MailService,
      activity as unknown as ActivityService,
    );
  });

  it("404s for a project in another workspace", async () => {
    db.project.findFirst.mockResolvedValue(null);
    await expect(service.completionCheck("x", ORG)).rejects.toBeInstanceOf(NotFoundException);
    expect(db.project.findFirst.mock.calls[0][0].where).toEqual({ id: "x", organizationId: ORG });
  });

  describe("completing the project", () => {
    it("completes cleanly when no work is open", async () => {
      await expect(service.completeProject("pr1", undefined, ORG, USER)).resolves.toEqual({ ok: true, overridden: false });
      expect(db.project.update).toHaveBeenCalledWith({ where: { id: "pr1" }, data: { status: "completed" } });
    });

    it("lists what is blocking and refuses without a reason", async () => {
      db.task.count.mockResolvedValue(2);
      db.deliverable.count.mockResolvedValue(1);
      await expect(service.completeProject("pr1", undefined, ORG, USER)).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.completeProject("pr1", "   ", ORG, USER)).rejects.toBeInstanceOf(BadRequestException);
      expect(db.project.update).not.toHaveBeenCalled();
      const check = await service.completionCheck("pr1", ORG);
      expect(check.canComplete).toBe(false);
      expect(check.blockers.map((b) => b.kind)).toEqual(["tasks", "deliverables"]);
    });

    it("allows an override and records the reason", async () => {
      db.milestone.count.mockResolvedValue(1);
      await expect(service.completeProject("pr1", "Client signed off by phone", ORG, USER)).resolves.toEqual({ ok: true, overridden: true });
      expect(activity.createForClient.mock.calls[0][0].summary).toContain("Client signed off by phone");
    });

    it("refuses a project that is already completed", async () => {
      db.project.findFirst.mockResolvedValue({ id: "pr1", name: "Site", status: "completed", clientId: "c1" });
      await expect(service.completeProject("pr1", undefined, ORG, USER)).rejects.toBeInstanceOf(BadRequestException);
    });

    it("counts open work with workspace-scoped queries", async () => {
      await service.completionCheck("pr1", ORG);
      expect(db.task.count.mock.calls[0][0].where).toMatchObject({ projectId: "pr1", organizationId: ORG });
      expect(db.deliverable.count.mock.calls[0][0].where).toMatchObject({ status: { not: "approved" } });
    });
  });

  describe("handover", () => {
    it("cannot start before the project is completed", async () => {
      await expect(service.start("pr1", ORG, USER)).rejects.toBeInstanceOf(BadRequestException);
      expect(db.handover.create).not.toHaveBeenCalled();
    });

    it("starts with the default checklist, and only once", async () => {
      db.project.findFirst.mockResolvedValue({ id: "pr1", name: "Site", status: "completed", clientId: "c1" });
      await service.start("pr1", ORG, USER);
      const items = db.handover.create.mock.calls[0][0].data.items.create;
      expect(items).toHaveLength(DEFAULT_HANDOVER_ITEMS.length);
      expect(items.map((i: { kind: string }) => i.kind)).toEqual(["files", "documentation", "access", "training", "deployment"]);

      db.handover.create.mockClear();
      db.handover.findFirst.mockResolvedValue({ id: "h1", items: [] });
      await service.start("pr1", ORG, USER);
      expect(db.handover.create).not.toHaveBeenCalled();
    });

    it("sets and clears doneAt as items are ticked", async () => {
      db.handover.findFirst.mockResolvedValue({ id: "h1" });
      db.handoverItem.findFirst.mockResolvedValue({ id: "i1" });
      await service.updateItem("pr1", "i1", { done: true }, ORG);
      expect(db.handoverItem.update.mock.calls[0][0].data.doneAt).toBeInstanceOf(Date);
      await service.updateItem("pr1", "i1", { done: false }, ORG);
      expect(db.handoverItem.update.mock.calls[1][0].data.doneAt).toBeNull();
    });

    it("scopes items to this project's handover", async () => {
      await expect(service.addItem("pr1", { title: "x" }, ORG)).rejects.toBeInstanceOf(NotFoundException);
      db.handover.findFirst.mockResolvedValue({ id: "h1" });
      db.handoverItem.deleteMany.mockResolvedValue({ count: 0 });
      await expect(service.removeItem("pr1", "foreign", ORG)).rejects.toBeInstanceOf(NotFoundException);
      expect(db.handoverItem.deleteMany.mock.calls[0][0].where).toEqual({ id: "foreign", handoverId: "h1" });
    });

    it("completes only when every item is done", async () => {
      db.handover.findFirst.mockResolvedValue({ id: "h1", status: "in_progress", items: [{ done: true }, { done: false }, { done: false }] });
      await expect(service.complete("pr1", ORG, USER)).rejects.toThrow("2 handover items are not done yet");
      db.handover.findFirst.mockResolvedValue({ id: "h1", status: "in_progress", items: [{ done: true }] });
      await expect(service.complete("pr1", ORG, USER)).resolves.toEqual({ ok: true });
      expect(db.handover.update.mock.calls[0][0].data).toMatchObject({ status: "completed", completedById: USER });
    });

    it("shares through a hashed link and never exposes the hash", async () => {
      db.handover.findFirst.mockResolvedValue({ id: "h1" });
      const { link, emailed } = await service.share("pr1", { email: true }, ORG, USER);
      const token = link.split("/handover/")[1];
      expect(emailed).toBe(true);
      expect(db.handover.update.mock.calls[0][0].data).toEqual({ tokenHash: hashToken(token) });

      db.handover.findFirst.mockResolvedValue({ id: "h1", tokenHash: "secret", items: [] });
      const got = await service.get("pr1", ORG);
      expect(got).not.toHaveProperty("tokenHash");
      expect(got).toMatchObject({ shared: true });
    });

    it("refuses to email a client without an address", async () => {
      db.handover.findFirst.mockResolvedValue({ id: "h1" });
      db.client.findFirst.mockResolvedValue({ name: "A", email: null });
      await expect(service.share("pr1", { email: true }, ORG, USER)).rejects.toBeInstanceOf(BadRequestException);
    });

    it("public view 404s for an unknown token and hides internals", async () => {
      await expect(service.getPublic("nope")).rejects.toBeInstanceOf(NotFoundException);
      db.handover.findUnique.mockResolvedValue({
        organizationId: ORG,
        status: "in_progress",
        completedAt: null,
        project: { name: "Site" },
        items: [{ id: "i1", kind: "files", title: "Final files", details: "d", linkUrl: null, done: false }],
      });
      const view = await service.getPublic("tok");
      expect(view).not.toHaveProperty("organizationId");
      expect(view.items[0]).toEqual({ id: "i1", kind: "files", title: "Final files", details: "d", linkUrl: null, done: false });
    });
  });
});

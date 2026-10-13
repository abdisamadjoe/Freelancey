import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { SupportService } from "./support.service";
import { hashToken } from "../common";
import type { PrismaService } from "../prisma/prisma.service";
import type { ConfigService } from "@nestjs/config";
import type { MailService } from "../mail/mail.service";
import type { ActivityService } from "../activity/activity.service";
import type { NotificationsService } from "../notifications/notifications.service";

const ORG = "org-1";
const USER = "user-1";

describe("SupportService", () => {
  let service: SupportService;
  let db: Record<string, Record<string, ReturnType<typeof vi.fn>>>;
  let activity: { createForClient: ReturnType<typeof vi.fn> };
  let notifications: { notifyAdmins: ReturnType<typeof vi.fn> };
  let mail: { send: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    db = {
      client: {
        findFirst: vi.fn().mockResolvedValue({ id: "c1" }),
        findUnique: vi.fn().mockResolvedValue({ id: "c1", name: "Acme", organizationId: ORG, archivedAt: null }),
        update: vi.fn().mockResolvedValue({}),
      },
      project: { findFirst: vi.fn().mockResolvedValue({ id: "pr1" }), findMany: vi.fn().mockResolvedValue([{ id: "pr1", name: "Site" }]) },
      supportTicket: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn((a: { data: Record<string, unknown> }) => Promise.resolve({ id: "t1", ...a.data })),
        update: vi.fn().mockResolvedValue({}),
      },
      supportReply: { create: vi.fn((a: { data: Record<string, unknown> }) => Promise.resolve({ id: "r1", ...a.data })) },
      organization: { findUnique: vi.fn().mockResolvedValue({ name: "Studio" }) },
      branding: { findUnique: vi.fn().mockResolvedValue(null) },
    };
    activity = { createForClient: vi.fn().mockResolvedValue({}) };
    notifications = { notifyAdmins: vi.fn() };
    mail = { send: vi.fn().mockResolvedValue({ sent: true, viaOrgConfig: false }) };
    service = new SupportService(
      db as unknown as PrismaService,
      { get: (_k: string, d: string) => d } as unknown as ConfigService,
      mail as unknown as MailService,
      activity as unknown as ActivityService,
      notifications as unknown as NotificationsService,
    );
  });

  describe("support link", () => {
    it("404s for a client in another workspace", async () => {
      db.client.findFirst.mockResolvedValue(null);
      await expect(service.createSupportLink("x", ORG, USER)).rejects.toBeInstanceOf(NotFoundException);
      expect(db.client.findFirst.mock.calls[0][0].where).toEqual({ id: "x", organizationId: ORG });
    });

    it("stores only the hash and returns a /support link", async () => {
      const { link } = await service.createSupportLink("c1", ORG, USER);
      const token = link.split("/support/")[1];
      expect(db.client.update).toHaveBeenCalledWith({ where: { id: "c1" }, data: { supportTokenHash: hashToken(token) } });
    });
  });

  describe("public form", () => {
    it("404s for an unknown token or an archived client", async () => {
      db.client.findUnique.mockResolvedValue(null);
      await expect(service.getPublicForm("nope")).rejects.toBeInstanceOf(NotFoundException);
      expect(db.client.findUnique.mock.calls[0][0].where).toEqual({ supportTokenHash: hashToken("nope") });
      db.client.findUnique.mockResolvedValue({ id: "c1", name: "A", organizationId: ORG, archivedAt: new Date() });
      await expect(service.getPublicForm("tok")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("lists only this client's projects", async () => {
      const view = await service.getPublicForm("tok");
      expect(db.project.findMany.mock.calls[0][0].where).toMatchObject({ organizationId: ORG, clientId: "c1", archivedAt: null });
      expect(view.projects).toEqual([{ id: "pr1", name: "Site" }]);
      expect(view).not.toHaveProperty("organizationId");
    });
  });

  describe("submit", () => {
    it("quietly ignores bots", async () => {
      await expect(service.submit("tok", { subject: "x", message: "y", hp: "bot" })).resolves.toEqual({ ok: true });
      expect(db.supportTicket.create).not.toHaveBeenCalled();
    });

    it("needs a subject and message as plain text", async () => {
      await expect(service.submit("tok", { subject: "<b></b>", message: "help" })).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects a project that belongs to another client", async () => {
      db.project.findFirst.mockResolvedValue(null);
      await expect(service.submit("tok", { subject: "s", message: "m", projectId: "other" })).rejects.toBeInstanceOf(BadRequestException);
      expect(db.project.findFirst.mock.calls[0][0].where).toEqual({ id: "other", organizationId: ORG, clientId: "c1" });
    });

    it("creates the ticket in the client's workspace, logs it and notifies", async () => {
      await service.submit("tok", { subject: " Site is <i>down</i> ", message: "It shows an error", projectId: "pr1", email: "A@Acme.com" });
      const data = db.supportTicket.create.mock.calls[0][0].data;
      expect(data).toMatchObject({ organizationId: ORG, clientId: "c1", projectId: "pr1", subject: "Site is down", submittedByEmail: "a@acme.com" });
      expect(activity.createForClient).toHaveBeenCalledOnce();
      expect(notifications.notifyAdmins).toHaveBeenCalledOnce();
    });

    it("stops creating tickets past the hourly cap without telling the caller", async () => {
      db.supportTicket.count.mockResolvedValue(10);
      await expect(service.submit("tok", { subject: "s", message: "m" })).resolves.toEqual({ ok: true });
      expect(db.supportTicket.create).not.toHaveBeenCalled();
    });
  });

  describe("staff side", () => {
    it("scopes the list by workspace", async () => {
      await service.list(ORG, { status: "open" });
      expect(db.supportTicket.findMany.mock.calls[0][0].where).toEqual({ organizationId: ORG, status: "open" });
    });

    it("logs a ticket for a client and checks the project belongs to them", async () => {
      db.project.findFirst.mockResolvedValue(null);
      await expect(service.create({ clientId: "c1", projectId: "other", subject: "s", message: "m" }, ORG, USER)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      db.project.findFirst.mockResolvedValue({ id: "pr1" });
      await service.create({ clientId: "c1", projectId: "pr1", subject: "s", message: "m" }, ORG, USER);
      expect(db.supportTicket.create.mock.calls[0][0].data).toMatchObject({ source: "staff", priority: "normal" });
    });

    it("sets and clears resolvedAt with the status", async () => {
      db.supportTicket.findFirst.mockResolvedValue({ id: "t1", clientId: "c1", subject: "s", status: "open" });
      await service.update("t1", { status: "resolved" }, ORG, USER);
      expect(db.supportTicket.update.mock.calls[0][0].data.resolvedAt).toBeInstanceOf(Date);
      await service.update("t1", { status: "open" }, ORG, USER);
      expect(db.supportTicket.update.mock.calls[1][0].data.resolvedAt).toBeNull();
    });

    it("404s when updating another workspace's ticket", async () => {
      await expect(service.update("x", { status: "resolved" }, ORG, USER)).rejects.toBeInstanceOf(NotFoundException);
      expect(db.supportTicket.findFirst.mock.calls[0][0].where).toEqual({ id: "x", organizationId: ORG });
    });

    it("a first reply moves the ticket to in progress and emails the client", async () => {
      db.supportTicket.findFirst.mockResolvedValue({
        id: "t1",
        clientId: "c1",
        subject: "Down",
        status: "open",
        submittedByEmail: null,
        client: { name: "Acme", email: "a@acme.com" },
      });
      const res = await service.reply("t1", { message: " On it " }, ORG, USER, "Sam");
      expect(db.supportReply.create.mock.calls[0][0].data).toMatchObject({ authorKind: "staff", authorName: "Sam", message: "On it" });
      expect(db.supportTicket.update).toHaveBeenCalledWith({ where: { id: "t1" }, data: { status: "in_progress" } });
      expect(res.emailed).toBe(true);
    });

    it("can reply without emailing", async () => {
      db.supportTicket.findFirst.mockResolvedValue({
        id: "t1",
        clientId: "c1",
        subject: "Down",
        status: "in_progress",
        submittedByEmail: null,
        client: { name: "Acme", email: "a@acme.com" },
      });
      const res = await service.reply("t1", { message: "Fixed", email: false }, ORG, USER, "Sam");
      expect(res.emailed).toBe(false);
      expect(mail.send).not.toHaveBeenCalled();
    });
  });
});

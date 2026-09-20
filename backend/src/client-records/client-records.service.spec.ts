import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ClientRecordsService } from "./client-records.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { ActivityService } from "../activity/activity.service";

const ORG = "org-1";
const USER = "user-1";

function existing(overrides: Record<string, unknown> = {}) {
  return {
    id: "c1",
    organizationId: ORG,
    name: "Acme",
    email: "a@acme.com",
    phone: null,
    whatsapp: null,
    stage: "lead",
    leadStatus: "new",
    lostReason: null,
    ...overrides,
  };
}

describe("ClientRecordsService", () => {
  let service: ClientRecordsService;
  let client: Record<string, ReturnType<typeof vi.fn>>;
  let activity: { createForClient: ReturnType<typeof vi.fn>; findByClient: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    client = {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn((args: { data: Record<string, unknown> }) => Promise.resolve({ id: "c1", ...args.data })),
      update: vi.fn((args: { data: Record<string, unknown> }) => Promise.resolve({ id: "c1", ...args.data })),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    };
    activity = {
      createForClient: vi.fn().mockResolvedValue({}),
      findByClient: vi.fn().mockResolvedValue({ data: [], meta: {} }),
    };
    service = new ClientRecordsService(
      { client } as unknown as PrismaService,
      activity as unknown as ActivityService,
    );
  });

  describe("list", () => {
    it("always scopes by organization and hides archived by default", async () => {
      await service.list(ORG, {});
      const where = client.findMany.mock.calls[0][0].where;
      expect(where).toMatchObject({ organizationId: ORG, archivedAt: null });
    });

    it("filters follow-ups that are due and includes archived on request", async () => {
      await service.list(ORG, { followUpDue: true, archived: "true", stage: "lead" });
      const where = client.findMany.mock.calls[0][0].where;
      expect(where.nextFollowUpAt.lte).toBeInstanceOf(Date);
      expect(where.archivedAt).toBeUndefined();
      expect(where.stage).toBe("lead");
    });

    it("sorts by next follow-up with empty dates last", async () => {
      await service.list(ORG, {});
      expect(client.findMany.mock.calls[0][0].orderBy[0]).toEqual({
        nextFollowUpAt: { sort: "asc", nulls: "last" },
      });
    });
  });

  describe("create", () => {
    it("requires at least one way to reach the lead", async () => {
      await expect(service.create({ name: "No contact" }, ORG, USER)).rejects.toBeInstanceOf(BadRequestException);
      expect(client.create).not.toHaveBeenCalled();
    });

    it("accepts WhatsApp alone, defaults to a new lead owned by the creator, and logs it", async () => {
      await service.create({ name: " Kim ", whatsapp: "+254700000000", source: "referral" }, ORG, USER);
      const data = client.create.mock.calls[0][0].data;
      expect(data).toMatchObject({
        organizationId: ORG,
        name: "Kim",
        stage: "lead",
        leadStatus: "new",
        ownerId: USER,
      });
      expect(activity.createForClient).toHaveBeenCalledWith(
        expect.objectContaining({ clientId: "c1", organizationId: ORG, kind: "system", action: "created" }),
      );
    });

    it("lower-cases email and drops leadStatus for non-leads", async () => {
      await service.create({ name: "Bo", email: "Bo@X.COM", stage: "active" }, ORG, USER);
      const data = client.create.mock.calls[0][0].data;
      expect(data.email).toBe("bo@x.com");
      expect(data.leadStatus).toBeNull();
    });

    it("refuses to create a record that is already lost", async () => {
      await expect(service.create({ name: "X", email: "x@x.com", stage: "lost" }, ORG, USER)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe("update", () => {
    it("returns 404 for a record outside the organization", async () => {
      await expect(service.update("other", { name: "x" }, ORG, USER)).rejects.toBeInstanceOf(NotFoundException);
      expect(client.findFirst).toHaveBeenCalledWith({ where: { id: "other", organizationId: ORG } });
      expect(client.update).not.toHaveBeenCalled();
    });

    it("requires a reason when marking a lead lost", async () => {
      client.findFirst.mockResolvedValue(existing());
      await expect(service.update("c1", { stage: "lost" }, ORG, USER)).rejects.toBeInstanceOf(BadRequestException);
      expect(client.update).not.toHaveBeenCalled();
    });

    it("stores the lost reason, clears leadStatus and logs the stage change", async () => {
      client.findFirst.mockResolvedValue(existing());
      await service.update("c1", { stage: "lost", lostReason: "Budget too low" }, ORG, USER);
      const data = client.update.mock.calls[0][0].data;
      expect(data).toMatchObject({ stage: "lost", leadStatus: null, lostReason: "Budget too low" });
      expect(activity.createForClient).toHaveBeenCalledWith(
        expect.objectContaining({ action: "stage_changed", summary: expect.stringContaining("Budget too low") }),
      );
    });

    it("winning a lead makes it an active client with no lead status and clears any lost reason", async () => {
      client.findFirst.mockResolvedValue(existing({ leadStatus: "qualified" }));
      await service.update("c1", { stage: "active" }, ORG, USER);
      expect(client.update.mock.calls[0][0].data).toMatchObject({
        stage: "active",
        leadStatus: null,
        lostReason: null,
      });
    });

    it("reopening a lost record resets it to a new lead", async () => {
      client.findFirst.mockResolvedValue(existing({ stage: "lost", leadStatus: null, lostReason: "x" }));
      await service.update("c1", { stage: "lead" }, ORG, USER);
      expect(client.update.mock.calls[0][0].data).toMatchObject({ stage: "lead", leadStatus: "new", lostReason: null });
    });

    it("logs a lead status change separately from a stage change", async () => {
      client.findFirst.mockResolvedValue(existing());
      await service.update("c1", { leadStatus: "contacted" }, ORG, USER);
      expect(activity.createForClient).toHaveBeenCalledWith(expect.objectContaining({ action: "status_changed" }));
    });

    it("does not log anything when only plain fields change", async () => {
      client.findFirst.mockResolvedValue(existing());
      await service.update("c1", { company: "Acme Ltd" }, ORG, USER);
      expect(activity.createForClient).not.toHaveBeenCalled();
    });

    it("refuses to remove the last contact method", async () => {
      client.findFirst.mockResolvedValue(existing());
      await expect(service.update("c1", { email: null }, ORG, USER)).rejects.toBeInstanceOf(BadRequestException);
    });

    it("null clears the follow-up date", async () => {
      client.findFirst.mockResolvedValue(existing());
      await service.update("c1", { nextFollowUpAt: null }, ORG, USER);
      expect(client.update.mock.calls[0][0].data.nextFollowUpAt).toBeNull();
    });
  });

  describe("archive", () => {
    it("is scoped by organization and 404s when nothing matched", async () => {
      client.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.setArchived("c1", ORG, true)).rejects.toBeInstanceOf(NotFoundException);
      expect(client.updateMany.mock.calls[0][0].where).toEqual({ id: "c1", organizationId: ORG });
    });
  });

  describe("activity", () => {
    it("adds a manual entry only for a client in this organization", async () => {
      await expect(service.addActivity("other", { kind: "call", summary: "hi" }, ORG, USER)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(activity.createForClient).not.toHaveBeenCalled();

      client.findFirst.mockResolvedValue({ id: "c1" });
      await service.addActivity("c1", { kind: "whatsapp", summary: " Sent intro ", occurredAt: "2026-09-01T10:00:00Z" }, ORG, USER);
      expect(activity.createForClient).toHaveBeenCalledWith(
        expect.objectContaining({ kind: "whatsapp", summary: "Sent intro", organizationId: ORG }),
      );
    });

    it("lists the timeline only after confirming ownership", async () => {
      await expect(service.listActivity("other", ORG)).rejects.toBeInstanceOf(NotFoundException);
      expect(activity.findByClient).not.toHaveBeenCalled();
    });
  });
});

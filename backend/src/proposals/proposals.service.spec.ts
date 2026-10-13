import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { ProposalsService } from "./proposals.service";
import { hashToken } from "../common";
import type { PrismaService } from "../prisma/prisma.service";
import type { ConfigService } from "@nestjs/config";
import type { MailService } from "../mail/mail.service";
import type { ActivityService } from "../activity/activity.service";
import type { NotificationsService } from "../notifications/notifications.service";

const ORG = "org-1";
const USER = "user-1";

const item = (id: string, optional = false, selected = !optional) => ({
  id,
  description: id,
  quantity: 1,
  unitPriceCents: 10000,
  optional,
  selected,
  order: 0,
});

function proposal(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    organizationId: ORG,
    clientId: "c1",
    title: "Website",
    status: "draft",
    currency: "USD",
    validUntil: null,
    items: [item("i1"), item("i2", true)],
    client: { id: "c1", name: "Acme", email: "a@acme.com", stage: "lead", leadStatus: "contacted" },
    ...overrides,
  };
}

describe("ProposalsService", () => {
  let service: ProposalsService;
  let db: {
    proposal: Record<string, ReturnType<typeof vi.fn>>;
    proposalLineItem: Record<string, ReturnType<typeof vi.fn>>;
    client: Record<string, ReturnType<typeof vi.fn>>;
    organization: Record<string, ReturnType<typeof vi.fn>>;
    branding: Record<string, ReturnType<typeof vi.fn>>;
    $transaction: ReturnType<typeof vi.fn>;
  };
  let activity: { createForClient: ReturnType<typeof vi.fn> };
  let notifications: { notifyAdmins: ReturnType<typeof vi.fn> };
  let mail: { send: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    db = {
      proposal: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue(null),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockResolvedValue({ id: "p1", title: "Website" }),
        update: vi.fn().mockResolvedValue({}),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      proposalLineItem: {
        deleteMany: vi.fn().mockResolvedValue({}),
        createMany: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
      },
      client: { findFirst: vi.fn().mockResolvedValue({ id: "c1" }), update: vi.fn().mockResolvedValue({}) },
      organization: { findUnique: vi.fn().mockResolvedValue({ name: "Studio" }) },
      branding: { findUnique: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn(),
    };
    db.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(db));
    activity = { createForClient: vi.fn().mockResolvedValue({}) };
    notifications = { notifyAdmins: vi.fn() };
    mail = { send: vi.fn().mockResolvedValue({ sent: true, viaOrgConfig: false }) };
    service = new ProposalsService(
      db as unknown as PrismaService,
      { get: (_k: string, d: string) => d } as unknown as ConfigService,
      mail as unknown as MailService,
      activity as unknown as ActivityService,
      notifications as unknown as NotificationsService,
    );
  });

  describe("create", () => {
    it("404s when the client belongs to another workspace", async () => {
      db.client.findFirst.mockResolvedValue(null);
      await expect(
        service.create({ clientId: "other", title: "x", items: [] }, ORG, USER),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(db.client.findFirst.mock.calls[0][0].where).toEqual({ id: "other", organizationId: ORG });
      expect(db.proposal.create).not.toHaveBeenCalled();
    });

    it("starts optional items unselected", async () => {
      db.proposal.findFirst.mockResolvedValue(proposal());
      await service.create(
        {
          clientId: "c1",
          title: " Website ",
          items: [
            { description: "Design", quantity: 1, unitPriceCents: 100 },
            { description: "SEO", quantity: 1, unitPriceCents: 50, optional: true },
          ],
        },
        ORG,
        USER,
      );
      const created = db.proposal.create.mock.calls[0][0].data.items.create;
      expect(created.map((i: { selected: boolean }) => i.selected)).toEqual([true, false]);
      expect(db.proposal.create.mock.calls[0][0].data.title).toBe("Website");
    });
  });

  describe("update", () => {
    it("refuses to edit an accepted proposal", async () => {
      db.proposal.findFirst.mockResolvedValue(proposal({ status: "accepted" }));
      await expect(service.update("p1", { title: "New" }, ORG, USER)).rejects.toBeInstanceOf(BadRequestException);
    });

    it("sends a previously sent proposal back to draft and kills the old link", async () => {
      db.proposal.findFirst.mockResolvedValue(proposal({ status: "sent" }));
      await service.update("p1", { title: "Revised" }, ORG, USER);
      const data = db.proposal.update.mock.calls[0][0].data;
      expect(data).toMatchObject({ status: "draft", tokenHash: null, sentAt: null });
    });
  });

  describe("remove", () => {
    it("only deletes drafts in this workspace", async () => {
      await service.remove("p1", ORG);
      expect(db.proposal.deleteMany.mock.calls[0][0].where).toEqual({ id: "p1", organizationId: ORG, status: "draft" });
    });

    it("explains why a sent proposal cannot be deleted", async () => {
      db.proposal.deleteMany.mockResolvedValue({ count: 0 });
      db.proposal.findFirst.mockResolvedValue({ id: "p1" });
      await expect(service.remove("p1", ORG)).rejects.toBeInstanceOf(BadRequestException);
    });

    it("404s for a proposal in another workspace", async () => {
      db.proposal.deleteMany.mockResolvedValue({ count: 0 });
      await expect(service.remove("p1", ORG)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("send", () => {
    it("needs at least one required line item", async () => {
      db.proposal.findFirst.mockResolvedValue(proposal({ items: [item("i2", true)] }));
      await expect(service.send("p1", {}, ORG, USER)).rejects.toBeInstanceOf(BadRequestException);
    });

    it("refuses a valid-until date in the past", async () => {
      db.proposal.findFirst.mockResolvedValue(proposal({ validUntil: new Date(Date.now() - 1000) }));
      await expect(service.send("p1", {}, ORG, USER)).rejects.toBeInstanceOf(BadRequestException);
    });

    it("refuses to email a lead without an address", async () => {
      db.proposal.findFirst.mockResolvedValue(
        proposal({ client: { id: "c1", name: "Acme", email: null, stage: "lead", leadStatus: "new" } }),
      );
      await expect(service.send("p1", { email: true }, ORG, USER)).rejects.toBeInstanceOf(BadRequestException);
    });

    it("stores only the token hash, returns the link and moves the lead to proposal_sent", async () => {
      db.proposal.findFirst.mockResolvedValue(proposal());
      const { link, emailed } = await service.send("p1", { email: true }, ORG, USER);
      const token = link.split("/proposal/")[1];
      expect(emailed).toBe(true);
      const data = db.proposal.update.mock.calls[0][0].data;
      expect(data.status).toBe("sent");
      expect(data.tokenHash).toBe(hashToken(token));
      expect(JSON.stringify(data)).not.toContain(token);
      expect(db.client.update).toHaveBeenCalledWith({ where: { id: "c1" }, data: { leadStatus: "proposal_sent" } });
      expect(mail.send).toHaveBeenCalledOnce();
    });

    it("does not touch the stage of an existing client", async () => {
      db.proposal.findFirst.mockResolvedValue(
        proposal({ client: { id: "c1", name: "Acme", email: "a@a.com", stage: "active", leadStatus: null } }),
      );
      await service.send("p1", {}, ORG, USER);
      expect(db.client.update).not.toHaveBeenCalled();
    });
  });

  describe("public view", () => {
    it("404s for an unknown token", async () => {
      await expect(service.getPublic("nope")).rejects.toBeInstanceOf(NotFoundException);
      expect(db.proposal.findUnique.mock.calls[0][0].where).toEqual({ tokenHash: hashToken("nope") });
    });

    it("marks a sent proposal viewed once and tells the freelancer", async () => {
      db.proposal.findUnique.mockResolvedValue(proposal({ status: "sent" }));
      const view = await service.getPublic("tok");
      expect(view.status).toBe("viewed");
      expect(notifications.notifyAdmins).toHaveBeenCalledOnce();
      expect(view).not.toHaveProperty("tokenHash");
      expect(view).not.toHaveProperty("organizationId");
    });

    it("does not notify again when it was already viewed", async () => {
      db.proposal.findUnique.mockResolvedValue(proposal({ status: "viewed" }));
      await service.getPublic("tok");
      expect(notifications.notifyAdmins).not.toHaveBeenCalled();
    });

    it("expires an overdue proposal on open", async () => {
      db.proposal.findUnique.mockResolvedValue(proposal({ status: "sent", validUntil: new Date(Date.now() - 1000) }));
      const view = await service.getPublic("tok");
      expect(view.status).toBe("expired");
    });
  });

  describe("accept", () => {
    it("needs a typed name", async () => {
      db.proposal.findUnique.mockResolvedValue(proposal({ status: "viewed" }));
      await expect(service.accept("tok", { name: "   " })).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects optional ids that are not on this proposal", async () => {
      db.proposal.findUnique.mockResolvedValue(proposal({ status: "viewed" }));
      await expect(service.accept("tok", { name: "Ann", optionalItemIds: ["i1"] })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("cannot answer twice", async () => {
      db.proposal.findUnique.mockResolvedValue(proposal({ status: "accepted" }));
      await expect(service.accept("tok", { name: "Ann" })).rejects.toBeInstanceOf(ConflictException);
    });

    it("loses the race gracefully when another request answered first", async () => {
      db.proposal.findUnique.mockResolvedValue(proposal({ status: "viewed" }));
      db.proposal.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.accept("tok", { name: "Ann" })).rejects.toBeInstanceOf(ConflictException);
      expect(activity.createForClient).not.toHaveBeenCalled();
    });

    it("records the name and the chosen optional items", async () => {
      db.proposal.findUnique.mockResolvedValue(proposal({ status: "viewed" }));
      await service.accept("tok", { name: "  Ann Lee ", optionalItemIds: ["i2"] });
      expect(db.proposal.updateMany.mock.calls[0][0].data).toMatchObject({ status: "accepted", acceptedByName: "Ann Lee" });
      expect(db.proposalLineItem.update).toHaveBeenCalledWith({ where: { id: "i2" }, data: { selected: true } });
      expect(notifications.notifyAdmins).toHaveBeenCalledOnce();
    });

    it("refuses an expired proposal", async () => {
      db.proposal.findUnique.mockResolvedValue(proposal({ status: "sent", validUntil: new Date(Date.now() - 1000) }));
      await expect(service.accept("tok", { name: "Ann" })).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe("reject", () => {
    it("stores the reason as plain text", async () => {
      db.proposal.findUnique.mockResolvedValue(proposal({ status: "sent" }));
      await service.reject("tok", { reason: "<b>Too</b> pricey" });
      expect(db.proposal.updateMany.mock.calls[0][0].data).toMatchObject({
        status: "rejected",
        rejectionReason: "Too pricey",
      });
    });

    it("cannot reject a draft-then-answered proposal twice", async () => {
      db.proposal.findUnique.mockResolvedValue(proposal({ status: "rejected" }));
      await expect(service.reject("tok", {})).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe("expireOverdue", () => {
    it("expires each overdue open proposal and counts them", async () => {
      db.proposal.findMany.mockResolvedValue([
        { id: "a", organizationId: ORG, clientId: "c1", title: "A" },
        { id: "b", organizationId: ORG, clientId: "c2", title: "B" },
      ]);
      await expect(service.expireOverdue()).resolves.toBe(2);
      expect(activity.createForClient).toHaveBeenCalledTimes(2);
    });
  });
});

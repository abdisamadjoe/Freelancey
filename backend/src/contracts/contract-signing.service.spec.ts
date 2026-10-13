import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { ContractSigningService } from "./contract-signing.service";
import { hashToken } from "../common";
import type { PrismaService } from "../prisma/prisma.service";
import type { ConfigService } from "@nestjs/config";
import type { MailService } from "../mail/mail.service";
import type { ActivityService } from "../activity/activity.service";
import type { NotificationsService } from "../notifications/notifications.service";
import type { ContractPdfService } from "./contract-pdf.service";

const ORG = "org-1";
const USER = "user-1";

const acceptedProposal = (overrides: Record<string, unknown> = {}) => ({
  id: "p1",
  organizationId: ORG,
  clientId: "c1",
  title: "Website",
  status: "accepted",
  scope: "Build a site",
  deliverables: "- Home page\n- Contact page",
  timeline: "6 weeks",
  paymentTerms: "50% upfront",
  revisionLimit: 3,
  currency: "EUR",
  items: [
    { id: "i1", description: "Design", quantity: 1, unitPriceCents: 100000, optional: false, selected: true, order: 0 },
    { id: "i2", description: "SEO", quantity: 1, unitPriceCents: 50000, optional: true, selected: true, order: 1 },
    { id: "i3", description: "Blog", quantity: 1, unitPriceCents: 70000, optional: true, selected: false, order: 2 },
  ],
  client: { id: "c1", name: "Acme", email: "a@acme.com", company: "Acme Ltd", location: "Nairobi" },
  ...overrides,
});

const contractRow = (overrides: Record<string, unknown> = {}) => ({
  id: "k1",
  organizationId: ORG,
  title: "Agreement",
  status: "draft",
  version: 1,
  content: { marker: "draft" },
  clientRecord: { id: "c1", name: "Acme", email: "a@acme.com" },
  ...overrides,
});

describe("ContractSigningService", () => {
  let service: ContractSigningService;
  let db: Record<string, Record<string, ReturnType<typeof vi.fn>>> & { $transaction: ReturnType<typeof vi.fn> };
  let activity: { createForClient: ReturnType<typeof vi.fn> };
  let notifications: { notifyAdmins: ReturnType<typeof vi.fn> };
  let mail: { send: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    db = {
      proposal: { findFirst: vi.fn().mockResolvedValue(null) },
      contract: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn((args: { data: Record<string, unknown> }) => Promise.resolve({ id: "k1", ...args.data })),
        update: vi.fn().mockResolvedValue({}),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      contractVersion: { upsert: vi.fn().mockResolvedValue({}), findUnique: vi.fn().mockResolvedValue(null) },
      client: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      organization: { findUnique: vi.fn().mockResolvedValue({ name: "Studio" }) },
      branding: { findUnique: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    } as never;
    activity = { createForClient: vi.fn().mockResolvedValue({}) };
    notifications = { notifyAdmins: vi.fn() };
    mail = { send: vi.fn().mockResolvedValue({ sent: true, viaOrgConfig: false }) };
    service = new ContractSigningService(
      db as unknown as PrismaService,
      { get: (_k: string, d: string) => d } as unknown as ConfigService,
      mail as unknown as MailService,
      activity as unknown as ActivityService,
      notifications as unknown as NotificationsService,
      { render: vi.fn() } as unknown as ContractPdfService,
    );
  });

  describe("createFromProposal", () => {
    it("404s for a proposal in another workspace", async () => {
      await expect(service.createFromProposal("x", {}, ORG, USER)).rejects.toBeInstanceOf(NotFoundException);
      expect(db.proposal.findFirst.mock.calls[0][0].where).toEqual({ id: "x", organizationId: ORG });
    });

    it("refuses a proposal that has not been accepted", async () => {
      db.proposal.findFirst.mockResolvedValue(acceptedProposal({ status: "sent" }));
      await expect(service.createFromProposal("p1", {}, ORG, USER)).rejects.toBeInstanceOf(BadRequestException);
      expect(db.contract.create).not.toHaveBeenCalled();
    });

    it("returns the existing contract instead of creating a second one", async () => {
      db.proposal.findFirst.mockResolvedValue(acceptedProposal());
      db.contract.findFirst.mockResolvedValue({ id: "existing" });
      await expect(service.createFromProposal("p1", {}, ORG, USER)).resolves.toEqual({ id: "existing" });
      expect(db.contract.create).not.toHaveBeenCalled();
    });

    it("carries client, scope, price, timeline, revisions and payment terms into the contract", async () => {
      db.proposal.findFirst.mockResolvedValue(acceptedProposal());
      await service.createFromProposal("p1", {}, ORG, USER);
      const data = db.contract.create.mock.calls[0][0].data;
      expect(data).toMatchObject({ organizationId: ORG, clientRecordId: "c1", proposalId: "p1", status: "draft" });
      expect(data).not.toHaveProperty("projectId");

      const content = data.content;
      expect(content.parties.client).toMatchObject({ name: "Acme", email: "a@acme.com", company: "Acme Ltd" });
      expect(content.scope.projectDescription).toBe("Build a site");
      expect(content.scope.deliverables).toEqual(["Home page", "Contact page"]);
      expect(content.scope.revisionsCount).toBe(3);
      expect(content.agreement.timelineNote).toBe("6 weeks");
      expect(content.terms.revisionsText).toContain("up to 3 rounds");
      expect(content.terms.additionalTermsText).toContain("50% upfront");
      expect(content.payment.currency).toBe("EUR");
    });

    it("prices only the required and chosen optional items, and splits deposit and final payment", async () => {
      db.proposal.findFirst.mockResolvedValue(acceptedProposal());
      await service.createFromProposal("p1", {}, ORG, USER);
      const { payment } = db.contract.create.mock.calls[0][0].data.content;
      expect(payment.totalAmountCents).toBe(150000);
      expect(payment.depositCents).toBe(37500);
      expect(payment.schedule.map((s: { amountCents: number }) => s.amountCents)).toEqual([37500, 112500]);
    });
  });

  describe("sendForSigning", () => {
    it("404s for another workspace's contract", async () => {
      await expect(service.sendForSigning("k1", {}, ORG, USER)).rejects.toBeInstanceOf(NotFoundException);
      expect(db.contract.findFirst.mock.calls[0][0].where).toEqual({ id: "k1", organizationId: ORG });
    });

    it("refuses signed contracts", async () => {
      db.contract.findFirst.mockResolvedValue(contractRow({ status: "signed" }));
      await expect(service.sendForSigning("k1", {}, ORG, USER)).rejects.toBeInstanceOf(BadRequestException);
    });

    it("refuses a contract with no client record", async () => {
      db.contract.findFirst.mockResolvedValue(contractRow({ clientRecord: null }));
      await expect(service.sendForSigning("k1", {}, ORG, USER)).rejects.toBeInstanceOf(BadRequestException);
    });

    it("refuses to email a client without an address", async () => {
      db.contract.findFirst.mockResolvedValue(contractRow({ clientRecord: { id: "c1", name: "A", email: null } }));
      await expect(service.sendForSigning("k1", { email: true }, ORG, USER)).rejects.toBeInstanceOf(BadRequestException);
    });

    it("freezes the version, stores only the token hash and returns the link", async () => {
      db.contract.findFirst.mockResolvedValue(contractRow());
      const { link, emailed } = await service.sendForSigning("k1", { email: true }, ORG, USER);
      const token = link.split("/contract/")[1];
      expect(emailed).toBe(true);
      expect(db.contractVersion.upsert).toHaveBeenCalledOnce();
      expect(db.contractVersion.upsert.mock.calls[0][0].update).toEqual({});
      const data = db.contract.update.mock.calls[0][0].data;
      expect(data.status).toBe("sent");
      expect(data.tokenHash).toBe(hashToken(token));
      expect(JSON.stringify(data)).not.toContain(token);
    });
  });

  describe("public view", () => {
    it("404s for unknown tokens and voided contracts", async () => {
      await expect(service.getPublic("nope")).rejects.toBeInstanceOf(NotFoundException);
      db.contract.findUnique.mockResolvedValue(contractRow({ status: "void" }));
      await expect(service.getPublic("tok")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("shows the frozen version that was sent, not a later draft, and marks it viewed once", async () => {
      db.contract.findUnique.mockResolvedValue(contractRow({ status: "sent" }));
      db.contractVersion.findUnique.mockResolvedValue({ content: { marker: "frozen" } });
      const view = await service.getPublic("tok");
      expect(view.content).toEqual({ marker: "frozen" });
      expect(view.status).toBe("viewed");
      expect(notifications.notifyAdmins).toHaveBeenCalledOnce();
      expect(view).not.toHaveProperty("tokenHash");
      expect(view).not.toHaveProperty("organizationId");
    });

    it("does not notify again for an already viewed contract", async () => {
      db.contract.findUnique.mockResolvedValue(contractRow({ status: "viewed" }));
      await service.getPublic("tok");
      expect(notifications.notifyAdmins).not.toHaveBeenCalled();
    });
  });

  describe("sign", () => {
    const meta = { ip: "203.0.113.5", userAgent: "TestBrowser" };

    it("needs explicit consent and a typed name", async () => {
      db.contract.findUnique.mockResolvedValue(contractRow({ status: "viewed" }));
      await expect(service.sign("tok", { name: "Ann", consent: false }, meta)).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.sign("tok", { name: "  ", consent: true }, meta)).rejects.toBeInstanceOf(BadRequestException);
      expect(db.contract.updateMany).not.toHaveBeenCalled();
    });

    it("cannot sign a draft or an already signed contract", async () => {
      db.contract.findUnique.mockResolvedValue(contractRow({ status: "draft" }));
      await expect(service.sign("tok", { name: "Ann", consent: true }, meta)).rejects.toBeInstanceOf(ConflictException);
      db.contract.findUnique.mockResolvedValue(contractRow({ status: "signed" }));
      await expect(service.sign("tok", { name: "Ann", consent: true }, meta)).rejects.toBeInstanceOf(ConflictException);
    });

    it("loses the race gracefully and converts nothing", async () => {
      db.contract.findUnique.mockResolvedValue(contractRow({ status: "viewed" }));
      db.contract.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.sign("tok", { name: "Ann", consent: true }, meta)).rejects.toBeInstanceOf(ConflictException);
      expect(db.client.updateMany).not.toHaveBeenCalled();
    });

    it("records the signature evidence and converts the lead to an active client", async () => {
      db.contract.findUnique.mockResolvedValue(contractRow({ status: "viewed" }));
      await service.sign("tok", { name: " Ann Lee ", consent: true }, meta);
      expect(db.contract.updateMany.mock.calls[0][0].data).toMatchObject({
        status: "signed",
        signedByName: "Ann Lee",
        signedIp: "203.0.113.5",
        signedUserAgent: "TestBrowser",
      });
      expect(db.client.updateMany).toHaveBeenCalledWith({
        where: { id: "c1", organizationId: ORG, stage: "lead" },
        data: { stage: "active", leadStatus: null, lostReason: null },
      });
      expect(activity.createForClient.mock.calls.map((c) => c[0].action)).toEqual(["contract_signed", "converted_to_client"]);
      expect(notifications.notifyAdmins).toHaveBeenCalledOnce();
    });

    it("does not log a conversion when the record was already a client", async () => {
      db.contract.findUnique.mockResolvedValue(contractRow({ status: "sent" }));
      db.client.updateMany.mockResolvedValue({ count: 0 });
      await service.sign("tok", { name: "Ann", consent: true }, meta);
      expect(activity.createForClient.mock.calls.map((c) => c[0].action)).toEqual(["contract_signed"]);
    });
  });
});

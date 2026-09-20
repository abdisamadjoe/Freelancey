import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ClientOnboardingService } from "./client-onboarding.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { MailService } from "../mail/mail.service";
import type { ConfigService } from "@nestjs/config";
import type { ActivityService } from "../activity/activity.service";
import type { NotificationsService } from "../notifications/notifications.service";
import type { NeonAuthUsersRepository } from "../auth/neon-auth-users.repository";

const ORG = "org-1";
const CLIENT = "c1";

const fn = () => vi.fn();

function build() {
  const prisma = {
    client: { findFirst: fn(), findMany: fn() },
    project: { findFirst: fn(), findMany: fn() },
    document: { findMany: fn(), findFirst: fn() },
    invoice: { findMany: fn(), findFirst: fn() },
    formTemplate: { upsert: fn() },
    formResponse: { upsert: fn(), findFirst: fn(), findMany: fn(), update: fn() },
    onboardingItem: { count: fn(), createMany: fn(), findMany: fn(), findFirst: fn(), aggregate: fn(), create: fn(), update: fn(), delete: fn() },
    clientContact: { findMany: fn(), findFirst: fn(), create: fn(), update: fn() },
    projectClient: { createMany: fn() },
    member: { findFirst: fn() },
    invitation: { create: fn() },
    projectNote: { create: fn() },
  };
  prisma.client.findFirst.mockResolvedValue({ id: CLIENT, organizationId: ORG, name: "Acme", email: "kim@acme.com", phone: null });
  prisma.client.findMany.mockResolvedValue([]);
  prisma.project.findMany.mockResolvedValue([]);
  prisma.document.findMany.mockResolvedValue([]);
  prisma.invoice.findMany.mockResolvedValue([]);
  prisma.formResponse.findMany.mockResolvedValue([]);
  prisma.formResponse.findFirst.mockResolvedValue(null);
  prisma.onboardingItem.findMany.mockResolvedValue([]);
  prisma.onboardingItem.count.mockResolvedValue(0);
  prisma.clientContact.findMany.mockResolvedValue([]);
  prisma.formTemplate.upsert.mockResolvedValue({ id: "t1" });
  prisma.formResponse.upsert.mockResolvedValue({ id: "r1" });
  prisma.invitation.create.mockResolvedValue({ id: "inv1" });

  const mail = { send: vi.fn().mockResolvedValue(undefined) };
  const activity = { createForClient: vi.fn().mockResolvedValue({}) };
  const notifications = { notifyClientJoined: vi.fn(), notifyIntakeSubmitted: vi.fn() };
  const neon = { findByEmail: vi.fn().mockResolvedValue(null) };
  const config = { get: vi.fn((_k: string, d?: string) => d) };

  const service = new ClientOnboardingService(
    prisma as unknown as PrismaService,
    mail as unknown as MailService,
    config as unknown as ConfigService,
    activity as unknown as ActivityService,
    notifications as unknown as NotificationsService,
    neon as unknown as NeonAuthUsersRepository,
  );
  return { service, prisma, mail, activity, notifications, neon };
}

const item = (overrides: Record<string, unknown> = {}) => ({
  id: "i1", clientId: CLIENT, projectId: null, title: "T", description: null, kind: "custom",
  order: 0, done: false, doneAt: null, linkedType: null, linkedId: null, ...overrides,
});

describe("ClientOnboardingService (staff)", () => {
  let t: ReturnType<typeof build>;
  beforeEach(() => { t = build(); });

  it("404s for a client outside the workspace before touching anything", async () => {
    t.prisma.client.findFirst.mockResolvedValue(null);
    await expect(t.service.start("other", ORG, "u1")).rejects.toBeInstanceOf(NotFoundException);
    expect(t.prisma.client.findFirst).toHaveBeenCalledWith({ where: { id: "other", organizationId: ORG } });
    expect(t.prisma.onboardingItem.createMany).not.toHaveBeenCalled();
  });

  it("start creates the four default steps and links the questionnaire step to a draft form", async () => {
    await t.service.start(CLIENT, ORG, "u1");
    const data = t.prisma.onboardingItem.createMany.mock.calls[0][0].data as Array<Record<string, unknown>>;
    expect(data.map((d) => d.kind)).toEqual(["sign_agreement", "pay_deposit", "intake", "upload_assets"]);
    expect(data.every((d) => d.organizationId === ORG && d.clientId === CLIENT)).toBe(true);
    expect(data.find((d) => d.kind === "intake")).toMatchObject({ linkedType: "form", linkedId: "r1" });
    expect(t.activity.createForClient).toHaveBeenCalledWith(expect.objectContaining({ action: "onboarding_started" }));
  });

  it("start is idempotent: nothing is created when a checklist already exists", async () => {
    t.prisma.onboardingItem.count.mockResolvedValue(4);
    await t.service.start(CLIENT, ORG, "u1");
    expect(t.prisma.onboardingItem.createMany).not.toHaveBeenCalled();
    expect(t.prisma.formResponse.upsert).not.toHaveBeenCalled();
  });

  it("rejects a project from another workspace", async () => {
    t.prisma.project.findFirst.mockResolvedValue(null);
    await expect(t.service.start(CLIENT, ORG, "u1", "foreign")).rejects.toBeInstanceOf(BadRequestException);
    expect(t.prisma.project.findFirst.mock.calls[0][0].where).toEqual({ id: "foreign", organizationId: ORG });
  });

  it("derives done from the linked document, invoice and form instead of stored flags", async () => {
    t.prisma.onboardingItem.findMany.mockResolvedValue([
      item({ id: "a", kind: "sign_agreement", linkedType: "document", linkedId: "d1" }),
      item({ id: "b", kind: "pay_deposit", linkedType: "invoice", linkedId: "v1" }),
      item({ id: "c", kind: "intake", linkedType: "form", linkedId: "r1" }),
      item({ id: "d", kind: "upload_assets", done: true }),
      item({ id: "e", kind: "sign_agreement", linkedType: "document", linkedId: "d-other-org", done: true }),
    ]);
    t.prisma.document.findMany.mockResolvedValue([{ id: "d1", title: "Contract", status: "signed" }]);
    t.prisma.invoice.findMany.mockResolvedValue([{ id: "v1", invoiceNumber: "INV-0001", status: "sent" }]);
    t.prisma.formResponse.findMany.mockResolvedValue([{ id: "r1", status: "submitted" }]);

    const res = await t.service.getForClient(CLIENT, ORG);
    const done = Object.fromEntries(res.items.map((i) => [i.id, i.done]));
    expect(done).toEqual({ a: true, b: false, c: true, d: true, e: false });
    expect(res.progress).toEqual({ done: 3, total: 5, complete: false });
    // Linked lookups are scoped to the workspace.
    expect(t.prisma.document.findMany.mock.calls[0][0].where.organizationId).toBe(ORG);
    expect(t.prisma.invoice.findMany.mock.calls[0][0].where.organizationId).toBe(ORG);
  });

  describe("updateItem", () => {
    it("refuses to link a document that is not on one of this client's projects", async () => {
      t.prisma.onboardingItem.findFirst.mockResolvedValue(item());
      t.prisma.project.findMany.mockResolvedValue([{ id: "p1" }]);
      t.prisma.document.findFirst.mockResolvedValue(null);
      await expect(
        t.service.updateItem(CLIENT, "i1", ORG, { linkedType: "document", linkedId: "someone-elses" }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(t.prisma.document.findFirst.mock.calls[0][0].where).toMatchObject({ organizationId: ORG, projectId: { in: ["p1"] } });
      expect(t.prisma.onboardingItem.update).not.toHaveBeenCalled();
    });

    it("links a valid invoice", async () => {
      t.prisma.onboardingItem.findFirst.mockResolvedValue(item());
      t.prisma.invoice.findFirst.mockResolvedValue({ id: "v1" });
      await t.service.updateItem(CLIENT, "i1", ORG, { linkedType: "invoice", linkedId: "v1" });
      expect(t.prisma.onboardingItem.update.mock.calls[0][0].data).toMatchObject({ linkedType: "invoice", linkedId: "v1" });
    });

    it("does not let staff tick a linked item by hand", async () => {
      t.prisma.onboardingItem.findFirst.mockResolvedValue(item({ linkedType: "document", linkedId: "d1" }));
      await expect(t.service.updateItem(CLIENT, "i1", ORG, { done: true })).rejects.toBeInstanceOf(BadRequestException);
    });

    it("ticks an unlinked item and stamps the time", async () => {
      t.prisma.onboardingItem.findFirst.mockResolvedValue(item());
      await t.service.updateItem(CLIENT, "i1", ORG, { done: true });
      const data = t.prisma.onboardingItem.update.mock.calls[0][0].data;
      expect(data.done).toBe(true);
      expect(data.doneAt).toBeInstanceOf(Date);
    });

    it("keeps the questionnaire item bound to its form", async () => {
      t.prisma.onboardingItem.findFirst.mockResolvedValue(item({ kind: "intake", linkedType: "form", linkedId: "r1" }));
      await expect(t.service.updateItem(CLIENT, "i1", ORG, { linkedType: null })).rejects.toBeInstanceOf(BadRequestException);
    });

    it("404s for an item that belongs to another client or workspace", async () => {
      t.prisma.onboardingItem.findFirst.mockResolvedValue(null);
      await expect(t.service.updateItem(CLIENT, "x", ORG, { title: "n" })).rejects.toBeInstanceOf(NotFoundException);
      expect(t.prisma.onboardingItem.findFirst.mock.calls[0][0].where).toEqual({ id: "x", clientId: CLIENT, organizationId: ORG });
    });
  });

  describe("sendInvite", () => {
    const inviter = { id: "u1", name: "Sam" };

    it("needs an email on the client", async () => {
      t.prisma.client.findFirst.mockResolvedValue({ id: CLIENT, organizationId: ORG, name: "Acme", email: null });
      await expect(t.service.sendInvite(CLIENT, ORG, inviter, "Org")).rejects.toBeInstanceOf(BadRequestException);
      expect(t.prisma.invitation.create).not.toHaveBeenCalled();
    });

    it("refuses to make a team member a client", async () => {
      t.neon.findByEmail.mockResolvedValue({ id: "u9", name: "Team" });
      t.prisma.member.findFirst.mockResolvedValue({ role: "admin" });
      await expect(t.service.sendInvite(CLIENT, ORG, inviter, "Org")).rejects.toBeInstanceOf(BadRequestException);
      expect(t.mail.send).not.toHaveBeenCalled();
    });

    it("links an existing client login without sending an email", async () => {
      t.neon.findByEmail.mockResolvedValue({ id: "u9", name: "Kim" });
      t.prisma.member.findFirst.mockResolvedValue({ role: "member" });
      t.prisma.project.findMany.mockResolvedValue([{ id: "p1" }]);
      const res = await t.service.sendInvite(CLIENT, ORG, inviter, "Org");
      expect(res.status).toBe("linked");
      expect(t.mail.send).not.toHaveBeenCalled();
      expect(t.prisma.projectClient.createMany).toHaveBeenCalledWith({
        data: [{ projectId: "p1", userId: "u9" }],
        skipDuplicates: true,
      });
    });

    it("creates a member invitation, emails it with the project name and remembers the contact", async () => {
      t.prisma.project.findFirst.mockResolvedValue({ name: "Acme website" });
      const res = await t.service.sendInvite(CLIENT, ORG, inviter, "My Studio", "p1");
      expect(res).toMatchObject({ status: "invited", email: "kim@acme.com" });
      expect(res.inviteLink).toContain("/accept-invite?id=inv1");
      expect(t.prisma.invitation.create.mock.calls[0][0].data).toMatchObject({ organizationId: ORG, email: "kim@acme.com", role: "member" });
      const html = t.mail.send.mock.calls[0][2] as string;
      expect(html).toContain("Acme website");
      expect(t.prisma.clientContact.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ clientId: CLIENT, email: "kim@acme.com", isPrimary: true }),
      });
    });
  });

  describe("onInvitationAccepted", () => {
    it("ignores team invitations", async () => {
      await t.service.onInvitationAccepted({ userId: "u1", userName: "A", email: "a@x.com", orgId: ORG, role: "admin" });
      expect(t.prisma.client.findMany).not.toHaveBeenCalled();
    });

    it("links the login to the matching client, opens its projects and tells the owner", async () => {
      t.prisma.client.findMany.mockResolvedValue([{ id: CLIENT, name: "Acme" }]);
      // not linked yet, but a contact with this email already exists (invited earlier)
      t.prisma.clientContact.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "cc1", userId: null });
      t.prisma.project.findMany.mockResolvedValue([{ id: "p1" }, { id: "p2" }]);
      await t.service.onInvitationAccepted({ userId: "u1", userName: "Kim", email: "Kim@Acme.com", orgId: ORG, role: "member" });
      expect(t.prisma.client.findMany.mock.calls[0][0].where).toEqual({
        organizationId: ORG,
        email: { equals: "Kim@Acme.com", mode: "insensitive" },
      });
      expect(t.prisma.clientContact.update).toHaveBeenCalledWith({ where: { id: "cc1" }, data: { userId: "u1" } });
      expect(t.prisma.projectClient.createMany.mock.calls[0][0].data).toHaveLength(2);
      expect(t.notifications.notifyClientJoined).toHaveBeenCalledWith(ORG, CLIENT, "Acme");
    });

    it("does not create a second contact when the login is already linked to the client", async () => {
      t.prisma.client.findMany.mockResolvedValue([{ id: CLIENT, name: "Acme" }]);
      t.prisma.clientContact.findFirst.mockResolvedValueOnce({ id: "cc1" });
      await t.service.onInvitationAccepted({ userId: "u1", userName: "Kim", email: "kim@acme.com", orgId: ORG, role: "member" });
      expect(t.prisma.clientContact.create).not.toHaveBeenCalled();
      expect(t.prisma.clientContact.update).not.toHaveBeenCalled();
    });

    it("never throws, so a failure cannot block a client from joining", async () => {
      t.prisma.client.findMany.mockRejectedValue(new Error("db down"));
      await expect(
        t.service.onInvitationAccepted({ userId: "u1", userName: null, email: "a@x.com", orgId: ORG, role: "member" }),
      ).resolves.toBeUndefined();
    });
  });

  it("copies submitted answers into an internal project note grouped by section", async () => {
    t.prisma.project.findFirst.mockResolvedValue({ id: "p1" });
    t.prisma.formResponse.findFirst.mockResolvedValue({
      status: "submitted",
      answers: { businessName: "Acme", targetAudience: "Runners" },
      template: {
        name: "Website project questionnaire",
        fields: [
          { key: "businessName", label: "Business name", type: "text", section: "Your business" },
          { key: "vision", label: "Vision", type: "text", section: "Your business" },
          { key: "targetAudience", label: "Target audience", type: "text", section: "Audience" },
        ],
      },
    });
    await t.service.intakeToNote(CLIENT, ORG, "u1", "p1");
    const content = t.prisma.projectNote.create.mock.calls[0][0].data.content as string;
    expect(content).toContain("YOUR BUSINESS");
    expect(content).toContain("Business name: Acme");
    expect(content).toContain("Target audience: Runners");
    expect(content).not.toContain("Vision");
  });

  it("will not copy an unsubmitted questionnaire", async () => {
    t.prisma.project.findFirst.mockResolvedValue({ id: "p1" });
    t.prisma.formResponse.findFirst.mockResolvedValue({ status: "draft", answers: {}, template: { name: "n", fields: [] } });
    await expect(t.service.intakeToNote(CLIENT, ORG, "u1", "p1")).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("ClientOnboardingService (portal)", () => {
  let t: ReturnType<typeof build>;
  beforeEach(() => { t = build(); });

  const fields = [
    { key: "businessName", label: "Business name", type: "text", section: "S", required: true },
    { key: "websiteType", label: "Type", type: "select", section: "S", options: ["Portfolio", "Online store"] },
    { key: "notes", label: "Notes", type: "textarea", section: "S" },
  ];
  const response = (over: Record<string, unknown> = {}) => ({
    id: "r1", status: "draft", answers: {}, client: { id: CLIENT, name: "Acme" }, template: { name: "Q", fields }, ...over,
  });

  it("returns nothing for an account that is not linked to a client", async () => {
    const res = await t.service.getMine("u1", ORG);
    expect(res.items).toEqual([]);
    expect(t.prisma.onboardingItem.findMany).not.toHaveBeenCalled();
  });

  it("looks contacts up by the signed-in user within the workspace only", async () => {
    await t.service.getMine("u1", ORG);
    expect(t.prisma.clientContact.findMany.mock.calls[0][0].where).toEqual({ userId: "u1", client: { organizationId: ORG } });
  });

  it("only lets clients tick their own unlinked, self-reportable steps", async () => {
    t.prisma.clientContact.findMany.mockResolvedValue([{ clientId: CLIENT }]);
    t.prisma.onboardingItem.findFirst.mockResolvedValue(item({ kind: "sign_agreement" }));
    await expect(t.service.toggleMine("i1", "u1", ORG, true)).rejects.toBeInstanceOf(BadRequestException);
    t.prisma.onboardingItem.findFirst.mockResolvedValue(item({ kind: "upload_assets", linkedType: "document", linkedId: "d" }));
    await expect(t.service.toggleMine("i1", "u1", ORG, true)).rejects.toBeInstanceOf(BadRequestException);
    t.prisma.onboardingItem.findFirst.mockResolvedValue(item({ kind: "upload_assets" }));
    await t.service.toggleMine("i1", "u1", ORG, true);
    expect(t.prisma.onboardingItem.update).toHaveBeenCalledOnce();
  });

  it("cannot toggle another client's item", async () => {
    t.prisma.clientContact.findMany.mockResolvedValue([{ clientId: CLIENT }]);
    t.prisma.onboardingItem.findFirst.mockResolvedValue(null);
    await expect(t.service.toggleMine("theirs", "u1", ORG, true)).rejects.toBeInstanceOf(NotFoundException);
    expect(t.prisma.onboardingItem.findFirst.mock.calls[0][0].where).toEqual({
      id: "theirs", organizationId: ORG, clientId: { in: [CLIENT] },
    });
  });

  it("drops unknown keys and invalid select values, and trims and caps answers", async () => {
    t.prisma.clientContact.findMany.mockResolvedValue([{ clientId: CLIENT }]);
    t.prisma.formResponse.findFirst.mockResolvedValue(response());
    t.prisma.formResponse.update.mockResolvedValue({ status: "draft" });
    await t.service.saveIntake("u1", ORG, {
      answers: { businessName: "  Acme  ", websiteType: "Spaceship", notes: "x".repeat(6000), isAdmin: "true", ignored: null },
    });
    const answers = t.prisma.formResponse.update.mock.calls[0][0].data.answers as Record<string, string>;
    expect(Object.keys(answers).sort()).toEqual(["businessName", "notes"]);
    expect(answers.businessName).toBe("Acme");
    expect(answers.notes).toHaveLength(5000);
  });

  it("requires required answers to submit, then records and notifies", async () => {
    t.prisma.clientContact.findMany.mockResolvedValue([{ clientId: CLIENT }]);
    t.prisma.formResponse.findFirst.mockResolvedValue(response());
    await expect(t.service.saveIntake("u1", ORG, { answers: {}, submit: true })).rejects.toBeInstanceOf(BadRequestException);
    expect(t.prisma.formResponse.update).not.toHaveBeenCalled();

    t.prisma.formResponse.update.mockResolvedValue({ status: "submitted" });
    await t.service.saveIntake("u1", ORG, { answers: { businessName: "Acme" }, submit: true });
    expect(t.prisma.formResponse.update.mock.calls[0][0].data).toMatchObject({ status: "submitted", submittedById: "u1" });
    expect(t.notifications.notifyIntakeSubmitted).toHaveBeenCalledWith(ORG, CLIENT, "Acme");
    expect(t.activity.createForClient).toHaveBeenCalledWith(expect.objectContaining({ action: "intake_submitted" }));
  });

  it("does not allow edits after submission", async () => {
    t.prisma.clientContact.findMany.mockResolvedValue([{ clientId: CLIENT }]);
    t.prisma.formResponse.findFirst.mockResolvedValue(response({ status: "submitted" }));
    await expect(t.service.saveIntake("u1", ORG, { answers: { businessName: "New" } })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("hides internal ids of the questionnaire link from the client", async () => {
    t.prisma.clientContact.findMany.mockResolvedValue([{ clientId: CLIENT }]);
    t.prisma.onboardingItem.findMany.mockResolvedValue([item({ kind: "intake", linkedType: "form", linkedId: "r1" })]);
    t.prisma.formResponse.findMany.mockResolvedValue([{ id: "r1", status: "draft" }]);
    const res = await t.service.getMine("u1", ORG);
    expect(res.items[0].linkedId).toBeNull();
    expect(res.items[0].canToggle).toBe(false);
  });
});

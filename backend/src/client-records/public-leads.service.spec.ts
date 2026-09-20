import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PublicLeadsService } from "./public-leads.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { ActivityService } from "../activity/activity.service";
import type { NotificationsService } from "../notifications/notifications.service";

describe("PublicLeadsService", () => {
  let service: PublicLeadsService;
  let prisma: {
    organization: { findUnique: ReturnType<typeof vi.fn> };
    branding: { findUnique: ReturnType<typeof vi.fn> };
    client: Record<string, ReturnType<typeof vi.fn>>;
  };
  let activity: { createForClient: ReturnType<typeof vi.fn> };
  let notifications: { notifyNewLead: ReturnType<typeof vi.fn> };

  const enabledOrg = { id: "org-1", systemSettings: { leadFormEnabled: true } };

  beforeEach(() => {
    prisma = {
      organization: { findUnique: vi.fn().mockResolvedValue(enabledOrg) },
      branding: { findUnique: vi.fn().mockResolvedValue(null) },
      client: {
        findFirst: vi.fn().mockResolvedValue(null),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn((a: { data: Record<string, unknown> }) => Promise.resolve({ id: "c1", ...a.data })),
      },
    };
    activity = { createForClient: vi.fn().mockResolvedValue({}) };
    notifications = { notifyNewLead: vi.fn() };
    service = new PublicLeadsService(
      prisma as unknown as PrismaService,
      activity as unknown as ActivityService,
      notifications as unknown as NotificationsService,
    );
  });

  it("looks the workspace up by slug only", async () => {
    await service.submit("acme", { name: "Kim", email: "k@x.com" });
    expect(prisma.organization.findUnique.mock.calls[0][0].where).toEqual({ slug: "acme" });
  });

  it.each([
    ["unknown slug", null],
    ["form switched off", { id: "org-1", systemSettings: { leadFormEnabled: false } }],
    ["no settings row", { id: "org-1", systemSettings: null }],
  ])("returns not found when %s, and creates nothing", async (_label, org) => {
    prisma.organization.findUnique.mockResolvedValue(org);
    await expect(service.submit("acme", { name: "Kim", email: "k@x.com" })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.getForm("acme")).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.client.create).not.toHaveBeenCalled();
  });

  it("silently ignores honeypot submissions without touching the database", async () => {
    await expect(service.submit("acme", { name: "Bot", email: "b@x.com", hp: "gotcha" })).resolves.toEqual({ ok: true });
    expect(prisma.organization.findUnique).not.toHaveBeenCalled();
    expect(prisma.client.create).not.toHaveBeenCalled();
  });

  it("requires at least one contact method", async () => {
    await expect(service.submit("acme", { name: "Kim" })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.client.create).not.toHaveBeenCalled();
  });

  it("creates a new lead in the resolved workspace with a follow-up tomorrow and notifies", async () => {
    const before = Date.now();
    await service.submit("acme", { name: " Kim ", email: "Kim@X.com", message: "Need a site", budget: "$2k" });
    const data = prisma.client.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      organizationId: "org-1",
      name: "Kim",
      email: "kim@x.com",
      stage: "lead",
      leadStatus: "new",
      source: "website form",
    });
    const followUp = (data.nextFollowUpAt as Date).getTime();
    expect(followUp).toBeGreaterThanOrEqual(before + 23 * 3600_000);
    expect(followUp).toBeLessThanOrEqual(Date.now() + 25 * 3600_000);
    expect(activity.createForClient).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "org-1", actorId: "public", summary: expect.stringContaining("Need a site") }),
    );
    expect(notifications.notifyNewLead).toHaveBeenCalledWith("org-1", "c1", "Kim", "Need a site");
  });

  it("strips markup from every text field", async () => {
    await service.submit("acme", {
      name: "<b>Kim</b><script>alert(1)</script>",
      email: "k@x.com",
      company: "<img src=x onerror=alert(1)>Acme",
      message: "<a href='http://evil'>click</a> hello",
    });
    const data = prisma.client.create.mock.calls[0][0].data;
    expect(data.name).not.toMatch(/[<>]/);
    expect(data.company).toBe("Acme");
    expect(activity.createForClient.mock.calls[0][0].summary).not.toMatch(/<|href/);
  });

  it("keeps ampersands readable while still escaping angle brackets", async () => {
    await service.submit("acme", { name: "Tom & Jerry", email: "t@x.com", message: "R&D <b>rocks</b> 5 < 6" });
    const data = prisma.client.create.mock.calls[0][0].data;
    expect(data.name).toBe("Tom & Jerry");
    const summary = activity.createForClient.mock.calls[0][0].summary as string;
    expect(summary).toContain("R&D rocks 5 &lt; 6");
    expect(summary).not.toContain("<b>");
  });

  it("appends to an existing record for the same email instead of creating a second one", async () => {
    prisma.client.findFirst.mockResolvedValue({ id: "c9", name: "Kim" });
    await service.submit("acme", { name: "Kim", email: "kim@x.com", message: "Again" });
    expect(prisma.client.findFirst.mock.calls[0][0].where).toMatchObject({ organizationId: "org-1", email: "kim@x.com" });
    expect(prisma.client.create).not.toHaveBeenCalled();
    expect(activity.createForClient).toHaveBeenCalledWith(expect.objectContaining({ clientId: "c9" }));
    expect(notifications.notifyNewLead).toHaveBeenCalledOnce();
  });

  it("responds identically but creates nothing once the hourly cap is hit", async () => {
    prisma.client.count.mockResolvedValue(30);
    await expect(service.submit("acme", { name: "Kim", email: "k@x.com" })).resolves.toEqual({ ok: true });
    expect(prisma.client.create).not.toHaveBeenCalled();
    expect(notifications.notifyNewLead).not.toHaveBeenCalled();
  });

  it("exposes only name and branding on the public form", async () => {
    prisma.organization.findUnique.mockResolvedValue({ ...enabledOrg, name: "Acme" });
    prisma.branding.findUnique.mockResolvedValue({ primaryColor: "#123456", logoUrl: null });
    await expect(service.getForm("acme")).resolves.toEqual({ name: "Acme", primaryColor: "#123456", logoUrl: null });
  });
});

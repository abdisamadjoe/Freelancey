import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { NeonAuthUsersRepository } from "../auth/neon-auth-users.repository";
import { CalendarService } from "./calendar.service";

let service: CalendarService;
let prisma: PrismaService;
let orgId: string;
let userId: string;
let projectId: string;

// Scoped to a single organizationId so this file's fixtures never touch rows
// created by other spec files running in parallel against the same DB.
async function cleanupOrg(org: string) {
  const staleInvoices = await prisma.invoice.findMany({
    where: { organizationId: org },
    select: { id: true },
  });
  const staleInvoiceIds = staleInvoices.map((i) => i.id);
  if (staleInvoiceIds.length) {
    await prisma.invoiceLineItem.deleteMany({ where: { invoiceId: { in: staleInvoiceIds } } });
  }
  await prisma.invoice.deleteMany({ where: { organizationId: org } });
  await prisma.task.deleteMany({ where: { organizationId: org } });
  await prisma.project.deleteMany({ where: { organizationId: org } });
}

beforeAll(async () => {
  const mod = await Test.createTestingModule({
    providers: [CalendarService, PrismaService, NeonAuthUsersRepository],
  }).compile();
  service = mod.get(CalendarService);
  prisma = mod.get(PrismaService);
});

beforeEach(async () => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  if (orgId) await cleanupOrg(orgId);

  const org = await prisma.organization.create({
    data: { id: `cal-org-${stamp}`, name: `cal-${stamp}`, slug: `cal-${stamp}` },
  });
  orgId = org.id;
  userId = `cal-user-${stamp}`;
  await prisma.member.create({
    data: { id: `cal-mem-${stamp}`, organizationId: orgId, userId, role: "owner" },
  });
  const project = await prisma.project.create({
    data: {
      id: `cal-proj-${stamp}`,
      name: "P",
      organizationId: orgId,
      startDate: new Date("2026-05-05"),
      endDate: new Date("2026-05-25"),
    },
  });
  projectId = project.id;
});

afterAll(async () => {
  if (orgId) await cleanupOrg(orgId);
  await prisma.$disconnect();
});

describe("CalendarService.list", () => {
  it("returns task whose dueDate falls in window", async () => {
    await prisma.task.create({
      data: { title: "Inside", organizationId: orgId, projectId, status: "open", dueDate: new Date("2026-05-10") },
    });
    await prisma.task.create({
      data: { title: "Outside", organizationId: orgId, projectId, status: "open", dueDate: new Date("2026-06-15") },
    });
    const events = await service.list(orgId, { from: "2026-05-01", to: "2026-05-31" });
    const tasks = events.filter((e) => e.type === "task");
    expect(tasks.length).toBe(1);
    expect(tasks[0].type === "task" && tasks[0].title).toBe("Inside");
  });

  it("returns project_start and project_end events for projects in window", async () => {
    const events = await service.list(orgId, { from: "2026-05-01", to: "2026-05-31" });
    const types = events.filter((e) => e.type === "project_start" || e.type === "project_end").map((e) => e.type);
    expect(types).toContain("project_start");
    expect(types).toContain("project_end");
  });

  it("omits project events when start/end is null", async () => {
    await prisma.project.update({ where: { id: projectId }, data: { startDate: null, endDate: null } });
    const events = await service.list(orgId, { from: "2026-05-01", to: "2026-05-31" });
    expect(events.filter((e) => e.type === "project_start" || e.type === "project_end").length).toBe(0);
  });

  it("returns invoice with computed amount from line items", async () => {
    const inv = await prisma.invoice.create({
      data: {
        organizationId: orgId,
        projectId,
        invoiceNumber: `INV-CAL-${Date.now()}`,
        status: "draft",
        dueDate: new Date("2026-05-20"),
      },
    });
    await prisma.invoiceLineItem.create({
      data: { invoiceId: inv.id, description: "x", quantity: 2, unitPrice: 5000 },
    });
    const events = await service.list(orgId, { from: "2026-05-01", to: "2026-05-31" });
    const invoiceEvents = events.filter((e) => e.type === "invoice_due");
    expect(invoiceEvents.length).toBe(1);
    expect(invoiceEvents[0].type === "invoice_due" && invoiceEvents[0].amountCents).toBe(10000);
  });

  it("projectId filter narrows tasks, projects, and invoices", async () => {
    const stamp2 = `${Date.now()}-other-${Math.random().toString(36).slice(2, 7)}`;
    const other = await prisma.project.create({
      data: { id: `cal-other-${stamp2}`, name: "Other", organizationId: orgId, startDate: new Date("2026-05-08") },
    });
    await prisma.task.create({
      data: { title: "OtherTask", organizationId: orgId, projectId: other.id, status: "open", dueDate: new Date("2026-05-12") },
    });
    const events = await service.list(orgId, { from: "2026-05-01", to: "2026-05-31", projectId });
    const titles = events.map((e) => e.title);
    expect(titles).not.toContain("OtherTask");
    expect(titles).not.toContain("Other");
  });

  it("type filter returns only requested event types", async () => {
    await prisma.task.create({
      data: { title: "T", organizationId: orgId, projectId, status: "open", dueDate: new Date("2026-05-10") },
    });
    const events = await service.list(orgId, { from: "2026-05-01", to: "2026-05-31", type: "task" });
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((e) => e.type === "task")).toBe(true);
  });

  it("rejects when to <= from", async () => {
    await expect(
      service.list(orgId, { from: "2026-05-10", to: "2026-05-01" }),
    ).rejects.toThrow();
  });

  it("rejects when window > 366 days", async () => {
    await expect(
      service.list(orgId, { from: "2026-01-01", to: "2027-01-15" }),
    ).rejects.toThrow();
  });

  it("allows same-day query (from === to)", async () => {
    await prisma.task.create({
      data: { title: "Same", organizationId: orgId, projectId, status: "open", dueDate: new Date("2026-05-15T12:00:00Z") },
    });
    const events = await service.list(orgId, { from: "2026-05-15", to: "2026-05-15" });
    const tasks = events.filter((e) => e.type === "task" && e.title === "Same");
    expect(tasks.length).toBe(1);
  });

  it("groups dates in the requested timezone (America/Los_Angeles)", async () => {
    // 2026-05-15T03:00:00Z is May 14 in America/Los_Angeles (UTC-7 PDT).
    await prisma.task.create({
      data: { title: "NearMidnight", organizationId: orgId, projectId, status: "open", dueDate: new Date("2026-05-15T03:00:00Z") },
    });
    const utcEvents = await service.list(orgId, { from: "2026-05-01", to: "2026-05-31" });
    const utcTask = utcEvents.find((e) => e.type === "task" && e.title === "NearMidnight");
    expect(utcTask?.date).toBe("2026-05-15");

    const laEvents = await service.list(orgId, { from: "2026-05-01", to: "2026-05-31", tz: "America/Los_Angeles" });
    const laTask = laEvents.find((e) => e.type === "task" && e.title === "NearMidnight");
    expect(laTask?.date).toBe("2026-05-14");
  });

  it("rejects an invalid timezone", async () => {
    await expect(
      service.list(orgId, { from: "2026-05-01", to: "2026-05-31", tz: "Not/A_Zone" }),
    ).rejects.toThrow();
  });

  it("sorts events ascending by date", async () => {
    await prisma.task.create({
      data: { title: "Late", organizationId: orgId, projectId, status: "open", dueDate: new Date("2026-05-22") },
    });
    await prisma.task.create({
      data: { title: "Early", organizationId: orgId, projectId, status: "open", dueDate: new Date("2026-05-03") },
    });
    const events = await service.list(orgId, { from: "2026-05-01", to: "2026-05-31" });
    for (let i = 1; i < events.length; i++) {
      expect(events[i].date >= events[i - 1].date).toBe(true);
    }
  });
});

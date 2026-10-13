import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ProjectWorkflowService } from "./project-workflow.service";
import { PROJECT_TEMPLATES } from "./project-templates";
import type { PrismaService } from "../prisma/prisma.service";

const ORG = "org-1";

describe("ProjectWorkflowService", () => {
  let service: ProjectWorkflowService;
  let db: Record<string, Record<string, ReturnType<typeof vi.fn>>> & { $transaction: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    db = {
      project: { findFirst: vi.fn().mockResolvedValue({ id: "pr1", clientId: "c1" }) },
      milestone: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockImplementation(() => Promise.resolve({ id: `m${Math.random()}` })),
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
        aggregate: vi.fn().mockResolvedValue({ _max: { order: 2 } }),
        update: vi.fn().mockResolvedValue({}),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      task: { aggregate: vi.fn().mockResolvedValue({ _max: { order: 4 } }), createMany: vi.fn().mockResolvedValue({}) },
      meeting: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      expense: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      formLink: { count: vi.fn().mockResolvedValue(0) },
      contract: { count: vi.fn().mockResolvedValue(0) },
      $transaction: vi.fn(),
    };
    db.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(db));
    service = new ProjectWorkflowService(db as unknown as PrismaService);
  });

  it("404s for a project in another workspace before touching anything", async () => {
    db.project.findFirst.mockResolvedValue(null);
    await expect(service.listMilestones("x", ORG)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.createMeeting("x", { title: "t", scheduledAt: "2026-10-10T10:00:00Z" }, ORG, "u")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.createExpense("x", { description: "d", amountCents: 1, incurredOn: "2026-10-10" }, ORG, "u")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(db.project.findFirst.mock.calls[0][0].where).toEqual({ id: "x", organizationId: ORG });
  });

  describe("applyTemplate", () => {
    it("rejects an unknown template and a project that already has milestones", async () => {
      await expect(service.applyTemplate("pr1", "nope", ORG)).rejects.toBeInstanceOf(BadRequestException);
      db.milestone.count.mockResolvedValue(3);
      await expect(service.applyTemplate("pr1", "website", ORG)).rejects.toBeInstanceOf(BadRequestException);
      expect(db.milestone.create).not.toHaveBeenCalled();
    });

    it("creates every milestone with its tasks, continuing the task order", async () => {
      const template = PROJECT_TEMPLATES.find((t) => t.id === "website")!;
      await service.applyTemplate("pr1", "website", ORG);
      expect(db.milestone.create).toHaveBeenCalledTimes(template.milestones.length);
      expect(db.task.createMany).toHaveBeenCalledTimes(template.milestones.length);
      const first = db.task.createMany.mock.calls[0][0].data;
      expect(first[0]).toMatchObject({ projectId: "pr1", organizationId: ORG, order: 5 });
      expect(first[0].milestoneId).toBeTruthy();
    });

    it("ships the seven-step website workflow", () => {
      const website = PROJECT_TEMPLATES.find((t) => t.id === "website")!;
      expect(website.milestones.map((m) => m.title)).toEqual([
        "Discovery",
        "Content",
        "UI/UX design",
        "Development",
        "Testing",
        "Launch",
        "Handover",
      ]);
    });
  });

  describe("milestones", () => {
    it("sets and clears completedAt as the status changes", async () => {
      db.milestone.findFirst.mockResolvedValue({ id: "m1", completedAt: null });
      await service.updateMilestone("pr1", "m1", { status: "done" }, ORG);
      expect(db.milestone.update.mock.calls[0][0].data.completedAt).toBeInstanceOf(Date);
      await service.updateMilestone("pr1", "m1", { status: "in_progress" }, ORG);
      expect(db.milestone.update.mock.calls[1][0].data.completedAt).toBeNull();
    });

    it("scopes update and delete to the project and workspace", async () => {
      await expect(service.updateMilestone("pr1", "m1", { title: "x" }, ORG)).rejects.toBeInstanceOf(NotFoundException);
      db.milestone.deleteMany.mockResolvedValue({ count: 0 });
      await expect(service.removeMilestone("pr1", "m1", ORG)).rejects.toBeInstanceOf(NotFoundException);
      expect(db.milestone.deleteMany.mock.calls[0][0].where).toEqual({ id: "m1", projectId: "pr1", organizationId: ORG });
    });

    it("counts finished tasks per milestone", async () => {
      db.milestone.findMany.mockResolvedValue([
        { id: "m1", tasks: [{ status: "done" }, { status: "open" }, { status: "done" }] },
      ]);
      const [m] = await service.listMilestones("pr1", ORG);
      expect(m).toMatchObject({ taskCount: 3, doneCount: 2 });
    });
  });

  describe("expenses", () => {
    it("totals all and billable expenses", async () => {
      db.expense.findMany.mockResolvedValue([
        { amountCents: 1000, billable: true },
        { amountCents: 500, billable: false },
      ]);
      await expect(service.listExpenses("pr1", ORG)).resolves.toMatchObject({ totalCents: 1500, billableCents: 1000 });
    });
  });

  describe("readiness", () => {
    it("is not ready without a client", async () => {
      db.project.findFirst.mockResolvedValue({ id: "pr1", clientId: null });
      await expect(service.readiness("pr1", ORG)).resolves.toMatchObject({ hasClient: false, ready: false });
    });

    it("is ready only when onboarding, brief and a signed contract all exist", async () => {
      db.formLink.count.mockResolvedValue(1);
      db.contract.count.mockResolvedValue(0);
      await expect(service.readiness("pr1", ORG)).resolves.toMatchObject({ onboarding: true, brief: true, contract: false, ready: false });
      db.contract.count.mockResolvedValue(1);
      await expect(service.readiness("pr1", ORG)).resolves.toMatchObject({ ready: true });
    });
  });
});

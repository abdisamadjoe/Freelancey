import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PROJECT_TEMPLATES, findTemplate } from "./project-templates";
import {
  CreateExpenseDto,
  CreateMeetingDto,
  CreateMilestoneDto,
  UpdateExpenseDto,
  UpdateMeetingDto,
  UpdateMilestoneDto,
} from "./project-workflow.dto";

@Injectable()
export class ProjectWorkflowService {
  constructor(private prisma: PrismaService) {}

  private async assertProject(projectId: string, orgId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId: orgId },
      select: { id: true, clientId: true },
    });
    if (!project) throw new NotFoundException("Project not found");
    return project;
  }

  // ----- templates & milestones -----

  listTemplates() {
    return PROJECT_TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      milestones: t.milestones.map((m) => m.title),
    }));
  }

  /** Creates the template's milestones and tasks. Refuses a project that already has milestones. */
  async applyTemplate(projectId: string, templateId: string, orgId: string) {
    await this.assertProject(projectId, orgId);
    const template = findTemplate(templateId);
    if (!template) throw new BadRequestException("Unknown template");

    const existing = await this.prisma.milestone.count({ where: { projectId, organizationId: orgId } });
    if (existing > 0) throw new BadRequestException("This project already has milestones");

    const lastTask = await this.prisma.task.aggregate({ where: { projectId }, _max: { order: true } });
    let taskOrder = (lastTask._max.order ?? -1) + 1;

    await this.prisma.$transaction(async (tx) => {
      for (const [index, m] of template.milestones.entries()) {
        const milestone = await tx.milestone.create({
          data: { projectId, organizationId: orgId, title: m.title, description: m.description, order: index },
        });
        await tx.task.createMany({
          data: m.tasks.map((title) => ({
            projectId,
            organizationId: orgId,
            milestoneId: milestone.id,
            title,
            order: taskOrder++,
          })),
        });
      }
    });
    return this.listMilestones(projectId, orgId);
  }

  async listMilestones(projectId: string, orgId: string) {
    await this.assertProject(projectId, orgId);
    const milestones = await this.prisma.milestone.findMany({
      where: { projectId, organizationId: orgId },
      orderBy: { order: "asc" },
      include: { tasks: { select: { id: true, title: true, status: true }, orderBy: { order: "asc" } } },
    });
    return milestones.map((m) => ({
      ...m,
      taskCount: m.tasks.length,
      doneCount: m.tasks.filter((t) => t.status === "done").length,
    }));
  }

  async createMilestone(projectId: string, dto: CreateMilestoneDto, orgId: string) {
    await this.assertProject(projectId, orgId);
    const last = await this.prisma.milestone.aggregate({ where: { projectId }, _max: { order: true } });
    return this.prisma.milestone.create({
      data: {
        projectId,
        organizationId: orgId,
        title: dto.title.trim(),
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        order: (last._max.order ?? -1) + 1,
      },
    });
  }

  async updateMilestone(projectId: string, id: string, dto: UpdateMilestoneDto, orgId: string) {
    const existing = await this.prisma.milestone.findFirst({ where: { id, projectId, organizationId: orgId } });
    if (!existing) throw new NotFoundException("Milestone not found");
    const { dueDate, status, title, ...rest } = dto;
    return this.prisma.milestone.update({
      where: { id },
      data: {
        ...rest,
        ...(title ? { title: title.trim() } : {}),
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
        ...(status
          ? { status, completedAt: status === "done" ? (existing.completedAt ?? new Date()) : null }
          : {}),
      },
    });
  }

  async removeMilestone(projectId: string, id: string, orgId: string) {
    const result = await this.prisma.milestone.deleteMany({ where: { id, projectId, organizationId: orgId } });
    if (result.count === 0) throw new NotFoundException("Milestone not found");
  }

  // ----- meetings -----

  async listMeetings(projectId: string, orgId: string) {
    await this.assertProject(projectId, orgId);
    return this.prisma.meeting.findMany({
      where: { projectId, organizationId: orgId },
      orderBy: { scheduledAt: "desc" },
    });
  }

  async createMeeting(projectId: string, dto: CreateMeetingDto, orgId: string, userId: string) {
    await this.assertProject(projectId, orgId);
    return this.prisma.meeting.create({
      data: {
        projectId,
        organizationId: orgId,
        title: dto.title.trim(),
        scheduledAt: new Date(dto.scheduledAt),
        durationMin: dto.durationMin,
        location: dto.location,
        notes: dto.notes,
        createdById: userId,
      },
    });
  }

  async updateMeeting(projectId: string, id: string, dto: UpdateMeetingDto, orgId: string) {
    const existing = await this.prisma.meeting.findFirst({ where: { id, projectId, organizationId: orgId }, select: { id: true } });
    if (!existing) throw new NotFoundException("Meeting not found");
    const { scheduledAt, title, ...rest } = dto;
    return this.prisma.meeting.update({
      where: { id },
      data: {
        ...rest,
        ...(title ? { title: title.trim() } : {}),
        ...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}),
      },
    });
  }

  async removeMeeting(projectId: string, id: string, orgId: string) {
    const result = await this.prisma.meeting.deleteMany({ where: { id, projectId, organizationId: orgId } });
    if (result.count === 0) throw new NotFoundException("Meeting not found");
  }

  // ----- expenses -----

  async listExpenses(projectId: string, orgId: string) {
    await this.assertProject(projectId, orgId);
    const expenses = await this.prisma.expense.findMany({
      where: { projectId, organizationId: orgId },
      orderBy: { incurredOn: "desc" },
    });
    return {
      data: expenses,
      totalCents: expenses.reduce((sum, e) => sum + e.amountCents, 0),
      billableCents: expenses.filter((e) => e.billable).reduce((sum, e) => sum + e.amountCents, 0),
    };
  }

  async createExpense(projectId: string, dto: CreateExpenseDto, orgId: string, userId: string) {
    await this.assertProject(projectId, orgId);
    return this.prisma.expense.create({
      data: {
        projectId,
        organizationId: orgId,
        description: dto.description.trim(),
        amountCents: dto.amountCents,
        incurredOn: new Date(dto.incurredOn),
        category: dto.category,
        billable: dto.billable ?? false,
        currency: (dto.currency ?? "USD").toUpperCase(),
        createdById: userId,
      },
    });
  }

  async updateExpense(projectId: string, id: string, dto: UpdateExpenseDto, orgId: string) {
    const existing = await this.prisma.expense.findFirst({ where: { id, projectId, organizationId: orgId }, select: { id: true } });
    if (!existing) throw new NotFoundException("Expense not found");
    const { incurredOn, description, ...rest } = dto;
    return this.prisma.expense.update({
      where: { id },
      data: {
        ...rest,
        ...(description ? { description: description.trim() } : {}),
        ...(incurredOn ? { incurredOn: new Date(incurredOn) } : {}),
      },
    });
  }

  async removeExpense(projectId: string, id: string, orgId: string) {
    const result = await this.prisma.expense.deleteMany({ where: { id, projectId, organizationId: orgId } });
    if (result.count === 0) throw new NotFoundException("Expense not found");
  }

  // ----- readiness -----

  /** Onboarding, brief and a signed contract: what has to be true before work starts. */
  async readiness(projectId: string, orgId: string) {
    const project = await this.assertProject(projectId, orgId);
    if (!project.clientId) return { hasClient: false, onboarding: false, brief: false, contract: false, ready: false };

    const [onboarding, brief, contract] = await Promise.all([
      this.prisma.formLink.count({
        where: { organizationId: orgId, clientId: project.clientId, kind: "onboarding", status: "completed" },
      }),
      this.prisma.formLink.count({
        where: { organizationId: orgId, projectId, kind: "project_brief", status: "completed" },
      }),
      this.prisma.contract.count({
        where: {
          organizationId: orgId,
          status: "signed",
          OR: [{ projectId }, { clientRecordId: project.clientId }],
        },
      }),
    ]);
    const result = { hasClient: true, onboarding: onboarding > 0, brief: brief > 0, contract: contract > 0 };
    return { ...result, ready: result.onboarding && result.brief && result.contract };
  }
}

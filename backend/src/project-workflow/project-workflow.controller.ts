import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AuthGuard, CurrentOrg, CurrentUser, Roles, RolesGuard } from "../common";
import { ProjectWorkflowService } from "./project-workflow.service";
import {
  ApplyTemplateDto,
  CreateExpenseDto,
  CreateMeetingDto,
  CreateMilestoneDto,
  UpdateExpenseDto,
  UpdateMeetingDto,
  UpdateMilestoneDto,
} from "./project-workflow.dto";

/** Milestones, meetings, expenses and readiness for one project. Staff only. */
@Controller("projects")
@UseGuards(AuthGuard, RolesGuard)
@Roles("owner", "admin")
export class ProjectWorkflowController {
  constructor(private service: ProjectWorkflowService) {}

  @Get(":projectId/readiness")
  readiness(@Param("projectId") projectId: string, @CurrentOrg("id") orgId: string) {
    return this.service.readiness(projectId, orgId);
  }

  @Get(":projectId/milestones")
  milestones(@Param("projectId") projectId: string, @CurrentOrg("id") orgId: string) {
    return this.service.listMilestones(projectId, orgId);
  }

  @Post(":projectId/apply-template")
  applyTemplate(@Param("projectId") projectId: string, @Body() dto: ApplyTemplateDto, @CurrentOrg("id") orgId: string) {
    return this.service.applyTemplate(projectId, dto.templateId, orgId);
  }

  @Post(":projectId/milestones")
  createMilestone(@Param("projectId") projectId: string, @Body() dto: CreateMilestoneDto, @CurrentOrg("id") orgId: string) {
    return this.service.createMilestone(projectId, dto, orgId);
  }

  @Patch(":projectId/milestones/:id")
  updateMilestone(
    @Param("projectId") projectId: string,
    @Param("id") id: string,
    @Body() dto: UpdateMilestoneDto,
    @CurrentOrg("id") orgId: string,
  ) {
    return this.service.updateMilestone(projectId, id, dto, orgId);
  }

  @Delete(":projectId/milestones/:id")
  @HttpCode(204)
  async removeMilestone(@Param("projectId") projectId: string, @Param("id") id: string, @CurrentOrg("id") orgId: string) {
    await this.service.removeMilestone(projectId, id, orgId);
  }

  @Get(":projectId/meetings")
  meetings(@Param("projectId") projectId: string, @CurrentOrg("id") orgId: string) {
    return this.service.listMeetings(projectId, orgId);
  }

  @Post(":projectId/meetings")
  createMeeting(
    @Param("projectId") projectId: string,
    @Body() dto: CreateMeetingDto,
    @CurrentOrg("id") orgId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.service.createMeeting(projectId, dto, orgId, userId);
  }

  @Patch(":projectId/meetings/:id")
  updateMeeting(
    @Param("projectId") projectId: string,
    @Param("id") id: string,
    @Body() dto: UpdateMeetingDto,
    @CurrentOrg("id") orgId: string,
  ) {
    return this.service.updateMeeting(projectId, id, dto, orgId);
  }

  @Delete(":projectId/meetings/:id")
  @HttpCode(204)
  async removeMeeting(@Param("projectId") projectId: string, @Param("id") id: string, @CurrentOrg("id") orgId: string) {
    await this.service.removeMeeting(projectId, id, orgId);
  }

  @Get(":projectId/expenses")
  expenses(@Param("projectId") projectId: string, @CurrentOrg("id") orgId: string) {
    return this.service.listExpenses(projectId, orgId);
  }

  @Post(":projectId/expenses")
  createExpense(
    @Param("projectId") projectId: string,
    @Body() dto: CreateExpenseDto,
    @CurrentOrg("id") orgId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.service.createExpense(projectId, dto, orgId, userId);
  }

  @Patch(":projectId/expenses/:id")
  updateExpense(
    @Param("projectId") projectId: string,
    @Param("id") id: string,
    @Body() dto: UpdateExpenseDto,
    @CurrentOrg("id") orgId: string,
  ) {
    return this.service.updateExpense(projectId, id, dto, orgId);
  }

  @Delete(":projectId/expenses/:id")
  @HttpCode(204)
  async removeExpense(@Param("projectId") projectId: string, @Param("id") id: string, @CurrentOrg("id") orgId: string) {
    await this.service.removeExpense(projectId, id, orgId);
  }
}

/** Separate path so "templates" is never read as a project id by the projects controller. */
@Controller("project-templates")
@UseGuards(AuthGuard, RolesGuard)
@Roles("owner", "admin")
export class ProjectTemplatesController {
  constructor(private service: ProjectWorkflowService) {}

  @Get()
  list() {
    return this.service.listTemplates();
  }
}

import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthGuard, CurrentOrg, CurrentUser, Public, Roles, RolesGuard } from "../common";
import { DeliverablesService } from "./deliverables.service";
import {
  ApproveDeliverableDto,
  CreateDeliverableDto,
  RequestChangesDto,
  SendDeliverableDto,
  UpdateDeliverableDto,
} from "./deliverables.dto";

/** Deliverables a freelancer sends to the client for review. Staff only. */
@Controller("projects/:projectId/deliverables")
@UseGuards(AuthGuard, RolesGuard)
@Roles("owner", "admin")
export class DeliverablesController {
  constructor(private service: DeliverablesService) {}

  @Get()
  list(@Param("projectId") projectId: string, @CurrentOrg("id") orgId: string) {
    return this.service.list(projectId, orgId);
  }

  @Post()
  create(
    @Param("projectId") projectId: string,
    @Body() dto: CreateDeliverableDto,
    @CurrentOrg("id") orgId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.service.create(projectId, dto, orgId, userId);
  }

  @Patch(":id")
  update(
    @Param("projectId") projectId: string,
    @Param("id") id: string,
    @Body() dto: UpdateDeliverableDto,
    @CurrentOrg("id") orgId: string,
  ) {
    return this.service.update(projectId, id, dto, orgId);
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("projectId") projectId: string, @Param("id") id: string, @CurrentOrg("id") orgId: string) {
    await this.service.remove(projectId, id, orgId);
  }

  @Post(":id/send")
  send(
    @Param("projectId") projectId: string,
    @Param("id") id: string,
    @Body() dto: SendDeliverableDto,
    @CurrentOrg("id") orgId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.service.send(projectId, id, dto, orgId, userId);
  }
}

/** Unauthenticated: the secret token in the URL is the only way in and scopes everything to one deliverable. */
@Controller("deliverables/public")
export class PublicDeliverablesController {
  constructor(private service: DeliverablesService) {}

  @Public()
  @Get(":token")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  view(@Param("token") token: string) {
    return this.service.getPublic(token);
  }

  @Public()
  @Post(":token/approve")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  approve(@Param("token") token: string, @Body() dto: ApproveDeliverableDto) {
    return this.service.approve(token, dto.name);
  }

  @Public()
  @Post(":token/request-changes")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  requestChanges(@Param("token") token: string, @Body() dto: RequestChangesDto) {
    return this.service.requestChanges(token, dto);
  }
}

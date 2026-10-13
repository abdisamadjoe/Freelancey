import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthGuard, CurrentOrg, CurrentUser, Public, Roles, RolesGuard } from "../common";
import { HandoverService } from "./handover.service";
import { AddHandoverItemDto, CompleteProjectDto, ShareHandoverDto, UpdateHandoverItemDto } from "./handover.dto";

/** Project completion and handover. Staff only. */
@Controller("projects/:projectId")
@UseGuards(AuthGuard, RolesGuard)
@Roles("owner", "admin")
export class HandoverController {
  constructor(private service: HandoverService) {}

  @Get("completion-check")
  completionCheck(@Param("projectId") projectId: string, @CurrentOrg("id") orgId: string) {
    return this.service.completionCheck(projectId, orgId);
  }

  @Post("complete")
  @HttpCode(200)
  complete(
    @Param("projectId") projectId: string,
    @Body() dto: CompleteProjectDto,
    @CurrentOrg("id") orgId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.service.completeProject(projectId, dto.overrideReason, orgId, userId);
  }

  @Get("handover")
  get(@Param("projectId") projectId: string, @CurrentOrg("id") orgId: string) {
    return this.service.get(projectId, orgId);
  }

  @Post("handover")
  start(@Param("projectId") projectId: string, @CurrentOrg("id") orgId: string, @CurrentUser("id") userId: string) {
    return this.service.start(projectId, orgId, userId);
  }

  @Post("handover/items")
  addItem(@Param("projectId") projectId: string, @Body() dto: AddHandoverItemDto, @CurrentOrg("id") orgId: string) {
    return this.service.addItem(projectId, dto, orgId);
  }

  @Patch("handover/items/:itemId")
  updateItem(
    @Param("projectId") projectId: string,
    @Param("itemId") itemId: string,
    @Body() dto: UpdateHandoverItemDto,
    @CurrentOrg("id") orgId: string,
  ) {
    return this.service.updateItem(projectId, itemId, dto, orgId);
  }

  @Delete("handover/items/:itemId")
  @HttpCode(204)
  async removeItem(@Param("projectId") projectId: string, @Param("itemId") itemId: string, @CurrentOrg("id") orgId: string) {
    await this.service.removeItem(projectId, itemId, orgId);
  }

  @Post("handover/share")
  share(
    @Param("projectId") projectId: string,
    @Body() dto: ShareHandoverDto,
    @CurrentOrg("id") orgId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.service.share(projectId, dto, orgId, userId);
  }

  @Post("handover/complete")
  @HttpCode(200)
  completeHandover(@Param("projectId") projectId: string, @CurrentOrg("id") orgId: string, @CurrentUser("id") userId: string) {
    return this.service.complete(projectId, orgId, userId);
  }
}

/** Unauthenticated: the secret token in the URL is the only way in and scopes everything to one handover. */
@Controller("handover/public")
export class PublicHandoverController {
  constructor(private service: HandoverService) {}

  @Public()
  @Get(":token")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  view(@Param("token") token: string) {
    return this.service.getPublic(token);
  }
}

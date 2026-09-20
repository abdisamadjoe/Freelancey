import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from "@nestjs/common";
import { AuthGuard, CurrentOrg, CurrentUser, Roles, RolesGuard } from "../common";
import { ClientOnboardingService } from "./client-onboarding.service";
import {
  AddOnboardingItemDto,
  IntakeToNoteDto,
  SaveIntakeDto,
  SendInviteDto,
  StartOnboardingDto,
  ToggleMineDto,
  UpdateOnboardingItemDto,
} from "./client-onboarding.dto";

/** Staff view: manage a client's onboarding checklist and questionnaire. */
@Controller("client-records/:id/onboarding")
@UseGuards(AuthGuard, RolesGuard)
@Roles("owner", "admin")
export class ClientOnboardingController {
  constructor(private service: ClientOnboardingService) {}

  @Get()
  get(@Param("id") id: string, @CurrentOrg("id") orgId: string) {
    return this.service.getForClient(id, orgId);
  }

  @Post("start")
  start(
    @Param("id") id: string,
    @Body() dto: StartOnboardingDto,
    @CurrentOrg("id") orgId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.service.start(id, orgId, userId, dto.projectId);
  }

  @Post("invite")
  invite(
    @Param("id") id: string,
    @Body() dto: SendInviteDto,
    @CurrentOrg("id") orgId: string,
    @CurrentOrg("name") orgName: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("name") userName: string,
  ) {
    return this.service.sendInvite(id, orgId, { id: userId, name: userName }, orgName, dto.projectId);
  }

  @Get("linkables")
  linkables(@Param("id") id: string, @CurrentOrg("id") orgId: string) {
    return this.service.linkables(id, orgId);
  }

  @Post("items")
  addItem(@Param("id") id: string, @Body() dto: AddOnboardingItemDto, @CurrentOrg("id") orgId: string) {
    return this.service.addItem(id, orgId, dto);
  }

  @Patch("items/:itemId")
  updateItem(
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @Body() dto: UpdateOnboardingItemDto,
    @CurrentOrg("id") orgId: string,
  ) {
    return this.service.updateItem(id, itemId, orgId, dto);
  }

  @Delete("items/:itemId")
  removeItem(@Param("id") id: string, @Param("itemId") itemId: string, @CurrentOrg("id") orgId: string) {
    return this.service.removeItem(id, itemId, orgId);
  }

  @Post("intake-to-note")
  intakeToNote(
    @Param("id") id: string,
    @Body() dto: IntakeToNoteDto,
    @CurrentOrg("id") orgId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.service.intakeToNote(id, orgId, userId, dto.projectId);
  }
}

/** Portal view: the signed-in client's own checklist and questionnaire. */
@Controller("client-onboarding/mine")
@UseGuards(AuthGuard)
export class ClientOnboardingPortalController {
  constructor(private service: ClientOnboardingService) {}

  @Get()
  get(@CurrentUser("id") userId: string, @CurrentOrg("id") orgId: string) {
    return this.service.getMine(userId, orgId);
  }

  @Post("items/:itemId")
  toggle(
    @Param("itemId") itemId: string,
    @Body() dto: ToggleMineDto,
    @CurrentUser("id") userId: string,
    @CurrentOrg("id") orgId: string,
  ) {
    return this.service.toggleMine(itemId, userId, orgId, dto.done);
  }

  @Put("intake")
  saveIntake(@Body() dto: SaveIntakeDto, @CurrentUser("id") userId: string, @CurrentOrg("id") orgId: string) {
    return this.service.saveIntake(userId, orgId, dto);
  }
}

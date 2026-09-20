import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard, CurrentOrg, CurrentUser, PaginationQueryDto, Roles, RolesGuard } from "../common";
import { ClientRecordsService } from "./client-records.service";
import {
  ClientRecordListQueryDto,
  CreateClientActivityDto,
  CreateClientRecordDto,
  UpdateClientRecordDto,
} from "./client-records.dto";

/** Leads and clients as relationship records. Staff only; clients never see these. */
@Controller("client-records")
@UseGuards(AuthGuard, RolesGuard)
@Roles("owner", "admin")
export class ClientRecordsController {
  constructor(private service: ClientRecordsService) {}

  @Get()
  list(@CurrentOrg("id") orgId: string, @Query() query: ClientRecordListQueryDto) {
    return this.service.list(orgId, query);
  }

  @Post()
  create(
    @Body() dto: CreateClientRecordDto,
    @CurrentOrg("id") orgId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.service.create(dto, orgId, userId);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentOrg("id") orgId: string) {
    return this.service.findOne(id, orgId);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateClientRecordDto,
    @CurrentOrg("id") orgId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.service.update(id, dto, orgId, userId);
  }

  @Post(":id/archive")
  archive(@Param("id") id: string, @CurrentOrg("id") orgId: string) {
    return this.service.setArchived(id, orgId, true);
  }

  @Post(":id/unarchive")
  unarchive(@Param("id") id: string, @CurrentOrg("id") orgId: string) {
    return this.service.setArchived(id, orgId, false);
  }

  @Get(":id/activity")
  listActivity(
    @Param("id") id: string,
    @CurrentOrg("id") orgId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.service.listActivity(id, orgId, query.page, query.limit);
  }

  @Post(":id/activity")
  addActivity(
    @Param("id") id: string,
    @Body() dto: CreateClientActivityDto,
    @CurrentOrg("id") orgId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.service.addActivity(id, dto, orgId, userId);
  }
}

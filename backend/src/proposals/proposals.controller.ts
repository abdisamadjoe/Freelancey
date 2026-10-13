import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthGuard, CurrentOrg, CurrentUser, Public, Roles, RolesGuard } from "../common";
import { ProposalsService } from "./proposals.service";
import {
  AcceptProposalDto,
  CreateProposalDto,
  ProposalListQueryDto,
  RejectProposalDto,
  SendProposalDto,
  UpdateProposalDto,
} from "./proposals.dto";

/** Proposals a freelancer writes for a lead. Staff only. */
@Controller("proposals")
@UseGuards(AuthGuard, RolesGuard)
@Roles("owner", "admin")
export class ProposalsController {
  constructor(private service: ProposalsService) {}

  @Get()
  list(@CurrentOrg("id") orgId: string, @Query() query: ProposalListQueryDto) {
    return this.service.list(orgId, query);
  }

  @Post()
  create(@Body() dto: CreateProposalDto, @CurrentOrg("id") orgId: string, @CurrentUser("id") userId: string) {
    return this.service.create(dto, orgId, userId);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentOrg("id") orgId: string) {
    return this.service.findOne(id, orgId);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateProposalDto,
    @CurrentOrg("id") orgId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.service.update(id, dto, orgId, userId);
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id") id: string, @CurrentOrg("id") orgId: string) {
    await this.service.remove(id, orgId);
  }

  @Post(":id/send")
  send(
    @Param("id") id: string,
    @Body() dto: SendProposalDto,
    @CurrentOrg("id") orgId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.service.send(id, dto, orgId, userId);
  }
}

/** Unauthenticated: the secret token in the URL is the only way in and scopes everything to one proposal. */
@Controller("proposals/public")
export class PublicProposalsController {
  constructor(private service: ProposalsService) {}

  @Public()
  @Get(":token")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  view(@Param("token") token: string) {
    return this.service.getPublic(token);
  }

  @Public()
  @Post(":token/accept")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  accept(@Param("token") token: string, @Body() dto: AcceptProposalDto) {
    return this.service.accept(token, dto);
  }

  @Public()
  @Post(":token/reject")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  reject(@Param("token") token: string, @Body() dto: RejectProposalDto) {
    return this.service.reject(token, dto);
  }
}

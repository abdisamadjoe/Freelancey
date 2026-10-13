import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthGuard, CurrentOrg, CurrentUser, Public, Roles, RolesGuard } from "../common";
import { SupportService } from "./support.service";
import { CreateTicketDto, ReplyDto, SubmitTicketDto, TicketListQueryDto, UpdateTicketDto } from "./support.dto";

/** The support inbox. Staff only. */
@Controller()
@UseGuards(AuthGuard, RolesGuard)
@Roles("owner", "admin")
export class SupportController {
  constructor(private service: SupportService) {}

  @Post("client-records/:id/support-link")
  supportLink(@Param("id") id: string, @CurrentOrg("id") orgId: string, @CurrentUser("id") userId: string) {
    return this.service.createSupportLink(id, orgId, userId);
  }

  @Get("support-tickets")
  list(@CurrentOrg("id") orgId: string, @Query() query: TicketListQueryDto) {
    return this.service.list(orgId, query);
  }

  @Post("support-tickets")
  create(@Body() dto: CreateTicketDto, @CurrentOrg("id") orgId: string, @CurrentUser("id") userId: string) {
    return this.service.create(dto, orgId, userId);
  }

  @Get("support-tickets/:id")
  findOne(@Param("id") id: string, @CurrentOrg("id") orgId: string) {
    return this.service.findOne(id, orgId);
  }

  @Patch("support-tickets/:id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateTicketDto,
    @CurrentOrg("id") orgId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.service.update(id, dto, orgId, userId);
  }

  @Post("support-tickets/:id/replies")
  reply(
    @Param("id") id: string,
    @Body() dto: ReplyDto,
    @CurrentOrg("id") orgId: string,
    @CurrentUser() user: { id: string; name?: string | null },
  ) {
    return this.service.reply(id, dto, orgId, user.id, user.name ?? "Support");
  }
}

/** Unauthenticated: the client's private support link is the only way in and scopes everything to that client. */
@Controller("support/public")
export class PublicSupportController {
  constructor(private service: SupportService) {}

  @Public()
  @Get(":token")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  form(@Param("token") token: string) {
    return this.service.getPublicForm(token);
  }

  @Public()
  @Post(":token/tickets")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  submit(@Param("token") token: string, @Body() dto: SubmitTicketDto) {
    return this.service.submit(token, dto);
  }
}

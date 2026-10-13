import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthGuard, CurrentOrg, CurrentUser, Public, Roles, RolesGuard } from "../common";
import { FormLinksService } from "./form-links.service";
import { CreateFormLinkDto, FormLinkListQueryDto, SubmitFormDto } from "./form-links.dto";

/** Onboarding and project-brief links a freelancer sends to a client. Staff only. */
@Controller("form-links")
@UseGuards(AuthGuard, RolesGuard)
@Roles("owner", "admin")
export class FormLinksController {
  constructor(private service: FormLinksService) {}

  @Get()
  list(@Query() query: FormLinkListQueryDto, @CurrentOrg("id") orgId: string) {
    return this.service.list(query, orgId);
  }

  @Post()
  create(@Body() dto: CreateFormLinkDto, @CurrentOrg("id") orgId: string, @CurrentUser("id") userId: string) {
    return this.service.createLink(dto, orgId, userId);
  }

  @Get(":id/answers")
  answers(@Param("id") id: string, @CurrentOrg("id") orgId: string) {
    return this.service.getAnswers(id, orgId);
  }
}

/** Unauthenticated: the secret token in the URL is the only way in and scopes everything to one form. */
@Controller("forms/public")
export class PublicFormsController {
  constructor(private service: FormLinksService) {}

  @Public()
  @Get(":token")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  view(@Param("token") token: string) {
    return this.service.getPublic(token);
  }

  @Public()
  @Post(":token/submit")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  submit(@Param("token") token: string, @Body() dto: SubmitFormDto) {
    return this.service.submit(token, dto.answers);
  }
}

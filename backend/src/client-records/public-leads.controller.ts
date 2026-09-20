import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Public } from "../common";
import { PublicLeadDto } from "./public-leads.dto";
import { PublicLeadsService } from "./public-leads.service";

/** Unauthenticated: the tenant comes from the slug only, never from the body. */
@Controller("leads/public")
export class PublicLeadsController {
  constructor(private service: PublicLeadsService) {}

  @Public()
  @Get(":slug")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  getForm(@Param("slug") slug: string) {
    return this.service.getForm(slug);
  }

  @Public()
  @Post(":slug")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  submit(@Param("slug") slug: string, @Body() dto: PublicLeadDto) {
    return this.service.submit(slug, dto);
  }
}

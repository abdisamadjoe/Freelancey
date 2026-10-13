import { Controller, Get, UseGuards } from "@nestjs/common";
import { AuthGuard, CurrentOrg, Roles, RolesGuard } from "../common";
import { PipelineService } from "./pipeline.service";

/** The freelancer's pipeline at a glance. Staff only. */
@Controller("pipeline")
@UseGuards(AuthGuard, RolesGuard)
@Roles("owner", "admin")
export class PipelineController {
  constructor(private service: PipelineService) {}

  @Get("summary")
  summary(@CurrentOrg("id") orgId: string) {
    return this.service.summary(orgId);
  }
}

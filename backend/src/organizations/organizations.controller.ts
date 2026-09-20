import { Body, Controller, Get, Patch, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { UserOnlyAuthGuard } from "../account/user-only-auth.guard";
import { AuthGuard, RolesGuard, Roles, CurrentOrg, CurrentUser } from "../common";
import type { AuthenticatedRequest } from "../common";
import { ACTIVE_ORG_COOKIE } from "../auth/session.middleware";
import { OrganizationsService } from "./organizations.service";
import { SetActiveOrgDto, AcceptInvitationDto, UpdateOrganizationDto } from "./organizations.dto";

@Controller("organizations")
@UseGuards(UserOnlyAuthGuard)
export class OrganizationsController {
  constructor(private organizations: OrganizationsService) {}

  @Get()
  async list(@CurrentUser("id") userId: string) {
    return this.organizations.listForUser(userId);
  }

  @Get("me")
  async me(@Req() req: AuthenticatedRequest) {
    const { organization, member } = await this.organizations.getMe(
      req.organization?.id,
      req.member?.id,
    );
    return { user: req.user, organization, member };
  }

  @Post("active")
  async setActive(
    @Body() dto: SetActiveOrgDto,
    @CurrentUser("id") userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const member = await this.organizations.getMembership(userId, dto.organizationId);

    const secureCookies =
      process.env.SECURE_COOKIES !== undefined
        ? process.env.SECURE_COOKIES === "true"
        : process.env.NODE_ENV === "production";

    res.cookie(ACTIVE_ORG_COOKIE, dto.organizationId, {
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookies,
      path: "/",
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });

    return { organizationId: dto.organizationId, role: member.role };
  }

  @Post("accept-invitation")
  async acceptInvitation(
    @Body() dto: AcceptInvitationDto,
    @CurrentUser("id") userId: string,
    @CurrentUser("email") userEmail: string,
    @CurrentUser("name") userName: string,
  ) {
    return this.organizations.acceptInvitation(dto.invitationId, userId, userEmail, userName);
  }

  @Patch("current")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("owner", "admin")
  async updateCurrent(
    @Body() dto: UpdateOrganizationDto,
    @CurrentOrg("id") orgId: string,
  ) {
    return this.organizations.update(orgId, dto.name);
  }
}

import {
  Controller,
  Get,
  Delete,
  Post,
  Put,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { NeonAuthUsersRepository } from "../auth/neon-auth-users.repository";
import {
  AuthGuard,
  RolesGuard,
  Roles,
  CurrentOrg,
  CurrentUser,
  CurrentMember,
  PaginationQueryDto,
  paginatedResponse,
  contentDisposition,
  toCsv,
} from "../common";
import type { CsvColumn } from "../common";
import { ClientsService } from "./clients.service";
import { ChangeRoleDto, SetRateDto, InviteMemberDto } from "./clients.dto";
import { UpdateClientProfileDto } from "./client-profile.dto";

@Controller("clients")
@UseGuards(AuthGuard, RolesGuard)
export class ClientsController {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private clientsService: ClientsService,
    private neonAuthUsers: NeonAuthUsersRepository,
  ) {}

  @Get()
  @Roles("owner", "admin")
  async list(
    @CurrentOrg("id") orgId: string,
    @Query() query: PaginationQueryDto,
  ) {
    const { page = 1, limit = 20 } = query;
    const where = { organizationId: orgId };
    const [data, total] = await Promise.all([
      this.prisma.member.findMany({
        where,
        select: {
          id: true,
          userId: true,
          role: true,
          createdAt: true,
          hourlyRateCents: true,
          labels: { select: { label: { select: { id: true, name: true, color: true } } } },
        },
        orderBy: { createdAt: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.member.count({ where }),
    ]);

    const userIds = data.map((m) => m.userId);
    const [profiles, users] = await Promise.all([
      this.prisma.clientProfile.findMany({
        where: { userId: { in: userIds }, organizationId: orgId },
      }),
      this.neonAuthUsers.findMany(userIds),
    ]);
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));
    const userMap = new Map(users.map((u) => [u.id, { id: u.id, name: u.name, email: u.email }]));

    const enriched = data.map((m) => ({
      ...m,
      user: userMap.get(m.userId) ?? { id: m.userId, name: "Unknown", email: "" },
      profile: profileMap.get(m.userId) || null,
    }));

    return paginatedResponse(enriched, total, page, limit);
  }

  @Get("export")
  @Roles("owner", "admin")
  async exportCsv(@CurrentOrg("id") orgId: string, @Res() res: Response) {
    const members = await this.prisma.member.findMany({
      where: { organizationId: orgId },
      select: {
        userId: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
    const [profiles, users] = await Promise.all([
      this.prisma.clientProfile.findMany({ where: { organizationId: orgId } }),
      this.neonAuthUsers.findMany(members.map((m) => m.userId)),
    ]);
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));
    const userMap = new Map(users.map((u) => [u.id, u]));

    type Row = { name: string | null; email: string | null; role: string; company?: string; phone?: string; address?: string; website?: string; joinedAt: Date };
    const rows: Row[] = members.map((m) => {
      const p = profileMap.get(m.userId);
      const u = userMap.get(m.userId);
      return {
        name: u?.name ?? null, email: u?.email ?? null, role: m.role,
        company: p?.company ?? undefined, phone: p?.phone ?? undefined,
        address: p?.address ?? undefined, website: p?.website ?? undefined,
        joinedAt: m.createdAt,
      };
    });

    const columns: CsvColumn<Row>[] = [
      { header: "Name", value: (r) => r.name },
      { header: "Email", value: (r) => r.email },
      { header: "Role", value: (r) => r.role },
      { header: "Company", value: (r) => r.company },
      { header: "Phone", value: (r) => r.phone },
      { header: "Address", value: (r) => r.address },
      { header: "Website", value: (r) => r.website },
      { header: "Joined At", value: (r) => r.joinedAt.toISOString().split("T")[0] },
    ];
    const csv = toCsv(columns, rows);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", contentDisposition("people.csv"));
    res.send(csv);
  }

  @Post("invitations")
  @Roles("owner", "admin")
  async invite(
    @Body() dto: InviteMemberDto,
    @CurrentOrg("id") orgId: string,
    @CurrentOrg("name") orgName: string,
    @CurrentUser("id") inviterId: string,
    @CurrentUser("name") inviterName: string,
  ) {
    return this.clientsService.inviteMember(
      dto.email,
      dto.role,
      orgId,
      inviterId,
      inviterName,
      orgName,
    );
  }

  @Get("invitations")
  @Roles("owner", "admin")
  async invitations(@CurrentOrg("id") orgId: string) {
    const webUrl = this.config.get("WEB_URL", "http://localhost:3000");
    const invitations = await this.prisma.invitation.findMany({
      where: { organizationId: orgId, status: "pending" },
      orderBy: { createdAt: "desc" },
    });
    return invitations.map((inv) => ({
      ...inv,
      inviteLink: `${webUrl}/accept-invite?id=${inv.id}`,
    }));
  }

  @Get("me/profile")
  async getMyProfile(
    @CurrentUser("id") userId: string,
    @CurrentOrg("id") orgId: string,
  ) {
    return this.clientsService.getProfile(userId, orgId);
  }

  @Put("me/profile")
  async updateMyProfile(
    @CurrentUser("id") userId: string,
    @CurrentOrg("id") orgId: string,
    @Body() dto: UpdateClientProfileDto,
  ) {
    return this.clientsService.updateProfile(userId, orgId, dto);
  }

  @Get(":id/profile")
  @Roles("owner", "admin")
  async getClientProfile(
    @Param("id") userId: string,
    @CurrentOrg("id") orgId: string,
  ) {
    return this.clientsService.getProfile(userId, orgId);
  }

  @Put(":id/profile")
  @Roles("owner", "admin")
  async updateClientProfile(
    @Param("id") userId: string,
    @CurrentOrg("id") orgId: string,
    @Body() dto: UpdateClientProfileDto,
  ) {
    return this.clientsService.updateProfile(userId, orgId, dto);
  }

  @Delete(":id")
  @Roles("owner", "admin")
  async remove(
    @Param("id") memberId: string,
    @CurrentOrg("id") orgId: string,
    @CurrentUser("id") userId: string,
    @CurrentMember("role") role: string,
  ) {
    await this.clientsService.removeMember(memberId, orgId, userId, role);
  }

  @Post(":id/reset-password")
  @Roles("owner", "admin")
  async resetPassword(
    @Param("id") memberId: string,
    @CurrentOrg("id") orgId: string,
    @CurrentUser("id") userId: string,
    @CurrentMember("role") role: string,
  ) {
    return this.clientsService.generateResetLink(
      memberId,
      orgId,
      userId,
      role,
    );
  }

  @Put(":id/role")
  @Roles("owner")
  async changeRole(
    @Param("id") memberId: string,
    @Body() dto: ChangeRoleDto,
    @CurrentOrg("id") orgId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.clientsService.changeRole(memberId, dto.role, orgId, userId);
  }

  @Put(":id/rate")
  @Roles("owner")
  async setRate(
    @Param("id") memberId: string,
    @CurrentOrg("id") orgId: string,
    @CurrentUser("id") userId: string,
    @CurrentMember("role") role: string,
    @Body() dto: SetRateDto,
  ) {
    return this.clientsService.setMemberRate(
      memberId,
      orgId,
      userId,
      role,
      dto.hourlyRateCents ?? null,
    );
  }
}

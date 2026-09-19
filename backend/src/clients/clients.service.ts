import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { render } from "@react-email/render";
import { InvitationEmail } from "@/email";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "../auth/auth.service";
import { NeonAuthUsersRepository } from "../auth/neon-auth-users.repository";
import { MailService } from "../mail/mail.service";
import { UpdateClientProfileDto } from "./client-profile.dto";

@Injectable()
export class ClientsService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
    private mail: MailService,
    private config: ConfigService,
    private neonAuthUsers: NeonAuthUsersRepository,
  ) {}

  /** Invites a client (or, less commonly, a teammate) to the organization. */
  async inviteMember(
    email: string,
    role: string,
    orgId: string,
    inviterId: string,
    inviterName: string,
    organizationName: string,
  ) {
    const invitation = await this.prisma.invitation.create({
      data: {
        organizationId: orgId,
        email: email.toLowerCase(),
        role,
        status: "pending",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        inviterId,
      },
    });

    const webUrl = this.config.get("WEB_URL", "http://localhost:3000");
    const inviteUrl = `${webUrl}/accept-invite?id=${invitation.id}`;
    const html = await render(
      InvitationEmail({ inviteUrl, organizationName, inviterName }),
    );
    await this.mail.send(
      email,
      `You've been invited to ${organizationName}`,
      html,
      orgId,
    );

    return invitation;
  }

  async generateResetLink(
    memberId: string,
    orgId: string,
    requestingUserId: string,
    requestingRole: string,
  ): Promise<{
    email: string;
    emailSent: boolean;
  }> {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, organizationId: orgId },
    });
    if (!member) throw new NotFoundException("Member not found");
    if (member.userId === requestingUserId) {
      throw new BadRequestException(
        "Cannot reset your own password — use forgot-password instead",
      );
    }
    if (member.role === "owner" && requestingRole !== "owner") {
      throw new ForbiddenException("Only owners can reset another owner");
    }
    const user = await this.neonAuthUsers.findUnique(member.userId);
    if (!user?.email) {
      throw new NotFoundException("Member has no email on file");
    }

    const { emailSent } = await this.authService.sendAdminPasswordReset(user.email);
    return {
      email: user.email,
      emailSent,
    };
  }

  async removeMember(
    memberId: string,
    orgId: string,
    requestingUserId: string,
    requestingRole: string,
  ) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, organizationId: orgId },
    });
    if (!member) throw new NotFoundException("Member not found");
    if (member.userId === requestingUserId) {
      throw new BadRequestException("Cannot remove yourself");
    }
    if (member.role === "owner" && requestingRole !== "owner") {
      throw new BadRequestException("Only owners can remove other owners");
    }

    // Scope ProjectClient deletion to this org's projects only
    const orgProjectIds = await this.prisma.project.findMany({
      where: { organizationId: orgId },
      select: { id: true },
    });
    const projectIds = orgProjectIds.map((p) => p.id);

    await this.prisma.$transaction([
      this.prisma.projectClient.deleteMany({
        where: { userId: member.userId, projectId: { in: projectIds } },
      }),
      this.prisma.member.delete({ where: { id: memberId } }),
    ]);
  }

  async changeRole(
    memberId: string,
    newRole: string,
    orgId: string,
    requestingUserId: string,
  ) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, organizationId: orgId },
    });
    if (!member) throw new NotFoundException("Member not found");
    if (member.userId === requestingUserId) {
      throw new BadRequestException("Cannot change your own role");
    }
    if (member.role === "owner") {
      const ownerCount = await this.prisma.member.count({
        where: { organizationId: orgId, role: "owner" },
      });
      if (ownerCount <= 1) {
        throw new BadRequestException("Cannot demote the last owner");
      }
    }
    const validRoles = ["owner", "admin", "member"];
    if (!validRoles.includes(newRole)) {
      throw new BadRequestException("Invalid role");
    }
    return this.prisma.member.update({
      where: { id: memberId },
      data: { role: newRole },
    });
  }

  async setMemberRate(
    memberId: string,
    orgId: string,
    actorUserId: string,
    actorRole: string,
    rate: number | null,
  ) {
    if (actorRole !== "owner") {
      throw new ForbiddenException("Only owners can set member rates");
    }
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, organizationId: orgId },
    });
    if (!member) throw new NotFoundException("Member not found");
    return this.prisma.member.update({
      where: { id: memberId },
      data: { hourlyRateCents: rate },
    });
  }

  async getProfile(userId: string, orgId: string) {
    const profile = await this.prisma.clientProfile.findUnique({
      where: { userId_organizationId: { userId, organizationId: orgId } },
    });
    return (
      profile || {
        userId,
        organizationId: orgId,
        company: null,
        phone: null,
        address: null,
        website: null,
        description: null,
      }
    );
  }

  async updateProfile(
    userId: string,
    orgId: string,
    dto: UpdateClientProfileDto,
  ) {
    return this.prisma.clientProfile.upsert({
      where: { userId_organizationId: { userId, organizationId: orgId } },
      create: { userId, organizationId: orgId, ...dto },
      update: dto,
    });
  }
}

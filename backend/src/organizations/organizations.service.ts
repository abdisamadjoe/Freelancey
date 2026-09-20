import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ClientOnboardingService } from "../client-onboarding/client-onboarding.service";

@Injectable()
export class OrganizationsService {
  constructor(
    private prisma: PrismaService,
    private clientOnboarding: ClientOnboardingService,
  ) {}

  /** Lists every organization the given user is a member of. */
  async listForUser(userId: string) {
    const memberships = await this.prisma.member.findMany({
      where: { userId },
      include: { organization: { select: { id: true, name: true, slug: true, logo: true } } },
      orderBy: { createdAt: "desc" },
    });
    return memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      logo: m.organization.logo,
      role: m.role,
    }));
  }

  /** Verifies membership and returns the member row, used to set the active_org cookie. */
  async getMembership(userId: string, organizationId: string) {
    const member = await this.prisma.member.findFirst({
      where: { userId, organizationId },
    });
    if (!member) {
      throw new ForbiddenException("You are not a member of this organization");
    }
    return member;
  }

  /** Returns the organization + member row currently resolved for the request (set by SessionMiddleware). */
  async getMe(organizationId: string | undefined, memberId: string | undefined) {
    if (!organizationId || !memberId) {
      throw new NotFoundException("No active organization");
    }
    const [organization, member] = await Promise.all([
      this.prisma.organization.findUniqueOrThrow({ where: { id: organizationId } }),
      this.prisma.member.findUniqueOrThrow({ where: { id: memberId } }),
    ]);
    return { organization, member };
  }

  /**
   * Accepts a pending invitation for the now-authenticated user, creating
   * their Member row. Replaces Better Auth's organization/accept-invitation
   * endpoint now that Invitation is an app-owned table.
   */
  async acceptInvitation(invitationId: string, userId: string, userEmail: string, userName: string | null = null) {
    const invitation = await this.prisma.invitation.findUnique({ where: { id: invitationId } });
    if (!invitation || invitation.status !== "pending") {
      throw new NotFoundException("Invitation not found or already used");
    }
    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException("This invitation has expired");
    }
    if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
      throw new ForbiddenException("This invitation was sent to a different email address");
    }

    const existing = await this.prisma.member.findFirst({
      where: { userId, organizationId: invitation.organizationId },
    });
    if (existing) {
      await this.prisma.invitation.update({ where: { id: invitationId }, data: { status: "accepted" } });
      return { organizationId: invitation.organizationId, memberId: existing.id, role: existing.role };
    }

    const [member] = await this.prisma.$transaction([
      this.prisma.member.create({
        data: { userId, organizationId: invitation.organizationId, role: invitation.role || "member" },
      }),
      this.prisma.invitation.update({ where: { id: invitationId }, data: { status: "accepted" } }),
    ]);

    // Connect the new login to the client record with this email, give it access
    // to that client's projects, and tell the owner. Never blocks acceptance.
    await this.clientOnboarding.onInvitationAccepted({
      userId,
      userName,
      email: userEmail,
      orgId: invitation.organizationId,
      role: member.role,
    });

    return { organizationId: invitation.organizationId, memberId: member.id, role: member.role };
  }

  /** Updates the current organization's name. */
  async update(organizationId: string, name: string) {
    return this.prisma.organization.update({ where: { id: organizationId }, data: { name } });
  }
}

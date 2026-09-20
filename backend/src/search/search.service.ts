import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NeonAuthUsersRepository } from "../auth/neon-auth-users.repository";

@Injectable()
export class SearchService {
  constructor(
    private prisma: PrismaService,
    private neonAuthUsers: NeonAuthUsersRepository,
  ) {}

  async search(orgId: string, q: string) {
    // Members are matched by their Neon Auth user's name/email, which isn't
    // a Prisma relation — resolve matching user ids first.
    // Only this organization's clients are searched; the auth table is global.
    const orgClientIds = (
      await this.prisma.member.findMany({
        where: { organizationId: orgId, role: "member" },
        select: { userId: true },
      })
    ).map((m) => m.userId);
    const matchingUsers = orgClientIds.length
      ? await this.neonAuthUsers.searchByNameOrEmail(q, 20, orgClientIds)
      : [];
    const matchingUserIds = matchingUsers.map((u) => u.id);
    const userById = new Map(matchingUsers.map((u) => [u.id, u]));

    const [projects, tasks, files, memberRows] = await Promise.all([
      this.prisma.project.findMany({
        where: {
          organizationId: orgId,
          archivedAt: null,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
        },
        take: 5,
      }),
      this.prisma.task.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          title: true,
          description: true,
          projectId: true,
          project: { select: { id: true, name: true } },
        },
        take: 5,
      }),
      this.prisma.file.findMany({
        where: {
          organizationId: orgId,
          filename: { contains: q, mode: "insensitive" },
        },
        select: {
          id: true,
          filename: true,
          projectId: true,
          project: { select: { id: true, name: true } },
        },
        take: 5,
      }),
      matchingUserIds.length > 0
        ? this.prisma.member.findMany({
            where: {
              organizationId: orgId,
              role: "member",
              userId: { in: matchingUserIds },
            },
            select: { id: true, userId: true },
            take: 5,
          })
        : Promise.resolve([]),
    ]);

    const members = memberRows.map((m) => ({
      ...m,
      user: userById.get(m.userId) ?? { id: m.userId, name: "Unknown", email: "" },
    }));

    const memberUserIds = members.map((m) => m.userId);
    const clientProfiles =
      memberUserIds.length > 0
        ? await this.prisma.clientProfile.findMany({
            where: { userId: { in: memberUserIds }, organizationId: orgId },
            select: { userId: true, company: true },
          })
        : [];

    const profileByUserId = new Map(clientProfiles.map((p) => [p.userId, p]));

    const clients = members.map((m) => ({
      ...m,
      company: profileByUserId.get(m.userId)?.company ?? null,
    }));

    return { projects, tasks, files, clients };
  }
}

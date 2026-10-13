import { Injectable } from "@nestjs/common";
import type { AuthUser as AuthUserRow } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export type { AuthUserRow };

/**
 * Read access to the identity table Better Auth owns (`auth_user`):
 * id/name/email/emailVerified/image/createdAt/updatedAt. Other tables point at
 * users by plain string id, so this is how names and emails are resolved for display.
 */
@Injectable()
export class AuthUsersRepository {
  constructor(private prisma: PrismaService) {}

  async findUnique(id: string): Promise<AuthUserRow | null> {
    return this.prisma.authUser.findUnique({ where: { id } });
  }

  async findMany(ids: string[]): Promise<AuthUserRow[]> {
    if (ids.length === 0) return [];
    return this.prisma.authUser.findMany({ where: { id: { in: ids } } });
  }

  async findByEmail(email: string): Promise<AuthUserRow | null> {
    // Addresses are compared case-insensitively: "Kim@X.com" and "kim@x.com" are the same person.
    return this.prisma.authUser.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  }

  /**
   * The user table is global across tenants, so callers should pass `onlyIds`
   * (e.g. an organization's member ids) to keep the search, and the `take`
   * cap, inside their own tenant.
   */
  async searchByNameOrEmail(query: string, take = 20, onlyIds?: string[]): Promise<AuthUserRow[]> {
    return this.prisma.authUser.findMany({
      where: {
        ...(onlyIds ? { id: { in: onlyIds } } : {}),
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      take,
    });
  }
}

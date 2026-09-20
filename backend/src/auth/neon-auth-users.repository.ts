import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { NeonAuthPrismaClient } from "@/database";
import type { NeonAuthUser } from "@/database";

export type { NeonAuthUser };

/**
 * Read-only access to Neon Auth's own `neon_auth."user"` table (Managed
 * Better Auth's user table — id/name/email/emailVerified/image/createdAt/
 * updatedAt, plus admin-plugin ban fields we don't use here).
 *
 * Backed by a separate, generate-only Prisma client (see
 * packages/database/prisma/neon-auth.schema.prisma) rather than the main
 * PrismaService: `neon_auth` is a whole schema Neon Auth owns (user/
 * session/account/verification/jwks/organization/member/invitation/
 * project_config), and Prisma's migrate/db push drops any undeclared table
 * in a schema it's told to manage — that schema must never be listed in
 * the app's main, migrated datasource.
 */
@Injectable()
export class NeonAuthUsersRepository implements OnModuleInit, OnModuleDestroy {
  private client = new NeonAuthPrismaClient();

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }

  async findUnique(id: string): Promise<NeonAuthUser | null> {
    return this.client.neonAuthUser.findUnique({ where: { id } });
  }

  async findMany(ids: string[]): Promise<NeonAuthUser[]> {
    if (ids.length === 0) return [];
    return this.client.neonAuthUser.findMany({ where: { id: { in: ids } } });
  }

  async findByEmail(email: string): Promise<NeonAuthUser | null> {
    // Addresses are compared case-insensitively: "Kim@X.com" and "kim@x.com" are the same person.
    return this.client.neonAuthUser.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  }

  /**
   * The auth table is global across tenants, so callers should pass `onlyIds`
   * (e.g. an organization's member ids) to keep the search, and the `take`
   * cap, inside their own tenant.
   */
  async searchByNameOrEmail(query: string, take = 20, onlyIds?: string[]): Promise<NeonAuthUser[]> {
    return this.client.neonAuthUser.findMany({
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

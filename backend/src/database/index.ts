export { PrismaClient, Prisma } from "@prisma/client";
export type * from "@prisma/client";

// Separate, read-only client for Neon Auth's own `neon_auth` schema — see
// prisma/neon-auth.schema.prisma for why this is generated from an
// entirely separate schema file (never migrated/pushed, generate-only).
export { PrismaClient as NeonAuthPrismaClient } from "../../node_modules/.prisma/neon-auth-client/index.js";
export type { NeonAuthUser } from "../../node_modules/.prisma/neon-auth-client/index.js";

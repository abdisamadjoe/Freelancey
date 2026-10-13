import { Injectable, NestMiddleware } from "@nestjs/common";
import type { Request, Response, NextFunction } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { BetterAuthService } from "./better-auth.service";
import { AuthUsersRepository } from "./auth-users.repository";
import type { AuthenticatedRequest, AuthUser, FullOrganization, OrgMember } from "../common";

export const ACTIVE_ORG_COOKIE = "active_org";

interface CachedSession {
  user: AuthUser;
  organization?: FullOrganization;
  member?: OrgMember;
  expiresAt: number;
}

const SESSION_CACHE_TTL = 30_000; // 30 seconds

@Injectable()
export class SessionMiddleware implements NestMiddleware {
  private cache = new Map<string, CachedSession>();

  constructor(
    private betterAuth: BetterAuthService,
    private prisma: PrismaService,
    private authUsers: AuthUsersRepository,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const authReq = req as Partial<
      Pick<AuthenticatedRequest, "user" | "organization" | "member">
    > &
      Request;

    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
      // Server-rendered pages send the session cookie instead of a bearer token.
      const sessionCookie = token ? undefined : (req.headers.cookie ?? "").includes("session_token") ? req.headers.cookie : undefined;
      if (!token && !sessionCookie) {
        next();
        return;
      }

      // The client SDK reuses one JWT for many requests, so the cache key must
      // also carry the active workspace: switching workspace (or joining one)
      // changes the cookie, not the token.
      const activeOrgCookie = req.cookies?.[ACTIVE_ORG_COOKIE];
      const cacheKey = `${token ?? sessionCookie}|${activeOrgCookie ?? ""}`;

      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        authReq.user = cached.user;
        if (cached.organization) authReq.organization = cached.organization;
        if (cached.member) authReq.member = cached.member;
        return next();
      }
      if (cached) this.cache.delete(cacheKey);

      let payload: { sub: string } | null = null;
      if (token) {
        payload = await this.betterAuth.verifyAccessToken(token);
      } else {
        const userId = await this.betterAuth.getSessionUserId(req.headers);
        payload = userId ? { sub: userId } : null;
      }
      if (!payload) {
        next();
        return;
      }

      const userRecord = await this.authUsers.findUnique(payload.sub);
      if (!userRecord) {
        next();
        return;
      }

      authReq.user = {
        id: userRecord.id,
        name: userRecord.name,
        email: userRecord.email,
        emailVerified: userRecord.emailVerified,
        image: userRecord.image,
        createdAt: userRecord.createdAt,
        updatedAt: userRecord.updatedAt,
      };

      // Resolve the active organization: prefer the org named by the
      // active_org cookie (if the user is actually a member of it),
      // otherwise fall back to their most recently joined org.
      const member = await this.prisma.member.findFirst({
        where: activeOrgCookie
          ? { userId: payload.sub, organizationId: activeOrgCookie }
          : { userId: payload.sub },
        orderBy: activeOrgCookie ? undefined : { createdAt: "desc" },
        include: { organization: true },
      });

      if (member) {
        authReq.organization = member.organization as FullOrganization;
        authReq.member = {
          id: member.id,
          organizationId: member.organizationId,
          userId: member.userId,
          role: member.role,
          createdAt: member.createdAt,
        };
      }

      // Never cache a session that has no membership: the user is about to
      // create or join a workspace (accepting an invitation, onboarding), and a
      // cached "no organization" answer would 401 their very next requests.
      if (authReq.member) {
        this.cache.set(cacheKey, {
          user: authReq.user,
          organization: authReq.organization,
          member: authReq.member,
          expiresAt: Date.now() + SESSION_CACHE_TTL,
        });
      }

      if (this.cache.size > 1000) {
        const now = Date.now();
        for (const [key, val] of this.cache) {
          if (val.expiresAt < now) this.cache.delete(key);
        }
      }
    } catch {
      // Session resolution failed — continue without auth.
      // The AuthGuard will reject unauthenticated requests.
    }

    next();
  }
}

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { render } from "@react-email/render";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { fromNodeHeaders } from "better-auth/node";
import { jwt } from "better-auth/plugins/jwt";
import { createLocalJWKSet, jwtVerify, type JSONWebKeySet } from "jose";
import * as React from "react";
import { ResetPasswordEmail, VerifyEmail } from "../email";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";

export interface AccessTokenPayload {
  sub: string;
  email?: string;
}

/**
 * The app's identity provider: a self-hosted Better Auth instance backed by
 * this API's own Postgres (tables `auth_*`). It is mounted at `/api/auth/*`
 * in main.ts and reached by the web app through its own `/api/auth` proxy, so
 * session cookies are first-party for the web origin.
 *
 * Clients call the API with a short-lived JWT (jwt plugin) or, for server-side
 * rendering, with the session cookie; both are resolved here.
 */
@Injectable()
export class BetterAuthService {
  private readonly logger = new Logger(BetterAuthService.name);
  readonly auth: ReturnType<typeof this.build>;
  private jwks: ReturnType<typeof createLocalJWKSet> | null = null;
  private jwksFetchedAt = 0;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private mail: MailService,
  ) {
    this.auth = this.build();
  }

  /** The Better Auth storage adapter (Prisma over the app's Postgres). Overridable in tests. */
  protected createDatabase() {
    return prismaAdapter(this.prisma, { provider: "postgresql" });
  }

  private build() {
    const webUrl = this.config.get<string>("WEB_URL", "http://localhost:3000").replace(/\/$/, "");
    const secret = this.config.get<string>("BETTER_AUTH_SECRET") || this.config.getOrThrow<string>("APP_ENCRYPTION_SECRET");

    return betterAuth({
      appName: "Gigly",
      // The public origin of the web app: it proxies /api/auth to this API, so links in
      // emails and cookies are issued for that origin.
      baseURL: webUrl,
      basePath: "/api/auth",
      secret,
      trustedOrigins: [webUrl],
      database: this.createDatabase(),
      user: { modelName: "authUser" },
      session: { modelName: "authSession" },
      account: { modelName: "authAccount" },
      verification: { modelName: "authVerification" },
      emailAndPassword: {
        enabled: true,
        minPasswordLength: 8,
        maxPasswordLength: 128,
        resetPasswordTokenExpiresIn: 60 * 60,
        sendResetPassword: async ({ user, url }) => {
          const html = await render(React.createElement(ResetPasswordEmail, { url }));
          await this.mail.send(user.email, "Reset your Gigly password", html);
        },
      },
      emailVerification: {
        sendOnSignUp: true,
        sendVerificationEmail: async ({ user, url }) => {
          const html = await render(React.createElement(VerifyEmail, { url }));
          await this.mail.send(user.email, "Verify your email address", html);
        },
      },
      plugins: [
        jwt({
          schema: { jwks: { modelName: "authJwks" } },
          jwt: { expirationTime: "15m" },
        }),
      ],
    });
  }

  /** Express/Node request handler for Better Auth's own endpoints. */
  async nodeHandler() {
    const { toNodeHandler } = await import("better-auth/node");
    return toNodeHandler(this.auth);
  }

  private async getJwks() {
    const stale = Date.now() - this.jwksFetchedAt > 5 * 60 * 1000;
    if (!this.jwks || stale) {
      const set = (await this.auth.api.getJwks()) as JSONWebKeySet;
      this.jwks = createLocalJWKSet(set);
      this.jwksFetchedAt = Date.now();
    }
    return this.jwks;
  }

  /** Verifies a bearer access token and returns its payload, or null if invalid/expired. */
  async verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
    const attempt = async () => {
      const { payload } = await jwtVerify(token, await this.getJwks());
      if (!payload.sub) return null;
      return { sub: payload.sub, email: payload.email as string | undefined };
    };
    try {
      return await attempt();
    } catch {
      // A key may have rotated since the set was cached: refresh once and retry.
      try {
        this.jwks = null;
        return await attempt();
      } catch {
        return null;
      }
    }
  }

  /** Resolves the signed-in user id from a session cookie, or null. */
  async getSessionUserId(headers: Record<string, string | string[] | undefined>): Promise<string | null> {
    try {
      const session = await this.auth.api.getSession({ headers: fromNodeHeaders(headers) });
      return session?.user?.id ?? null;
    } catch {
      return null;
    }
  }

  /** Emails the user a password-reset link. */
  async sendPasswordResetEmail(email: string, redirectUrl: string): Promise<boolean> {
    try {
      await this.auth.api.requestPasswordReset({ body: { email, redirectTo: redirectUrl } });
      return true;
    } catch (err) {
      this.logger.warn(`Password reset request failed: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }

  /** Verifies a user's current password (used before self-service account deletion). */
  async verifyPassword(userId: string, password: string): Promise<boolean> {
    const account = await this.prisma.authAccount.findFirst({
      where: { userId, providerId: "credential" },
      select: { password: true },
    });
    if (!account?.password) return false;
    const ctx = await this.auth.$context;
    return ctx.password.verify({ hash: account.password, password });
  }

  /** Permanently deletes a user's identity (sessions and accounts cascade). */
  async deleteUser(userId: string): Promise<void> {
    await this.prisma.authUser.delete({ where: { id: userId } });
  }
}

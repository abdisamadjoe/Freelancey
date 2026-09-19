import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createRemoteJWKSet, jwtVerify } from "jose";

export interface StackAuthPayload {
  sub: string;
  email?: string;
}

/**
 * Verifies Neon Auth access tokens.
 *
 * Neon Auth's product surface moved from a Stack-Auth-hosted backend to
 * "Managed Better Auth" (Neon hosts a Better Auth instance itself, at a
 * per-project URL like https://<endpoint>.neonauth.<region>.aws.neon.tech).
 * JWT verification via JWKS works the same way regardless of which one a
 * given project is on, so this class only depends on NEON_AUTH_BASE_URL —
 * point it at the auth base URL shown in your Neon project's Auth tab.
 *
 * The admin-style methods below (getUser/sendPasswordResetEmail/
 * verifyPassword/deleteUser) still assume Stack Auth's REST API shape and
 * have NOT been re-verified against Managed Better Auth's admin surface —
 * they need rework before password-reset/account-deletion features will
 * work end-to-end. Plain sign-in/sign-up/session verification (the auth
 * this app needs to boot) does not depend on them.
 */
@Injectable()
export class StackAuthClient {
  private readonly baseUrl: string;
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(private config: ConfigService) {
    this.baseUrl = this.config.getOrThrow<string>("NEON_AUTH_BASE_URL").replace(/\/$/, "");
    this.jwks = createRemoteJWKSet(new URL(`${this.baseUrl}/.well-known/jwks.json`));
  }

  /** Verifies a bearer access token and returns its payload, or null if invalid/expired. */
  async verifyAccessToken(token: string): Promise<StackAuthPayload | null> {
    try {
      const { payload } = await jwtVerify(token, this.jwks);
      if (!payload.sub) return null;
      return { sub: payload.sub, email: payload.email as string | undefined };
    } catch {
      return null;
    }
  }

  // TODO(auth-admin-ops): these four still assume Stack Auth's REST API
  // shape (x-stack-* headers, api.stack-auth.com paths) and have not been
  // re-verified against Managed Better Auth's actual admin surface — that
  // likely means Better Auth's admin plugin endpoints under
  // `${NEON_AUTH_BASE_URL}/admin/*`, authenticated some other way (Neon API
  // key? a server-side Better Auth session?). Left unimplemented rather
  // than guessing a second time. None of these block the app from booting
  // or basic sign-in/session verification from working — only admin
  // password-reset and self-service account deletion depend on them.

  /** Fetches a user's profile (id/name/email) by user id. */
  async getUser(_userId: string): Promise<{ id: string; displayName: string | null; primaryEmail: string | null } | null> {
    throw new Error("StackAuthClient.getUser: not yet implemented for Managed Better Auth");
  }

  /** Triggers a password-reset email to be sent to the given user. */
  async sendPasswordResetEmail(_email: string, _redirectUrl: string): Promise<boolean> {
    throw new Error("StackAuthClient.sendPasswordResetEmail: not yet implemented for Managed Better Auth");
  }

  /** Verifies a user's current password (used before self-service account deletion). */
  async verifyPassword(_userId: string, _password: string): Promise<boolean> {
    throw new Error("StackAuthClient.verifyPassword: not yet implemented for Managed Better Auth");
  }

  /** Permanently deletes a user's identity. */
  async deleteUser(_userId: string): Promise<void> {
    throw new Error("StackAuthClient.deleteUser: not yet implemented for Managed Better Auth");
  }
}

import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";

// Server-side Neon Auth instance. Proxies auth requests through this app's
// own /api/auth/[...path] route rather than talking to the Neon Auth URL
// directly, so the session cookie is first-party for this domain — server
// components (dashboard/portal layouts) can read it, and it isn't subject
// to third-party cookie blocking. Used by server components/actions to
// resolve the session and by anything forwarding a bearer token (via
// `auth.token()`) to the separate NestJS backend.
//
// The instance is created lazily on first use instead of at module scope:
// Next.js evaluates route modules during `next build` ("Collecting page
// data"), and `createNeonAuth` throws when the cookie secret is missing.
// The NEON_AUTH_* variables are runtime-only (configured in the Vercel
// project settings), so module-scope initialization breaks the build.
let authInstance: ReturnType<typeof createNeonAuth> | null = null;

export function getAuth() {
  if (!authInstance) {
    const baseUrl = process.env.NEON_AUTH_BASE_URL;
    const secret = process.env.NEON_AUTH_COOKIE_SECRET;
    if (!baseUrl || !secret) {
      throw new Error(
        "Neon Auth is not configured: NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET (min 32 chars) must be set.",
      );
    }
    authInstance = createNeonAuth({ baseUrl, cookies: { secret } });
  }
  return authInstance;
}

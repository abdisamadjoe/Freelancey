import { getAuth } from "@/lib/auth/server";

// Deferred handlers: the auth instance is created on the first request, so
// `next build` never initializes `createNeonAuth` and therefore doesn't
// require NEON_AUTH_BASE_URL / NEON_AUTH_COOKIE_SECRET at build time (they
// are runtime-only Vercel environment variables). `force-dynamic` stops
// Next.js from statically optimizing this route, which would otherwise
// invoke the handler — and thus `createNeonAuth` — during the build.
export const dynamic = "force-dynamic";

type AuthRouteContext = { params: Promise<{ path: string[] }> };

export const GET = (request: Request, context: AuthRouteContext) =>
  getAuth().handler().GET(request, context);

export const POST = (request: Request, context: AuthRouteContext) =>
  getAuth().handler().POST(request, context);

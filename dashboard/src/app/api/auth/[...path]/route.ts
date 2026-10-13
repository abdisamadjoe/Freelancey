import { NextRequest, NextResponse } from "next/server";

// Forwards Better Auth requests to the API, which runs Better Auth itself. Going
// through this route keeps the session cookie first-party for the web origin, so
// server components can read it and browsers never treat it as third-party.
export const dynamic = "force-dynamic";

const API_URL = (process.env.API_URL || "http://localhost:3001").replace(/\/$/, "");

type RouteContext = { params: Promise<{ path: string[] }> };

async function forward(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { path } = await context.params;
  const target = `${API_URL}/api/auth/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");
  headers.set("x-forwarded-host", request.headers.get("host") ?? "");
  headers.set("x-forwarded-proto", request.nextUrl.protocol.replace(":", ""));

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    redirect: "manual",
    cache: "no-store",
  });

  const responseHeaders = new Headers(upstream.headers);
  // fetch has already decoded the body.
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");

  return new NextResponse(upstream.body, { status: upstream.status, headers: responseHeaders });
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;

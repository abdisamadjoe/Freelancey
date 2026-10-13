import "server-only";
import { cookies } from "next/headers";

const API_URL = process.env.API_URL || "http://localhost:3001";

/**
 * Server-component fetch against the backend API, authenticated with the
 * visitor's session cookie. Returns null on any failure (no session, network
 * error, non-2xx) so callers can treat "not logged in" and "backend hiccup"
 * the same way.
 */
export async function serverApiFetch<T = unknown>(path: string): Promise<T | null> {
  try {
    const cookieHeader = (await cookies()).toString();
    if (!cookieHeader) return null;

    const res = await fetch(`${API_URL}/api${path}`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

import "server-only";
import { getAuth } from "./auth/server";

const API_URL = process.env.API_URL || "http://localhost:3001";

/**
 * Server-component fetch against the backend API, authenticated with the
 * current Neon Auth user's access token (forwarded as a bearer header).
 * Returns null on any failure (no session, network error, non-2xx) so
 * callers can treat "not logged in" and "backend hiccup" the same way the
 * old cookie-forwarding helpers did.
 */
export async function serverApiFetch<T = unknown>(path: string): Promise<T | null> {
  try {
    const { data } = await getAuth().token();
    const accessToken = data?.token;
    if (!accessToken) return null;

    const res = await fetch(`${API_URL}/api${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

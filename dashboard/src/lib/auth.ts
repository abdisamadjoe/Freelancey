import { serverApiFetch } from "./server-api";

/** Returns the current user + active org's member row (via /organizations/me), or null if signed out. */
export async function getSession() {
  return serverApiFetch<{
    user: { id: string; name: string; email: string; emailVerified: boolean };
    organization: { id: string; name: string; slug: string | null; logo: string | null; customDomain: string | null; setupCompleted: boolean };
    member: { id: string; role: string };
  }>("/organizations/me");
}

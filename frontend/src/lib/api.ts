import { getStoredPreviewClientId } from "./preview-mode";
import { authClient } from "./auth/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

async function getAccessToken(): Promise<string | undefined> {
  const { data } = await authClient.token();
  return data?.token ?? undefined;
}

async function doFetch(
  path: string,
  options: RequestInit,
): Promise<Response> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const accessToken = await getAccessToken();
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const method = (options.method || "GET").toUpperCase();
  const previewClientId = getStoredPreviewClientId();
  if (previewClientId) {
    if (MUTATING_METHODS.has(method)) {
      throw new Error("Read-only preview mode");
    }
    headers["X-Preview-As"] = previewClientId;
  }

  return fetch(`${API_URL}/api${path}`, {
    ...options,
    credentials: "include",
    headers,
  });
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await doFetch(path, options);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as Record<string, unknown>).message as string || `API error: ${res.status}`);
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Fetches a binary response (e.g. a generated PDF) with the same auth as `apiFetch`. */
export async function apiFetchBlob(
  path: string,
): Promise<{ blob: Blob; filename?: string }> {
  const res = await doFetch(path, {});
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as Record<string, unknown>).message as string || `API error: ${res.status}`);
  }
  const disposition = res.headers.get("Content-Disposition");
  return {
    blob: await res.blob(),
    filename: disposition?.match(/filename="(.+?)"/)?.[1],
  };
}

/**
 * After authentication, sets the active org and returns the redirect path
 * based on the user's role (owner/admin -> /dashboard, member -> /portal).
 *
 * `preferredOrgId` is used when the caller knows which org the user is acting
 * on (e.g. the org they just accepted an invite to). Without it, users who
 * belong to multiple orgs would be routed by an arbitrary `orgs[0]`, which
 * can land an invited client on the dashboard of an unrelated org they own.
 */
export async function setActiveOrgAndRedirect(
  defaultPath = "/portal",
  preferredOrgId?: string,
): Promise<string> {
  let orgs: { id: string }[];
  try {
    orgs = await apiFetch<{ id: string }[]>("/organizations");
  } catch {
    return defaultPath;
  }
  if (!orgs?.length) return defaultPath;

  const targetOrgId =
    preferredOrgId && orgs.some((o) => o.id === preferredOrgId)
      ? preferredOrgId
      : orgs[0].id;

  try {
    const { role } = await apiFetch<{ role: string }>("/organizations/active", {
      method: "POST",
      body: JSON.stringify({ organizationId: targetOrgId }),
    });
    return role === "owner" || role === "admin" ? "/dashboard" : defaultPath;
  } catch {
    return defaultPath;
  }
}

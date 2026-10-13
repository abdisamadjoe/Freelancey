import { serverApiFetch } from "./server-api";

export interface OrgBranding {
  logoKey?: string;
  logoUrl?: string;
  organizationId?: string;
  primaryColor?: string;
  accentColor?: string;
  hideLogo?: boolean;
}

export function getOrgBranding() {
  return serverApiFetch<OrgBranding>("/branding");
}

export function getLogoSrc(branding: OrgBranding | null): string | null {
  if (!branding) return null;
  const API_URL = process.env.API_URL || "http://localhost:3001";
  if (branding.logoKey) {
    return `${API_URL}/api/branding/logo/${branding.organizationId}?k=${encodeURIComponent(branding.logoKey)}`;
  }
  return branding.logoUrl ?? null;
}

/** Legacy Freelancey default stored in the DB: treated as "not customised". */
const LEGACY_DEFAULT_PRIMARY = "#006b68";
/** Colours the product ships with; a workspace on these values has no custom brand. */
const BUILT_IN_PRIMARIES = new Set([LEGACY_DEFAULT_PRIMARY, "#665df5", "#5750f1", "#064e3b"]);

/** The workspace's own brand colour, or null when it still uses the product default. */
export function customPrimary(primaryColor?: string | null): string | null {
  if (!primaryColor) return null;
  return BUILT_IN_PRIMARIES.has(primaryColor.toLowerCase()) ? null : primaryColor;
}

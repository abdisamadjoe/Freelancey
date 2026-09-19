import { redirect } from "next/navigation";
import { TelemetryConsentBanner } from "@/components/telemetry-consent-banner";
import { AppShell } from "./app-shell";
import { DynamicFavicon } from "@/components/dynamic-favicon";
import { getSession } from "@/lib/auth";
import { serverApiFetch } from "@/lib/server-api";

async function getBranding() {
  return serverApiFetch<{ logoKey?: string; logoUrl?: string; organizationId?: string; primaryColor?: string; accentColor?: string; hideLogo?: boolean }>(
    "/branding",
  );
}

function getLogoSrc(branding: { logoKey?: string; logoUrl?: string; organizationId?: string } | null) {
  if (!branding) return null;
  const API_URL = process.env.API_URL || "http://localhost:3001";
  if (branding.logoKey) return `${API_URL}/api/branding/logo/${branding.organizationId}?k=${encodeURIComponent(branding.logoKey)}`;
  if (branding.logoUrl) return branding.logoUrl;
  return null;
}

async function getSetupStatus() {
  return serverApiFetch<{ completed: boolean }>("/setup/status");
}

async function getTelemetryStatus(): Promise<boolean | null> {
  const settings = await serverApiFetch<{ telemetryEnabled?: boolean }>("/settings");
  return settings?.telemetryEnabled ?? null;
}

/** Brand colour used when the workspace has no custom branding. */
const DEFAULT_PRIMARY = "#5750f1";
/** Legacy Freelancey default stored in the DB — treated as "not customised". */
const LEGACY_DEFAULT_PRIMARY = "#006b68";

function resolvePrimaryColor(primaryColor?: string | null): string {
  if (primaryColor && primaryColor !== LEGACY_DEFAULT_PRIMARY) return primaryColor;
  return DEFAULT_PRIMARY;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, branding] = await Promise.all([getSession(), getBranding()]);

  if (!session) {
    redirect("/login");
  }

  const role = session.member.role;

  if (role === "member") {
    redirect("/portal");
  }

  let telemetryEnabled: boolean | null = null;
  const isHostedDeployment = process.env.NEXT_PUBLIC_SENTRY_ENABLED === "true";
  if (role === "owner") {
    const [setupStatus, telemetry] = await Promise.all([
      getSetupStatus(),
      isHostedDeployment ? Promise.resolve(true) : getTelemetryStatus(),
    ]);
    if (setupStatus && !setupStatus.completed) {
      redirect("/setup");
    }
    telemetryEnabled = telemetry;
  }

  const logoSrc = getLogoSrc(branding);
  const orgName = session.organization.name;
  const userName = session.user?.name || "User";
  const userEmail = session.user?.email || "";

  const primaryColor = resolvePrimaryColor(branding?.primaryColor);

  return (
    <div
      style={
        {
          // Single brand anchor: every brand-derived token follows it.
          "--primary": primaryColor,
          "--accent": branding?.accentColor ?? "#3c35d8",
        } as React.CSSProperties
      }
    >
      <DynamicFavicon href={logoSrc || "/icon.png"} />

      <AppShell
        orgName={orgName}
        userName={userName}
        userEmail={userEmail}
        logoSrc={logoSrc}
        hideLogo={branding?.hideLogo}
      >
        {role === "owner" && telemetryEnabled === null && (
          <TelemetryConsentBanner />
        )}
        {children}
      </AppShell>
    </div>
  );
}

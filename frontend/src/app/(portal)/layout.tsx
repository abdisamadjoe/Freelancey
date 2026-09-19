import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "./sign-out-button";
import { getSession } from "@/lib/auth";
import { serverApiFetch } from "@/lib/server-api";
import { NotificationBell } from "@/components/notification-bell";
import { DynamicFavicon } from "@/components/dynamic-favicon";
import { PreviewModeProvider } from "@/lib/preview-mode";
import { PreviewBanner } from "@/components/preview-banner";

async function getBranding() {
  return serverApiFetch<{ logoKey?: string; logoUrl?: string; organizationId?: string; primaryColor?: string; accentColor?: string; hideLogo?: boolean }>(
    "/branding",
  );
}

function getLogoSrc(branding: { logoKey?: string; logoUrl?: string; organizationId?: string } | null) {
  if (!branding) return null;
  const API_URL = process.env.API_URL || "http://localhost:3001";
  if (branding.logoKey) {
    return `${API_URL}/api/branding/logo/${branding.organizationId}?k=${encodeURIComponent(branding.logoKey)}`;
  }
  if (branding.logoUrl) {
    return branding.logoUrl;
  }
  return null;
}

/** Brand colour used when the workspace has no custom branding. */
const DEFAULT_PRIMARY = "#5750f1";
/** Legacy Freelancey default stored in the DB — treated as "not customised". */
const LEGACY_DEFAULT_PRIMARY = "#006b68";

function resolvePrimaryColor(primaryColor?: string | null): string {
  if (primaryColor && primaryColor !== LEGACY_DEFAULT_PRIMARY) return primaryColor;
  return DEFAULT_PRIMARY;
}

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, branding] = await Promise.all([getSession(), getBranding()]);
  if (!session) {
    redirect("/login");
  }

  const logoSrc = getLogoSrc(branding);
  const orgName = session.organization.name;
  const primaryColor = resolvePrimaryColor(branding?.primaryColor);

  return (
    <Suspense fallback={null}>
      <PreviewModeProvider>
        <div
          style={
            {
              "--primary": primaryColor,
              "--brand-500": primaryColor,
              "--accent": branding?.accentColor || "#ff6b5c",
            } as React.CSSProperties
          }
          className="flex min-h-[100dvh] flex-col bg-background-gray-secondary_alt_2"
        >
          <DynamicFavicon href={logoSrc || "/icon.png"} />
          <PreviewBanner />
          <header className="w-full border-b-[0.5px] border-card-border bg-card-surface-area">
            <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2 px-4 py-3 sm:px-6 lg:px-8">
              <Link
                href="/portal"
                className="flex min-w-0 items-center gap-2.5"
                aria-label={`${orgName || "Freelancey"} portal home`}
              >
                {!branding?.hideLogo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={logoSrc || "/icon.png"}
                    alt=""
                    className="size-7 shrink-0 rounded-md object-contain"
                  />
                ) : null}
                <span className="truncate text-sm leading-none font-semibold tracking-[-0.2px] text-text-primary">
                  {orgName || "Freelancey"}
                </span>
              </Link>

              <nav className="ml-auto flex items-center gap-1">
                <Link
                  href="/portal"
                  className="flex h-9 items-center rounded-lg px-3 text-sm font-medium text-text-tertiary transition-colors hover:bg-background-gray-secondary hover:text-text-primary"
                >
                  Projects
                </Link>
                <Link
                  href="/portal/settings"
                  className="flex h-9 items-center rounded-lg px-3 text-sm font-medium text-text-tertiary transition-colors hover:bg-background-gray-secondary hover:text-text-primary"
                >
                  Settings
                </Link>
              </nav>

              <div className="flex shrink-0 items-center gap-1.5">
                <NotificationBell />
                <SignOutButton />
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:pb-10">
            {children}
          </main>
        </div>
      </PreviewModeProvider>
    </Suspense>
  );
}

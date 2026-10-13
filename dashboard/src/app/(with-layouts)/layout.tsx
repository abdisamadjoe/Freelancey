import { DynamicFavicon } from "@/components/app/dynamic-favicon";
import { AppShell } from "@/components/common/app-shell";
import { getSession } from "@/lib/auth";
import { customPrimary, getLogoSrc, getOrgBranding } from "@/lib/org-branding";
import { SessionProvider } from "@/lib/session";
import { serverApiFetch } from "@/lib/server-api";
import { redirect } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";

export default async function WithLayout({ children }: { children: ReactNode }) {
  const [session, branding] = await Promise.all([getSession(), getOrgBranding()]);

  if (!session) {
    redirect("/login");
  }

  if (session.member.role === "owner") {
    const setup = await serverApiFetch<{ completed: boolean }>("/setup/status");
    if (setup && !setup.completed) {
      redirect("/setup");
    }
  }

  const primary = customPrimary(branding?.primaryColor);
  const logoSrc = getLogoSrc(branding);

  return (
    <div
      className="h-full"
      data-branded={primary ? "" : undefined}
      style={primary ? ({ "--primary": primary } as CSSProperties) : undefined}
    >
      <SessionProvider session={session}>
        <AppShell
          orgName={session.organization.name}
          userName={session.user?.name || "User"}
          userEmail={session.user?.email || ""}
          logoSrc={logoSrc}
          hideLogo={branding?.hideLogo}
        >
          <DynamicFavicon href={logoSrc || "/icon.png"} />
          {children}
        </AppShell>
      </SessionProvider>
    </div>
  );
}

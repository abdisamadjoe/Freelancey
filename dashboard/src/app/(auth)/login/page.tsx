import { buildBrandingStyle, getBrandingByDomain, getInstanceBranding } from "@/lib/branding";
import { customPrimary } from "@/lib/org-branding";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { LoginForm } from "./login-form";

async function resolveBranding() {
  const customHost = (await headers()).get("x-custom-host");
  return customHost ? getBrandingByDomain(customHost) : getInstanceBranding();
}

export async function generateMetadata(): Promise<Metadata> {
  const branding = await resolveBranding();
  if (!branding?.orgName) return {};
  return { title: `Sign in to ${branding.orgName}` };
}

export default async function LoginPage() {
  const branding = await resolveBranding();
  const primary = customPrimary(branding?.primaryColor);

  return (
    <div className="h-full" style={buildBrandingStyle(branding)} data-branded={primary ? "" : undefined}>
      <LoginForm orgName={branding?.orgName} logoSrc={branding?.logoSrc} hideLogo={branding?.hideLogo} />
    </div>
  );
}

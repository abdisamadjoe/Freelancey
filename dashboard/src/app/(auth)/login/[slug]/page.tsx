import { buildBrandingStyle, getBrandingBySlug } from "@/lib/branding";
import { customPrimary } from "@/lib/org-branding";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LoginForm } from "../login-form";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const branding = await getBrandingBySlug(slug).catch(() => null);
  if (!branding) return {};
  return { title: `Sign in to ${branding.orgName}` };
}

export default async function BrandedLoginPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const branding = await getBrandingBySlug(slug);

  if (!branding) notFound();

  const primary = customPrimary(branding.primaryColor);

  return (
    <div className="h-full" style={buildBrandingStyle(branding)} data-branded={primary ? "" : undefined}>
      <LoginForm orgName={branding.orgName} logoSrc={branding.logoSrc} hideLogo={branding.hideLogo} />
    </div>
  );
}

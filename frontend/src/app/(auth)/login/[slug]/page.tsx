import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBrandingBySlug, buildBrandingStyle, type BrandingData } from "@/lib/branding";
import { LoginForm } from "../login-form";

/**
 * `buildBrandingStyle` injects the org colours as `--primary` / `--accent`.
 * The design-system brand token (`bg-brand-500`, `text-brand-500`, …) is
 * declared on `:root` as `var(--primary)`, and custom-property substitution
 * happens where the variable is declared — so the alias has to be re-pointed
 * at the org colour here as well (the dashboard shell does the same).
 */
function brandedStyle(branding: BrandingData | null): React.CSSProperties {
  const primary = branding?.primaryColor;
  if (!primary) return buildBrandingStyle(branding);
  return {
    ...buildBrandingStyle(branding),
    "--brand-500": primary,
    "--brand-600": `color-mix(in srgb, ${primary}, #000 15%)`,
  } as React.CSSProperties;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const branding = await getBrandingBySlug(slug).catch(() => null);
  if (!branding) return {};
  return { title: `Sign in to ${branding.orgName}` };
}

export default async function BrandedLoginPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const branding = await getBrandingBySlug(slug);

  if (!branding) notFound();

  return (
    <div style={brandedStyle(branding)}>
      <LoginForm
        orgName={branding.orgName}
        logoSrc={branding.logoSrc}
        hideLogo={branding.hideLogo}
      />
    </div>
  );
}

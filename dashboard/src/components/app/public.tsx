"use client";

import ThemeToggle from "@/components/common/header/theme-toggle";
import type { CSSProperties, ReactNode } from "react";

/** Brand-token override for pages reached by a secret link (same mechanism as the branded login). */
export function brandStyle(primaryColor: string | null | undefined): { style?: CSSProperties; branded?: "" } {
  if (!primaryColor) return {};
  return {
    style: { "--primary": primaryColor } as CSSProperties,
    branded: "",
  };
}

/** Centred column on the app background for signed-out, link-based pages. */
export function PublicShell({
  primaryColor,
  children,
  wide,
}: {
  primaryColor?: string | null;
  children: ReactNode;
  wide?: boolean;
}) {
  const { style, branded } = brandStyle(primaryColor);
  return (
    <main style={style} data-branded={branded} className="h-full overflow-y-auto bg-background-gray-secondary_alt_2">
      <div className="relative mx-auto w-full px-4 py-10 sm:px-6" style={{ maxWidth: wide ? "56rem" : "42rem" }}>
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="space-y-5 pt-6">{children}</div>
      </div>
    </main>
  );
}

export function PublicHeader({
  logoUrl,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  logoUrl?: string | null;
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-2">
      {logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="mb-2 size-14 rounded-lg object-contain" />
      )}
      {eyebrow && <p className="text-sm text-text-tertiary">{eyebrow}</p>}
      <h1 className="text-[28px] leading-8 font-medium text-text-primary">{title}</h1>
      {subtitle && <p className="text-sm text-text-secondary">{subtitle}</p>}
      {children && <div className="flex flex-wrap items-center gap-2 pt-1">{children}</div>}
    </div>
  );
}

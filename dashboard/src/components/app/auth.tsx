"use client";

import { Card } from "@/components/tailgrids/core/card";
import { LogoWithText } from "@/utils/icon";
import { cn } from "@/utils/cn";
import Link from "next/link";
import type { ReactNode } from "react";

/** Centred card on the app background — shared by every signed-out page. */
export function AuthShell({
  children,
  wide,
  logoSrc,
  logoAlt,
  hideLogo,
}: {
  children: ReactNode;
  wide?: boolean;
  logoSrc?: string | null;
  logoAlt?: string;
  hideLogo?: boolean;
}) {
  return (
    <div className="h-full overflow-y-auto bg-background-gray-secondary_alt_2">
      <div className="flex min-h-full items-center justify-center p-4 sm:p-8">
        <div className={cn("w-full", wide ? "max-w-3xl" : "max-w-sm")}>
          {!hideLogo && (
            <div className="mb-6 flex justify-center text-text-primary">
              {logoSrc ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={logoSrc} alt={logoAlt || "Logo"} className="h-12 w-auto object-contain" />
              ) : (
                <LogoWithText />
              )}
            </div>
          )}
          <Card className="p-6 sm:p-7">{children}</Card>
        </div>
      </div>
    </div>
  );
}

export function AuthHeading({ title, description }: { title: ReactNode; description?: ReactNode }) {
  return (
    <div className="text-center">
      <h1 className="text-2xl leading-8 font-medium tracking-[-0.4px] text-text-primary">{title}</h1>
      {description && <p className="mt-2 text-sm leading-5 text-text-tertiary">{description}</p>}
    </div>
  );
}

export function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-sm font-medium text-neutral-brand-color hover:underline">
      {children}
    </Link>
  );
}

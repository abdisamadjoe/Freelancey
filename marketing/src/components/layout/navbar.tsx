import Link from "next/link";
import { BrandLogo } from "@/components/illustrations/logo";
import { Button } from "@/components/ui/button";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { navPrimary, portalUrl } from "@/lib/site";

export function Navbar() {
  return (
    <header className="sticky top-[-12px] z-10 tab:top-0">
      <nav aria-label="Main" className="flex flex-col items-center justify-center px-4 py-3 tab:px-6 tab:py-4">
        <div className="relative flex w-full items-center justify-between rounded-[16px] bg-surface p-[10px] backdrop-blur-[10px] after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:border after:border-[rgba(232,232,232,0.2)] after:content-[''] tab:rounded-[24px] tab:p-4">
          <div className="flex items-center gap-[25px] lg:gap-12">
            <Link href="/" aria-label="Gigly home" className="block h-10 shrink-0">
              <BrandLogo />
            </Link>
            <ul className="hidden items-center gap-6 tab:flex lg:gap-[30px]">
              {navPrimary.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="t-15-md block leading-6 text-ink transition-colors hover:text-primary">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden tab:block">
              <Button href={portalUrl} variant="dark" size="sm">
                Get started
              </Button>
            </div>
            <MobileMenu links={navPrimary} cta={{ label: "Get started", href: portalUrl }} />
          </div>
        </div>
      </nav>
    </header>
  );
}

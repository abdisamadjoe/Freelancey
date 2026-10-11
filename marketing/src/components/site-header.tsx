import Image from "next/image";
import Link from "next/link";
import { MenuIcon } from "./icons";
import { LinkButton } from "./link-button";
import { LOGIN_URL, SIGNUP_URL } from "@/lib/site";

const NAV = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
] as const;

const navLink =
  "rounded-lg px-3 py-2 text-sm text-ink-secondary transition-colors duration-200 hover:bg-surface-muted hover:text-ink";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Freelancey home" className="shrink-0">
          <Image src="/logo/freelancey.svg" alt="Freelancey" width={140} height={32} priority className="h-8 w-auto" />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={navLink}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <a href={LOGIN_URL} className={navLink}>
            Sign in
          </a>
          <LinkButton href={SIGNUP_URL}>Start free</LinkButton>
        </div>

        {/* Mobile: a native disclosure, so the menu works without any script. */}
        <details className="group relative md:hidden">
          <summary
            aria-label="Open menu"
            className="flex size-10 cursor-pointer items-center justify-center rounded-lg border border-line text-ink"
          >
            <MenuIcon width={20} height={20} />
          </summary>
          <div className="absolute right-0 mt-2 w-64 rounded-xl border border-line bg-white p-2 shadow-float">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className={`block py-3 ${navLink}`}>
                {item.label}
              </Link>
            ))}
            <a href={LOGIN_URL} className={`block py-3 ${navLink}`}>
              Sign in
            </a>
            <div className="p-2">
              <LinkButton href={SIGNUP_URL} className="w-full">
                Start free
              </LinkButton>
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}

import Image from "next/image";
import Link from "next/link";
import { LOGIN_URL, REPO_URL, SIGNUP_URL } from "@/lib/site";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/#how-it-works", label: "How it works" },
      { href: "/#features", label: "Features" },
      { href: "/#pricing", label: "Pricing" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
  {
    title: "Get started",
    links: [
      { href: SIGNUP_URL, label: "Create a free workspace" },
      { href: LOGIN_URL, label: "Sign in" },
    ],
  },
  {
    title: "Open source",
    links: [
      { href: REPO_URL, label: "Source on GitHub" },
      { href: `${REPO_URL}#readme`, label: "Read the docs" },
      { href: `${REPO_URL}/issues`, label: "Report an issue" },
    ],
  },
] as const;

const linkClass = "text-sm text-ink-secondary transition-colors duration-200 hover:text-ink";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface-subtle">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="max-w-xs">
          <Image src="/logo/freelancey.svg" alt="Freelancey" width={140} height={32} className="h-8 w-auto" />
          <p className="mt-4 text-sm leading-6 text-ink-secondary">
            Client management software for freelance web designers and developers.
          </p>
        </div>

        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="text-sm font-medium text-ink">{column.title}</h2>
            <ul className="mt-4 space-y-3">
              {column.links.map((link) => (
                <li key={link.label}>
                  {/^https?:\/\//.test(link.href) ? (
                    <a href={link.href} className={linkClass}>
                      {link.label}
                    </a>
                  ) : (
                    <Link href={link.href} className={linkClass}>
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-line">
        <p className="mx-auto w-full max-w-6xl px-4 py-6 text-sm text-ink-secondary sm:px-6">
          Freelancey is open source software released under the MIT License.
        </p>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { BrandLogo } from "@/components/illustrations/logo";
import { InView } from "@/components/ui/in-view";
import { Button } from "@/components/ui/button";
import { githubUrl, navPrimary } from "@/lib/site";

type FooterLink = { label: string; href: string; external?: boolean };

const columns: { title: string; links: FooterLink[] }[] = [
  { title: "Product", links: navPrimary },
  {
    title: "Open source",
    links: [
      { label: "Source code", href: githubUrl, external: true },
      { label: "Report an issue", href: `${githubUrl}/issues`, external: true },
      { label: "Releases", href: `${githubUrl}/releases`, external: true },
      { label: "MIT licence", href: `${githubUrl}/blob/main/LICENSE`, external: true },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy policy", href: "/privacy-policy" },
      { label: "Terms and conditions", href: "/terms-conditions" },
    ],
  },
];

const linkClass = "t-14 block py-1.5 text-white/65 transition-colors hover:text-white";

function GithubMark() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.16 1.18a10.9 10.9 0 0 1 5.76 0c2.2-1.49 3.16-1.18 3.16-1.18.62 1.59.23 2.76.11 3.05.74.8 1.18 1.82 1.18 3.08 0 4.42-2.7 5.4-5.27 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="relative isolate w-full overflow-hidden bg-dark text-white">
      <div
        aria-hidden
        className="absolute left-1/2 top-0 -z-10 h-[300px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-light/40 blur-[120px]"
      />
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-12 px-4 pb-8 pt-14 tab:px-6 lg:gap-16 lg:pt-20">
        <InView className="flex flex-col gap-12 lg:flex-row lg:justify-between lg:gap-16">
          <div className="flex max-w-[380px] flex-col items-start gap-5">
            <Link href="/" aria-label="Gigly home" className="block h-10 w-[170px] shrink-0 [&_*]:!fill-white [&_*]:!text-white">
              <BrandLogo />
            </Link>
            <p className="t-14 !leading-[22px] text-white/65">
              Open-source client and project management for freelancers. Leads, proposals, contracts, projects, files
              and invoices in one app you own.
            </p>
            <Button href={githubUrl} variant="light" size="sm" icon={<GithubMark />}>
              Star on GitHub
            </Button>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-8 gap-y-10 tab:grid-cols-3 lg:gap-x-16">
            {columns.map((c) => (
              <div key={c.title} className="flex flex-col gap-3">
                <p className="t-geist-13 uppercase tracking-[0.08em] text-white/45">{c.title}</p>
                <ul className="flex flex-col">
                  {c.links.map((l) => (
                    <li key={l.label}>
                      {l.external ? (
                        <a href={l.href} target="_blank" rel="noreferrer" className={linkClass}>
                          {l.label}
                        </a>
                      ) : (
                        <Link href={l.href} className={linkClass}>
                          {l.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </InView>

        <InView delay={120} className="select-none overflow-hidden">
          <span className="block text-center font-[family-name:var(--font-geist)] text-[19vw] font-semibold leading-[0.8] tracking-[-0.06em] text-white/[0.06] min-[1200px]:text-[220px]">
            Gigly
          </span>
        </InView>

        <div className="flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 tab:flex-row tab:items-center">
          <p className="t-14 text-white/55">© {new Date().getFullYear()} Gigly. Released under the MIT licence.</p>
          <a
            href={githubUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Gigly on GitHub"
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/65 transition-colors hover:bg-white/10 hover:text-white"
          >
            <GithubMark />
          </a>
        </div>
      </div>
    </footer>
  );
}

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { InView, Words } from "@/components/ui/in-view";
import { HeroShowcase } from "@/components/home/hero-showcase";

function ArrowUpRight() {
  return (
    <span className="flex h-4 w-4 items-center justify-center" aria-hidden>
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="#0b0c2b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 10L10 1M2.5 1H10v7.5" />
      </svg>
    </span>
  );
}

export function Hero() {
  return (
    <section className="relative flex items-center justify-center overflow-clip">
      <div className="relative flex grow flex-col items-center justify-center gap-[60px] rounded-[24px] bg-white py-[50px] md:py-[60px] lg:pb-20">
        <div className="z-[6] flex flex-col items-center justify-center gap-5 px-2 md:gap-6 md:px-0 lg:w-[856px] md:w-[590px] w-full">
          <Link
            href="https://github.com/GroundworkTechnologies/Gigly/releases"
            className="t-15-md relative flex items-center gap-3 rounded-[10px] bg-white px-4 py-[7px] text-ink shadow-pill after:pointer-events-none after:absolute after:inset-0 after:rounded-[10px] after:border after:border-line after:content-['']"
          >
            Version 1.0 out now
            <svg width="14" height="14" viewBox="0 0 11 11" fill="none" stroke="#064E3B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M1 10L10 1M2.5 1H10v7.5" />
            </svg>
          </Link>
          <InView as="h1" mode="words" className="t-h1 text-center text-ink">
            <Words text="Win Clients and" />
            <br />
            <Words text="Deliver Projects Faster" />
          </InView>
          <InView as="p" mode="words" className="t-body w-full max-w-[490px] text-center text-body">
            <Words text="Gigly is open-source client and project management for freelancers. Leads, proposals, contracts, projects, files and invoices, all in one app you own." />
          </InView>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Button href="https://github.com/GroundworkTechnologies/Gigly" variant="primary" icon={<ArrowUpRight />}>
              View on GitHub
            </Button>
            <Button href="#workflow" variant="light">
              See how it works
            </Button>
          </div>
        </div>
        <HeroShowcase
          className="relative z-[3] flex w-full items-center justify-center overflow-clip rounded-[16px] bg-[radial-gradient(96.4534%_96.4534%_at_50%_3.54659%,rgba(255,255,255,0.4)_0%,transparent_100%)] p-[10px] shadow-[0_271px_76px_0_transparent,0_11px_24px_0_rgba(0,0,0,0.05),0_98px_59px_0_rgba(0,0,0,0.03),0_43px_43px_0_rgba(0,0,0,0.04),0_174px_69px_0_rgba(0,0,0,0.01)] md:w-[90%] md:rounded-[24px] md:p-3 lg:rounded-[32px] lg:p-4"
        >
          <div className="relative min-w-0 grow overflow-hidden rounded-[6px] md:rounded-[12px] lg:rounded-[16px]">
            <Image
              src="/images/dashboard-overview-v2.png"
              alt="Gigly dashboard overview with project, receivables and lead pipeline summaries"
              width={2160}
              height={1350}
              priority
              sizes="(min-width: 1200px) 1040px, 90vw"
              className="h-auto w-full rounded-[inherit]"
            />
          </div>
        </HeroShowcase>
        <div className="absolute bottom-0 left-4 right-4 top-[30%] z-[2] overflow-hidden rounded-[24px] tab:left-6 tab:right-6 md:top-0">
          <Image src="/images/hero-bg.png" alt="" fill priority sizes="100vw" className="object-cover [filter:url(#brand-green)]" />
        </div>
      </div>
    </section>
  );
}

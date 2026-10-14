import { InView } from "@/components/ui/in-view";
import { Button } from "@/components/ui/button";
import { githubUrl } from "@/lib/site";

/** Full-bleed closing banner: breaks out of the 1200px page container to span the viewport. */
export function FinalCta() {
  return (
    <section className="relative isolate w-screen overflow-hidden bg-[linear-gradient(135deg,#0B6B52_0%,#064E3B_45%,#032A20_100%)] [margin-inline:calc(50%-50vw)]">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-40 [background-image:radial-gradient(rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(70%_80%_at_50%_40%,#000_0%,transparent_100%)]"
      />
      <div
        aria-hidden
        className="absolute left-1/2 top-0 -z-10 h-[160px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-soft/30 blur-[120px]"
      />
      <div className="mx-auto flex w-full max-w-[1200px] flex-col items-start gap-6 px-4 py-10 tab:px-6 tab:py-12 lg:py-[58px] lg:flex-row lg:items-center lg:justify-between lg:gap-12">
        <InView className="flex w-full max-w-[640px] flex-col gap-2">
          <h2 className="t-h3 text-white">Run your freelance business<br className="hidden tab:block" /> on software you own</h2>
          <p className="t-body text-white/80">
            Open source, MIT licensed and free to self-host. Your clients and data stay yours.
          </p>
        </InView>
        <InView delay={150} className="flex shrink-0 flex-wrap items-center gap-3">
          <Button href={githubUrl} variant="light" size="sm">
            Get the code
          </Button>
          <Button href={`${githubUrl}/issues`} variant="outline" size="sm" className="!bg-white/10 !text-white after:!border-white/30">
            Ask a question
          </Button>
        </InView>
      </div>
    </section>
  );
}

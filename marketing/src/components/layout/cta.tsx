import Image from "next/image";
import { Button } from "@/components/ui/button";
import { githubUrl } from "@/lib/site";

export function Cta() {
  return (
    <section className="relative flex flex-col items-center justify-center">
      <div className="relative z-[6] flex w-full flex-col items-center justify-center">
        <div className="relative flex w-full flex-col items-center justify-center overflow-hidden px-4 pb-[60px] pt-[60px] lg:pb-[130px] lg:pt-28">
          <div className="absolute inset-0 z-0">
            <Image src="/images/cta-bg.png" alt="" fill sizes="100vw" className="object-cover [filter:url(#brand-green)]" />
          </div>
          <div className="relative z-[1] flex max-w-[803px] flex-col items-center gap-9 text-center">
            <h2 className="t-h2 !font-semibold text-white">Start running your client work from one place.</h2>
            <p className="t-lead max-w-[566px] text-white">
              Self-host Gigly for free or ask for a hosted setup. Either way, your clients, projects and data stay yours.
            </p>
            <Button href={githubUrl} variant="light">
              Get started
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

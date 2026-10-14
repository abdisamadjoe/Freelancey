import { InView } from "@/components/ui/in-view";
import { stackIcons } from "@/lib/stack-icons";

const stack = ["Next.js", "NestJS", "PostgreSQL", "Prisma", "Better Auth", "Cloudflare R2", "Stripe", "Resend", "Tailwind CSS", "TypeScript"];

function Row({ hidden }: { hidden?: boolean }) {
  return (
    <ul aria-hidden={hidden} className="flex shrink-0 items-center gap-10 pr-10 tab:gap-14 tab:pr-14 lg:gap-[72px] lg:pr-[72px]">
      {stack.map((s) => (
        <li key={s} className="flex shrink-0 items-center gap-3 font-[family-name:var(--font-geist)] text-[22px] font-medium leading-[34px] tracking-[-0.5px] text-ink/70">
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            className="h-7 w-7 shrink-0"
            dangerouslySetInnerHTML={{ __html: stackIcons[s] }}
          />
          {s}
        </li>
      ))}
    </ul>
  );
}

export function LogoMarquee() {
  return (
    <section className="relative flex flex-col items-center justify-center px-4 py-[62px] tab:gap-20 tab:px-6 tab:py-[72px] lg:py-[130px]">
      <div className="flex w-full flex-col items-center justify-center gap-[30px] overflow-x-clip">
        <InView as="p" className="t-body-md text-center text-ink">Built on open tools you can host and inspect yourself</InView>
        <InView delay={120} className="marquee w-full overflow-hidden p-[10px] [mask-image:linear-gradient(to_right,transparent_5.5%,#000_12.5%,#000_87.5%,transparent_94.5%)] tab:[mask-image:linear-gradient(to_right,transparent_3.5%,#000_12.5%,#000_87.5%,transparent_96.5%)] lg:[mask-image:linear-gradient(to_right,transparent_3%,#000_14%,#000_86%,transparent_97%)]">
          <div className="marquee-track flex w-max items-center">
            <Row />
            <Row hidden />
          </div>
        </InView>
      </div>
    </section>
  );
}

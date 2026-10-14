import { InView } from "@/components/ui/in-view";
import { SectionBadge, SectionTitle } from "@/components/ui/section-badge";
import { BadgeIconFeatures } from "@/components/illustrations/badges/features";
import { CoreIcon0 } from "@/components/illustrations/core/icon-0";
import { CoreIcon1 } from "@/components/illustrations/core/icon-1";
import { CoreIcon2 } from "@/components/illustrations/core/icon-2";
import { CoreIcon3 } from "@/components/illustrations/core/icon-3";
import { CoreIcon4 } from "@/components/illustrations/core/icon-4";
import { CoreIcon5 } from "@/components/illustrations/core/icon-5";

const features = [
  {
    Icon: CoreIcon0,
    title: "Lead pipeline",
    text: "Add leads manually, from your contact form, by referral or CSV import, and track them on a board by status.",
  },
  {
    Icon: CoreIcon1,
    title: "Projects and milestones",
    text: "Break each project into milestones and tasks with customizable status pipelines, so progress is always visible.",
  },
  {
    Icon: CoreIcon2,
    title: "Proposals and contracts",
    text: "Write proposals and contracts inside Freelancey. Clients accept and sign from a private link.",
  },
  {
    Icon: CoreIcon3,
    title: "Private client links",
    text: "Onboarding, briefs, reviews and handovers open from tokenized links. Clients never need an account.",
  },
  {
    Icon: CoreIcon4,
    title: "Notifications",
    text: "Get push and email alerts when a client responds, approves a deliverable or sends a support request.",
  },
  {
    Icon: CoreIcon5,
    title: "White-label branding",
    text: "Use your logo, colors and custom domain so clients see your business, not a third party tool.",
  },
];

export function CoreFeatures() {
  return (
    <section id="features" className="scroll-mt-24 relative flex flex-col items-center justify-center px-4 pb-[60px] tab:px-6 tab:pb-20 lg:pb-[130px]">
      <InView className="scale-in relative flex w-full flex-col items-center justify-center" mode="scale">
        <div className="absolute inset-x-0 inset-y-0 z-[1] overflow-clip rounded-[24px] bg-dark" />
        <div className="relative z-[1] flex w-full flex-col items-center justify-center gap-9 px-4 py-[60px] tab:gap-12 tab:px-6 tab:py-20 lg:gap-20 lg:px-20 lg:py-[130px]">
          <SectionTitle
            dark
            className="w-full max-w-[460px] lg:max-w-[460px] [&_p]:opacity-80"
            badge={
              <SectionBadge dark icon={<BadgeIconFeatures />}>
                Key features
              </SectionBadge>
            }
            title="Core features that run your client work"
            text="Freelancey brings the tools a freelance business uses every day into one self-hosted platform you control."
          />
          <div className="z-[1] grid w-full grid-cols-12 gap-x-4 gap-y-4 tab:gap-x-6 tab:gap-y-6">
            {features.map((f, i) => (
              <InView
                key={f.title}
                as="div"
                delay={(i % 3) * 90}
                className="col-span-12 flex tab:col-span-6 tab:min-h-[324px] lg:col-span-4 lg:[&:nth-child(n+4)]:min-h-[353px]"
              >
              <article
                className="group relative flex w-full flex-col items-start gap-7 overflow-hidden rounded-[16px] bg-[rgba(25,26,28,0.2)] px-4 py-7 transition-[background-color,transform] duration-500 ease-out after:pointer-events-none after:absolute after:inset-0 after:rounded-[16px] after:border after:border-[#363536] after:transition-colors after:duration-500 after:content-[''] hover:-translate-y-1 hover:bg-[rgba(255,255,255,0.04)] hover:after:border-primary-soft/60 tab:p-9"
              >
                <div className="h-[62px] w-[62px] text-white">
                  <div className="h-[49.6px] w-[49.6px] origin-top-left scale-125">
                    <f.Icon />
                  </div>
                </div>
                <div className="flex w-full flex-col items-start justify-center gap-4">
                  <h3 className="t-h5 !text-[20px] !leading-[30px] text-white">{f.title}</h3>
                  <p className="t-15 text-white/80">{f.text}</p>
                </div>
              </article>
              </InView>
            ))}
          </div>
        </div>
      </InView>
    </section>
  );
}

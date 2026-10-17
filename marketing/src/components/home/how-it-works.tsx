import { InView } from "@/components/ui/in-view";
import { SectionBadge, SectionTitle } from "@/components/ui/section-badge";
import { LeadBoardMock, ProjectTasksMock, HandoverMock } from "@/components/mocks";
import { BadgeIconProcess } from "@/components/illustrations/badges/process";

const steps = [
  {
    mock: <LeadBoardMock />,
    title: "Capture the lead",
    text: "Add a lead from any source and move it from contacted to qualified.",
  },
  {
    mock: <ProjectTasksMock />,
    title: "Agree and deliver",
    text: "Send the proposal and contract, then run the project with milestones and tasks.",
  },
  {
    mock: <HandoverMock />,
    title: "Hand over and support",
    text: "Deliver the files, transfer access and keep supporting through a request form.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 relative flex flex-col items-center justify-center px-4 py-[60px] tab:px-6 tab:pb-20 tab:pt-0 lg:pb-[130px]">
      <div className="flex w-full flex-col items-center justify-center gap-[42px] overflow-x-clip tab:gap-12 lg:gap-20">
        <InView className="w-full max-w-[515px]">
          <SectionTitle
            badge={
              <SectionBadge icon={<BadgeIconProcess />} pillClassName="bg-surface-2">
                How it works
              </SectionBadge>
            }
            title="A simpler way to run client work"
            text="Three steps cover most projects. Gigly keeps the details in one place from the first message to the last file."
          />
        </InView>
        <div className="hidden h-[45px] lg:block" aria-hidden />
        <div className="grid w-full grid-cols-12 gap-x-4 gap-y-[42px] tab:gap-x-6 lg:-mt-20">
          {steps.map((s, i) => (
            <InView key={s.title} delay={i * 120} className="col-span-12 flex tab:col-span-4">
            <article className="flex w-full flex-col items-center justify-center gap-3 overflow-clip tab:gap-6 lg:gap-9">
              <div className="w-full">
                <div className="flex min-h-[250px] w-full items-center justify-center rounded-[12px] bg-[linear-gradient(#ECF6F2_0%,transparent_100%)] p-4 tab:min-h-[218px] lg:min-h-[353px] lg:rounded-[16px] lg:p-6">
                  {s.mock}
                </div>
              </div>
              <div className="flex w-full flex-col items-start gap-2 pr-4">
                <h3 className="t-h5">{s.title}</h3>
                <p className="t-14 !leading-[21px] text-body">{s.text}</p>
              </div>
            </article>
            </InView>
          ))}
        </div>
      </div>
    </section>
  );
}

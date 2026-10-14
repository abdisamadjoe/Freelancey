"use client";

import Image from "next/image";
import { useState } from "react";
import { InView } from "@/components/ui/in-view";
import { SectionBadge, SectionTitle } from "@/components/ui/section-badge";
import { BadgeIconGrowth } from "@/components/illustrations/badges/growth";
import { InvoiceMock, LeadBoardMock, ProjectTasksMock, ProposalMock } from "@/components/mocks";
import { cn } from "@/lib/cn";

const tabs = [
  {
    label: "Leads",
    sub: "Capture and qualify",
    title: "Capture and qualify leads",
    text: "Add leads by hand, from your contact form, a referral or a CSV import. Every source lands in one list with a board view by status.",
    panel: (
      <div className="grid gap-3 tab:grid-cols-2">
        <LeadBoardMock />
        <ProposalMock />
      </div>
    ),
  },
  {
    label: "Projects",
    sub: "Plan and deliver",
    title: "Plan and deliver the work",
    text: "Turn a signed contract into a project with milestones, tasks and files, then share progress with the client in their portal.",
    panel: (
      <div className="grid gap-3 tab:grid-cols-2">
        <ProjectTasksMock />
        <InvoiceMock />
      </div>
    ),
  },
  {
    label: "Handover",
    sub: "Finish and support",
    title: "Finish clean and keep supporting",
    text: "Deliver files, transfer access and give clients a support form tied to their project, so the work stays organised after launch.",
    panel: (
      <div className="grid gap-3 tab:grid-cols-2">
        <ProjectTasksMock />
        <ProposalMock />
      </div>
    ),
  },
];

export function GrowthStack() {
  const [active, setActive] = useState(0);
  const tab = tabs[active];
  return (
    <section id="workflow" className="scroll-mt-24 relative flex flex-col items-center justify-center bg-white px-4 pb-12 pt-[60px] tab:px-6 tab:pt-20 lg:pt-[130px]">
      <div className="flex w-full flex-col items-center justify-center gap-[42px] overflow-clip tab:gap-12 lg:gap-20">
        <InView className="w-full max-w-[574px]">
          <SectionTitle
            badge={
              <SectionBadge icon={<BadgeIconGrowth />} pillClassName="bg-surface-2">
                From lead to handover
              </SectionBadge>
            }
            title="One workflow, start to finish"
            text="Each stage hands its details to the next, so you spend your time on the work instead of retyping it."
          />
        </InView>

        <div className="relative flex w-full flex-col items-center justify-center overflow-clip pt-6 tab:pt-10 lg:pt-[60px]">
          <div className="absolute left-0 right-0 top-0 h-[296px] overflow-clip rounded-[16px] tab:h-[386px] lg:h-[554px] lg:rounded-[24px]">
            <div className="relative h-full w-full [mask-image:linear-gradient(#000_40%,transparent_80%)]">
              <Image src="/images/growth-stack-dashboard.png" alt="" fill sizes="1152px" className="object-cover [filter:url(#brand-green)]" />
            </div>
          </div>
          <div className="relative flex w-full flex-col items-center gap-4 tab:gap-[30px]">
            <div
              role="tablist"
              aria-label="Workflow stages"
              className="relative z-[1] grid w-[94%] grid-cols-3 overflow-hidden rounded-[14px] bg-surface-2 shadow-[0_0_0_1px_rgba(11,12,43,0.08),0_1px_2px_rgba(11,12,43,0.04)] backdrop-blur-[10px] tab:w-[68%] tab:rounded-[16px]"
            >
              {tabs.map((t, i) => {
                const on = i === active;
                return (
                  <button
                    key={t.label}
                    role="tab"
                    type="button"
                    aria-selected={on}
                    onClick={() => setActive(i)}
                    className={cn(
                      "relative flex flex-col items-start gap-1 px-3 py-3 text-left outline-none transition-colors duration-200 focus-visible:z-[1] focus-visible:ring-2 focus-visible:ring-primary/40 tab:gap-1.5 tab:px-5 tab:py-4",
                      i > 0 && "border-l border-ink/[0.08]",
                      on ? "bg-white" : "hover:bg-white/60",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className={cn(
                          "h-1.5 w-1.5 rounded-full transition-colors duration-200",
                          on ? "bg-primary" : "bg-ink/20",
                        )}
                      />
                      <span
                        className={cn(
                          "font-mono text-[12px] leading-none tracking-[0.02em] tabular-nums transition-colors duration-200",
                          on ? "text-primary" : "text-muted",
                        )}
                      >
                        0{i + 1}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "t-15-sb tracking-[-0.2px] transition-colors duration-200",
                        on ? "text-ink" : "text-ink/60",
                      )}
                    >
                      {t.label}
                    </span>
                    <span className="t-14 hidden !leading-[20px] text-body tab:block">{t.sub}</span>
                  </button>
                );
              })}
            </div>
            <div
              role="tabpanel"
              className="w-[94%] overflow-clip rounded-[12px] bg-[linear-gradient(rgba(255,255,255,0.8)_0%,#d8d8df_100%)] p-[6px] backdrop-blur-[8px] tab:w-[68%] tab:rounded-[24px] tab:p-[10px]"
            >
              <div className="flex flex-col gap-4 rounded-[6px] bg-surface-2 p-4 tab:gap-6 tab:rounded-[14px] tab:p-8">
                <div className="flex flex-col gap-2">
                  <h3 className="t-h4 text-ink">{tab.title}</h3>
                  <p className="t-body text-body">{tab.text}</p>
                </div>
                {tab.panel}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

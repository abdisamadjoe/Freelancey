"use client";

import { useState } from "react";
import { InView } from "@/components/ui/in-view";
import { SectionBadge } from "@/components/ui/section-badge";
import { BadgeIconFaq } from "@/components/illustrations/badges/faq";
import { cn } from "@/lib/cn";
import { faqs } from "@/components/home/faq-data";

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="scroll-mt-24 relative flex flex-col items-center justify-center px-4 py-[60px] tab:px-6 tab:py-20 lg:py-[130px]">
      <div className="grid w-full grid-cols-12 items-center gap-x-4 gap-y-6 overflow-x-clip tab:gap-x-6">
        <div className="col-span-12 flex w-full flex-col items-start gap-[42px] lg:col-span-6 lg:gap-[46px]">
          <InView className="flex w-full flex-col items-start gap-4">
            <SectionBadge icon={<BadgeIconFaq />} pillClassName="bg-surface-2">
              FAQs
            </SectionBadge>
            <h2 className="t-h2 text-ink">Got Questions?</h2>
            <p className="t-body text-body">
              Answers about how Gigly works, who it is for and how to run it yourself.
            </p>
          </InView>
          <InView delay={150} className="relative flex min-h-[395px] w-full flex-col justify-end overflow-hidden rounded-[16px] bg-dark p-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(6, 78, 59, 0.45),transparent_60%)]" />
            <div className="relative z-[1] flex max-w-[380px] flex-col items-start gap-4">
              <p className="t-14-md !leading-[23.1px] text-white">
                Still have questions or need help setting up? Ask on GitHub and we will help you get
                running.
              </p>
              <a href="https://github.com/GroundworkTechnologies/Gigly/issues" target="_blank" rel="noreferrer" className="t-body-md group flex min-h-11 items-center gap-[10px] !font-medium text-white">
                Ask on GitHub
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                  <path d="M1 10L10 1M2.5 1H10v7.5" />
                </svg>
              </a>
            </div>
          </InView>
        </div>
        <div className="col-span-12 flex w-full flex-col gap-2 lg:col-span-6">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <InView key={f.q} delay={i * 70}>
              <div
                className={cn(
                  "relative rounded-[12px] after:pointer-events-none after:absolute after:inset-0 after:rounded-[12px] after:border after:border-line after:content-['']",
                  isOpen ? "bg-surface" : "bg-white",
                )}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-[10px] p-4 text-left tab:px-8 tab:py-6"
                >
                  <span className="t-body-md !text-[16px] !leading-[26.4px] text-ink tab:!text-[18px] tab:!leading-[29.7px]">
                    {f.q}
                  </span>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#0b0c2b"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={cn("shrink-0 transition-transform duration-300", isOpen ? "rotate-180" : "")}
                    aria-hidden
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                <div
                  className={cn(
                    "grid transition-[grid-template-rows] duration-300 ease-out",
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="t-body px-4 pb-4 text-body tab:px-8 tab:pb-6">{f.a}</p>
                  </div>
                </div>
              </div>
              </InView>
            );
          })}
        </div>
      </div>
    </section>
  );
}

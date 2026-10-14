import { InView } from "@/components/ui/in-view";
import { SectionTitle } from "@/components/ui/section-badge";

export type LegalSection = { heading: string; paragraphs: string[] };

export function LegalPage({
  title,
  intro,
  updated,
  sections,
}: {
  title: string;
  intro: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <section className="relative flex flex-col items-center justify-center bg-surface px-4 py-[60px] after:pointer-events-none after:absolute after:inset-0 after:border after:border-line after:content-[''] tab:px-6 tab:py-20 tab:after:hidden lg:py-[130px]">
      <div className="flex w-full flex-col items-center justify-center gap-[42px] tab:gap-12 lg:gap-20">
        <InView className="w-full max-w-[575px]">
          <SectionTitle
            badge={null}
            title={title}
            text={intro}
          />
        </InView>
        <InView delay={120} className="flex w-full max-w-[1000px] flex-col gap-6">
          <article className="flex flex-col gap-8 rounded-[16px] bg-white p-5 shadow-ring-lavender tab:gap-10 tab:p-10">
            <p className="t-14-md text-primary">Last updated {updated}</p>
            {sections.map((s) => (
              <div key={s.heading} className="flex flex-col gap-3">
                <h2 className="t-h4 text-ink">{s.heading}</h2>
                {s.paragraphs.map((p) => (
                  <p key={p} className="t-body text-body">
                    {p}
                  </p>
                ))}
              </div>
            ))}
          </article>
        </InView>
      </div>
    </section>
  );
}

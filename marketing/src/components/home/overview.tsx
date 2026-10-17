import { InView } from "@/components/ui/in-view";
import { SectionBadge, SectionTitle } from "@/components/ui/section-badge";
import { BadgeIconMeet } from "@/components/illustrations/badges/meet";
import { LeadBoardMock, ProjectTasksMock, PortalMock } from "@/components/mocks";

const cardBg = "bg-[linear-gradient(#ECF6F2_0%,transparent_100%)]";

const cards = [
  {
    eyebrow: "Win the work",
    title: "Leads to clients",
    text: "Capture leads from any source, move them across a board, and turn a signed contract into an active client.",
    Mock: LeadBoardMock,
  },
  {
    eyebrow: "Deliver the work",
    title: "Projects, milestones and tasks",
    text: "Break work into milestones and tasks, track status, and keep every project moving.",
    Mock: ProjectTasksMock,
  },
  {
    eyebrow: "Keep clients in the loop",
    title: "A portal your clients can use",
    text: "Clients review progress, approve deliverables and pay invoices in a branded portal, with no back and forth over email.",
    Mock: PortalMock,
  },
];

export function Overview() {
  return (
    <section className="relative flex flex-col items-center justify-center bg-surface px-4 py-[60px] after:pointer-events-none after:absolute after:inset-0 after:border after:border-line after:content-[''] tab:px-6 tab:py-20 tab:after:hidden lg:py-[130px]">
      <div className="flex w-full flex-col items-center justify-center gap-[42px] tab:gap-12 lg:gap-16">
        <InView className="w-full max-w-[575px]">
          <SectionTitle
            badge={<SectionBadge icon={<BadgeIconMeet />}>What you get</SectionBadge>}
            title="Everything a freelance business runs on"
            text="Gigly follows you from the first lead to the final handover, so clients, projects and payments live in one place instead of across drives, spreadsheets and inboxes."
          />
        </InView>

        <div className="grid w-full grid-cols-1 gap-4 tab:grid-cols-2 tab:gap-6 lg:grid-cols-3">
          {cards.map((c, i) => (
            <InView
              key={c.title}
              delay={i * 90}
              className={`flex ${i === cards.length - 1 ? "tab:col-span-2 lg:col-span-1" : ""}`}
            >
              <article
                className={`relative flex w-full flex-col overflow-hidden rounded-[16px] ${cardBg} transition-transform duration-500 ease-out hover:-translate-y-1`}
              >
                <div className="flex flex-col gap-3 p-5 tab:p-6">
                  <span className="t-geist-13 uppercase tracking-[0.08em] text-primary">{c.eyebrow}</span>
                  <h3 className="t-h4 text-ink">{c.title}</h3>
                  <p className="t-15 text-body">{c.text}</p>
                </div>
                <div className="relative mt-auto h-[230px] overflow-hidden px-3 tab:h-[240px] tab:px-4 [mask-image:linear-gradient(to_bottom,#000_45%,transparent_100%)]">
                  <c.Mock />
                </div>
              </article>
            </InView>
          ))}
        </div>
      </div>
    </section>
  );
}

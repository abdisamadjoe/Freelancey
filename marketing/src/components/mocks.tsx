import { cn } from "@/lib/cn";

/**
 * Small product mock-ups drawn in code. They show the shape of Freelancey screens
 * with sample labels only (no customer data).
 */

function Chip({ children, tone = "blue" }: { children: string; tone?: "blue" | "green" | "gray" | "amber" }) {
  const tones = {
    blue: "bg-primary/10 text-primary",
    green: "bg-success/20 text-[#1f7a43]",
    gray: "bg-[#f1f2f4] text-muted",
    amber: "bg-[#fff3d6] text-[#8a5a00]",
  };
  return <span className={cn("whitespace-nowrap rounded-full px-2 py-[2px] text-[11px] font-medium leading-4", tones[tone])}>{children}</span>;
}

function Frame({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("w-full overflow-hidden rounded-[12px] bg-white p-4 text-left shadow-[0_1px_2px_rgba(11,12,43,0.06)]", className)}>
      <p className="mb-3 font-[family-name:var(--font-geist)] text-[14px] font-medium leading-5 text-ink">{title}</p>
      {children}
    </div>
  );
}

export function LeadBoardMock({ className }: { className?: string }) {
  const cols = [
    { name: "Contacted", items: ["Studio Mwangi", "Fresh Bites"] },
    { name: "Proposal", items: ["Green Roots"] },
  ];
  return (
    <Frame title="Lead board" className={className}>
      <div className="grid grid-cols-2 gap-2">
        {cols.map((c) => (
          <div key={c.name} className="rounded-[8px] bg-surface-2 p-2">
            <p className="mb-2 text-[11px] font-medium leading-4 text-muted">{c.name}</p>
            <div className="flex flex-col gap-2">
              {c.items.map((i) => (
                <div key={i} className="rounded-[6px] bg-white p-2 text-[12px] font-medium leading-4 text-ink shadow-[0_0_0_1px_#eee]">
                  {i}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function ProposalMock({ className }: { className?: string }) {
  return (
    <Frame title="Website redesign proposal" className={className}>
      <div className="flex flex-col gap-2">
        {["Scope and deliverables", "Timeline", "Investment"].map((r) => (
          <div key={r} className="flex items-center justify-between rounded-[6px] bg-surface-2 px-3 py-2 text-[12px] leading-4 text-ink">
            {r}
            <span className="h-1.5 w-12 rounded-full bg-primary/30" />
          </div>
        ))}
        <div className="mt-1 flex items-center justify-between">
          <Chip tone="amber">Waiting for client</Chip>
          <span className="rounded-[6px] bg-primary px-3 py-1 text-[12px] font-medium leading-4 text-white">Accept proposal</span>
        </div>
      </div>
    </Frame>
  );
}

export function ProjectTasksMock({ className }: { className?: string }) {
  const tasks = [
    { t: "Collect brand assets", s: "Done", tone: "green" as const },
    { t: "Design homepage", s: "In progress", tone: "blue" as const },
    { t: "Build contact form", s: "To do", tone: "gray" as const },
  ];
  return (
    <Frame title="Milestone 1: Design" className={className}>
      <div className="flex flex-col gap-2">
        {tasks.map((x) => (
          <div key={x.t} className="flex items-center justify-between rounded-[6px] bg-surface-2 px-3 py-2">
            <span className="text-[12px] leading-4 text-ink">{x.t}</span>
            <Chip tone={x.tone}>{x.s}</Chip>
          </div>
        ))}
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#eceef2]">
          <div className="h-full w-1/3 rounded-full bg-primary" />
        </div>
      </div>
    </Frame>
  );
}

export function InvoiceMock({ className }: { className?: string }) {
  return (
    <Frame title="Invoice INV-0012" className={className}>
      <div className="flex flex-col gap-2 text-[12px] leading-4 text-ink">
        <div className="flex justify-between"><span>Design milestone</span><span>Sent</span></div>
        <div className="flex justify-between text-muted"><span>Due in 14 days</span><Chip tone="amber">Unpaid</Chip></div>
        <span className="mt-1 rounded-[6px] bg-primary px-3 py-1.5 text-center font-medium text-white">Pay invoice</span>
      </div>
    </Frame>
  );
}

export function PortalMock({ className }: { className?: string }) {
  return (
    <Frame title="Your project portal" className={className}>
      <div className="grid grid-cols-2 gap-2 text-[12px] leading-4">
        {[
          ["Progress", "Milestone 2 of 4"],
          ["Needs you", "Approve homepage"],
          ["Files", "6 deliverables"],
          ["Invoices", "1 awaiting payment"],
        ].map(([a, b]) => (
          <div key={a} className="rounded-[8px] bg-surface-2 p-3">
            <p className="text-muted">{a}</p>
            <p className="mt-1 font-medium text-ink">{b}</p>
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function FilesMock({ className }: { className?: string }) {
  return (
    <Frame title="Deliverables" className={className}>
      <div className="flex flex-col gap-2">
        {[
          ["homepage-final.fig", "Approved", "green" as const],
          ["brand-guidelines.pdf", "In review", "amber" as const],
          ["site-export.zip", "Delivered", "blue" as const],
        ].map(([n, s, t]) => (
          <div key={n as string} className="flex items-center justify-between rounded-[6px] bg-surface-2 px-3 py-2 text-[12px] leading-4 text-ink">
            {n as string}
            <Chip tone={t as "green" | "amber" | "blue"}>{s as string}</Chip>
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function HandoverMock({ className }: { className?: string }) {
  return (
    <Frame title="Handover" className={className}>
      <ul className="flex flex-col gap-2 text-[12px] leading-4 text-ink">
        {["Files delivered", "Logins transferred", "Support route shared"].map((x) => (
          <li key={x} className="flex items-center gap-2">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-white">✓</span>
            {x}
          </li>
        ))}
      </ul>
    </Frame>
  );
}

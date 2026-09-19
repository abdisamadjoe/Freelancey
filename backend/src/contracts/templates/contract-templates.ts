import { ContractContent, ContractTemplateId } from "@/shared";

interface OrganizationInfo {
  name: string;
}

interface ClientInfo {
  name: string;
  email: string;
  company?: string | null;
  address?: string | null;
}

interface ProjectInfo {
  name: string;
  description?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  hourlyRateCents?: number | null;
  tasks?: { title: string; description?: string | null }[];
}

type TermsOverride = Partial<ContractContent["terms"]>;

interface TemplateDefinition {
  title: string;
  layout: NonNullable<ContractContent["layout"]>;
  timelineNote?: string;
  scope: {
    description?: string;
    techStack?: string;
    servicesIncluded: string;
    deliverables?: string[];
    outOfScope: string;
  };
  payment: {
    totalAmountCents: number;
    depositCents: number;
    paymentMethod: string;
    latePaymentTerms: string;
    schedule: { milestoneName: string; amountCents: number; dueDate?: string }[];
  };
  terms: TermsOverride;
}

interface Ctx {
  provider: string;
  client: string;
  projectName: string;
  effectiveDate: string;
  endDate: string;
  deliverables: string[];
  /** Estimated project total in cents (rate x 40h, or $2,500). */
  total: number;
  /** Hourly rate in cents (or $100). */
  rate: number;
}

const NO_CLAUSES = {
  intellectualPropertyEnabled: false,
  confidentialityEnabled: false,
  revisionsEnabled: false,
  clientResponsibilitiesEnabled: false,
  providerResponsibilitiesEnabled: false,
  terminationEnabled: false,
  refundsEnabled: false,
  liabilityEnabled: false,
  disputeResolutionEnabled: false,
  governingLawEnabled: false,
  additionalTermsEnabled: false,
};

const LATE_FEE = "Invoices unpaid 15 days after their due date accrue interest at 1.5% per month (or the maximum rate permitted by law, if lower).";

const DISPUTES = (a: string, b: string) =>
  `The parties will first try to resolve any dispute arising out of this Agreement through good-faith negotiation between ${a} and ${b} for at least 30 days. If unresolved, the parties will attempt mediation before either commences formal proceedings.`;

const GOVERNING_LAW =
  "This Agreement is governed by the laws of the jurisdiction in which the provider is established, without regard to its conflict-of-laws rules. Each party submits to the exclusive jurisdiction of the courts of that jurisdiction.";

const TEMPLATE_DEFINITIONS: Record<ContractTemplateId, (c: Ctx) => TemplateDefinition> = {
  "website-design": (c) => {
    const deposit = Math.round(c.total * 0.25);
    return {
      title: "Website Design Service Agreement",
      layout: {
        documentLabel: "WEBSITE DESIGN AGREEMENT",
        coverLabel: "Website Design Contract between:",
        scopeHeading: "Scope Of Work",
        paymentHeading: "Payment",
        showDeliverables: true,
        showTimeline: true,
        clauseTitles: {
          clientResponsibilities: "Client Responsibilities",
          revisions: "Feedback & Revisions",
          intellectualProperty: "Ownership & Rights",
          termination: "Cancellation",
        },
        clauseOrder: ["clientResponsibilities", "revisions", "intellectualProperty", "termination", "liability", "governingLaw"],
      },
      timelineNote: "Delays caused by the Client (late content, slow feedback) will push the delivery date forward accordingly.",
      scope: {
        description: "",
        servicesIncluded: `${c.provider} will design and deliver:`,
        deliverables:
          c.deliverables.length > 0 && c.deliverables[0] !== "Project deliverable 1"
            ? c.deliverables
            : [
                "Responsive website design and development",
                "Content management and admin dashboard",
                "Cross-browser and mobile device testing",
                "Deployment and launch on the agreed hosting",
                "Handover of all final files and source code upon completion",
              ],
        techStack: "This project will be built using Next.js, hosted on Vercel / Cloudflare, with Firebase / Neon PostgreSQL as the database.",
        outOfScope: "",
      },
      payment: {
        totalAmountCents: c.total,
        depositCents: deposit,
        paymentMethod: "EVC-Plus, M-Pesa, Bank Transfer",
        latePaymentTerms: "Work stops if payment is delayed beyond 5 days. Final files and dashboard access will only be handed over after full payment is confirmed.",
        schedule: [
          { milestoneName: "deposit due upon signing this Agreement", amountCents: deposit, dueDate: c.effectiveDate },
          { milestoneName: "due upon project completion and final delivery", amountCents: c.total - deposit, dueDate: c.endDate || undefined },
        ],
      },
      terms: {
        ...NO_CLAUSES,
        clientResponsibilitiesEnabled: true,
        clientResponsibilitiesText: `The Client agrees to:\n- Provide all content (text, images, logo, brand colors) within 5 days of acceptance\n- Give feedback within 3 days of each submission\n- Settle full payment upon delivery before receiving final files`,
        revisionsEnabled: true,
        revisionsText: `The project includes up to two rounds of consolidated revisions per stage. Additional rounds, or changes that go beyond the scope above, are quoted separately and start only after the Client approves the quote in writing.`,
        intellectualPropertyEnabled: true,
        intellectualPropertyText: `Ownership of the final website, design files, and source code transfers to the Client once full payment is confirmed. ${c.provider} keeps ownership of its pre-existing tools and reusable components, and may show the finished work in its portfolio unless the Client objects in writing.`,
        terminationEnabled: true,
        terminationText: `Either party may cancel this Agreement with written notice. The deposit is non-refundable once work has started, and the Client pays for all work completed up to the date of cancellation.`,
        liabilityEnabled: true,
        liabilityText: `${c.provider}'s total liability under this Agreement is limited to the fees paid by the Client. Neither party is liable for indirect or consequential loss, including loss of profit or data.`,
        governingLawEnabled: true,
        governingLawText: GOVERNING_LAW,
      },
    };
  },
};

export function buildDefaultContractContent(
  templateId: ContractTemplateId,
  org: OrganizationInfo,
  client: ClientInfo,
  project: ProjectInfo,
): ContractContent {
  const providerName = org.name || "Service Provider";
  const clientName = client.name || "Client";

  const effectiveDate = new Date().toISOString().slice(0, 10);
  const startDate = project.startDate
    ? new Date(project.startDate).toISOString().slice(0, 10)
    : effectiveDate;
  const endDate = project.endDate
    ? new Date(project.endDate).toISOString().slice(0, 10)
    : "";

  const rate = project.hourlyRateCents || 10000;
  const define = TEMPLATE_DEFINITIONS[templateId] ?? TEMPLATE_DEFINITIONS["website-design"];
  const def = define({
    provider: providerName,
    client: clientName,
    projectName: project.name,
    effectiveDate,
    endDate,
    deliverables:
      project.tasks && project.tasks.length > 0
        ? project.tasks.map((t) => t.title)
        : ["Project deliverable 1", "Project deliverable 2", "Final review and handover"],
    total: rate * 40,
    rate,
  });

  return {
    layout: def.layout,
    parties: {
      provider: { name: providerName, company: org.name, email: "", address: "" },
      client: {
        name: clientName,
        company: client.company || "",
        email: client.email || "",
        address: client.address || "",
      },
    },
    agreement: { title: def.title, effectiveDate, startDate, endDate, timelineNote: def.timelineNote },
    scope: {
      projectDescription: def.scope.description ?? project.description ?? `Professional services for ${project.name}.`,
      deliverables: def.scope.deliverables ?? [],
      servicesIncluded: def.scope.servicesIncluded,
      techStack: def.scope.techStack,
      revisionsCount: 2,
      outOfScope: def.scope.outOfScope,
    },
    payment: {
      totalAmountCents: def.payment.totalAmountCents,
      currency: "USD",
      depositCents: def.payment.depositCents,
      paymentMethod: def.payment.paymentMethod,
      latePaymentTerms: def.payment.latePaymentTerms,
      schedule: def.payment.schedule.map((item, i) => ({ id: String(i + 1), ...item })),
    },
    terms: { ...NO_CLAUSES, ...def.terms } as ContractContent["terms"],
  };
}

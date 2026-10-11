import Image from "next/image";
import {
  ArrowRightIcon,
  CheckIcon,
  ClipboardIcon,
  FileSignIcon,
  FlagIcon,
  GithubIcon,
  LifebuoyIcon,
  LinkIcon,
  LockIcon,
  PackageIcon,
  PlusIcon,
  ReviewIcon,
  UsersIcon,
} from "@/components/icons";
import { Laptop } from "@/components/laptop";
import { LinkButton } from "@/components/link-button";
import { FAQ, PLANS, REPO_URL, SIGNUP_URL, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

const FLOW = ["Lead", "Proposal", "Contract", "Onboarding", "Project", "Handover"] as const;

const STEPS = [
  { title: "Capture the lead", text: "Add it by hand, import a CSV or share your public contact link. Write down what you learn in discovery." },
  { title: "Send the proposal", text: "Your client opens a private link, sees the scope, price and timeline, and accepts in one click." },
  { title: "Get the contract signed", text: "The accepted proposal becomes a contract. Your client signs by typing their name, no account needed." },
  { title: "Onboard the client", text: "Send an onboarding form and a project brief. The answers land on the project, ready to use." },
  { title: "Deliver in milestones", text: "Start from the website template, share each deliverable for review and collect approvals with notes." },
  { title: "Hand over and support", text: "Finish with a handover checklist and a support link, so after-launch requests stay in one place." },
] as const;

const SHOWCASE = [
  {
    id: "leads",
    eyebrow: "Leads",
    title: "Keep every inquiry in one place",
    text: "Add leads by hand, import a CSV or share a public contact link. Discovery notes and the next step sit on the lead, so your proposal starts from what you already know.",
    points: [
      "Manual entry, CSV import and a public lead form",
      "Discovery notes and a next step on every lead",
      "Convert to a client when the contract is signed",
    ],
    image: "/mockups/leads.jpg",
    alt: "The Freelancey leads list on a laptop, showing leads by stage",
  },
  {
    id: "proposals",
    eyebrow: "Proposals",
    title: "Send a proposal your client can accept in one click",
    text: "Build the scope, price and timeline once and send it as a private link. You see when it was sent, opened and answered, and an accepted proposal turns into a contract.",
    points: [
      "Scope, price and timeline on a clean client page",
      "Sent, opened and answered, tracked for you",
      "Expires on the date you choose",
    ],
    image: "/mockups/proposal.jpg",
    alt: "A Freelancey proposal page on a laptop with scope and pricing",
  },
  {
    id: "projects",
    eyebrow: "Projects",
    title: "Run every project from a clear workflow",
    text: "Start from a website template of milestones and tasks. Share each deliverable for review, and close the project with a handover checklist and a support link.",
    points: [
      "Seven-stage website template you can adapt",
      "Clients approve or request changes, with notes",
      "Handover checklist and a support page at the end",
    ],
    image: "/mockups/project.jpg",
    alt: "A Freelancey project page on a laptop with milestones and status",
  },
] as const;

const FEATURES = [
  { icon: FileSignIcon, title: "Contracts and e-signature", text: "A signed contract is stored with the name, time and a record of who signed." },
  { icon: ClipboardIcon, title: "Onboarding forms", text: "Built-in forms collect what you need before work starts. No third-party form tool." },
  { icon: FlagIcon, title: "Milestones and tasks", text: "Break a project into stages and see what is done, what is next and what is late." },
  { icon: ReviewIcon, title: "Deliverable reviews", text: "Share a deliverable and get an approval or a change request back, with notes." },
  { icon: PackageIcon, title: "Handover", text: "Close out with a checklist so the client gets everything they paid for." },
  { icon: LifebuoyIcon, title: "Support requests", text: "After launch, clients send requests from one link instead of a long email thread." },
] as const;

const CLIENT_LINKS = [
  "Proposal",
  "Contract",
  "Onboarding form",
  "Project brief",
  "Deliverable review",
  "Handover",
  "Support",
] as const;

const STACK = [
  { name: "Next.js", role: "Web app" },
  { name: "NestJS", role: "API" },
  { name: "PostgreSQL", role: "Database" },
  { name: "Stripe", role: "Payments" },
  { name: "Resend", role: "Email" },
  { name: "S3-compatible", role: "File storage" },
] as const;

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      url: SITE_URL,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: SITE_DESCRIPTION,
      offers: PLANS.map((plan) => ({
        "@type": "Offer",
        name: plan.name,
        price: plan.price.replace("$", ""),
        priceCurrency: "USD",
      })),
      license: "https://opensource.org/licenses/MIT",
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
  ],
};

const container = "mx-auto w-full max-w-6xl px-4 sm:px-6";
const section = "py-16 sm:py-24";
const eyebrow = "text-sm font-medium text-brand-600";
const h2 = "mt-3 text-3xl font-medium tracking-tight text-ink text-balance sm:text-4xl";
const lead = "mt-4 text-base leading-7 text-ink-secondary sm:text-lg sm:leading-8";

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      {/* Hero: two columns, sized to fit the first screen on desktop */}
      <section className="hero-gradient relative overflow-hidden text-white">
        <div
          className={`${container} grid items-center gap-12 py-12 sm:py-16 lg:min-h-[calc(100svh-4.0625rem)] lg:grid-cols-2 lg:gap-8 lg:py-8`}
        >
          <div className="text-center lg:text-left">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-sm text-white">
              <span className="size-1.5 rounded-full bg-white" aria-hidden />
              Free to start. Open source.
            </p>
            <h1 className="mt-6 text-4xl font-medium tracking-tight text-balance sm:text-5xl lg:text-5xl lg:leading-[1.08] xl:text-6xl">
              <span className="block">Send the proposal.</span>
              <span className="block">Get it signed.</span>
              <span className="block text-brand-200">Deliver the project.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-brand-100 lg:mx-0 xl:text-lg xl:leading-8">
              Freelancey is client management software for freelance web designers and developers. Track leads, send
              proposals, collect signatures and hand over finished projects from one workspace.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <LinkButton href={SIGNUP_URL} variant="inverse" size="lg" className="w-full sm:w-auto">
                Start your free workspace
              </LinkButton>
              <LinkButton href="#how-it-works" variant="inverse-outline" size="lg" className="w-full sm:w-auto">
                See how it works
              </LinkButton>
            </div>
            <p className="mt-4 text-sm text-brand-100">No credit card needed. 2 projects free, forever.</p>
          </div>

          <div className="relative mx-auto w-full max-w-2xl">
            <Laptop
              src="/mockups/dashboard.jpg"
              alt="The Freelancey dashboard on a laptop, showing active projects, receivables and the pipeline"
              priority
              sizes="(min-width: 1024px) 640px, 100vw"
            />
            <Image
              src="/mockups/card-signed.png"
              alt="Notification card: contract signed by the client"
              width={1064}
              height={460}
              className="absolute -left-4 bottom-[14%] hidden w-[30%] rounded-xl shadow-float ring-1 ring-line sm:block"
            />
            <Image
              src="/mockups/card-approved.png"
              alt="Notification card: deliverable approved by the client"
              width={1064}
              height={460}
              className="absolute -right-2 top-[8%] hidden w-[30%] rounded-xl shadow-float ring-1 ring-line sm:block"
            />
          </div>
        </div>
      </section>

      {/* One flow */}
      <section className="border-b border-line bg-surface-subtle py-12" aria-labelledby="flow-title">
        <div className={container}>
          <h2 id="flow-title" className="text-center text-sm font-medium text-ink-secondary">
            One flow, from first inquiry to final handover
          </h2>
          <ol className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {FLOW.map((step, index) => (
              <li
                key={step}
                className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 shadow-card"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-medium text-brand-700">
                  {index + 1}
                </span>
                <span className="text-sm font-medium text-ink">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Showcase */}
      <section id="features" className={section} aria-labelledby="features-title">
        <div className={container}>
          <div className="mx-auto max-w-2xl text-center">
            <p className={eyebrow}>Features</p>
            <h2 id="features-title" className={h2}>
              From the first inquiry to the signed contract to the finished project
            </h2>
          </div>

          <div className="mt-16 space-y-16 sm:space-y-24">
            {SHOWCASE.map((item, index) => (
              <article
                key={item.id}
                id={item.id}
                className={`grid items-center gap-8 lg:gap-12 ${index % 2 === 1 ? "lg:grid-cols-[7fr_5fr]" : "lg:grid-cols-[5fr_7fr]"}`}
              >
                <div className={index % 2 === 1 ? "lg:order-2" : ""}>
                  <p className={eyebrow}>{item.eyebrow}</p>
                  <h3 className="mt-3 text-2xl font-medium tracking-tight text-ink text-balance sm:text-3xl">
                    {item.title}
                  </h3>
                  <p className={lead}>{item.text}</p>
                  <ul className="mt-6 space-y-3">
                    {item.points.map((point) => (
                      <li key={point} className="flex items-start gap-3 text-base text-ink">
                        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                          <CheckIcon width={14} height={14} />
                        </span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={index % 2 === 1 ? "lg:order-1" : ""}>
                  <Laptop src={item.image} alt={item.alt} />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Everything after the sale */}
      <section className={`${section} border-y border-line bg-surface-subtle`} aria-labelledby="after-title">
        <div className={container}>
          <div className="mx-auto max-w-2xl text-center">
            <p className={eyebrow}>After the sale</p>
            <h2 id="after-title" className={h2}>
              Everything that happens once the client says yes
            </h2>
          </div>
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="rounded-2xl border border-line bg-white p-6 shadow-card">
                <span className="flex size-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Icon width={20} height={20} />
                </span>
                <h3 className="mt-4 text-base font-medium text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-secondary">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className={section} aria-labelledby="how-title">
        <div className={container}>
          <div className="mx-auto max-w-2xl text-center">
            <p className={eyebrow}>How it works</p>
            <h2 id="how-title" className={h2}>
              Six steps from a new lead to a handed-over project
            </h2>
          </div>
          <ol className="mt-12 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <span className="text-sm font-medium text-brand-600 tabular-nums">Step {index + 1}</span>
                <h3 className="mt-2 text-lg font-medium text-ink">{step.title}</h3>
                <p className="mt-2 text-base leading-7 text-ink-secondary">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Client side */}
      <section className="border-y border-line bg-brand-900 py-16 text-white sm:py-24" aria-labelledby="clients-title">
        <div className={`${container} grid items-center gap-12 lg:grid-cols-2 lg:gap-16`}>
          <div>
            <p className="text-sm font-medium text-brand-200">For your clients</p>
            <h2 id="clients-title" className="mt-3 text-3xl font-medium tracking-tight text-balance sm:text-4xl">
              Your clients never create an account
            </h2>
            <p className="mt-4 text-base leading-7 text-brand-100 sm:text-lg sm:leading-8">
              Every step they take opens from a private link you send. They read, sign or answer, and you see it in your
              workspace right away. Your logo and brand color appear on every page.
            </p>
            <div className="mt-8 flex items-center gap-3 text-sm text-brand-100">
              <LockIcon width={20} height={20} />
              Links are single purpose, hashed at rest and can be revoked.
            </div>
          </div>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CLIENT_LINKS.map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-4 text-base"
              >
                <LinkIcon width={20} height={20} className="shrink-0 text-brand-200" />
                {item}
              </li>
            ))}
            <li className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-4 text-base">
              <UsersIcon width={20} height={20} className="shrink-0 text-brand-200" />
              No sign-up, no password
            </li>
          </ul>
        </div>
      </section>

      {/* Open source */}
      <section className={section} aria-labelledby="oss-title">
        <div className={container}>
          <div className="mx-auto max-w-2xl text-center">
            <p className={eyebrow}>Open source</p>
            <h2 id="oss-title" className={h2}>
              Read the code, host it yourself, or let us run it
            </h2>
            <p className={lead}>
              Freelancey is released under the MIT License and built on tools you already know.
            </p>
          </div>
          <ul className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {STACK.map((item) => (
              <li key={item.name} className="rounded-xl border border-line bg-white px-5 py-4 shadow-card">
                <p className="text-base font-medium text-ink">{item.name}</p>
                <p className="mt-1 text-sm text-ink-secondary">{item.role}</p>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex justify-center">
            <LinkButton href={REPO_URL} variant="outline" size="lg">
              <GithubIcon width={20} height={20} />
              View the source on GitHub
            </LinkButton>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className={`${section} border-y border-line bg-surface-subtle`} aria-labelledby="pricing-title">
        <div className={container}>
          <div className="mx-auto max-w-2xl text-center">
            <p className={eyebrow}>Pricing</p>
            <h2 id="pricing-title" className={h2}>
              Start free. Pay when you outgrow it.
            </h2>
          </div>
          <ul className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <li
                key={plan.slug}
                className={`flex flex-col rounded-2xl border bg-white p-8 ${
                  plan.highlighted ? "border-brand-500 shadow-float ring-1 ring-brand-500" : "border-line shadow-card"
                }`}
              >
                <h3 className="text-base font-medium text-ink">{plan.name}</h3>
                <p className="mt-1 text-sm text-ink-secondary">{plan.summary}</p>
                <p className="mt-6 text-4xl font-light tracking-tight text-ink tabular-nums">{plan.price}</p>
                <p className="mt-1 text-sm text-ink-secondary">{plan.cadence}</p>
                <LinkButton
                  href={SIGNUP_URL}
                  variant={plan.highlighted ? "primary" : "outline"}
                  className="mt-6 w-full"
                >
                  {plan.cta}
                </LinkButton>
                <ul className="mt-8 space-y-3 border-t border-line pt-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm text-ink">
                      <CheckIcon width={16} height={16} className="shrink-0 text-brand-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className={section} aria-labelledby="faq-title">
        <div className={`${container} max-w-3xl`}>
          <div className="text-center">
            <p className={eyebrow}>FAQ</p>
            <h2 id="faq-title" className={h2}>
              Questions before you start
            </h2>
          </div>
          <div className="mt-12 divide-y divide-line border-y border-line">
            {FAQ.map((item) => (
              <details key={item.question} className="group py-5">
                <summary className="flex cursor-pointer items-center justify-between gap-4 text-base font-medium text-ink">
                  {item.question}
                  <PlusIcon
                    width={20}
                    height={20}
                    className="faq-icon shrink-0 text-ink-secondary transition-transform duration-200"
                  />
                </summary>
                <p className="mt-3 pr-8 text-base leading-7 text-ink-secondary">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Closing call to action */}
      <section className="px-4 pb-16 sm:px-6 sm:pb-24" aria-labelledby="cta-title">
        <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-3xl bg-brand-600 px-6 pt-12 sm:px-12 sm:pt-16">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="pb-12 sm:pb-16">
              <h2 id="cta-title" className="text-3xl font-medium tracking-tight text-white text-balance sm:text-4xl">
                Send your first proposal today
              </h2>
              <p className="mt-4 text-base leading-7 text-brand-100 sm:text-lg sm:leading-8">
                Set up a free workspace in minutes. No credit card needed.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <LinkButton href={SIGNUP_URL} variant="inverse" size="lg">
                  Start your free workspace
                  <ArrowRightIcon width={20} height={20} />
                </LinkButton>
                <LinkButton href={REPO_URL} variant="inverse-outline" size="lg">
                  Self-host it
                </LinkButton>
              </div>
            </div>
            <div className="lg:translate-y-6">
              <Laptop
                src="/mockups/dashboard.jpg"
                alt="The Freelancey dashboard on a laptop"
                sizes="(min-width: 1024px) 560px, 100vw"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

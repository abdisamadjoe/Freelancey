/** Where the website lives and where its calls to action send people. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://freelancey.groundwork.co.ke";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const SIGNUP_URL = `${APP_URL}/signup`;
export const LOGIN_URL = `${APP_URL}/login`;
export const REPO_URL = "https://github.com/GroundworkTechnologies/Freelancey";

export const SITE_NAME = "Freelancey";
export const SITE_TITLE = "Freelancey: Send Proposals, Get Contracts Signed, Deliver Projects";
export const SITE_DESCRIPTION =
  "Client management software for freelance web designers. Send proposals, collect signatures and deliver projects from one free workspace.";

/** The plans as they exist in the product (backend/src/database/seed.ts). Prices are in US dollars. */
export const PLANS = [
  {
    slug: "free",
    name: "Free",
    price: "$0",
    cadence: "Free forever",
    summary: "For your first client projects.",
    features: ["2 projects", "3 clients", "50 MB storage", "1 team member"],
    cta: "Start free",
    highlighted: false,
  },
  {
    slug: "pro",
    name: "Pro",
    price: "$29",
    cadence: "per month, or $290 per year",
    summary: "For a full client roster.",
    features: ["Unlimited projects", "Unlimited clients", "10 GB storage", "5 team members"],
    cta: "Start with Pro",
    highlighted: true,
  },
  {
    slug: "lifetime",
    name: "Lifetime",
    price: "$499",
    cadence: "one-time payment, 100 seats",
    summary: "Pay once and keep it.",
    features: ["Unlimited projects", "Unlimited clients", "25 GB storage", "100 team members"],
    cta: "Get lifetime access",
    highlighted: false,
  },
] as const;

export const FAQ = [
  {
    question: "Does my client need an account?",
    answer:
      "No. Proposals, contracts, onboarding forms, deliverable reviews, handovers and support requests all open from a private link you send. Your client types a name or fills in a form and that is it.",
  },
  {
    question: "Is Freelancey free?",
    answer:
      "Yes, to start. The free plan covers 2 projects and 3 clients with no credit card. Pro and Lifetime lift those limits when you grow.",
  },
  {
    question: "Can I host it myself?",
    answer:
      "Yes. Freelancey is open source under the MIT License, so you can run it on your own infrastructure with your own database and file storage.",
  },
  {
    question: "Who is Freelancey built for?",
    answer:
      "Freelance web designers and developers who sell website projects to small businesses. The project template, the proposal and the contract all start from that kind of work.",
  },
  {
    question: "Can I use my own logo and colors?",
    answer:
      "Yes. Your logo and brand color appear on the pages your clients see, including proposals, contracts, forms and the support page.",
  },
] as const;

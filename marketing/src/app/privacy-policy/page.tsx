import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = pageMetadata({
  title: "Freelancey: Privacy Policy",
  description: "How the Freelancey website and hosted service handle your information.",
  path: "/privacy-policy",
});

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      intro="What this website collects, what the hosted service stores, and what stays entirely in your hands when you self-host."
      updated="14 October 2026"
      sections={[
        {
          heading: "This website",
          paragraphs: [
            "The Freelancey marketing site is a static page. It has no accounts and no forms, and it does not set advertising cookies. Our hosting provider may keep standard server logs, such as IP address and requested URL, for security and reliability.",
          ],
        },
        {
          heading: "Self-hosted Freelancey",
          paragraphs: [
            "When you run Freelancey on your own infrastructure, your clients, projects, files and invoices are stored in the database and storage bucket you choose. We do not receive that data and cannot access it.",
          ],
        },
        {
          heading: "Hosted Freelancey",
          paragraphs: [
            "If we run Freelancey for you, we store the data you and your clients enter so that the service can work, and we process it only on your behalf. We do not sell it or use it for advertising.",
            "Payments and email are handled by third-party processors such as Stripe and Resend, under their own privacy policies.",
          ],
        },
        {
          heading: "Your choices",
          paragraphs: [
            "You can ask us to access, correct, export or delete the information we hold about you. The project is open source, so you can also inspect exactly what the code does on GitHub.",
          ],
        },
        {
          heading: "Contact",
          paragraphs: ["Questions about this policy can be raised as an issue on the Freelancey GitHub repository."],
        },
      ]}
    />
  );
}

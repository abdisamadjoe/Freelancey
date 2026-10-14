import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { faqs } from "@/components/home/faq-data";
import { pageMetadata, softwareJsonLd } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Freelancey: Win Clients and Deliver Projects Faster",
  description:
    "Open-source client and project management for freelancers. Manage leads, proposals, contracts, projects and invoices in one app.",
  path: "/",
});

import { Hero } from "@/components/home/hero";
import { Overview } from "@/components/home/overview";
import { GrowthStack } from "@/components/home/growth-stack";
import { CoreFeatures } from "@/components/home/core-features";
import { HowItWorks } from "@/components/home/how-it-works";
import { Faq } from "@/components/home/faq";
import { FinalCta } from "@/components/home/final-cta";
import { LogoMarquee } from "@/components/home/logo-marquee";

export default function HomePage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <>
      <JsonLd data={softwareJsonLd} />
      <JsonLd data={faqJsonLd} />
      <Hero />
      <LogoMarquee />
      <Overview />
      <GrowthStack />
      <CoreFeatures />
      <HowItWorks />
      <Faq />
      <FinalCta />
    </>
  );
}

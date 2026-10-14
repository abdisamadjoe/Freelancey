import type { Metadata } from "next";
import { siteName } from "@/lib/site";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://freelancey.groundwork.co.ke").replace(/\/$/, "");

export const defaultDescription =
  "Open-source client and project management for freelancers. Leads, proposals, contracts, projects, files and invoices in one self-hosted app.";

/** Per-page metadata with canonical, Open Graph and Twitter cards. */
export function pageMetadata({
  title,
  description,
  path,
  type = "website",
}: {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
}): Metadata {
  const url = path === "/" ? SITE_URL : `${SITE_URL}${path}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url, siteName, type, locale: "en_US" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteName,
  url: SITE_URL,
  logo: `${SITE_URL}/images/logo-symbol.svg`,
  sameAs: ["https://github.com/GroundworkTechnologies/Freelancey"],
};

export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteName,
  url: SITE_URL,
  description: defaultDescription,
};

export const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: siteName,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: defaultDescription,
  url: SITE_URL,
  license: "https://opensource.org/licenses/MIT",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Free to self-host under the MIT licence" },
};

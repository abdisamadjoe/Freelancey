import type { Metadata } from "next";
import "../sierra-globals.css";
import "../../styles/homepage2-scoped.css";
import { UIStateProvider } from "@/components/UIStateProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BackToTop } from "@/components/BackToTop";
import { ContactPopup } from "@/components/ContactPopup";

export const metadata: Metadata = {
  metadataBase: new URL("https://freelancey.groundwork.co.ke"),
  title: "Freelancey: Run Your Freelance Business in One Place",
  description:
    "Manage clients, projects, invoices, and contracts in one open-source platform built for freelancers and agencies. Self-host it free.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Freelancey: Run Your Freelance Business in One Place",
    description:
      "Manage clients, projects, invoices, and contracts in one open-source platform built for freelancers and agencies.",
    url: "/",
    siteName: "Freelancey",
    type: "website",
    images: ["/images/329bbf4a014a.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Freelancey: Run Your Freelance Business in One Place",
    description:
      "Manage clients, projects, invoices, and contracts in one open-source platform built for freelancers and agencies.",
    images: ["/images/329bbf4a014a.png"],
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Freelancey",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Open-source client and project management platform for freelancers: project tracking, a white-labeled client portal, file delivery, contracts, and invoicing.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

// Body classes are preserved from the original capture: several theme
// stylesheets scope rules to them (e.g. .underline-link-effect,
// .flip-button-effect, .elementor-kit-21148).
const BODY_CLASSES =
  "home wp-singular page-template-default page page-id-21437 " +
  "wp-theme-keydesign-pro wp-child-theme-keydesign-pro-child " +
  "underline-link-effect flip-button-effect elementor-default " +
  "elementor-kit-21148 elementor-page elementor-page-21437 " +
  "e--ua-blink e--ua-chrome e--ua-webkit min-h-full flex flex-col";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className={BODY_CLASSES}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        <UIStateProvider>
          <div id="page" className="site">
            <SiteHeader />
            {children}
            <SiteFooter />
          </div>
          <BackToTop />
          <ContactPopup />
        </UIStateProvider>
      </body>
    </html>
  );
}

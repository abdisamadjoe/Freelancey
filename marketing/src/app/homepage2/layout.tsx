import type { Metadata } from "next";
import "../homepage2-globals.css";
import { UIState2Provider } from "@/components/homepage2/UIState2Provider";
import { Header2 } from "@/components/homepage2/Header2";
import { Footer2 } from "@/components/homepage2/Footer2";
import { VideoLightbox } from "@/components/homepage2/VideoLightbox";

export const metadata: Metadata = {
  metadataBase: new URL("https://freelancey.groundwork.co.ke"),
  title: "Freelancey: Client & Project Management, Simplified",
  description:
    "Track projects, share files, sign contracts, and send invoices from one client portal. Open-source and free to self-host for freelancers and agencies.",
  alternates: {
    canonical: "/homepage2",
  },
  openGraph: {
    title: "Freelancey: Client & Project Management, Simplified",
    description:
      "Track projects, share files, sign contracts, and send invoices from one client portal. Open-source and free to self-host.",
    url: "/homepage2",
    siteName: "Freelancey",
    type: "website",
    images: ["/homepage2/images/3ec4ed6cd320.webp"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Freelancey: Client & Project Management, Simplified",
    description:
      "Track projects, share files, sign contracts, and send invoices from one client portal. Open-source and free to self-host.",
    images: ["/homepage2/images/3ec4ed6cd320.webp"],
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

// This is a second, independent root layout (Next.js "multiple root
// layouts" pattern: any layout with no layout.tsx above it becomes a root
// layout and gets its own <html>/<body>). It intentionally does NOT share
// the Sierra/(sierra) route group's header, footer, providers, or global
// CSS — this is a different captured site with a different theme.
//
// Body classes are preserved from the original capture for CSS scoping
// (e.g. .has-tj-mega-menu, .elementor-kit-5586).
const BODY_CLASSES =
  "home wp-singular page-template page-template-elementor_header_footer " +
  "page page-id-3950 wp-embed-responsive wp-theme-sasflo has-tj-mega-menu " +
  "elementor-default elementor-template-full-width elementor-kit-5586 " +
  "elementor-page elementor-page-3950 e--ua-blink e--ua-chrome e--ua-webkit";

export default function Homepage2Layout({ children }: LayoutProps<"/homepage2">) {
  return (
    <html lang="en">
      <body className={BODY_CLASSES}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        <UIState2Provider>
          <Header2 />
          <div id="smooth-wrapper">
            <div id="smooth-content">
              <main id="content" className="site-main tj-content">
                {children}
              </main>
              <Footer2 />
            </div>
          </div>
          <VideoLightbox />
        </UIState2Provider>
      </body>
    </html>
  );
}

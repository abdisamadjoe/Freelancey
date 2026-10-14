import type { Metadata, Viewport } from "next";
import { SITE_URL, defaultDescription, organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import localFont from "next/font/local";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

const geist = localFont({
  variable: "--nf-geist",
  src: [{ path: "../fonts/geist-var.woff2", weight: "100 900", style: "normal" }],
});

const inter = localFont({
  variable: "--nf-inter",
  src: [
    { path: "../fonts/inter-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/inter-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/inter-600.woff2", weight: "600", style: "normal" },
    { path: "../fonts/inter-700.woff2", weight: "700", style: "normal" },
  ],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Freelancey: Win Clients and Deliver Projects Faster", template: "%s" },
  description: defaultDescription,
  applicationName: "Freelancey",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Freelancey",
    url: SITE_URL,
    title: "Freelancey: Win Clients and Deliver Projects Faster",
    description: defaultDescription,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Freelancey: Win Clients and Deliver Projects Faster",
    description: defaultDescription,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#064E3B", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} ${inter.variable}`}>
      <body className="overflow-x-clip">
        <svg width="0" height="0" className="absolute" aria-hidden>
          <filter id="brand-green" colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values="1.22 0 -0.22 0 0  0.8675 0 0.1325 0 0  0.961 0 0.039 0 0  0 0 0 1 0" />
          </filter>
        </svg>
        <div className="mx-auto w-full max-w-[1200px]">
          <JsonLd data={organizationJsonLd} />
          <JsonLd data={websiteJsonLd} />
          <Navbar />
          <main>{children}</main>
        </div>
        <Footer />
      </body>
    </html>
  );
}

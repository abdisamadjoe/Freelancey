import type { Metadata } from "next";
import { Manrope, Inter } from "next/font/google";
import Script from "next/script";
import { Providers } from "./providers";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

// Only regular/medium/semibold are loaded — bold (700) and heavier weights
// are never used in this app, so there's no reason to ship those font files.
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-manrope",
});

// Inter is used only for numeric values (money, metrics, durations, table
// number columns) via the `font-numeric` utility — its tabular figures keep
// digits fixed-width, which Manrope's numerals don't guarantee.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Freelancey",
  description: "Client portal for agencies and freelancers",
};

const ALLOWED_TRACKER_KEYS = new Set([
  "src",
  "strategy",
  "async",
  "defer",
  "crossOrigin",
  "nonce",
  "type",
]);

function getTrackers(): Array<Record<string, string>> {
  const raw = process.env.NEXT_PUBLIC_TRACKERS;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((t): t is Record<string, string> => t && typeof t === "object" && typeof t.src === "string")
      .map((t) => {
        const safe: Record<string, string> = {};
        for (const [k, v] of Object.entries(t)) {
          if (ALLOWED_TRACKER_KEYS.has(k) || k.startsWith("data-")) {
            safe[k] = String(v);
          }
        }
        return safe;
      })
      .filter((t) => t.src);
  } catch {
    return [];
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const trackers = getTrackers();

  return (
    <html
      lang="en"
      className={`${manrope.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {trackers.map((tracker, i) => (
          <Script
            key={tracker.src || i}
            defer
            strategy="afterInteractive"
            {...tracker}
          />
        ))}
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

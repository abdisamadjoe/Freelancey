import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.117"],
  images: {
    unoptimized: true, // CVE-2026-27980: disable image optimization (not used in this app)
  },
  // No landing page — the app always starts at /login
  async redirects() {
    return [
      {
        source: "/",
        destination: "/login",
        permanent: false,
      },
    ];
  },
  async headers() {
    // Pages reached through a secret link: never indexed, cached or leaked through a Referer header.
    const secretLinkHeaders = [
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Cache-Control", value: "private, no-store" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
    ];
    return [
      ...["proposal", "contract", "onboarding", "brief", "review", "handover", "support"].map((segment) => ({
        source: `/${segment}/:token*`,
        headers: secretLinkHeaders,
      })),
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-src 'self' blob: " +
              // Regex-based providers (fast path)
              "https://www.youtube.com https://www.loom.com https://www.figma.com https://docs.google.com " +
              // oEmbed providers (resolved via /api/embeds/resolve)
              "https://www.canva.com https://canva.com " +
              "https://open.spotify.com " +
              "https://w.soundcloud.com https://soundcloud.com " +
              "https://codepen.io " +
              "https://player.vimeo.com;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

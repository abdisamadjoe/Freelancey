import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Freelancey",
    short_name: "Freelancey",
    description: "Open-source client and project management for freelancers.",
    start_url: "/",
    display: "browser",
    background_color: "#ffffff",
    theme_color: "#064E3B",
    icons: [{ src: "/images/logo-symbol.svg", sizes: "any", type: "image/svg+xml" }],
  };
}

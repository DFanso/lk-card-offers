import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LK Card Offers",
    short_name: "LK Offers",
    description:
      "Community-curated catalog of valid credit and debit card offers from Sri Lankan banks.",
    start_url: "/",
    display: "standalone",
    background_color: "#fdf6e8",
    theme_color: "#c77a3a",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.svg", sizes: "180x180", type: "image/svg+xml" },
    ],
  };
}

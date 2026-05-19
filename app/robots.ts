import type { MetadataRoute } from "next";

function siteUrl() {
  return (
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000"
  );
}

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/maintainer", "/account", "/api"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}

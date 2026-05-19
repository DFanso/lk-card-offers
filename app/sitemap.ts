import type { MetadataRoute } from "next";
import { and, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { offers } from "@/db/schema";

function siteUrl() {
  return (
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000"
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const todayStr = new Date().toISOString().slice(0, 10);

  const rows = await db
    .select({ id: offers.id, updatedAt: offers.updatedAt })
    .from(offers)
    .where(and(eq(offers.status, "published"), gte(offers.endDate, todayStr)));

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/offers`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/login`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/register`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const offerRoutes: MetadataRoute.Sitemap = rows.map((o) => ({
    url: `${base}/offers/${o.id}`,
    lastModified: o.updatedAt ?? undefined,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...offerRoutes];
}

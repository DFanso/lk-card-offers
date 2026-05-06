import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import {
  banks,
  cardTypes,
  categories,
  maintainerRequests,
  merchants,
  users,
} from "@/db/schema";
import { requireRole, roleAtLeast } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const session = await requireRole("admin");

  const [bankCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(banks);
  const [cardTypeCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(cardTypes);
  const [categoryCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(categories);
  const [merchantCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(merchants);
  const [pendingRequests] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(maintainerRequests)
    .where(sql`${maintainerRequests.status} = 'pending'`);
  const [userCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);

  const tiles = [
    { label: "Banks", count: bankCount.count, href: "/admin/banks" },
    { label: "Card types", count: cardTypeCount.count, href: "/admin/card-types" },
    { label: "Categories", count: categoryCount.count, href: "/admin/categories" },
    { label: "Merchants", count: merchantCount.count, href: "/admin/merchants" },
    {
      label: "Maintainer requests",
      count: pendingRequests.count,
      href: "/admin/maintainer-requests",
    },
  ];
  if (roleAtLeast(session.user.role, "super_admin")) {
    tiles.push({ label: "Users", count: userCount.count, href: "/admin/users" });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-base font-semibold">Admin dashboard</h1>
        <p className="text-xs text-muted-foreground">
          Manage master data and access control.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {tiles.map((t) => (
          <Card key={t.href}>
            <CardHeader>
              <CardTitle className="text-xs text-muted-foreground">
                {t.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{t.count}</p>
              <Link href={t.href} className="mt-1 inline-block text-xs underline">
                Manage →
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import {
  banks,
  cardTypes,
  categories,
  maintainerRequests,
  merchants,
  offers,
  users,
} from "@/db/schema";
import { requireRole, roleAtLeast } from "@/lib/rbac";

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
  const [offerCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(offers);

  const tiles = [
    { code: "01", label: "Banks", count: bankCount.count, href: "/admin/banks" },
    { code: "02", label: "Card types", count: cardTypeCount.count, href: "/admin/card-types" },
    { code: "03", label: "Categories", count: categoryCount.count, href: "/admin/categories" },
    { code: "04", label: "Merchants", count: merchantCount.count, href: "/admin/merchants" },
    {
      code: "05",
      label: "Maintainer requests",
      count: pendingRequests.count,
      href: "/admin/maintainer-requests",
    },
    {
      code: "06",
      label: "Offers",
      count: offerCount.count,
      href: "/admin/offers",
    },
  ];
  if (roleAtLeast(session.user.role, "super_admin")) {
    tiles.push({
      code: "07",
      label: "Users",
      count: userCount.count,
      href: "/admin/users",
    });
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="section-label">Administration</div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Master data & access
        </h1>
        <p className="max-w-xl text-xs text-muted-foreground">
          Curate the canonical taxonomy of banks, card types, merchants, and
          categories. Approve maintainer requests and manage roles.
        </p>
      </header>

      <div className="grid gap-px border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="group bg-card p-5 transition-colors hover:bg-muted/40"
          >
            <div className="flex items-baseline justify-between">
              <span className="num text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                № {t.code}
              </span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors group-hover:text-foreground">
                Manage →
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="num text-4xl font-semibold tracking-tight">
                {t.count.toString().padStart(2, "0")}
              </span>
              <span className="text-xs text-muted-foreground">{t.label}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

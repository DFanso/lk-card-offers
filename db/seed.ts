import "dotenv/config";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db, pgClient } from "./index";
import {
  banks,
  cardTypes,
  categories,
  merchants,
  offerBanks,
  offerCardTypes,
  offers,
  users,
} from "./schema";

async function main() {
  console.log("Seeding database…");

  const superEmail = (
    process.env.SEED_SUPERADMIN_EMAIL ?? "super@example.com"
  ).toLowerCase();
  const superPassword = process.env.SEED_SUPERADMIN_PASSWORD ?? "password123";
  const superName = process.env.SEED_SUPERADMIN_NAME ?? "Super Admin";
  const passwordHash = await bcrypt.hash(superPassword, 10);

  await db
    .insert(users)
    .values({
      name: superName,
      email: superEmail,
      passwordHash,
      role: "super_admin",
    })
    .onConflictDoNothing({ target: users.email });

  const seededBanks = [
    { name: "Commercial Bank of Ceylon", slug: "commercial-bank" },
    { name: "Hatton National Bank", slug: "hnb" },
    { name: "Sampath Bank", slug: "sampath" },
    { name: "Bank of Ceylon", slug: "boc" },
    { name: "NDB Bank", slug: "ndb" },
    { name: "National Savings Bank", slug: "nsb" },
  ];
  for (const bank of seededBanks) {
    await db.insert(banks).values(bank).onConflictDoNothing({ target: banks.slug });
  }

  const seededCardTypes = [
    { name: "Visa Credit", kind: "credit" as const },
    { name: "Mastercard Credit", kind: "credit" as const },
    { name: "Visa Debit", kind: "debit" as const },
    { name: "Mastercard Debit", kind: "debit" as const },
    { name: "Amex", kind: "other" as const },
  ];
  for (const ct of seededCardTypes) {
    const existing = await db
      .select({ id: cardTypes.id })
      .from(cardTypes)
      .where(sql`${cardTypes.name} = ${ct.name}`)
      .limit(1);
    if (!existing[0]) await db.insert(cardTypes).values(ct);
  }

  const seededCategories = [
    { name: "Dining", slug: "dining" },
    { name: "Shopping", slug: "shopping" },
    { name: "Travel", slug: "travel" },
    { name: "Groceries", slug: "groceries" },
    { name: "Electronics", slug: "electronics" },
    { name: "Fuel", slug: "fuel" },
  ];
  for (const c of seededCategories) {
    await db
      .insert(categories)
      .values(c)
      .onConflictDoNothing({ target: categories.slug });
  }

  const seededMerchants = [
    { name: "Cinnamon Grand Colombo" },
    { name: "Keells Super" },
    { name: "Odel" },
  ];
  for (const m of seededMerchants) {
    const existing = await db
      .select({ id: merchants.id })
      .from(merchants)
      .where(sql`${merchants.name} = ${m.name}`)
      .limit(1);
    if (!existing[0]) await db.insert(merchants).values(m);
  }

  const allBanks = await db.select().from(banks);
  const allCardTypes = await db.select().from(cardTypes);
  const allCategories = await db.select().from(categories);
  const allMerchants = await db.select().from(merchants);
  const dining = allCategories.find((c) => c.slug === "dining");
  const groceries = allCategories.find((c) => c.slug === "groceries");
  const shopping = allCategories.find((c) => c.slug === "shopping");
  const cinnamon = allMerchants.find((m) => m.name === "Cinnamon Grand Colombo");
  const keells = allMerchants.find((m) => m.name === "Keells Super");
  const odel = allMerchants.find((m) => m.name === "Odel");

  const today = new Date();
  const inFuture = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };
  const inPast = (days: number) => inFuture(-days);

  const sampleOffers: Array<{
    title: string;
    description: string;
    merchantId: string | undefined;
    categoryId: string | undefined;
    startDate: string;
    endDate: string;
    sourceUrl: string;
    bankSlugs: string[];
    cardTypeNames: string[];
  }> = [
    {
      title: "20% Off Dining at Cinnamon Grand",
      description:
        "Get 20% off your total bill when paying with selected credit cards.",
      merchantId: cinnamon?.id,
      categoryId: dining?.id,
      startDate: inPast(7),
      endDate: inFuture(60),
      sourceUrl: "https://example.lk/cinnamon-dining",
      bankSlugs: ["commercial-bank", "hnb"],
      cardTypeNames: ["Visa Credit", "Mastercard Credit"],
    },
    {
      title: "10% Off Groceries at Keells",
      description: "Weekend grocery discount on all Keells Super outlets.",
      merchantId: keells?.id,
      categoryId: groceries?.id,
      startDate: inPast(3),
      endDate: inFuture(30),
      sourceUrl: "https://example.lk/keells-weekend",
      bankSlugs: ["sampath", "boc"],
      cardTypeNames: ["Visa Debit", "Mastercard Debit"],
    },
    {
      title: "Up to 30% Off at Odel",
      description: "Seasonal sale for cardholders.",
      merchantId: odel?.id,
      categoryId: shopping?.id,
      startDate: inPast(60),
      endDate: inPast(1),
      sourceUrl: "https://example.lk/odel-sale",
      bankSlugs: ["ndb"],
      cardTypeNames: ["Amex"],
    },
  ];

  for (const so of sampleOffers) {
    if (!so.merchantId || !so.categoryId) continue;
    const exists = await db
      .select({ id: offers.id })
      .from(offers)
      .where(sql`${offers.title} = ${so.title}`)
      .limit(1);
    if (exists[0]) continue;

    const isExpired = new Date(so.endDate) < today;
    const inserted = await db
      .insert(offers)
      .values({
        title: so.title,
        description: so.description,
        merchantId: so.merchantId,
        categoryId: so.categoryId,
        startDate: so.startDate,
        endDate: so.endDate,
        status: isExpired ? "expired" : "published",
        sourceUrl: so.sourceUrl,
        publishedAt: isExpired ? null : new Date(),
      })
      .returning({ id: offers.id });

    const offerId = inserted[0].id;
    const bankIds = allBanks
      .filter((b) => so.bankSlugs.includes(b.slug))
      .map((b) => b.id);
    const cardTypeIds = allCardTypes
      .filter((ct) => so.cardTypeNames.includes(ct.name))
      .map((ct) => ct.id);

    for (const bankId of bankIds) {
      await db.insert(offerBanks).values({ offerId, bankId }).onConflictDoNothing();
    }
    for (const cardTypeId of cardTypeIds) {
      await db
        .insert(offerCardTypes)
        .values({ offerId, cardTypeId })
        .onConflictDoNothing();
    }
  }

  console.log("Seed complete.");
  await pgClient.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

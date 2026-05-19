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

type Sample = {
  title: string;
  description: string;
  merchant: string;
  categorySlug: string;
  startDays: number;
  endDays: number;
  source: string;
  bankSlugs: string[];
  cardTypes: string[];
};

const DEV_MERCHANTS = [
  "Burger King",
  "Pizza Hut",
  "McDonald's",
  "KFC",
  "Spa Ceylon",
  "Singer",
  "Abans",
  "Cargills Food City",
  "Arpico Supercentre",
  "House of Fashion",
  "Cool Planet",
  "Galle Face Hotel",
  "Jetwing Hotels",
  "Cinnamon Lakeside",
  "Mlesna Tea Centre",
  "Cinnamon Air",
  "Edna Chocolates",
];

const SAMPLES: Sample[] = [
  {
    title: "30% off all-day buffet",
    description:
      "Enjoy 30% off the lunch and dinner buffet at participating outlets. Maximum discount LKR 5,000 per bill.",
    merchant: "Cinnamon Lakeside",
    categorySlug: "dining",
    startDays: -5,
    endDays: 25,
    source: "https://example.lk/cinnamon-lakeside-buffet",
    bankSlugs: ["commercial-bank", "sampath"],
    cardTypes: ["Visa Credit", "Mastercard Credit"],
  },
  {
    title: "Buy 1 Get 1 Free Whopper",
    description:
      "BOGO Whopper every Friday at all Burger King outlets nationwide.",
    merchant: "Burger King",
    categorySlug: "dining",
    startDays: -10,
    endDays: 50,
    source: "https://example.lk/bk-bogo-friday",
    bankSlugs: ["hnb", "boc"],
    cardTypes: ["Visa Credit", "Visa Debit"],
  },
  {
    title: "20% off family meals",
    description: "Enjoy 20% off any family meal combo at Pizza Hut dine-in.",
    merchant: "Pizza Hut",
    categorySlug: "dining",
    startDays: -3,
    endDays: 40,
    source: "https://example.lk/ph-family",
    bankSlugs: ["sampath"],
    cardTypes: ["Mastercard Credit", "Mastercard Debit"],
  },
  {
    title: "15% off online orders",
    description:
      "Skip the queue — get 15% off when you order online through the McDonald's app.",
    merchant: "McDonald's",
    categorySlug: "dining",
    startDays: -2,
    endDays: 28,
    source: "https://example.lk/mcd-online",
    bankSlugs: ["commercial-bank", "ndb"],
    cardTypes: ["Visa Credit", "Visa Debit"],
  },
  {
    title: "Bucket meal 25% off",
    description:
      "25% off the famous 8-piece bucket meal at every KFC restaurant.",
    merchant: "KFC",
    categorySlug: "dining",
    startDays: -1,
    endDays: 14,
    source: "https://example.lk/kfc-bucket",
    bankSlugs: ["commercial-bank", "hnb", "sampath"],
    cardTypes: ["Visa Credit", "Mastercard Credit"],
  },
  {
    title: "Spa treatments — 20% cardholder discount",
    description:
      "Indulge in signature Ayurvedic spa rituals with an exclusive 20% off for cardholders.",
    merchant: "Spa Ceylon",
    categorySlug: "shopping",
    startDays: 0,
    endDays: 60,
    source: "https://example.lk/spa-ceylon",
    bankSlugs: ["ndb"],
    cardTypes: ["Amex"],
  },
  {
    title: "Up to 24-month interest-free instalments",
    description:
      "Buy any Singer product over LKR 50,000 and pay in interest-free instalments.",
    merchant: "Singer",
    categorySlug: "electronics",
    startDays: -20,
    endDays: 70,
    source: "https://example.lk/singer-installments",
    bankSlugs: ["commercial-bank", "hnb", "sampath", "boc"],
    cardTypes: ["Visa Credit", "Mastercard Credit"],
  },
  {
    title: "Smart TV bundle — extra 10% off",
    description:
      "Get an additional 10% off the displayed price on selected smart TVs at Abans showrooms.",
    merchant: "Abans",
    categorySlug: "electronics",
    startDays: -5,
    endDays: 35,
    source: "https://example.lk/abans-tv",
    bankSlugs: ["sampath", "ndb"],
    cardTypes: ["Visa Credit"],
  },
  {
    title: "5% off weekend groceries",
    description:
      "Save 5% on all grocery purchases above LKR 5,000 at Cargills Food City stores on weekends.",
    merchant: "Cargills Food City",
    categorySlug: "groceries",
    startDays: -7,
    endDays: 21,
    source: "https://example.lk/cargills-weekend",
    bankSlugs: ["commercial-bank", "boc"],
    cardTypes: ["Visa Debit", "Mastercard Debit"],
  },
  {
    title: "10% off Arpico Supercentre",
    description:
      "Flat 10% off your bill at any Arpico Supercentre with selected cards.",
    merchant: "Arpico Supercentre",
    categorySlug: "groceries",
    startDays: -3,
    endDays: 12,
    source: "https://example.lk/arpico-flat",
    bankSlugs: ["hnb", "nsb"],
    cardTypes: ["Visa Credit", "Visa Debit"],
  },
  {
    title: "Seasonal sale — 30% off",
    description:
      "End-of-season sale on apparel and accessories at House of Fashion outlets.",
    merchant: "House of Fashion",
    categorySlug: "shopping",
    startDays: -2,
    endDays: 18,
    source: "https://example.lk/hof-sale",
    bankSlugs: ["sampath", "commercial-bank"],
    cardTypes: ["Mastercard Credit"],
  },
  {
    title: "20% off home appliances",
    description:
      "Cool Planet stores offer 20% off selected refrigerators and washing machines.",
    merchant: "Cool Planet",
    categorySlug: "electronics",
    startDays: -1,
    endDays: 45,
    source: "https://example.lk/cool-planet",
    bankSlugs: ["boc", "ndb"],
    cardTypes: ["Visa Credit", "Mastercard Credit"],
  },
  {
    title: "High Tea for two — 1+1 free",
    description:
      "Enjoy iconic high tea at Galle Face Hotel with the second guest on us.",
    merchant: "Galle Face Hotel",
    categorySlug: "dining",
    startDays: 0,
    endDays: 90,
    source: "https://example.lk/galle-face-tea",
    bankSlugs: ["hnb", "sampath"],
    cardTypes: ["Amex", "Visa Credit"],
  },
  {
    title: "15% off Jetwing stays",
    description:
      "Book direct on jetwinghotels.com and get an extra 15% off your stay.",
    merchant: "Jetwing Hotels",
    categorySlug: "travel",
    startDays: -10,
    endDays: 100,
    source: "https://example.lk/jetwing-15",
    bankSlugs: ["commercial-bank", "hnb"],
    cardTypes: ["Visa Credit", "Mastercard Credit"],
  },
  {
    title: "Premium seaplane transfer 25% off",
    description:
      "Cinnamon Air seaplane transfers between Colombo and resort destinations at 25% off.",
    merchant: "Cinnamon Air",
    categorySlug: "travel",
    startDays: -5,
    endDays: 55,
    source: "https://example.lk/cinnamon-air",
    bankSlugs: ["ndb"],
    cardTypes: ["Amex"],
  },
  {
    title: "Buy 3 get 1 free chocolates",
    description:
      "Mix-and-match any 3 boxes of Edna chocolates and get the 4th free.",
    merchant: "Edna Chocolates",
    categorySlug: "shopping",
    startDays: -1,
    endDays: 30,
    source: "https://example.lk/edna-bogo",
    bankSlugs: ["sampath", "boc"],
    cardTypes: ["Visa Debit", "Mastercard Debit"],
  },
  {
    title: "Tea tasting on us",
    description:
      "Complimentary tea tasting session at Mlesna outlets when you spend over LKR 3,000.",
    merchant: "Mlesna Tea Centre",
    categorySlug: "shopping",
    startDays: -2,
    endDays: 65,
    source: "https://example.lk/mlesna-tasting",
    bankSlugs: ["commercial-bank"],
    cardTypes: ["Visa Credit"],
  },
];

async function main() {
  console.log("Dev seed: ensuring test users and sample offers…");

  const passwordHash = await bcrypt.hash("password123", 10);
  await db
    .insert(users)
    .values([
      {
        name: "Test Maintainer",
        email: "maintainer@example.com",
        passwordHash,
        role: "maintainer",
      },
      {
        name: "Test User",
        email: "user@example.com",
        passwordHash,
        role: "user",
      },
    ])
    .onConflictDoNothing({ target: users.email });

  const allBanks = await db.select().from(banks);
  const allCardTypes = await db.select().from(cardTypes);
  const allCategories = await db.select().from(categories);
  if (allBanks.length === 0 || allCardTypes.length === 0 || allCategories.length === 0) {
    console.error(
      "Run `bun db:seed` first — dev seed expects banks/card types/categories to exist.",
    );
    await pgClient.end();
    process.exit(1);
  }

  for (const name of DEV_MERCHANTS) {
    const existing = await db
      .select({ id: merchants.id })
      .from(merchants)
      .where(sql`lower(${merchants.name}) = lower(${name})`)
      .limit(1);
    if (!existing[0]) await db.insert(merchants).values({ name });
  }

  const allMerchants = await db.select().from(merchants);
  const today = new Date();

  let created = 0;
  let skipped = 0;
  for (const s of SAMPLES) {
    const merchant = allMerchants.find(
      (m) => m.name.toLowerCase() === s.merchant.toLowerCase(),
    );
    const category = allCategories.find((c) => c.slug === s.categorySlug);
    if (!merchant || !category) continue;

    const exists = await db
      .select({ id: offers.id })
      .from(offers)
      .where(sql`${offers.sourceUrl} = ${s.source}`)
      .limit(1);
    if (exists[0]) {
      skipped++;
      continue;
    }

    const start = new Date(today);
    start.setDate(start.getDate() + s.startDays);
    const end = new Date(today);
    end.setDate(end.getDate() + s.endDays);
    const startDate = start.toISOString().slice(0, 10);
    const endDate = end.toISOString().slice(0, 10);
    const isExpired = end < today;

    const inserted = await db
      .insert(offers)
      .values({
        title: s.title,
        description: s.description,
        merchantId: merchant.id,
        categoryId: category.id,
        startDate,
        endDate,
        status: isExpired ? "expired" : "published",
        sourceUrl: s.source,
        publishedAt: isExpired ? null : new Date(),
      })
      .returning({ id: offers.id });

    const offerId = inserted[0].id;
    const bankIds = allBanks
      .filter((b) => s.bankSlugs.includes(b.slug))
      .map((b) => b.id);
    const cardTypeIds = allCardTypes
      .filter((ct) => s.cardTypes.includes(ct.name))
      .map((ct) => ct.id);
    for (const bankId of bankIds) {
      await db
        .insert(offerBanks)
        .values({ offerId, bankId })
        .onConflictDoNothing();
    }
    for (const cardTypeId of cardTypeIds) {
      await db
        .insert(offerCardTypes)
        .values({ offerId, cardTypeId })
        .onConflictDoNothing();
    }
    created++;
  }

  console.log(
    `Dev seed complete. Offers created: ${created}, skipped: ${skipped}. Test users: maintainer@example.com / user@example.com (password: password123).`,
  );
  await pgClient.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

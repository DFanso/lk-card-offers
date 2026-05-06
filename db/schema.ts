import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", [
  "user",
  "maintainer",
  "admin",
  "super_admin",
]);

export const offerStatus = pgEnum("offer_status", [
  "pending_review",
  "published",
  "expired",
  "rejected",
]);

export const submissionStatus = pgEnum("submission_status", [
  "pending_review",
  "approved",
  "rejected",
]);

export const maintainerRequestStatus = pgEnum("maintainer_request_status", [
  "pending",
  "approved",
  "rejected",
]);

export const cardTypeKind = pgEnum("card_type_kind", [
  "credit",
  "debit",
  "other",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRole("role").notNull().default("user"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    emailUnique: uniqueIndex("users_email_unique").on(table.email),
  }),
);

export const maintainerRequests = pgTable("maintainer_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: maintainerRequestStatus("status").notNull().default("pending"),
  reviewedBy: uuid("reviewed_by").references(() => users.id, {
    onDelete: "set null",
  }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const banks = pgTable(
  "banks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    logoUrl: text("logo_url"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    slugUnique: uniqueIndex("banks_slug_unique").on(table.slug),
  }),
);

export const cardTypes = pgTable("card_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  kind: cardTypeKind("kind").notNull().default("credit"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const merchants = pgTable("merchants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  contact: text("contact"),
  locationSummary: text("location_summary"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    parentId: uuid("parent_id"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    slugUnique: uniqueIndex("categories_slug_unique").on(table.slug),
  }),
);

export const offers = pgTable(
  "offers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    imageUrl: text("image_url"),
    merchantId: uuid("merchant_id").references(() => merchants.id, {
      onDelete: "set null",
    }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    status: offerStatus("status").notNull().default("pending_review"),
    sourceUrl: text("source_url").notNull(),
    locationScope: text("location_scope"),
    scheduleJson: jsonb("schedule_json"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    publishedByMaintainerId: uuid("published_by_maintainer_id").references(
      () => users.id,
      { onDelete: "set null" },
    ),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    statusIdx: index("offers_status_idx").on(table.status),
    endDateIdx: index("offers_end_date_idx").on(table.endDate),
    merchantIdx: index("offers_merchant_idx").on(table.merchantId),
    categoryIdx: index("offers_category_idx").on(table.categoryId),
  }),
);

export const offerBanks = pgTable(
  "offer_banks",
  {
    offerId: uuid("offer_id")
      .notNull()
      .references(() => offers.id, { onDelete: "cascade" }),
    bankId: uuid("bank_id")
      .notNull()
      .references(() => banks.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.offerId, table.bankId] }),
    bankIdx: index("offer_banks_bank_idx").on(table.bankId),
  }),
);

export const offerCardTypes = pgTable(
  "offer_card_types",
  {
    offerId: uuid("offer_id")
      .notNull()
      .references(() => offers.id, { onDelete: "cascade" }),
    cardTypeId: uuid("card_type_id")
      .notNull()
      .references(() => cardTypes.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.offerId, table.cardTypeId] }),
    cardTypeIdx: index("offer_card_types_card_type_idx").on(table.cardTypeId),
  }),
);

export const offerSubmissions = pgTable("offer_submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  submittedByUserId: uuid("submitted_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  payload: jsonb("payload").notNull(),
  status: submissionStatus("status").notNull().default("pending_review"),
  approvedByMaintainerId: uuid("approved_by_maintainer_id").references(
    () => users.id,
    { onDelete: "set null" },
  ),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewNote: text("review_note"),
  resultingOfferId: uuid("resulting_offer_id").references(() => offers.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  submissions: many(offerSubmissions),
  maintainerRequests: many(maintainerRequests),
  createdOffers: many(offers),
}));

export const maintainerRequestsRelations = relations(
  maintainerRequests,
  ({ one }) => ({
    user: one(users, {
      fields: [maintainerRequests.userId],
      references: [users.id],
    }),
    reviewer: one(users, {
      fields: [maintainerRequests.reviewedBy],
      references: [users.id],
    }),
  }),
);

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "parent_child",
  }),
  children: many(categories, { relationName: "parent_child" }),
  offers: many(offers),
}));

export const merchantsRelations = relations(merchants, ({ many }) => ({
  offers: many(offers),
}));

export const banksRelations = relations(banks, ({ many }) => ({
  offerBanks: many(offerBanks),
}));

export const cardTypesRelations = relations(cardTypes, ({ many }) => ({
  offerCardTypes: many(offerCardTypes),
}));

export const offersRelations = relations(offers, ({ one, many }) => ({
  merchant: one(merchants, {
    fields: [offers.merchantId],
    references: [merchants.id],
  }),
  category: one(categories, {
    fields: [offers.categoryId],
    references: [categories.id],
  }),
  createdBy: one(users, {
    fields: [offers.createdByUserId],
    references: [users.id],
  }),
  publishedBy: one(users, {
    fields: [offers.publishedByMaintainerId],
    references: [users.id],
  }),
  banks: many(offerBanks),
  cardTypes: many(offerCardTypes),
}));

export const offerBanksRelations = relations(offerBanks, ({ one }) => ({
  offer: one(offers, {
    fields: [offerBanks.offerId],
    references: [offers.id],
  }),
  bank: one(banks, {
    fields: [offerBanks.bankId],
    references: [banks.id],
  }),
}));

export const offerCardTypesRelations = relations(offerCardTypes, ({ one }) => ({
  offer: one(offers, {
    fields: [offerCardTypes.offerId],
    references: [offers.id],
  }),
  cardType: one(cardTypes, {
    fields: [offerCardTypes.cardTypeId],
    references: [cardTypes.id],
  }),
}));

export const offerSubmissionsRelations = relations(
  offerSubmissions,
  ({ one }) => ({
    submittedBy: one(users, {
      fields: [offerSubmissions.submittedByUserId],
      references: [users.id],
    }),
    approvedBy: one(users, {
      fields: [offerSubmissions.approvedByMaintainerId],
      references: [users.id],
    }),
    resultingOffer: one(offers, {
      fields: [offerSubmissions.resultingOfferId],
      references: [offers.id],
    }),
  }),
);

export type UserRoleValue = (typeof userRole.enumValues)[number];
export type OfferStatusValue = (typeof offerStatus.enumValues)[number];
export type SubmissionStatusValue = (typeof submissionStatus.enumValues)[number];
export type MaintainerRequestStatusValue =
  (typeof maintainerRequestStatus.enumValues)[number];
export type CardTypeKindValue = (typeof cardTypeKind.enumValues)[number];

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Bank = typeof banks.$inferSelect;
export type CardType = typeof cardTypes.$inferSelect;
export type Merchant = typeof merchants.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Offer = typeof offers.$inferSelect;
export type NewOffer = typeof offers.$inferInsert;
export type OfferSubmission = typeof offerSubmissions.$inferSelect;
export type MaintainerRequest = typeof maintainerRequests.$inferSelect;

# Contributing

Thanks for your interest. This project is a community catalog of Sri Lankan credit/debit card promotions — every accurate offer, fix, and scraper helps.

## Dev setup

Runtime is **Bun**. Database is **PostgreSQL** (local or remote).

```bash
bun install
cp .env.example .env       # fill in DATABASE_URL, AUTH_SECRET, NEXTAUTH_URL, CRON_SECRET
bun db:create              # creates the database if missing
bun db:migrate             # apply migrations
bun db:seed                # super admin + reference data + sample offers
bun dev                    # http://localhost:3000
```

Log in with the seed super admin (defaults: `super@example.com` / `password123`) to access `/admin` and `/maintainer`.

## Commit style

- Short imperative subject line (≤72 chars), no trailing period.
- Use the present tense: "Add health endpoint", not "Added".
- One concern per commit when possible.
- Body (optional) explains the **why**, not the **what** — the diff already shows the what.

Match the existing `git log --oneline` for tone.

## Coding conventions

- TypeScript-first; prefer real types over `any`. Inputs at boundaries are validated with **Zod 4** (`lib/validation/`).
- Server reads via route handlers in `app/api/**/route.ts` consumed through TanStack Query hooks in `lib/queries/`. Server components read directly from `lib/queries-server/`.
- Writes are **Next.js Server Actions** in `lib/actions/` (`"use server"`). Return the `ActionResult<T>` shape declared in `lib/actions/offers.ts`. Call `revalidatePath` for routes affected by the mutation.
- Role checks: use `requireSession()` / `requireRole(min)` from `lib/rbac.ts`. Compare with `roleAtLeast` — never string-compare role names.
- Auto-expiry of offers is enforced at **read time** in every public listing query, *plus* a bookkeeping cron at `/api/cron/expire-offers`. Don't add a public read path that skips the date filter.
- UI uses **shadcn/ui (base-lyra)** on top of **Base UI** primitives. Tailwind v4 tokens live in `app/globals.css`.
- Path alias: `@/*` → repo root.

## Adding a bank scraper

Each scraper is a one-shot script under `scripts/scrape-<bank>.ts`. They share helpers in `scripts/_shared.ts` (HTML fetch, image download, validity parsing, merchant/category resolution). New scrapers should be idempotent on `offers.sourceUrl`.

Skeleton:

```ts
// scripts/scrape-mybank.ts
import * as cheerio from "cheerio";
import {
  ensureBank,
  fetchHtml,
  getCardTypeIdsByKind,
  importOffer,
  pruneOrphanMerchants,
  resetOffersForBank,
} from "./_shared";

const BASE = "https://mybank.lk";
const LIST_URL = `${BASE}/promotions`;

async function main() {
  const reset = process.argv.includes("--reset");

  const bankId = await ensureBank("My Bank", "mybank");
  if (reset) await resetOffersForBank(bankId);

  const cardTypeIds = await getCardTypeIdsByKind(["credit", "debit"]);

  const html = await fetchHtml(LIST_URL);
  const $ = cheerio.load(html);

  let created = 0;
  let skipped = 0;
  for (const el of $(".promotion-card").toArray()) {
    const detailUrl = new URL($(el).find("a").attr("href")!, BASE).toString();
    const detailHtml = await fetchHtml(detailUrl);
    const $$ = cheerio.load(detailHtml);

    const result = await importOffer(
      {
        title: $$("h1").text().trim(),
        description: $$(".promotion-body").text().trim(),
        imageUrl: $$(".promotion-image img").attr("src") ?? null,
        sourceUrl: detailUrl,
        validityRaw: $$(".validity").text(),
        merchantName: $$(".merchant-name").text().trim(),
        categorySlug: "dining", // pick from seeded categories
      },
      bankId,
      cardTypeIds,
    );
    if (result === "created") created++;
    else skipped++;
  }

  await pruneOrphanMerchants();
  console.log(`Done. Created ${created}, skipped ${skipped}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

Wire it into `package.json` as `"scrape:mybank": "bun run scripts/scrape-mybank.ts"`.

If the bank's image CDN blocks hotlinking (referer check), call `downloadImage(imageUrl, "uploads/scraped/mybank", LIST_URL)` from `_shared.ts` and pass the returned local path as `imageUrl`.

## Schema changes

Schema is the single source of truth — edit `db/schema.ts`, then:

```bash
bun db:generate    # emit migration SQL to db/migrations/
bun db:migrate     # apply locally
```

Commit the generated SQL alongside the schema change. Only use `bun db:push` for throwaway local exploration.

## Before opening a PR

```bash
bun lint           # eslint flat config
bun build          # next build
```

Fill in the PR template — especially screenshots for any UI change.

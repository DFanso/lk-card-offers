# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Runtime is Bun. `next dev` uses Turbopack by default in Next 16.

```bash
bun dev               # dev server on :3000
bun build             # production build
bun start             # serve the build
bun lint              # eslint (flat config in eslint.config.mjs)

bun db:create         # create the database (CREATE DATABASE if missing)
bun db:generate       # drizzle-kit generate — emit SQL to db/migrations/
bun db:migrate        # drizzle-kit migrate — apply pending migrations
bun db:push           # drizzle-kit push — sync schema without migrations (dev only)
bun db:studio         # drizzle-kit studio
bun db:seed           # super admin + reference data + sample offers

bun scrape:dfcc       # ~130 offers; pass `-- --reset` to wipe this bank first
bun scrape:combank    # ~25 offers
bun scrape:peoples    # ~145 offers; downloads images locally (CDN blocks hotlinking)
```

There is no test runner configured. The project has not adopted one — do not assume Jest/Vitest exists.

Manual cron trigger:

```bash
curl -X POST -H "x-cron-secret: $CRON_SECRET" http://localhost:3000/api/cron/expire-offers
```

## Architecture

### Next 16 App Router with renamed middleware

`proxy.ts` at the repo root **is the Next 16 middleware** (Next 16 renamed `middleware.ts` → `proxy.ts`). It wraps the Auth.js `auth()` handler and gates route prefixes by minimum role using `ROLE_RANK` from `lib/rbac.ts`. Adding a new protected area means adding an entry to `PROTECTED_PREFIXES` in `proxy.ts` — there is no other gateway.

### Auth + roles

- Auth.js v5 with **Credentials provider only** (no OAuth), JWT sessions. Configured in `lib/auth.ts`.
- The JWT callback **re-reads `users.role` from the database on every request**. This is intentional: role promotions/demotions take effect on the next request without forcing re-login. Don't "optimize" this away.
- Four roles, ordered by `ROLE_RANK` in `lib/rbac.ts`: `user` (1) < `maintainer` (2) < `admin` (3) < `super_admin` (4). Use `roleAtLeast(role, min)` for comparisons; never compare role strings directly.
- Server-side guards: `requireSession()`, `requireRole(min)` from `lib/rbac.ts`. They throw `AuthError`; route handlers convert with `unauthorizedJson(err)`. Server actions catch and return `{ ok: false, error: "Forbidden" }` instead.
- Session type augmentation lives in `types/next-auth.d.ts`.

### Read vs. write split

- **Reads**: `app/api/**/route.ts` route handlers, consumed client-side via TanStack Query hooks in `lib/queries/`. Server components read directly from `lib/queries-server/`.
- **Writes**: Next.js Server Actions in `lib/actions/` (each file `"use server"`). Mutations call `revalidatePath` for affected routes. Action results follow the `ActionResult<T> = { ok: true; data?: T } | { ok: false; error: string }` shape declared in `lib/actions/offers.ts` — reuse this shape for new actions.
- Body size for server actions is bumped to 6 MB in `next.config.ts` to allow image uploads.

### Database

- Drizzle ORM over `postgres-js`. The `pgClient` is cached on `globalThis` in dev to survive HMR (`db/index.ts`) — preserve this pattern when touching the file.
- Schema is the single source of truth: `db/schema.ts`. All enums are pg enums (e.g. `userRole`, `offerStatus`, `submissionStatus`, `cardTypeKind`); their `.enumValues` are exported as TS union types (`UserRoleValue`, etc.). Don't hand-write these unions elsewhere.
- Many-to-many is explicit join tables: `offerBanks`, `offerCardTypes`. Server-action helper `setOfferLinks` in `lib/actions/offers.ts` is the single place those links are rewritten.
- Migrations live in `db/migrations/` and are committed. Use `db:generate` to emit them; only use `db:push` for local exploration.

### Auto-expiry of offers

PRD rule 2.A — offers past `endDate` must not appear publicly. Two layers, both required:

1. **Read-time filter** (always-on): every public listing query in `lib/queries-server/` and the matching `app/api/**` handlers must `WHERE status = 'published' AND end_date >= today`. Don't add a public read path that skips this.
2. **Bookkeeping**: `expireDueOffers()` in `lib/actions/offers.ts` flips `published` → `expired`. Exposed at `POST /api/cron/expire-offers`, header-guarded by `CRON_SECRET`.

### Submission flow

- `user` submits → row in `offer_submissions` (`payload` is the full offer JSON). Maintainer reviews from `app/maintainer/queue/`.
- On approve, the submission's `payload` is materialized into an `offers` row plus join-table inserts; submission's `resultingOfferId` is filled. New merchants in the payload are created on the fly via `resolveMerchantId` in `lib/actions/merchants-resolve.ts` — case-insensitive dedup. Use that helper rather than inserting into `merchants` directly from action code.
- Maintainers can also create offers directly (skipping the queue) via `lib/actions/offers.ts:createOffer`.

### Image uploads

`lib/actions/upload.ts:uploadOfferImage` is the only path that writes user-supplied images. Files land in `public/uploads/offers/` with random UUID names. It validates MIME (`jpeg|png|webp|gif`), enforces 5 MB cap, and requires a logged-in session. Scrapers use a parallel path that writes under `public/uploads/scraped/<bank>/` (see `scripts/_shared.ts`).

### Scrapers

- Each `scripts/scrape-*.ts` is idempotent on `offers.sourceUrl` (UPSERT-style). Re-running is safe; `-- --reset` (note the `--` separator for `bun`) wipes that bank's offers before re-importing.
- Shared helpers in `scripts/_shared.ts`: `fetchHtml`, `cleanMerchantName`, image-download utilities. New scrapers should reuse these rather than re-implementing fetch/parse.
- People's Bank's CDN blocks hotlinking — its scraper downloads images and rewrites `imageUrl` to a local path. If you add a new bank with the same restriction, copy that approach.

### Validation

Zod 4 schemas in `lib/validation/` are the boundary contract. Server actions parse with `safeParse` and return `{ ok: false, error }` on failure. Don't bypass this — types alone don't reach the runtime.

### UI

- shadcn/ui (base-lyra style) over Base UI primitives, not Radix. Components in `components/ui/`.
- Tailwind v4 with `@tailwindcss/postcss`. Global tokens in `app/globals.css`.
- Shared offer create/edit/submit form: `components/forms/offer-form.tsx` — same component drives all three flows, switched by props.
- Path alias `@/*` → repo root (see `tsconfig.json`).

## PRD

Product rules and acceptance criteria live in `docs/sri-lanka-credit-card-offers-prd.md`. When in doubt about expected behavior (especially around auto-expiry, role permissions, and submission lifecycle), defer to that document.

# LK Card Offers

![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-000000?style=for-the-badge&logo=shadcnui&logoColor=white)
![Drizzle](https://img.shields.io/badge/Drizzle-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white)

A community-curated catalog of valid credit and debit card promotions from Sri Lankan banks. Filter by bank, card type, and category to find deals that match the cards in your wallet — no scraping noise, no expired clutter.

---

## Features

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>Public catalog</h3>
      <p>Browse hundreds of live card promotions, filter by bank, card type, category, or keyword. Editorial cards with images, validity countdowns, and source links. Read-time auto-expiry hides offers past their end date.</p>
    </td>
    <td width="50%" valign="top">
      <h3>Role-based access</h3>
      <p>Four roles wired through Auth.js: <code>user</code>, <code>maintainer</code>, <code>admin</code>, <code>super_admin</code>. Role is refreshed from the DB on every JWT callback, so promotions take effect on the next request without re-login.</p>
    </td>
  </tr>
  <tr>
    <td valign="top">
      <h3>Submission queue</h3>
      <p>Logged-in users submit new offers. Maintainers review pending submissions, approve to publish (auto-creating new merchants), or reject with a note. Direct-publish path for trusted maintainer entries.</p>
    </td>
    <td valign="top">
      <h3>Admin master data</h3>
      <p>CRUD for banks, card types, categories, merchants. Soft-delete on entries referenced by live offers protects the catalog. Maintainer-request queue and super-admin user-role management.</p>
    </td>
  </tr>
  <tr>
    <td valign="top">
      <h3>Bank scrapers</h3>
      <p>One-shot import scripts for DFCC, Commercial Bank, and People's Bank pull ~300 offers in seconds. Idempotent on source URL; <code>--reset</code> wipes per-bank entries before re-importing. Hotlinked images are downloaded locally to bypass referer protection.</p>
    </td>
    <td valign="top">
      <h3>Image uploads</h3>
      <p>Optional promo image per offer via paste-URL or file upload (JPG/PNG/WEBP/GIF up to 5 MB). Uploaded files land under <code>/public/uploads/offers/</code>. Server action validates MIME, size, and auth before writing.</p>
    </td>
  </tr>
  <tr>
    <td valign="top">
      <h3>Searchable merchants</h3>
      <p>~280 merchants in the catalog. Offer form uses a Combobox so picking among them is type-ahead fast, and a "+ Add new merchant" toggle lets contributors propose new ones inline (case-insensitive dedup at save time).</p>
    </td>
    <td valign="top">
      <h3>Distinctive design</h3>
      <p>Financial-wire/terminal aesthetic: JetBrains Mono everywhere, sharp 0-radius corners, warm bone background with a saffron-amber accent, section codes and hairline rules. Mobile-responsive header, hero, filters, and cards.</p>
    </td>
  </tr>
</table>

---

## Tech Stack

<table>
  <tr>
    <td width="33%" valign="top">
      <h3>Frontend</h3>
      <ul>
        <li><a href="https://nextjs.org/">Next.js 16</a> App Router (Turbopack)</li>
        <li><a href="https://react.dev/">React 19</a></li>
        <li><a href="https://tailwindcss.com/">Tailwind CSS v4</a></li>
        <li><a href="https://ui.shadcn.com/">shadcn/ui</a> (base-lyra style)</li>
        <li><a href="https://base-ui.com/">Base UI</a> primitives</li>
        <li><a href="https://hugeicons.com/">Hugeicons</a></li>
        <li>JetBrains Mono via <code>next/font</code></li>
      </ul>
    </td>
    <td width="33%" valign="top">
      <h3>Backend</h3>
      <ul>
        <li><a href="https://orm.drizzle.team/">Drizzle ORM</a></li>
        <li><a href="https://www.postgresql.org/">PostgreSQL</a> via <code>postgres-js</code></li>
        <li><a href="https://authjs.dev/">Auth.js v5</a> (Credentials, JWT)</li>
        <li><a href="https://www.npmjs.com/package/bcryptjs">bcryptjs</a> password hashing</li>
        <li>Next.js Server Actions for mutations</li>
        <li>Route Handlers for read APIs</li>
      </ul>
    </td>
    <td width="33%" valign="top">
      <h3>State, validation, scraping</h3>
      <ul>
        <li><a href="https://tanstack.com/query/latest">TanStack Query v5</a></li>
        <li><a href="https://github.com/pmndrs/zustand">Zustand</a> (client UI state)</li>
        <li><a href="https://zod.dev/">Zod 4</a> (input validation)</li>
        <li><a href="https://cheerio.js.org/">Cheerio</a> (bank scrapers)</li>
        <li><a href="https://sonner.emilkowal.ski/">Sonner</a> (toasts)</li>
        <li><a href="https://bun.sh/">Bun</a> + <code>tsx</code> (runtime + scripts)</li>
      </ul>
    </td>
  </tr>
</table>

---

## Getting Started

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment variables

Copy the example file and fill in the values:

```bash
cp .env.example .env
```

| Variable                   | Purpose                                                              |
| -------------------------- | -------------------------------------------------------------------- |
| `DATABASE_URL`             | PostgreSQL connection string (URL-encode special chars in passwords) |
| `AUTH_SECRET`              | JWT signing secret (`openssl rand -base64 32`)                       |
| `NEXTAUTH_URL`             | Site URL — `http://localhost:3000` for dev                           |
| `CRON_SECRET`              | Header secret for the `expire-offers` cron endpoint                  |
| `SEED_SUPERADMIN_EMAIL`    | Bootstrapped super-admin email (default `super@example.com`)         |
| `SEED_SUPERADMIN_PASSWORD` | Bootstrapped super-admin password                                    |

### 3. Create and migrate the database

```bash
bun db:create     # creates the database if it doesn't exist
bun db:migrate    # applies migrations from db/migrations
bun db:seed       # super admin + 6 banks, 5 card types, 6 categories, sample offers
bun db:seed:dev   # (optional, local dev) ~17 sample offers + maintainer@/user@ test accounts
```

### 4. Run the dev server

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with `super@example.com` / `password123` to bootstrap.

---

## Docker

The repo ships a Dockerfile and a `docker-compose.yml` that brings up Postgres and the app together. The app entrypoint waits for Postgres, creates the database if it's missing, runs migrations, seeds reference data, then starts Next.js.

```bash
cp .env.example .env       # set AUTH_SECRET at minimum
docker compose up --build
```

Then open [http://localhost:3000](http://localhost:3000). User uploads land in the `uploads` named volume so they survive image rebuilds.

To run just the app against an existing Postgres (e.g. a managed DB):

```bash
docker build -t lk-card-offers .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL='postgres://...' \
  -e AUTH_SECRET='...' \
  -e NEXTAUTH_URL='https://your-domain' \
  -e CRON_SECRET='...' \
  lk-card-offers
```

Entrypoint knobs:
- `SKIP_DB_BOOTSTRAP=1` — skip the create/migrate/seed steps (use for sidecar containers).
- `SKIP_SEED=1` — run create + migrate, skip seed (useful when seed already ran from a different image).
- `DB_WAIT_TIMEOUT=60` — seconds to wait for Postgres readiness (default 60).

### Running scrapers inside a deployed container

All `bun scrape:*` and `bun run merchants:normalize` / `bun run uploads:prune` commands work inside the running container — `DATABASE_URL` and `AUTH_SECRET` are inherited from the app process.

**One-off (manual import or maintenance):**

```bash
# Find the container id (Docker)
docker ps --filter ancestor=lk-card-offers

# Or in Dokploy → your service → "Terminal" tab. Then:
bun run scrape:ndb
bun run scrape:ntb
bun run scrape:dfcc
bun run scrape:combank
bun run scrape:peoples
bun run scrape:hnb
bun run merchants:normalize
bun run uploads:prune
bun run banks:dedupe         # one-off: merge dupe bank rows (e.g. peoples/peoples-bank)
```

> ⚠️ **Persistent volume required for scraped images.** The People's Bank scraper downloads images to `/app/public/uploads/scraped/peoples/` because that CDN blocks hotlinking. If your deploy doesn't mount a volume at `/app/public/uploads`, the files vanish on every container restart and the offer cards show 404'd images. In Dokploy → your service → **Volumes**, add `/app/public/uploads` mapped to a host directory or named volume, then re-run `bun run scrape:peoples` once to repopulate.

**Scheduled (GitHub Actions, every 6 hours):**

`.github/workflows/cron-scrapers.yml` triggers each scraper via HTTP every 6 hours, staggered 10 min apart. The route handler at `POST /api/cron/scrape/[bank]` is header-guarded by `CRON_SECRET` and spawns the matching `bun scripts/scrape-<bank>.ts` as a background subprocess inside the running container. It replies `202 started` once the child PID is up — output streams to the container logs.

| Schedule (UTC)   | Bank                            |
| ---------------- | ------------------------------- |
| `0 */6 * * *`    | NDB (`scrape-ndb`)              |
| `10 */6 * * *`   | NTB (`scrape-ntb`)              |
| `20 */6 * * *`   | DFCC (`scrape-dfcc`)            |
| `30 */6 * * *`   | Commercial Bank (`scrape-combank`) |
| `40 */6 * * *`   | People's Bank (`scrape-peoples`)|
| `50 */6 * * *`   | HNB (`scrape-hnb`)              |

Enable it by setting two repository secrets:

- `CRON_SCRAPE_BASE_URL` — e.g. `https://your-domain` (no trailing slash)
- `CRON_SECRET` — same value as the server `CRON_SECRET` env var

You can also trigger any single bank manually from the Actions tab (workflow_dispatch). Each scraper is idempotent on `offers.sourceUrl`, so a re-run just picks up anything new.

For `merchants:normalize` and `uploads:prune` (housekeeping that doesn't need the every-6h cadence), run them ad-hoc from the Dokploy Terminal as shown above.

---

## Bank Importers

The catalog is seeded with sample data; for real volume run the scrapers.

```bash
bun scrape:dfcc          # ~130 offers from dfcc.lk/credit-card-promotions
bun scrape:combank       # ~25 offers from combank.lk/rewards-promotions
bun scrape:peoples       # ~145 offers from peoplesbank.lk/special-offers
bun scrape:ndb           # NDB Bank — paginated by category at /cards/card-offers/{category}
bun scrape:ntb           # Nations Trust Bank — one DB offer per merchant row on each /promotions bucket page
bun scrape:hnb           # HNB Bank — JSON API at venus.hnb.lk (~850 offers, the biggest catalog)
```

Each scraper is idempotent on `sourceUrl` — safe to re-run on a schedule. Pass `-- --reset` to wipe that bank's offers and re-import:

```bash
bun scrape:dfcc -- --reset
```

People's Bank's image CDN blocks hotlinking, so its scraper downloads images to `/public/uploads/scraped/peoples/` and rewrites the URL to a local path. HNB images hotlink directly off `assets.hnb.lk` (S3), no download needed.

For the full state of bank coverage (including Sampath, BOC, NSB, Pan Asia and why each isn't shipped), see [scripts/SCRAPERS.md](scripts/SCRAPERS.md).

---

## Auto-expiry

Per PRD rule 2.A, offers past their `endDate` are hidden from the public listing.

- **Read-time** (always-on): every public listing query joins on `status = 'published' AND end_date >= today`.
- **Bookkeeping**: `expireDueOffers()` flips `published` → `expired` for due rows. Exposed at `POST /api/cron/expire-offers` (header-guarded by `CRON_SECRET`).

```bash
curl -X POST -H "x-cron-secret: $CRON_SECRET" \
  https://your-domain/api/cron/expire-offers
```

A GitHub Actions workflow (`.github/workflows/cron-expire-offers.yml`) hits this endpoint hourly. To enable it, set two repository secrets:

- `CRON_EXPIRE_OFFERS_URL` — e.g. `https://your-domain/api/cron/expire-offers`
- `CRON_SECRET` — same value as the server `CRON_SECRET` env var

You can also trigger the workflow manually via the Actions tab (workflow_dispatch).

---

## Health

`GET /api/health` returns JSON with app status, DB reachability, and uptime in seconds. Returns 200 when the DB responds, 503 otherwise. Wire it into any uptime monitor or load-balancer health check.

```bash
curl https://your-domain/api/health
# { "status": "ok", "db": "ok", "uptime": 42 }
```

---

## Project Structure

```
app/
  (auth)/login,register/        # auth pages
  account/                      # logged-in user account
  admin/                        # admin master data + offers + users
  api/                          # JSON read endpoints + cron
  maintainer/                   # submission queue + offer publish
  offers/                       # public listing + detail
  page.tsx                      # editorial home
components/
  forms/offer-form.tsx          # shared create/edit/submit form
  site/                         # header, footer, nav, cards, filters
  ui/                           # shadcn primitives (Base UI based)
db/
  schema.ts                     # Drizzle table + enum definitions
  migrations/                   # generated SQL migrations
  seed.ts                       # initial seed data
lib/
  actions/                      # server actions (auth, offers, master, …)
  auth.ts                       # Auth.js v5 config + role refresh
  queries-server/               # server-side DB read helpers
  queries/                      # client TanStack Query hooks
  rbac.ts                       # role hierarchy and guards
  validation/                   # Zod schemas
scripts/
  _shared.ts                    # shared scraper helpers
  scrape-{dfcc,combank,peoples}.ts
  create-database.ts
proxy.ts                        # Next 16 middleware: route role gating
```

---

## Roles

| Role          | Can                                                                |
| ------------- | ------------------------------------------------------------------ |
| `user`        | Browse offers, submit offers, request maintainer access             |
| `maintainer`  | All of the above + approve/reject submissions, publish direct offers |
| `admin`       | All of the above + master data CRUD, approve maintainer requests    |
| `super_admin` | All of the above + assign any role to any user                      |

---

## License

[MIT](LICENSE) © 2026 Leo Gavin

# Scrapers

This catalog imports offers from Sri Lankan banks via one-shot scripts under `scripts/scrape-*.ts`. Each script is idempotent on `offers.sourceUrl`; pass `-- --reset` to wipe and re-import that bank.

## Live scrapers

| Bank          | Script               | Source                                                        | Notes                                                                 |
| ------------- | -------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------- |
| DFCC          | `bun scrape:dfcc`    | `dfcc.lk/cards/cards-promotions/`                             | ~130 offers, paginated by category slug                               |
| Commercial    | `bun scrape:combank` | `combank.lk/rewards-promotions`                               | ~25 offers, single page split by `div.offers-row[id]`                 |
| People's Bank | `bun scrape:peoples` | `peoplesbank.lk/special-offers`                               | ~145 offers, downloads images locally (CDN blocks hotlinking)         |
| NDB           | `bun scrape:ndb`     | `ndbbank.com/cards/card-offers/{category}`                    | 8 category pages, Bootstrap-rendered SSR — `.card.offer-card` per offer |
| Nations Trust | `bun scrape:ntb`     | `nationstrust.com/promotions` + per-bucket detail pages       | Listing has ~20 buckets; each bucket detail page contains a `.saving-rate-table` with one merchant per `<tr>`. One DB offer per merchant row. |
| HNB           | `bun scrape:hnb`     | JSON API at `venus.hnb.lk/api/get_all_web_card_promos`        | ~845 offers in one request (`?limit=2000`). Images hotlinked from `assets.hnb.lk/atdi/`. No category info in the API — assigned via title-keyword heuristic. |
| mypromo.lk    | `bun scrape:mypromo` | `mypromo.lk/promotions/morecatpromos` (paginated HTML chunks) | ~80 distinct promos across 11 category pages. Aggregator covering banks we can't reach directly (Amana, BOC, Sampath, HSBC, Citi, Seylan, etc.). Each detail page exposes JSON-LD `Offer` schema with title/image/dates/merchant. Bank affiliation is regex-extracted from the title — most titles don't pin a bank, so those offers attach to the synthetic catch-all bank `mypromo-any` ("Any bank (mypromo)"). Cross-source dedup (`findContentDuplicate` in `_shared.ts`) skips offers we already have from first-party scrapers via fuzzy title + merchant + endDate match. Images hotlinked from `mypromo.azureedge.net`. |
| Seylan        | `bun scrape:seylan`  | `seylan.lk/promotions/cards/{category}?page=N`                 | ~155 offers across 22 categories. Each listing card has a flyer + `<h5>` merchant name + a direct detail-page URL (`seylan.lk/<merchant-slug>-N`). Detail page carries the validity text ("Valid from 07th May - 30th June 2026") and card-kind mentions. Per-merchant detail page is one DB offer. Pagination via `?page=N` until the listing returns no `.promotion-item` divs. |

## Blocked banks (investigated, not shippable without extra infra)

Investigation summary for everything that was requested but couldn't ship:

### Sampath — Nuxt SSR with minified inline payload
- URL: `https://www.sampath.lk/sampath-cards/credit-card-offer`
- The page is rendered server-side by Nuxt. The full offer payload IS embedded in the HTML inside a `window.__NUXT__=(function(a,b,c,...)` IIFE — every variable is single-letter, every string is referenced by position. Extracting offers requires either (a) reverse-engineering the IIFE arg ordering for each release (brittle), or (b) running the IIFE in V8 and reading the resulting object (effectively a headless eval). Strapi-style API guesses (`/api/credit-card-offers`, `/api/card-offers`, `/api/offers`, etc., with and without `?populate=*`) all return 404; only `/api/uploads/*` for static images works.
- **Needs**: headless browser, or a sandboxed JS eval of the inline payload. ~3-6 hours of work either way.

### BOC — CloudFront WAF block (re-confirmed 2026-05)
- URL: `https://www.boc.lk/`
- Still HTTP 403 from CloudFront on every URL, on every UA. Their WAF fingerprints non-residential IPs.
- **Needs**: residential SG/LK proxy, or a headless browser session that solves the WAF challenge.

### NSB — no public promo pages
- URL: `https://www.nsb.lk/`
- NSB is primarily a savings bank. Their sitemap lists ~196 URLs, none mention card promotions or merchant offers. We tried `/promotions`, `/offers`, `/card-offers`, `/credit-card-offers`, `/merchant-discounts`, `/discounts`, `/atm-card-offers` — all 404.
- **Decision**: leave out of the scraper set. If NSB launches a card-promotion section in the future, revisit.

### Pan Asia (PABC) — Sucuri Cloudproxy JS challenge
- URL: `https://www.pabcbank.com/`
- Every HTML page returns a 307 to a Sucuri challenge page that sets a cookie via JavaScript and reloads. `curl` can't satisfy this. Their sitemap is accessible but doesn't include any `/promotions` page — Pan Asia surfaces offers via a homepage carousel only, which isn't accessible without solving the challenge.
- **Needs**: headless browser session that can solve the Sucuri challenge.

### HSBC — bank exited Sri Lanka
- URL: `https://www.hsbc.lk/credit-cards/offers/` → 301 to `/announcements/goodbye/`.
- HSBC has shut down their Sri Lanka retail-banking operation; the cards business no longer exists. Nothing to scrape.
- **Decision**: permanent removal from the candidate list.

### Amana Bank — promotions are PDFs
- URL: `https://www.amanabank.lk/promotions/`
- The promotions index lists PDF flyers (`/pdf/promotions/new-born-promo.pdf`, etc.) rather than HTML pages. PDF parsing is heavy and the extracted text is unreliable.
- **Decision**: skip unless we add a PDF-extraction pipeline.

### Cargills Bank — image-only flyers, no text
- URL: `https://www.cargillsbank.com/products/cargills-bank-cards-promotions/`
- The single product page hosts ~28 promo JPGs in `wp-content/uploads/2018/04/` — all with empty `alt`, no `<h2>`/`<h3>` headings, no validity text in the markup. The flyer image itself contains every detail of the offer.
- **Needs**: OCR pipeline. Otherwise the only extractable signal is filename slugs ("KFC-EDM-1-1", "Banana-Bunks-Kandy") which aren't enough.

### Union Bank — site near-empty
- URL: `https://www.unionb.com/`
- Returns a 959-byte placeholder homepage with no promo section, no sitemap, no card listings.
- **Decision**: skip until the site is rebuilt.

## Adding a new scraper

See [CONTRIBUTING.md](../CONTRIBUTING.md#adding-a-bank-scraper) for the skeleton.

Steps in order:
1. Find the bank's promo URL. Test with `curl -A "<chrome UA>" -sI <url>` first — if it returns 403 or `<noscript>You need JavaScript</noscript>`, you'll need a headless browser.
2. View source on a category page. The selectors you need: an offer container, title text, merchant text, image URL, validity text, detail-page link.
3. Map their category taxonomy → our `categories` table slugs (defined in `db/seed.ts`).
4. Reuse `scripts/_shared.ts` helpers (`fetchHtml`, `cleanMerchantName`, `ensureBank`, `importOffer`, `pruneOrphanMerchants`).
5. Add a row to the live-scrapers table above.
6. (Optional) Add a parser smoke test under `tests/scraper-*.test.ts` with a hand-pasted snippet of the real HTML so a future site redesign is caught in CI.

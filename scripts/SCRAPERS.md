# Scrapers

This catalog imports offers from Sri Lankan banks via one-shot scripts under `scripts/scrape-*.ts`. Each script is idempotent on `offers.sourceUrl`; pass `-- --reset` to wipe and re-import that bank.

## Live scrapers

| Bank          | Script               | Source                                                        | Notes                                                                 |
| ------------- | -------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------- |
| DFCC          | `bun scrape:dfcc`    | `dfcc.lk/cards/cards-promotions/`                             | ~130 offers, paginated by category slug                               |
| Commercial    | `bun scrape:combank` | `combank.lk/rewards-promotions`                               | ~25 offers, single page split by `div.offers-row[id]`                 |
| People's Bank | `bun scrape:peoples` | `peoplesbank.lk/special-offers`                               | ~145 offers, downloads images locally (CDN blocks hotlinking)         |
| NDB           | `bun scrape:ndb`     | `ndbbank.com/cards/card-offers/{category}`                    | 8 category pages, Bootstrap-rendered SSR — `.card.offer-card` per offer |

## Blocked banks (investigated, not shippable without extra infra)

These five were requested in #5. Investigation summary:

### HNB — JS-rendered SPA
- URL: `https://www.hnb.lk/` (the `.net` host doesn't resolve)
- The page is a React SPA; the initial HTML is `<div id="root"></div>` with no offer data. All content is fetched client-side.
- **Needs**: headless browser (Playwright/Puppeteer) — same category of work as issue #16.

### Sampath — Nuxt SSR but offer data is post-hydration
- URL: `https://www.sampath.lk/sampath-cards/credit-card-offer`
- The page is rendered server-side by Nuxt, but the offer cards are populated client-side via XHR. The category list is exposed at `/api/offer-catergories` and the page metadata at `/api/card-offers-page`, but the actual offer-list endpoint is not discoverable by static bundle analysis (we tried `/api/credit-card-offer`, `/api/card-offer-block`, `/api/credit-card-offers?pagination[…]=…`, etc — all 404). Direct detail URLs `/sampath-cards/credit-card-offer/:id` return 500.
- **Needs**: open the page in DevTools, observe the Network panel to capture the real fetch URL, then write a JSON-based scraper. Should be 30–60 min once the endpoint is known. Alternatively, headless browser.

### BOC — CloudFront WAF block
- URL: `https://www.boc.lk/`
- Returns HTTP 403 from CloudFront on every request from our IP, regardless of User-Agent or full browser headers. The WAF likely fingerprints non-Sri Lankan IPs or non-browser clients.
- **Needs**: either a residential SG/LK proxy, or a headless browser session that survives the WAF challenge. Same severity as #16.

### NSB — no public promo pages
- URL: `https://www.nsb.lk/`
- NSB is primarily a savings bank. Their sitemap lists ~196 URLs, none mention card promotions or merchant offers. We tried `/promotions`, `/offers`, `/card-offers`, `/credit-card-offers`, `/merchant-discounts`, `/discounts`, `/atm-card-offers` — all 404. They publish a master card application PDF from 2018 and that's it.
- **Decision**: leave out of the scraper set. If NSB launches a card-promotion section in the future, revisit.

## Adding a new scraper

See [CONTRIBUTING.md](../CONTRIBUTING.md#adding-a-bank-scraper) for the skeleton.

Steps in order:
1. Find the bank's promo URL. Test with `curl -A "<chrome UA>" -sI <url>` first — if it returns 403 or `<noscript>You need JavaScript</noscript>`, you'll need a headless browser.
2. View source on a category page. The selectors you need: an offer container, title text, merchant text, image URL, validity text, detail-page link.
3. Map their category taxonomy → our `categories` table slugs (defined in `db/seed.ts`).
4. Reuse `scripts/_shared.ts` helpers (`fetchHtml`, `cleanMerchantName`, `ensureBank`, `importOffer`, `pruneOrphanMerchants`).
5. Add a row to the live-scrapers table above.
6. (Optional) Add a parser smoke test under `tests/scraper-*.test.ts` with a hand-pasted snippet of the real HTML so a future site redesign is caught in CI.

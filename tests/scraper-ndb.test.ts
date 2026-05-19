import { describe, expect, it } from "vitest";
import { load } from "cheerio";

/**
 * Smoke test for the NDB listing-card selector. Uses a hand-pasted snippet of
 * the actual NDB markup so we get a fast assertion that the selectors keep
 * working without needing a live HTTP fetch. If NDB redesigns their page,
 * update the snippet (or this test catches the breakage during CI).
 */
const NDB_SNIPPET = `
<div class="col-12 col-md-6 col-lg-4  mb-5">
  <a href="/cards/card-offers/offer-details/296" title="View Offer Details">
    <div class="card offer-card h-100 shadow-none">
      <div class="position-relative">
        <img src="https://ndbbankweb.ndbbank.com/cardoffer/images/banner.jpg" class="card-img-top" alt="20% Savings on Food" />
        <img src="https://ndbbankweb.ndbbank.com/media/logo.webp" class="card-img-top position-absolute offercompanylogo" alt="logo" />
      </div>
      <div class="card-body pb-0">
        <h5 class="card-title ndbcolor">20% Savings on Food</h5>
        <p class="card-title">Adityaa - NH Collection Colombo</p>
        <p class="text-muted py-1"> Credit Cards </p>
        <p class="offer-date py-2 mb-0">
          <i class="bi bi-calendar-event"></i> &nbsp;
          Until 31st May 2026
        </p>
      </div>
    </div>
  </a>
</div>
`;

describe("ndb listing card selectors", () => {
  const $ = load(NDB_SNIPPET);
  const anchor = $("a[href*='/cards/card-offers/offer-details/']");

  it("finds the wrapping anchor with the detail-page id", () => {
    expect(anchor.length).toBe(1);
    expect(anchor.attr("href")).toBe("/cards/card-offers/offer-details/296");
  });

  const card = anchor.find(".card.offer-card");

  it("extracts the headline title", () => {
    expect(card.find("h5.card-title").first().text().trim()).toBe(
      "20% Savings on Food",
    );
  });

  it("extracts the merchant name from the body p.card-title", () => {
    expect(card.find(".card-body p.card-title").first().text().trim()).toBe(
      "Adityaa - NH Collection Colombo",
    );
  });

  it("extracts the card-type line", () => {
    expect(card.find(".card-body p.text-muted").first().text().trim()).toBe(
      "Credit Cards",
    );
  });

  it("extracts validity text (collapses whitespace)", () => {
    const validity = card
      .find(".offer-date")
      .first()
      .text()
      .replace(/\s+/g, " ")
      .trim();
    expect(validity).toContain("Until 31st May 2026");
  });

  it("picks the banner image (not the offercompanylogo)", () => {
    let banner: string | null = null;
    card.find("img.card-img-top").each((_i, img) => {
      const $img = $(img);
      if ($img.hasClass("offercompanylogo")) return;
      if (!banner) banner = $img.attr("src") ?? null;
    });
    expect(banner).toBe(
      "https://ndbbankweb.ndbbank.com/cardoffer/images/banner.jpg",
    );
  });
});

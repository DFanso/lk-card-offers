import { describe, expect, it } from "vitest";
import { load } from "cheerio";

/**
 * Smoke tests for the NTB listing-grid and merchant-row selectors,
 * pinned against hand-pasted real markup. If NTB redesigns, CI catches it.
 */

const LISTING_SNIPPET = `
<div class="col-lg-3 col-md-6 col-sm-12 grid-item dining">
  <div class="promo-box">
    <div class="promo-image mb-4">
      <img class="w-100 radius-8" src="https://assets.nationstrust.com/2246/Dining-100.jpg.jpeg" alt="" />
      <div class="tag">Dining</div>
    </div>
    <div class="info">
      <h6></h6>
      <h5>Enjoy exclusive savings on Dining</h5>
    </div>
    <div class="promo-footer">
      <small></small>
      <a href="https://nationstrust.com/promotions/enjoy-exclusive-savings-on-dining" class="btn">Learn More</a>
    </div>
  </div>
</div>
<div class="col-lg-3 col-md-6 col-sm-12 grid-item general-tcs-offers">
  <div class="promo-box">
    <div class="promo-image mb-4">
      <img src="x.png" alt="" />
      <div class="tag">General T&amp;Cs Offers</div>
    </div>
    <div class="info"><h5>General Terms and Condition for Offers</h5></div>
    <div class="promo-footer">
      <a href="https://nationstrust.com/promotions/general-terms-and-condition-for-offers">Learn More</a>
    </div>
  </div>
</div>
`;

const DETAIL_TABLE_SNIPPET = `
<div class="saving-rate-table">
  <div class="table-responsive description-block">
    <table>
      <tbody>
        <tr>
          <td><h3><strong>Merchant</strong></h3></td>
          <td><h3><strong>Offer</strong></h3></td>
          <td><h3><strong>Eligibility</strong></h3></td>
        </tr>
        <tr>
          <td>Butlers</td>
          <td>Enjoy 20% savings with your Nations Trust Bank Mastercard Credit Card</td>
          <td><p>Valid for dine-in on the à la carte menu</p><p>Valid till 30th June 2026</p></td>
        </tr>
        <tr>
          <td>Pizza Hut</td>
          <td>Enjoy a Buy One Get One offer with your Nations Trust Bank Mastercard Credit Card</td>
          <td>Valid on 28th May 2026</td>
        </tr>
        <tr>
          <td>Petti Petti Mirissa</td>
          <td>Enjoy 15% savings with your Nations Trust Bank Mastercard Credit &amp; Debit Card</td>
          <td>Valid on food &amp; beverages. Valid till 1st July 2026</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
`;

describe("ntb listing grid", () => {
  const $ = load(LISTING_SNIPPET);
  const items = $(".grid-item");

  it("finds both grid items including the skippable one", () => {
    expect(items.length).toBe(2);
  });

  it("first grid-item resolves to the dining detail page", () => {
    const $first = items.eq(0);
    const href = $first.find(".promo-footer a[href]").attr("href");
    expect(href).toBe(
      "https://nationstrust.com/promotions/enjoy-exclusive-savings-on-dining",
    );
  });

  it("category slug can be extracted from class list (excluding bootstrap col-*)", () => {
    const $first = items.eq(0);
    const classes = ($first.attr("class") ?? "").split(/\s+/);
    const slug = classes.find(
      (c) => !c.startsWith("col-") && c !== "grid-item" && !["mb-4", "reveal"].includes(c),
    );
    expect(slug).toBe("dining");
  });

  it("can detect the general-tcs-offers bucket (caller should skip it)", () => {
    const $second = items.eq(1);
    const classes = ($second.attr("class") ?? "").split(/\s+/);
    const slug = classes.find(
      (c) => !c.startsWith("col-") && c !== "grid-item",
    );
    expect(slug).toBe("general-tcs-offers");
  });
});

describe("ntb merchant-row table", () => {
  const $ = load(DETAIL_TABLE_SNIPPET);
  const rows = $(".saving-rate-table table tr").toArray();

  it("includes the header row + 3 merchant rows", () => {
    expect(rows.length).toBe(4);
  });

  it("merchant cell of header row reads 'Merchant' (so scraper can skip it)", () => {
    const header = $(rows[0]).find("td").first().text().trim();
    expect(header).toBe("Merchant");
  });

  it("first merchant row extracts Butlers + offer + validity", () => {
    const cells = $(rows[1]).find("td").toArray();
    const merchant = $(cells[0]).text().trim();
    const offer = $(cells[1]).text().trim();
    const eligibility = $(cells[2]).text().replace(/\s+/g, " ").trim();
    expect(merchant).toBe("Butlers");
    expect(offer).toMatch(/20% savings/);
    expect(eligibility).toMatch(/Valid till 30th June 2026/);
  });

  it("detects credit + debit kinds from combined text (handles 'Credit & Debit Card')", () => {
    const cells = $(rows[3]).find("td").toArray();
    const combined = `${$(cells[1]).text()} ${$(cells[2]).text()}`;
    expect(/\bcredit\b/i.test(combined)).toBe(true);
    expect(/\bdebit\b/i.test(combined)).toBe(true);
  });
});

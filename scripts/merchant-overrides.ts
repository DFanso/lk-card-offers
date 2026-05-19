/**
 * Canonical-casing overrides for merchant names that the scrapers
 * pick up from URL slugs. The key is the lowercased current name
 * after `cleanMerchantName`; the value is the canonical brand spelling.
 *
 * Add new entries here whenever you spot a wrong-cased merchant in the
 * catalog, then run `bun merchants:normalize` to apply.
 */
export const MERCHANT_OVERRIDES: Record<string, string> = {
  // chains & brands
  "kfc": "KFC",
  "mcdonalds": "McDonald's",
  "mcdonald's": "McDonald's",
  "dhl": "DHL",
  "bdms wellness clinic": "BDMS Wellness Clinic",
  "nh collection colombo": "NH Collection Colombo",
  "tudolk": "Tudo LK",
  "h&m": "H&M",
  "h & m": "H&M",
  "kfc sri lanka": "KFC",
  "pizza hut sri lanka": "Pizza Hut",
  "burger king sri lanka": "Burger King",
  "ndb bank": "NDB Bank",
  "boc": "Bank of Ceylon",
  "hnb": "Hatton National Bank",
  "nsb": "National Savings Bank",
  "uber": "Uber",
  "pickme": "PickMe",
  "ubereats": "Uber Eats",
  "uber eats": "Uber Eats",
  "fab": "FAB",
  "ikea": "IKEA",
  "ibm": "IBM",
  "ge": "GE",
  "lg": "LG",
  "sap": "SAP",
  "tnt": "TNT",
  "ups": "UPS",
};

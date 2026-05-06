import { NextRequest } from "next/server";
import { listOffers } from "@/lib/queries-server/offers";
import type { OfferStatusValue } from "@/db/schema";

const VALID_STATUSES: OfferStatusValue[] = [
  "pending_review",
  "published",
  "expired",
  "rejected",
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bankIds = searchParams.getAll("bank");
  const cardTypeIds = searchParams.getAll("cardType");
  const categoryId = searchParams.get("category") ?? undefined;
  const q = searchParams.get("q") ?? undefined;
  const statusParam = searchParams.get("status") as OfferStatusValue | null;
  const status = statusParam && VALID_STATUSES.includes(statusParam) ? statusParam : undefined;
  const includeExpired = searchParams.get("includeExpired") === "true";
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "20");

  const result = await listOffers({
    bankIds: bankIds.length ? bankIds : undefined,
    cardTypeIds: cardTypeIds.length ? cardTypeIds : undefined,
    categoryId,
    q,
    status,
    includeExpired,
    page: Number.isFinite(page) ? page : 1,
    pageSize: Number.isFinite(pageSize) ? pageSize : 20,
  });

  return Response.json(result);
}

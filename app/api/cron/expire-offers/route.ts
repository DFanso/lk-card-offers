import { expireDueOffers } from "@/lib/actions/offers";

export async function POST(req: Request) {
  const expected = process.env.CRON_SECRET;
  const got = req.headers.get("x-cron-secret");
  if (!expected || got !== expected) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const result = await expireDueOffers();
  return Response.json(result);
}

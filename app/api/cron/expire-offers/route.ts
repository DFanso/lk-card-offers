import { expireDueOffers } from "@/lib/actions/offers";
import { log } from "@/lib/log";

export async function POST(req: Request) {
  const expected = process.env.CRON_SECRET;
  const got = req.headers.get("x-cron-secret");
  if (!expected || got !== expected) {
    log.warn("cron_expire_offers_forbidden", {
      hasExpected: Boolean(expected),
    });
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const result = await expireDueOffers();
    log.info("cron_expire_offers_ok", result);
    return Response.json(result);
  } catch (err) {
    log.error("cron_expire_offers_failed", { err });
    return Response.json({ error: "expire_failed" }, { status: 500 });
  }
}

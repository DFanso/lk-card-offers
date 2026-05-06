import { getOfferById } from "@/lib/queries-server/offers";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const offer = await getOfferById(id);
  if (!offer) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return Response.json(offer);
}

import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { offerBanks, offerCardTypes, offers } from "@/db/schema";
import { requireRole } from "@/lib/rbac";
import { EditOfferForm } from "./edit-offer-form";
import type { OfferInput } from "@/lib/validation/offer";

export const dynamic = "force-dynamic";

export default async function EditOfferPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("maintainer");
  const { id } = await params;

  const found = await db.select().from(offers).where(eq(offers.id, id)).limit(1);
  const offer = found[0];
  if (!offer) notFound();

  const bankRows = await db
    .select({ bankId: offerBanks.bankId })
    .from(offerBanks)
    .where(eq(offerBanks.offerId, id));
  const ctRows = await db
    .select({ cardTypeId: offerCardTypes.cardTypeId })
    .from(offerCardTypes)
    .where(eq(offerCardTypes.offerId, id));

  const initial: OfferInput = {
    title: offer.title,
    description: offer.description,
    imageUrl: offer.imageUrl ?? null,
    merchantId: offer.merchantId ?? null,
    newMerchantName: null,
    categoryId: offer.categoryId ?? "",
    startDate: offer.startDate,
    endDate: offer.endDate,
    sourceUrl: offer.sourceUrl,
    locationScope: offer.locationScope ?? null,
    bankIds: bankRows.map((b) => b.bankId),
    cardTypeIds: ctRows.map((c) => c.cardTypeId),
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <div className="section-label">Maintainer / Edit</div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Edit offer
        </h1>
      </header>
      <EditOfferForm offerId={offer.id} initial={initial} />
    </div>
  );
}

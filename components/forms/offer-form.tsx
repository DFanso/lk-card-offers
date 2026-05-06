"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useBanks, useCardTypes, useCategories, useMerchants } from "@/lib/queries/master";
import type { OfferInput } from "@/lib/validation/offer";
import { uploadOfferImage } from "@/lib/actions/upload";

export type OfferFormSubmitFn = (
  values: OfferInput,
) => Promise<{ ok: true } | { ok: false; error: string }>;

export type OfferFormInitial = Partial<OfferInput>;

export function OfferForm({
  initial,
  onSubmit,
  submitLabel,
}: {
  initial?: OfferFormInitial;
  onSubmit: OfferFormSubmitFn;
  submitLabel: string;
}) {
  const banks = useBanks();
  const cardTypes = useCardTypes();
  const categories = useCategories();
  const merchants = useMerchants();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [bankIds, setBankIds] = useState<string[]>(initial?.bankIds ?? []);
  const [cardTypeIds, setCardTypeIds] = useState<string[]>(
    initial?.cardTypeIds ?? [],
  );
  const [merchantMode, setMerchantMode] = useState<"existing" | "new">(
    initial?.newMerchantName ? "new" : "existing",
  );
  const [imageUrl, setImageUrl] = useState<string>(initial?.imageUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploadError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const result = await uploadOfferImage(fd);
      if (result.ok) setImageUrl(result.url);
      else setUploadError(result.error);
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const values: OfferInput = {
      title: String(fd.get("title") ?? ""),
      description: String(fd.get("description") ?? ""),
      imageUrl: imageUrl.trim() || null,
      merchantId:
        merchantMode === "existing"
          ? String(fd.get("merchantId") ?? "") || null
          : null,
      newMerchantName:
        merchantMode === "new"
          ? String(fd.get("newMerchantName") ?? "").trim() || null
          : null,
      categoryId: String(fd.get("categoryId") ?? ""),
      startDate: String(fd.get("startDate") ?? ""),
      endDate: String(fd.get("endDate") ?? ""),
      sourceUrl: String(fd.get("sourceUrl") ?? ""),
      locationScope: (fd.get("locationScope") as string) || null,
      bankIds,
      cardTypeIds,
    };
    startTransition(async () => {
      const result = await onSubmit(values);
      if (!result.ok) setError(result.error);
    });
  }

  const toggleBank = (id: string) =>
    setBankIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  const toggleCardType = (id: string) =>
    setCardTypeIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required defaultValue={initial?.title} />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          required
          rows={4}
          defaultValue={initial?.description}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="merchantId">Merchant</Label>
            <button
              type="button"
              onClick={() =>
                setMerchantMode((m) => (m === "existing" ? "new" : "existing"))
              }
              className="text-[11px] text-muted-foreground underline hover:text-foreground"
            >
              {merchantMode === "existing"
                ? "+ Add new merchant"
                : "Pick existing merchant"}
            </button>
          </div>
          {merchantMode === "existing" ? (
            <select
              id="merchantId"
              name="merchantId"
              required
              defaultValue={initial?.merchantId ?? ""}
              className="h-8 w-full rounded-none border bg-transparent px-2.5 text-xs"
            >
              <option value="">Select merchant…</option>
              {merchants.data?.items.filter((m) => m.isActive).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          ) : (
            <Input
              id="newMerchantName"
              name="newMerchantName"
              required
              placeholder="New merchant name"
              defaultValue={initial?.newMerchantName ?? ""}
            />
          )}
          <p className="mt-1 text-[11px] text-muted-foreground">
            {merchantMode === "new"
              ? "We'll add this merchant when the offer is published."
              : "Don't see the merchant? Click + Add new merchant."}
          </p>
        </div>
        <div>
          <Label htmlFor="categoryId">Category</Label>
          <select
            id="categoryId"
            name="categoryId"
            required
            defaultValue={initial?.categoryId ?? ""}
            className="h-8 w-full rounded-none border bg-transparent px-2.5 text-xs"
          >
            <option value="">Select category…</option>
            {categories.data?.items.filter((c) => c.isActive).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="startDate">Start date</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            required
            defaultValue={initial?.startDate}
          />
        </div>
        <div>
          <Label htmlFor="endDate">End date</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            required
            defaultValue={initial?.endDate}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="sourceUrl">Source URL</Label>
        <Input
          id="sourceUrl"
          name="sourceUrl"
          type="url"
          required
          placeholder="https://bank.lk/promotion"
          defaultValue={initial?.sourceUrl}
        />
      </div>
      <div className="space-y-2">
        <Label>Promo image (optional)</Label>
        {imageUrl ? (
          <div className="flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Preview"
              className="h-20 w-32 rounded border object-cover"
            />
            <div className="space-y-1">
              <p className="break-all text-[11px] text-muted-foreground">
                {imageUrl}
              </p>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                onClick={() => setImageUrl("")}
              >
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <input
              id="imageFile"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
              className="block text-xs file:mr-2 file:rounded-none file:border file:bg-muted file:px-2 file:py-1 file:text-xs"
            />
            <Input
              type="url"
              placeholder="…or paste an image URL"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              {uploading
                ? "Uploading…"
                : "JPG, PNG, WEBP, or GIF up to 5 MB."}
            </p>
            {uploadError && (
              <p className="text-[11px] text-destructive">{uploadError}</p>
            )}
          </div>
        )}
      </div>
      <div>
        <Label htmlFor="locationScope">Location scope (optional)</Label>
        <Input
          id="locationScope"
          name="locationScope"
          placeholder="e.g. Colombo, Island-wide"
          defaultValue={initial?.locationScope ?? ""}
        />
      </div>

      <div>
        <h3 className="mb-2 font-medium">Banks</h3>
        <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3">
          {banks.data?.items.filter((b) => b.isActive).map((b) => (
            <label key={b.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={bankIds.includes(b.id)}
                onChange={() => toggleBank(b.id)}
              />
              <span>{b.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-medium">Card types</h3>
        <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3">
          {cardTypes.data?.items.filter((c) => c.isActive).map((c) => (
            <label key={c.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={cardTypeIds.includes(c.id)}
                onChange={() => toggleCardType(c.id)}
              />
              <span>{c.name}</span>
            </label>
          ))}
        </div>
      </div>

      {error && <p className="text-destructive">{error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}

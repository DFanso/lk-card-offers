"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  useBanks,
  useCardTypes,
  useCategories,
  useMerchants,
} from "@/lib/queries/master";
import type { OfferInput } from "@/lib/validation/offer";
import { uploadOfferImage } from "@/lib/actions/upload";

export type OfferFormSubmitFn = (
  values: OfferInput,
) => Promise<
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }
>;

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <ul className="mt-1 space-y-0.5 text-[11px] text-destructive">
      {messages.map((m, i) => (
        <li key={i}>{m}</li>
      ))}
    </ul>
  );
}

export type OfferFormInitial = Partial<OfferInput>;

function FormSection({
  step,
  title,
  description,
  children,
}: {
  step: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-border bg-card">
      <header className="border-b border-border bg-muted/30 px-4 py-2.5">
        <div className="flex items-baseline gap-3">
          <span className="num text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Step {step}
          </span>
          <h2 className="text-sm font-medium tracking-tight">{title}</h2>
        </div>
        {description && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            {description}
          </p>
        )}
      </header>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );
}

function FieldLabel({
  htmlFor,
  children,
  hint,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between">
      <Label htmlFor={htmlFor} className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {children}
      </Label>
      {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

export function OfferForm({
  initial,
  onSubmit,
  submitLabel,
  draftKey,
}: {
  initial?: OfferFormInitial;
  onSubmit: OfferFormSubmitFn;
  submitLabel: string;
  draftKey?: string;
}) {
  const banks = useBanks();
  const cardTypes = useCardTypes();
  const categories = useCategories();
  const merchants = useMerchants();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const loadedDraft: Partial<OfferInput> | null = (() => {
    if (typeof window === "undefined" || !draftKey) return null;
    try {
      const raw = localStorage.getItem(draftKey);
      return raw ? (JSON.parse(raw) as Partial<OfferInput>) : null;
    } catch {
      return null;
    }
  })();
  const startValues: Partial<OfferInput> = { ...initial, ...(loadedDraft ?? {}) };

  const [bankIds, setBankIds] = useState<string[]>(startValues.bankIds ?? []);
  const [cardTypeIds, setCardTypeIds] = useState<string[]>(
    startValues.cardTypeIds ?? [],
  );
  const [merchantMode, setMerchantMode] = useState<"existing" | "new">(
    startValues.newMerchantName ? "new" : "existing",
  );
  const [merchantId, setMerchantId] = useState<string>(
    startValues.merchantId ?? "",
  );
  const [categoryId, setCategoryId] = useState<string>(
    startValues.categoryId ?? "",
  );
  const [imageUrl, setImageUrl] = useState<string>(startValues.imageUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(
    loadedDraft ? Date.now() : null,
  );

  const formRef = useRef<HTMLFormElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function persistDraft() {
    if (!draftKey || typeof window === "undefined") return;
    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);
    const snapshot: Partial<OfferInput> = {
      title: String(fd.get("title") ?? "") || undefined,
      description: String(fd.get("description") ?? "") || undefined,
      sourceUrl: String(fd.get("sourceUrl") ?? "") || undefined,
      startDate: String(fd.get("startDate") ?? "") || undefined,
      endDate: String(fd.get("endDate") ?? "") || undefined,
      locationScope: (fd.get("locationScope") as string) || undefined,
      newMerchantName:
        merchantMode === "new"
          ? String(fd.get("newMerchantName") ?? "") || undefined
          : undefined,
      merchantId: merchantMode === "existing" ? merchantId || undefined : undefined,
      categoryId: categoryId || undefined,
      imageUrl: imageUrl || undefined,
      bankIds,
      cardTypeIds,
    };
    const hasContent = Object.values(snapshot).some((v) =>
      Array.isArray(v) ? v.length > 0 : Boolean(v),
    );
    if (!hasContent) {
      localStorage.removeItem(draftKey);
      setDraftSavedAt(null);
      return;
    }
    localStorage.setItem(draftKey, JSON.stringify(snapshot));
    setDraftSavedAt(Date.now());
  }

  function scheduleDraftSave() {
    if (!draftKey) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(persistDraft, 400);
  }

  useEffect(() => {
    if (!draftKey) return;
    scheduleDraftSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankIds, cardTypeIds, merchantMode, merchantId, categoryId, imageUrl]);

  function clearDraft() {
    if (!draftKey || typeof window === "undefined") return;
    localStorage.removeItem(draftKey);
    setDraftSavedAt(null);
  }

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
    setFieldErrors({});
    const fd = new FormData(e.currentTarget);
    const values: OfferInput = {
      title: String(fd.get("title") ?? ""),
      description: String(fd.get("description") ?? ""),
      imageUrl: imageUrl.trim() || null,
      merchantId:
        merchantMode === "existing" ? merchantId || null : null,
      newMerchantName:
        merchantMode === "new"
          ? String(fd.get("newMerchantName") ?? "").trim() || null
          : null,
      categoryId,
      startDate: String(fd.get("startDate") ?? ""),
      endDate: String(fd.get("endDate") ?? ""),
      sourceUrl: String(fd.get("sourceUrl") ?? ""),
      locationScope: (fd.get("locationScope") as string) || null,
      bankIds,
      cardTypeIds,
    };
    startTransition(async () => {
      const result = await onSubmit(values);
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
      } else {
        clearDraft();
      }
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
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onInput={scheduleDraftSave}
      className="space-y-4 text-xs"
    >
      <FormSection
        step="01"
        title="Basics"
        description="What is the offer and where to read more."
      >
        <div>
          <FieldLabel htmlFor="title">Title</FieldLabel>
          <Input
            id="title"
            name="title"
            required
            defaultValue={startValues.title}
            placeholder="20% off dining at…"
            aria-invalid={fieldErrors.title ? true : undefined}
          />
          <FieldError messages={fieldErrors.title} />
        </div>
        <div>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea
            id="description"
            name="description"
            required
            rows={5}
            defaultValue={startValues.description}
            placeholder="Spell out the offer terms in plain language."
            aria-invalid={fieldErrors.description ? true : undefined}
          />
          <FieldError messages={fieldErrors.description} />
        </div>
        <div>
          <FieldLabel htmlFor="sourceUrl">Source URL</FieldLabel>
          <Input
            id="sourceUrl"
            name="sourceUrl"
            type="url"
            required
            placeholder="https://bank.lk/promotion"
            defaultValue={startValues.sourceUrl}
            aria-invalid={fieldErrors.sourceUrl ? true : undefined}
          />
          <FieldError messages={fieldErrors.sourceUrl} />
        </div>
      </FormSection>

      <FormSection step="02" title="Merchant & category">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Merchant
            </Label>
            <button
              type="button"
              onClick={() =>
                setMerchantMode((m) => (m === "existing" ? "new" : "existing"))
              }
              className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              {merchantMode === "existing"
                ? "+ Add new merchant"
                : "← Use existing"}
            </button>
          </div>
          {merchantMode === "existing" ? (
            (() => {
              const list =
                merchants.data?.items.filter((m) => m.isActive) ?? [];
              const selectedName =
                list.find((m) => m.id === merchantId)?.name ?? "";
              return (
                <Combobox
                  items={list.map((m) => m.name)}
                  value={selectedName}
                  onValueChange={(name: string | null) => {
                    const match = list.find((m) => m.name === name);
                    setMerchantId(match?.id ?? "");
                  }}
                >
                  <ComboboxInput
                    placeholder={
                      list.length
                        ? `Search ${list.length} merchants…`
                        : "Loading merchants…"
                    }
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>No merchants match.</ComboboxEmpty>
                    <ComboboxList>
                      {(name: string) => (
                        <ComboboxItem key={name} value={name}>
                          {name}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              );
            })()
          ) : (
            <Input
              name="newMerchantName"
              required
              placeholder="New merchant name"
              defaultValue={startValues.newMerchantName ?? ""}
              aria-invalid={fieldErrors.newMerchantName ? true : undefined}
            />
          )}
          <FieldError messages={fieldErrors.merchantId} />
          <FieldError messages={fieldErrors.newMerchantName} />
          <p className="mt-1 text-[11px] text-muted-foreground">
            {merchantMode === "new"
              ? "We'll add this merchant when the offer is published."
              : "Don't see the merchant? Click + Add new merchant."}
          </p>
        </div>

        <div>
          <FieldLabel htmlFor="categoryId">Category</FieldLabel>
          <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select category…">
                {(value: string) =>
                  value
                    ? categories.data?.items.find((c) => c.id === value)?.name ??
                      "Loading…"
                    : "Select category…"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {categories.data?.items
                .filter((c) => c.isActive)
                .map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <FieldError messages={fieldErrors.categoryId} />
        </div>

        <div>
          <FieldLabel htmlFor="locationScope">
            Location scope
            <span className="ml-1 text-muted-foreground">(optional)</span>
          </FieldLabel>
          <Input
            id="locationScope"
            name="locationScope"
            placeholder="e.g. Colombo, Island-wide"
            defaultValue={startValues.locationScope ?? ""}
            aria-invalid={fieldErrors.locationScope ? true : undefined}
          />
          <FieldError messages={fieldErrors.locationScope} />
        </div>
      </FormSection>

      <FormSection step="03" title="Validity window">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel htmlFor="startDate">Start date</FieldLabel>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              required
              defaultValue={startValues.startDate}
              aria-invalid={fieldErrors.startDate ? true : undefined}
            />
            <FieldError messages={fieldErrors.startDate} />
          </div>
          <div>
            <FieldLabel htmlFor="endDate">End date</FieldLabel>
            <Input
              id="endDate"
              name="endDate"
              type="date"
              required
              defaultValue={startValues.endDate}
              aria-invalid={fieldErrors.endDate ? true : undefined}
            />
            <FieldError messages={fieldErrors.endDate} />
          </div>
        </div>
      </FormSection>

      <FormSection
        step="04"
        title="Eligibility"
        description="Pick at least one bank and one card type that the offer applies to."
      >
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="section-label">Banks</span>
            <span className="num text-[10px] text-muted-foreground">
              {bankIds.length.toString().padStart(2, "0")} selected
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {banks.data?.items
              .filter((b) => b.isActive)
              .map((b) => (
                <label
                  key={b.id}
                  className="flex cursor-pointer items-center gap-2 border border-border bg-background p-2 transition-colors has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5"
                >
                  <Checkbox
                    checked={bankIds.includes(b.id)}
                    onCheckedChange={() => toggleBank(b.id)}
                  />
                  <span>{b.name}</span>
                </label>
              ))}
          </div>
          <FieldError messages={fieldErrors.bankIds} />
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="section-label">Card types</span>
            <span className="num text-[10px] text-muted-foreground">
              {cardTypeIds.length.toString().padStart(2, "0")} selected
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {cardTypes.data?.items
              .filter((c) => c.isActive)
              .map((c) => (
                <label
                  key={c.id}
                  className="flex cursor-pointer items-center gap-2 border border-border bg-background p-2 transition-colors has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5"
                >
                  <Checkbox
                    checked={cardTypeIds.includes(c.id)}
                    onCheckedChange={() => toggleCardType(c.id)}
                  />
                  <span className="flex-1">{c.name}</span>
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {c.kind}
                  </Badge>
                </label>
              ))}
          </div>
          <FieldError messages={fieldErrors.cardTypeIds} />
        </div>
      </FormSection>

      <FormSection
        step="05"
        title="Promo image"
        description="Optional banner shown on the offer card and detail page."
      >
        {imageUrl ? (
          <div className="flex items-start gap-4 border border-border bg-muted/20 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Preview"
              className="aspect-[16/9] w-44 border border-border object-cover"
            />
            <div className="space-y-2">
              <p className="break-all text-[11px] text-muted-foreground">
                {imageUrl}
              </p>
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={() => setImageUrl("")}
              >
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="flex cursor-pointer items-center justify-center border border-dashed border-border bg-muted/30 px-4 py-6 text-center transition-colors hover:border-foreground/40 hover:bg-muted/40">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
                className="hidden"
              />
              <span className="text-xs text-muted-foreground">
                {uploading ? (
                  "Uploading…"
                ) : (
                  <>
                    <span className="text-foreground">Click to upload</span>{" "}
                    JPG, PNG, WEBP, or GIF up to 5 MB
                  </>
                )}
              </span>
            </label>
            <div className="flex items-center gap-3">
              <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                or
              </span>
              <Input
                type="url"
                placeholder="Paste an image URL"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                aria-invalid={fieldErrors.imageUrl ? true : undefined}
              />
            </div>
            {uploadError && (
              <p className="text-[11px] text-destructive">{uploadError}</p>
            )}
          </div>
        )}
        <FieldError messages={fieldErrors.imageUrl} />
      </FormSection>

      {error && (
        <div className="space-y-1 border border-destructive/40 bg-destructive/5 px-4 py-2 text-xs text-destructive">
          {Object.keys(fieldErrors).length > 0 ? (
            <>
              <p className="font-medium">Please fix the highlighted fields:</p>
              <ul className="list-disc space-y-0.5 pl-5 text-[11px]">
                {Object.entries(fieldErrors).flatMap(([field, msgs]) =>
                  msgs.map((m, i) => (
                    <li key={`${field}-${i}`}>
                      <span className="font-medium">{field === "_" ? "" : `${field}: `}</span>
                      {m}
                    </li>
                  )),
                )}
              </ul>
            </>
          ) : (
            error
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
        <div className="flex flex-col gap-1">
          <span className="ticker">Ready to {submitLabel.toLowerCase()}?</span>
          {draftKey && draftSavedAt !== null && (
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Draft saved · {new Date(draftSavedAt).toLocaleTimeString()}
              <button
                type="button"
                onClick={() => {
                  if (confirm("Discard the saved draft and start over?")) {
                    clearDraft();
                    window.location.reload();
                  }
                }}
                className="ml-2 underline-offset-2 hover:text-foreground hover:underline"
              >
                discard
              </button>
            </span>
          )}
        </div>
        <Button type="submit" disabled={pending} size="lg">
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

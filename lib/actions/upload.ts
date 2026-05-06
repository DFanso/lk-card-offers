"use server";

import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { requireSession } from "@/lib/rbac";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export type UploadResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export async function uploadOfferImage(
  formData: FormData,
): Promise<UploadResult> {
  try {
    await requireSession();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "No file provided" };
  }
  if (file.size === 0) {
    return { ok: false, error: "File is empty" };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Image must be 5 MB or smaller" };
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return { ok: false, error: "Use JPG, PNG, WEBP, or GIF" };
  }

  const ext =
    MIME_TO_EXT[file.type] ?? (extname(file.name).toLowerCase() || ".bin");
  const filename = `${randomUUID()}${ext}`;
  const relDir = join("uploads", "offers");
  const absDir = join(process.cwd(), "public", relDir);
  await mkdir(absDir, { recursive: true });

  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(join(absDir, filename), bytes);

  return { ok: true, url: `/${relDir.replace(/\\/g, "/")}/${filename}` };
}

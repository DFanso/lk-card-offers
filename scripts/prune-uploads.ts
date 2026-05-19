import { readdir, stat, unlink } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { isNotNull } from "drizzle-orm";
import { db } from "../db";
import { offers } from "../db/schema";

const UPLOAD_ROOTS = ["uploads/offers", "uploads/scraped"];

const DRY_RUN = process.argv.includes("--dry-run");

async function walk(root: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err &&
      "code" in err &&
      (err as { code?: string }).code === "ENOENT"
    ) {
      return [];
    }
    throw err;
  }
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

function toPublicPath(absPath: string, publicRoot: string): string {
  const rel = relative(publicRoot, absPath).split(sep).join("/");
  return `/${rel}`;
}

async function main() {
  const publicRoot = join(process.cwd(), "public");

  const referenced = new Set<string>();
  const rows = await db
    .select({ imageUrl: offers.imageUrl })
    .from(offers)
    .where(isNotNull(offers.imageUrl));
  for (const r of rows) {
    if (r.imageUrl) referenced.add(r.imageUrl);
  }
  console.log(`DB references ${referenced.size} unique image URLs.`);

  let scanned = 0;
  const orphans: string[] = [];
  for (const sub of UPLOAD_ROOTS) {
    const absDir = join(publicRoot, sub);
    const files = await walk(absDir);
    for (const f of files) {
      scanned++;
      const url = toPublicPath(f, publicRoot);
      if (!referenced.has(url)) orphans.push(f);
    }
  }

  console.log(
    `Scanned ${scanned} files under ${UPLOAD_ROOTS.join(", ")}. Found ${orphans.length} orphans.`,
  );

  if (orphans.length === 0) return;
  if (DRY_RUN) {
    for (const f of orphans.slice(0, 20)) console.log(`  would delete: ${f}`);
    if (orphans.length > 20) console.log(`  …and ${orphans.length - 20} more`);
    console.log("Dry run — no files deleted. Re-run without --dry-run to remove.");
    return;
  }

  let bytes = 0;
  for (const f of orphans) {
    try {
      const s = await stat(f);
      bytes += s.size;
      await unlink(f);
    } catch (err) {
      console.warn(`  failed to remove ${f}:`, err);
    }
  }
  console.log(`Deleted ${orphans.length} files (~${(bytes / 1024).toFixed(0)} KB).`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

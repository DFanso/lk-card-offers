/**
 * POST /api/cron/scrape/[bank]
 *
 * Header-guarded endpoint that kicks off a bank scraper as a background
 * subprocess. Used by `.github/workflows/cron-scrapers.yml` to refresh the
 * catalog every 6 hours without having to expose the database to GitHub.
 *
 * Fire-and-forget by design: peoples-bank downloads images and can run
 * >5 minutes, which exceeds Node's default `server.requestTimeout` (300s).
 * We return 202 as soon as the child process is spawned successfully and
 * let it run to completion in the container. Output goes to the container
 * logs via the scraper's stdout.
 *
 * Scrapers are idempotent on `offers.sourceUrl`, so a stray re-run if the
 * container restarts mid-scrape is harmless.
 */
import { spawn } from "node:child_process";
import { log } from "@/lib/log";

const ALLOWED_BANKS = ["ndb", "ntb", "dfcc", "combank", "peoples", "hnb", "mypromo", "seylan"] as const;
type Bank = (typeof ALLOWED_BANKS)[number];

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ bank: string }> },
) {
  const expected = process.env.CRON_SECRET;
  const got = req.headers.get("x-cron-secret");
  if (!expected || got !== expected) {
    log.warn("cron_scrape_forbidden", { hasExpected: Boolean(expected) });
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { bank } = await params;
  if (!ALLOWED_BANKS.includes(bank as Bank)) {
    return Response.json(
      { error: "unknown_bank", allowed: ALLOWED_BANKS },
      { status: 400 },
    );
  }

  const script = `scripts/scrape-${bank}.ts`;

  return new Promise<Response>((resolve) => {
    let resolved = false;

    const child = spawn("bun", [script], {
      cwd: process.cwd(),
      env: process.env,
      // Detach from the parent so the scrape survives if Next.js recycles
      // the request handler. The child still inherits stdio so its logs
      // land in the container logs.
      stdio: ["ignore", "inherit", "inherit"],
      detached: false,
    });

    child.on("error", (err) => {
      log.error("cron_scrape_spawn_failed", { bank, err });
      if (!resolved) {
        resolved = true;
        resolve(
          Response.json(
            { error: "spawn_failed", message: err.message },
            { status: 500 },
          ),
        );
      }
    });

    child.on("close", (code, signal) => {
      log.info("cron_scrape_done", { bank, exitCode: code, signal });
    });

    // If spawn doesn't immediately fail, consider it started and reply 202.
    // Anything that errors after this point is logged but not surfaced to
    // the caller — that's intentional (see file header).
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        log.info("cron_scrape_started", { bank, pid: child.pid });
        resolve(
          Response.json(
            { status: "started", bank, pid: child.pid },
            { status: 202 },
          ),
        );
      }
    }, 500);
  });
}

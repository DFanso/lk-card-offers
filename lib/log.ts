/**
 * Minimal structured logger. Emits one JSON line per call to stdout/stderr.
 *
 * Designed to be the boundary between app code and whatever log sink the
 * runtime ships logs to (Vercel logs, GitHub Actions, Sentry, Datadog, etc).
 * Keep call sites short: `log.error("submit_failed", { err, userId })`.
 *
 * Errors are normalized — pass either an `Error` instance as `err` in the
 * context or a string `message`; the logger extracts name/message/stack.
 */

type Level = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown> & {
  err?: unknown;
};

const LEVEL_RANK: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function envLevel(): Level {
  const raw = (process.env.LOG_LEVEL ?? "").toLowerCase();
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
    return raw;
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

const MIN = LEVEL_RANK[envLevel()];

function serializeError(err: unknown) {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
      cause: err.cause instanceof Error ? err.cause.message : err.cause,
    };
  }
  if (typeof err === "object" && err !== null) return err;
  return { message: String(err) };
}

function emit(level: Level, event: string, ctx: LogContext = {}) {
  if (LEVEL_RANK[level] < MIN) return;
  const { err, ...rest } = ctx;
  const line = {
    t: new Date().toISOString(),
    level,
    event,
    ...rest,
    ...(err !== undefined ? { err: serializeError(err) } : {}),
  };
  const stream = level === "error" || level === "warn" ? "stderr" : "stdout";
  const out = JSON.stringify(line);
  if (stream === "stderr") console.error(out);
  else console.log(out);
}

export const log = {
  debug: (event: string, ctx?: LogContext) => emit("debug", event, ctx),
  info: (event: string, ctx?: LogContext) => emit("info", event, ctx),
  warn: (event: string, ctx?: LogContext) => emit("warn", event, ctx),
  error: (event: string, ctx?: LogContext) => emit("error", event, ctx),
};

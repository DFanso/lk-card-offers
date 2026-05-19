# syntax=docker/dockerfile:1.7
#
# Build a runnable image of the Next.js app + db scripts. The entrypoint
# bootstraps the database (create-if-missing, migrate, seed) and then starts
# `next start`. Multi-stage so the runtime layer doesn't carry the build cache.

ARG BUN_VERSION=1.3.9

# ──── deps ────────────────────────────────────────────────────────────────────
FROM oven/bun:${BUN_VERSION}-slim AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ──── builder ────────────────────────────────────────────────────────────────
FROM oven/bun:${BUN_VERSION}-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build args required so Next's static page generation doesn't fail.
# Real values come from the runtime environment at container start.
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=postgres://build:build@localhost:5432/build
ENV AUTH_SECRET=build-time-placeholder-not-used-at-runtime
ENV NEXTAUTH_URL=http://localhost:3000
ENV CRON_SECRET=build-time-placeholder
RUN bun run build

# ──── runtime ────────────────────────────────────────────────────────────────
FROM oven/bun:${BUN_VERSION}-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Install only what the entrypoint shell needs.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates tini \
 && rm -rf /var/lib/apt/lists/*

# Carry everything needed at runtime: full node_modules (drizzle-kit, tsx,
# postgres-js, bcryptjs, next, react, the lot), build output, source for the
# db scripts that the entrypoint executes, and the migration journal.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/bun.lock ./bun.lock
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/db ./db
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/lib ./lib

# Uploaded images go here. Mount a volume on /app/public/uploads in production
# so user uploads survive container restarts.
RUN mkdir -p /app/public/uploads/offers /app/public/uploads/scraped

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "--", "docker-entrypoint.sh"]
CMD ["bun", "run", "start"]

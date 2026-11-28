# ---- deps ----
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder ----
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* values are inlined at build time. Override with --build-arg.
ARG NEXT_PUBLIC_APP_NAME=VALUEOUS
ARG NEXT_PUBLIC_DEMO_MODE=true
ARG NEXT_PUBLIC_DEFAULT_TIMEZONE=Asia/Kolkata
ARG NEXT_PUBLIC_PILOT_LABEL="Customers x Creators x Businesses"
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_DEMO_MODE=$NEXT_PUBLIC_DEMO_MODE
ENV NEXT_PUBLIC_DEFAULT_TIMEZONE=$NEXT_PUBLIC_DEFAULT_TIMEZONE
ENV NEXT_PUBLIC_PILOT_LABEL=$NEXT_PUBLIC_PILOT_LABEL
# Build-time placeholders only. Real values are injected at runtime.
ENV DATABASE_URL=postgresql://valueous:valueous@localhost:5432/valueous
ENV SESSION_SECRET=build-time-placeholder-session-secret-0000000000
ENV CLAIM_CODE_SECRET=build-time-placeholder-claim-secret-000000000000
RUN npm run build

# ---- runner ----
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/postcss.config.mjs ./postcss.config.mjs
COPY --from=builder /app/tailwind.config.ts ./tailwind.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src ./src

RUN mkdir -p /app/storage/uploads && chown -R node:node /app/storage
USER node

EXPOSE 3000

# Apply migrations, seed demo data if enabled, then start the production server.
CMD ["sh", "-c", "npm run db:migrate && if [ \"$ALLOW_DEV_SEED\" = \"true\" ]; then npm run db:seed; fi && npm run start"]

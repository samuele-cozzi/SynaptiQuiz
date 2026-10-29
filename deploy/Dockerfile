# Stage 1: Dependencies
FROM node:22-bookworm-slim AS deps
WORKDIR /app

ENV DATABASE_PROVIDER=sqlite
ENV DATABASE_URL=file:./prisma/dev.db

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY scripts ./scripts
RUN npm ci

# Stage 2: Builder
FROM node:22-bookworm-slim AS builder
WORKDIR /app

ENV DATABASE_PROVIDER=sqlite
ENV DATABASE_URL=file:./prisma/dev.db
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY --from=deps /app/src/generated/prisma ./src/generated/prisma

RUN npx next build

# Stage 3: Runner
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
	&& useradd --system --uid 1001 --gid nodejs nextjs \
	&& mkdir -p /app/prisma \
	&& chown -R nextjs:nodejs /app/prisma

# Copy standalone build
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma schema and configuration for database synchronization
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]

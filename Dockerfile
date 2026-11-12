FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG DATABASE_PROVIDER=sqlite
RUN if [ "$DATABASE_PROVIDER" = "postgresql" ]; then npm run build:postgres; else npm run build; fi

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/next.config.ts ./next.config.ts
EXPOSE 3000
CMD ["sh", "-c", "if [ \"$DATABASE_PROVIDER\" = \"postgresql\" ]; then ./node_modules/.bin/prisma db push --schema prisma/schema.postgresql.prisma; else ./node_modules/.bin/prisma db push --schema prisma/schema.prisma; fi && npm run start"]
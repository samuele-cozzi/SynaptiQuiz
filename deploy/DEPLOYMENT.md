# SynaptiQuiz Deployment Guide

Deployment assets are kept in this directory. Run Docker commands from the repository root unless noted otherwise.

## Vercel + Supabase

Vercel's local filesystem is ephemeral, so use PostgreSQL rather than SQLite.

1. Create a Supabase project and copy its PostgreSQL connection string.
2. Import the repository into Vercel and select Next.js as the framework.
3. Configure these environment variables in the Vercel project settings:

   ```env
   DATABASE_PROVIDER=postgresql
   DATABASE_URL=<your-supabase-connection-string>
   NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
   NEXTAUTH_URL=<your-vercel-url>

   # Optional: Google OAuth
   GOOGLE_CLIENT_ID=<your-google-client-id>
   GOOGLE_CLIENT_SECRET=<your-google-client-secret>
   NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true
   ```

4. Deploy the application. The app synchronizes the database schema as part of its build.
5. Register an account; the first user becomes an ADMIN.

## Docker Compose

The Compose file starts the development app using the root `.env` and stores SQLite data in `sqlite-data/`.

```bash
docker compose --env-file .env -f deploy/docker-compose.yml up -d
```

To start PostgreSQL instead, configure `.env` with `DATABASE_PROVIDER=postgresql` and a PostgreSQL `DATABASE_URL`, then run:

```bash
docker compose --env-file .env -f deploy/docker-compose.yml --profile postgresql up -d postgres
npm run db:push
```

Use `postgres` as the database hostname from a container, or `localhost` when connecting from the host. PostgreSQL data is stored in `postgres-data/`.

## Production Docker image

Build from the repository root so the Docker build context includes the application source:

```bash
docker build -f deploy/Dockerfile -t synaptiquiz .
```

Set production values in `.env`, including a reachable PostgreSQL `DATABASE_URL`, then run:

```bash
docker run --env-file .env -p 3000:3000 synaptiquiz
```

Put the app behind a TLS-terminating reverse proxy such as Nginx or a managed load balancer for production use.

## Post-deployment checklist

- [ ] Database schema is synchronized
- [ ] First admin user is created
- [ ] Production environment variables are set
- [ ] HTTPS is enabled
- [ ] Database backups and monitoring are configured

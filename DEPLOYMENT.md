# SynaptiQuiz Deployment Guide

This guide covers deploying SynaptiQuiz to production using either Vercel + Supabase or self-hosted Docker.

## Option 1: Vercel + Supabase

### Prerequisites
- GitHub account
- Vercel account
- Supabase account

### Step 1: Set Up Supabase Database

1. Go to [Supabase](https://supabase.com/) and create a new project
2. Wait for the database to be provisioned
3. Go to the top of the page and click on **Connect** → **ORMs**
4. Copy the **Connection String** (URI format of DIRECT_URL)
5. Replace `[YOUR-PASSWORD]` with your database password

### Step 2: Prepare Your Repository

1. Push your code to GitHub:

```bash
git remote add origin <your-github-repo-url>
git branch -M main
git push -u origin main
```

### Step 3: Deploy to Vercel

1. Go to [Vercel](https://vercel.com/) and sign in
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### Step 4: Set Environment Variables

In Vercel project settings, add these environment variables:

```env
DATABASE_URL=<your-supabase-connection-string>
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
NEXTAUTH_URL=<your-vercel-url>

# Optional: Google OAuth
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true
```

### Step 5: Create First Admin User

1. Visit your deployed site
2. Register a new account, the first user will be ADMIN by default

---

## Option 2: Self-Hosted Docker

### Prerequisites
- Docker & Docker Compose
- Domain name (optional but recommended)
- SSL certificate (Let's Encrypt recommended)

### Step 1: Create Dockerfile

Create `Dockerfile` in project root:

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN [ -f package-lock.json ] && npm ci || npm install

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED 1
RUN npx next build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone build
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### Step 2: Update next.config.ts

Add standalone output to `next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
};

export default nextConfig;
```

### Step 3: Create Production docker-compose.yml

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  db:
    image: postgres:18-alpine
    container_name: synaptiquiz-db
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: synaptiquiz
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - synaptiquiz-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: synaptiquiz-app
    restart: always
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@db:5432/synaptiquiz
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NEXTAUTH_URL: ${NEXTAUTH_URL}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
      NEXT_PUBLIC_GOOGLE_AUTH_ENABLED: ${NEXT_PUBLIC_GOOGLE_AUTH_ENABLED}
    depends_on:
      db:
        condition: service_healthy
    networks:
      - synaptiquiz-network

volumes:
  postgres_data:

networks:
  synaptiquiz-network:
    driver: bridge
```

### Step 4: Create .env.production

```env
DB_PASSWORD=your-secure-password
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://yourdomain.com
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=false
```

### Step 5: Deploy

```bash
# Build and start
docker-compose -f docker-compose.prod.yml up -d --build

# Run migrations
docker-compose -f docker-compose.prod.yml exec app npx prisma migrate deploy

# View logs
docker-compose -f docker-compose.prod.yml logs -f app
```

### Step 6: Set Up Nginx (Optional)

Create `/etc/nginx/sites-available/synaptiquiz`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/synaptiquiz /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 7: Set Up SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## Post-Deployment Checklist

- [ ] Database migrations applied
- [ ] First admin user created
- [ ] Environment variables set correctly
- [ ] SSL certificate installed (production)
- [ ] Backups configured
- [ ] Monitoring set up
- [ ] Error tracking configured (e.g., Sentry)
- [ ] Performance monitoring (e.g., Vercel Analytics)

## Backup Strategy

### Automated Database Backups

Create a backup script `backup.sh`:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="synaptiquiz"

# Create backup
docker-compose exec -T db pg_dump -U postgres $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete

echo "Backup completed: backup_$DATE.sql"
```

Add to crontab:
```bash
0 2 * * * /path/to/backup.sh
```

## Monitoring

### Health Check Endpoint

The application automatically provides:
- `/api/health` - Application health status

### Recommended Monitoring Tools

- **Uptime**: UptimeRobot, Pingdom
- **Errors**: Sentry
- **Performance**: Vercel Analytics, Google Analytics
- **Logs**: Papertrail, Logtail

## Scaling Considerations

### Database
- Use connection pooling (PgBouncer)
- Enable read replicas for high traffic
- Regular VACUUM and ANALYZE

### Application
- Use Vercel's auto-scaling (serverless)
- Or use Docker Swarm/Kubernetes for self-hosted
- Enable CDN for static assets

### Caching
- Implement Redis for session storage
- Use Next.js ISR for static pages
- Enable HTTP caching headers

## Troubleshooting

### Database Connection Issues
```bash
# Check database is running
docker-compose ps

# Check logs
docker-compose logs db

# Test connection
docker-compose exec db psql -U postgres -d synaptiquiz
```

### Migration Issues
```bash
# Reset and re-run migrations
npx prisma migrate reset
npx prisma migrate deploy
```

### Build Failures
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Regenerate Prisma Client
npx prisma generate
```

## Security Best Practices

1. **Never commit `.env` files**
2. **Use strong passwords** for database
3. **Rotate secrets** regularly
4. **Enable HTTPS** in production
5. **Keep dependencies updated**
6. **Use rate limiting** for API routes
7. **Enable CORS** properly
8. **Sanitize user inputs**
9. **Regular security audits**
10. **Monitor for suspicious activity**

## Support

For deployment issues:
1. Check application logs
2. Review environment variables
3. Verify database connectivity
4. Check Vercel/Docker logs
5. Open an issue on GitHub

---

**Last Updated**: 2025-12-22

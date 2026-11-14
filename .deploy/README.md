# SynaptiQuiz Docker Compose

Run the commands in this guide from the `.deploy` directory. Docker Compose reads `.env` there for variable substitution.

## Choose a Compose file

### SQLite (recommended for the current configuration)

Start the SQLite deployment:

```bash
docker compose -f docker-compose.sqlite.yml up -d
```

This file explicitly selects SQLite, loads `.env`, and stores the database at `synaptiquiz.db` in this directory. Google sign-in is disabled in this configuration.

### Default Compose file

Start the default file with:

```bash
docker compose up -d
```

This currently starts only the web app. Its active service is configured to use SQLite and the PostgreSQL app and database services in the file are commented out. The `latest` image includes both Prisma clients and selects one at runtime from `DATABASE_PROVIDER`; the Compose file itself must still be configured with a reachable PostgreSQL service and connection string to use PostgreSQL.

Do not start both configurations at the same time: they use the same container name and SQLite volume.

## Configure credentials

Edit `.env` before exposing the app. Set a unique, long `SESSION_SECRET` and a strong `ADMIN_PASSWORD`; also set `ADMIN_USER` and `PORT` as needed. Keep `.env` private and do not commit real credentials. The SQLite Compose file supplies defaults for some missing values, but those defaults are for local use only.

The default Compose file also needs a `DATABASE_URL` in `.env`; its active service defaults `DATABASE_PROVIDER` to `sqlite`. The checked-in `.env` may already contain local credentials, so review and replace them before deployment.

## Operate the app

Run these commands from `.deploy`. For the default Compose file, omit `-f docker-compose.sqlite.yml`; for SQLite, include it as shown:

```bash
# Start or update the SQLite service
docker compose -f docker-compose.sqlite.yml up -d

# Check service status and follow logs
docker compose -f docker-compose.sqlite.yml ps
docker compose -f docker-compose.sqlite.yml logs -f webapp

# Stop and remove the container and network (keeps database files)
docker compose -f docker-compose.sqlite.yml down
```

To fetch the latest image before starting, run `docker compose -f docker-compose.sqlite.yml pull`.

## Database and backups

The SQLite Compose file binds this directory into `/data` in the container. The database is therefore stored as `.deploy/synaptiquiz.db` and persists when the container is stopped or recreated. Back it up while the app is stopped, and keep the backup outside this directory. Avoid `docker compose down -v` unless you intend to remove Compose volumes.

The default Compose file also declares local bind-backed volumes, including `./data` for its commented-out PostgreSQL service. That PostgreSQL service must be deliberately enabled and configured before the default file can be used for PostgreSQL; update the image/provider settings and credentials as appropriate rather than relying on the current defaults.

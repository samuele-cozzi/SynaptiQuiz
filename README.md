# SynaptiQuiz

SynaptiQuiz is a responsive English/Italian quiz app for authoring question sets and playing turn-based games together. It uses Next.js, TypeScript, Tailwind CSS, Prisma, and SQLite or PostgreSQL.

## Local Development

```bash
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:3000. The dev script synchronizes the SQLite schema before starting Next.js. The first request creates the admin account from `ADMIN_USER` and `ADMIN_PASSWORD`; defaults are `admin` / `password01`. Change these values before exposing an installation to other people. Users can also register with a username and password or create a persistent guest profile. Guest accounts have no password.

The role menu and API enforce three roles:
- `admin`: manage users and all content and games.
- `editor`: create/edit games, questions, and topics; cannot manage users.
- `player`: play games they created or are listed in, and duplicate existing games.

An admin can promote accounts to editor or admin. At least one active admin is required. Google sign-in is enabled only when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are configured; set `GOOGLE_REDIRECT_URI` if the callback URL cannot be inferred. The self-hosted SQLite Compose option intentionally disables Google sign-in.

## Game Rules

- Questions have English and Italian variants, four answers per variant, one correct answer, difficulty 1–5, and author-editable plausibility percentages.
- A game uses questions matching its language. Its question count must be divisible by the number of selected players.
- Players take turns choosing any unused question. Correct answers score 10, 20, 50, 100, or 150 points by difficulty; incorrect answers score zero.
- Ties share rank and game wins. Completed games include an answer review. Editing question content later does not rewrite a game's saved question/answer snapshot.
- In-progress games can be continued offline on the same device after opening them online once. Answers are queued locally and checked by the server on reconnect. General content editing requires a connection.

## Hosting

### Docker: PostgreSQL

Set `POSTGRES_PASSWORD`, `SESSION_SECRET`, and a non-default `ADMIN_PASSWORD` in `.env`, then run:

```bash
docker compose up --build -d
```

The app and PostgreSQL use named persistent volumes. The Compose file includes local-only defaults; replace them before public deployment.

### Docker: SQLite

```bash
SESSION_SECRET="a-long-random-secret" ADMIN_PASSWORD="replace-this-password" \
	docker compose -f docker-compose.sqlite.yml up --build -d
```

SQLite is stored on the `synaptiquiz_sqlite` named volume. Back up that volume to preserve accounts and games. Google OAuth is disabled in this mode.

### Vercel + Neon

1. Create a Neon PostgreSQL database and set `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_USER`, and a unique `ADMIN_PASSWORD` in Vercel.
2. Before deploying a schema change, run `npm run db:push:postgres` with `DATABASE_URL` pointed at the Neon database.
3. Set the Vercel build command to `npm run build:postgres` so Prisma generates the PostgreSQL client.
4. Configure Google OAuth credentials and the callback URL `https://YOUR_DOMAIN/api/auth/google/callback` if Google sign-in is desired.

### Railway

Create a PostgreSQL service and a web service from this repository. Set the web service's Docker build argument `DATABASE_PROVIDER=postgresql`, and set `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_USER`, and a unique `ADMIN_PASSWORD` as service variables. The container applies the Prisma schema on startup. Add the optional Google OAuth variables and public callback URL if needed.

For SQLite on Railway, configure a persistent volume mounted at `/data`, use the SQLite schema/client build (`DATABASE_PROVIDER=sqlite`), and set `DATABASE_URL=file:/data/synaptiquiz.db`.

## Environment Variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `DATABASE_URL` | SQLite file URL or PostgreSQL connection string | `file:./dev.db` locally |
| `DATABASE_PROVIDER` | Container runtime schema selection (`sqlite` / `postgresql`) | `sqlite` |
| `SESSION_SECRET` | HMAC signing secret for HTTP-only sessions | Development fallback only |
| `ADMIN_USER` | Initial admin username | `admin` |
| `ADMIN_PASSWORD` | Initial admin password | `password01` |
| `GOOGLE_CLIENT_ID` | Optional Google OAuth client ID | unset |
| `GOOGLE_CLIENT_SECRET` | Optional Google OAuth secret | unset |
| `GOOGLE_REDIRECT_URI` | Optional explicit OAuth callback URL | inferred from request origin |

Production requires an explicit `SESSION_SECRET`. The documented admin defaults are honored when `ADMIN_USER` or `ADMIN_PASSWORD` is unset, but the server warns on first bootstrap; override both before public use. Never commit `.env` or database files.

## Checks

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

The GitHub Actions workflow runs these checks on pull requests and publishes versioned Docker Hub images on pushes when `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` repository secrets are configured.

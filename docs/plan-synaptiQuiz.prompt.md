## Plan: SynaptiQuiz PWA

Build SynaptiQuiz as a responsive, installable quiz app with English and Italian interfaces, role-based management, shared-device gameplay, and offline game progress. The workspace is empty, so this is a greenfield build.

**Steps**
1. **Scaffold the app:** Next.js App Router, TypeScript, Tailwind CSS, locale-prefixed `/en` and `/it` routes with `next-intl`, and light/dark themes with `next-themes`. Add login, registration, dashboard, and role-aware navigation.
2. **Add persistence and authentication:** Use Prisma with PostgreSQL for hosted deployments and a separate SQLite migration configuration for self-hosting. Use Auth.js for username/password and optional Google sign-in; create persistent username-only guest accounts. Bootstrap an admin from `ADMIN_USER` and `ADMIN_PASSWORD`, defaulting to `admin` / `password01`, and protect the final admin from deletion or demotion.
3. **Build management workflows:** Admins manage all records and players; editors manage games, questions, and topics but not users; players can duplicate games but cannot edit source games or access question/topic menus. Add the requested filters, four-answer validation, linked English/Italian question variants, and game creation validation that question count is divisible by player count.
4. **Implement play and results:** The creator or a listed participant can play; admins can inspect every game. Players take turns choosing unused questions. Correct answers score 10/20/50/100/150 points by difficulty; incorrect answers score zero. Tied top scorers share rank and game wins. Show correct answers in the completed-game review, plus dashboard stats and global/game leaderboards.
5. **Add PWA and deployments:** Use Serwist for installability and app-shell caching; store active game progress and queued answers in IndexedDB for offline continuation and idempotent reconnect sync. Provide Docker Compose options for PostgreSQL and SQLite, deployment guidance for Vercel + Neon and Railway, and a GitHub Actions workflow to publish Docker Hub images using repository secrets.
6. **Verify:** Cover authorization, admin protections, question/game validation, duplication, turns, scoring, leaderboards, and offline sync. Test both database modes, both Compose options, responsive layouts, PWA install/offline behavior, and the image workflow.

**Key decisions**
- Offline play means shared-device pass-and-play with later sync, not real-time multiplayer across devices.
- Each question has linked English and Italian variants; games use the matching language. Topic labels remain shared taxonomy labels.
- Plausibility is editable metadata and does not affect scoring.
- Google sign-in is optional and disabled for self-hosted deployments.
- Production deployments should override the default admin password.

**Relevant paths**
- `src/app/` for localized app routes; `src/lib/auth/`, `src/lib/permissions.ts`, and `src/lib/games/` for auth, access rules, and gameplay.
- `src/lib/db/` and `prisma/` for data models, migrations, and seed logic; `src/messages/en.json` and `src/messages/it.json` for translations.
- `public/`, service-worker configuration, `Dockerfile`, Docker Compose files, `.github/workflows/`, `.env.example`, and `README.md` for PWA, hosting, and delivery setup.

The full plan is saved at `/memories/session/plan.md`. No application files were changed.
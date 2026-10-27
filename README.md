# Creative AI Agent Quest

A self-directed, gamified course for anyone learning to build with AI coding agents: 10 quests with XP, streaks, badges and a day-by-day plan. Spark, the optional AI assistant, gives hints when asked and helps you write your own prompts instead of handing you finished ones. Quest notes and finish reflections are private to the learner’s account. A one-minute onboarding fits the course to your background and your tool (Kilo Code, OpenCode, Claude Code, Cursor, Copilot and more), and suggests Kilo Code or OpenCode as the free way to start.

**Public site:** https://creative-ai-agent-quest.vercel.app. Production currently serves an earlier build; this branch is not deployed.

Sign-in is all in-house (no auth service, no quota): **Google** (Google’s own button, verified server-side), **email + 6-digit code** (requires SMTP configuration), or **email + password** (scrypt-hashed in our database). Google and emailed-code sign-ins for the same verified address share an account; password sign-ins use a separate password-account id. Sessions are our own signed cookie, valid a year and rolled forward on each visit. Each person gets their own progress, schedule (starting the day they first sign in), uploads and Spark chats. There is no separate privileged learner-data dashboard. Evidence and reflections are not shown to other learners in the app, and nothing is shared with other learners by default; service providers process data to run the site, as described in the privacy note.

## What's inside

| Feature | Where |
|---|---|
| Quest content: 11 quests × 3 variants (original + 2 remixes that teach the same concept) | `src/lib/quest.ts` (edit the wording here, and only here) |
| Every supported AI tool: install steps per OS, cheat sheet, plan/undo/rules wording, price, with the official source for each fact. Quest text uses slots like `{plan}` that `variantOf` fills per tool | `src/lib/tools.ts` |
| Onboarding answers (role, experience, goal, tool, computer, time a week), validation, who sees onboarding vs the prompt | `src/lib/profile.ts` · `src/components/Onboarding.tsx` · `/profile` |
| XP, ranks, streaks, badges, schedule, pace. All derived from progress, never stored | `src/lib/game.ts` |
| Postgres (Neon) access, every table keyed by the account id; the schema is created automatically on first request | `src/lib/db.ts` |
| Sessions, password hashing, Google token check, session versioning | `src/lib/session.ts` · `src/app/api/session/route.ts` |
| Email codes and password recovery (SMTP) | `src/lib/mail.ts` · `src/app/api/recovery/route.ts` |
| Uploads (Vercel Blob) | `src/app/api/files/route.ts` · `src/components/Creations.tsx` |
| Account & data deletion: Blob files first, then one database transaction, with honest partial-failure messages | `src/app/api/account/route.ts` · `src/components/AccountSettings.tsx` |
| Spark, the optional AI assistant: system prompt + streaming from Cloudflare Workers AI | `src/lib/coach.ts` |
| API routes | `src/app/api/*` |
| Pages: map `/`, quest `/quest/t0…t10`, plan `/schedule`, guide `/guide`, pro `/pro`, recovery `/recover`, account `/account`, profile `/profile` | `src/app/*` |

Schedule rule: one sitting per day from the learner's first sign-in. Marking a day busy pushes the plan back a day and protects the streak.

## Run locally

```bash
npm install
npm run dev            # needs .env.development.local (below)
npx tsc --noEmit && npm test && npm run build
```

`.env.development.local` points at a separate test database, never production learner data. The database name must contain `test` (the local example is `kiki_quest_test`); never point local testing or the guarded integration test at production.

```dotenv
DATABASE_URL=postgresql://…/kiki_quest_test?sslmode=require
OPENAI_API_KEY=…            # Cloudflare Workers AI token
OPENAI_BASE_URL=https://api.cloudflare.com/client/v4/accounts/<id>/ai/v1
OPENAI_CHAT_MODEL=@cf/meta/llama-3.3-70b-instruct-fp8-fast
AUTH_SECRET=…               # any long random string (signs session cookies and hashed codes)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=…   # optional; Google Auth Platform → Clients (JS origin http://localhost:3100)
SMTP_HOST=smtp.gmail.com    # optional
SMTP_PORT=465               # optional
SMTP_USER=…                 # optional
SMTP_PASS=…                 # optional
BLOB_READ_WRITE_TOKEN=…     # from `vercel env pull` (Blob store creative-quest-files)
```

`SMTP_*` is optional: without it, local development prints codes to the console. In production, email sign-in codes and self-service password recovery stay unavailable until SMTP is configured; `/recover` says so honestly.

## Deploy

This branch has not been merged or deployed. Production deploy is a separate owner-approved action. **No production merge, deploy, migration, or credential change was performed for this branch.**

The Vercel project is `creative-ai-agent-quest` (functions pinned to `sin1`, next to the Neon DB in Singapore). It has no Git integration; pushing does not deploy.

Production env names: `DATABASE_URL` (Neon integration), `BLOB_READ_WRITE_TOKEN` (Blob store), the three `OPENAI_*` vars, `AUTH_SECRET`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, and optionally `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` to enable email codes and password recovery. The Google client’s Authorized JavaScript origin is `https://creative-ai-agent-quest.vercel.app`, and the app is published (Google Auth Platform → Audience) so anyone can sign in. Public pages: `/privacy`, `/terms`, `/recover`.

See `docs/deploy.md` for the pending production gates and the additive schema notes.

## Costs and limits

- Neon free plan: 0.5 GB. Check-in screenshots are shrunk to ≤ 1 MB JPEGs before they're stored.
- Spark uses the Cloudflare Workers AI free allowance (10k neurons/day, roughly 60–100 replies/day by my estimate). Each learner can send 30 messages per 10 minutes.

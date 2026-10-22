# Creative AI Agent Quest

A gamified, AI-coached course for anyone learning to build with AI coding agents: 10 quests with XP, streaks, badges and a day-by-day plan, plus Spark, an AI coach that helps you write your own prompts instead of handing you finished ones. A one-minute onboarding fits the course to your background and your tool (Kilo Code, OpenCode, Claude Code, Cursor, Copilot and more), and suggests Kilo Code or OpenCode as the free way to start. Mentors get a dashboard to see where learners get stuck.

**Live:** https://creative-ai-agent-quest.vercel.app · **Mentor view:** https://creative-ai-agent-quest.vercel.app/mentor

Sign-in is all in-house (no auth service, no quota): **Google** (Google's own button, verified server-side), **email + 6-digit code** (sent from a Gmail app password), or **email + password** (scrypt-hashed in our DB). One account per email address, whichever way they sign in. Sessions are our own signed cookie, valid a year and rolled forward on each visit. Each person gets their own progress, schedule (starting the day they first sign in), uploads and coach chats. Emails in `ADMIN_EMAILS` get Mentor HQ, which can also reset a learner's password.

## What's inside

| Feature | Where |
|---|---|
| Quest content: 11 quests × 3 variants (original + 2 remixes that teach the same concept) | `src/lib/quest.ts` (edit the wording here, and only here) |
| Every supported AI tool: install steps per OS, cheat sheet, plan/undo/rules wording, price, with the official source for each fact. Quest text uses slots like `{plan}` that `variantOf` fills per tool | `src/lib/tools.ts` |
| Onboarding answers (role, experience, goal, tool, computer, time a week), validation, who sees onboarding vs the prompt | `src/lib/profile.ts` · `src/components/Onboarding.tsx` · `/profile` |
| XP, ranks, streaks, badges, schedule, pace. All derived from progress, never stored | `src/lib/game.ts` |
| Postgres (Neon) access, every table keyed by the Google account id; the schema is created automatically on first request | `src/lib/db.ts` |
| Sessions, password hashing, Google token check, mentor allow-list | `src/lib/session.ts` · `src/app/api/session/route.ts` |
| Email codes (SMTP) | `src/lib/mail.ts` |
| Uploads (Vercel Blob) | `src/app/api/files/route.ts` · `src/components/Creations.tsx` |
| Spark, the AI coach: system prompt + streaming from Cloudflare Workers AI | `src/lib/coach.ts` |
| API routes | `src/app/api/*` |
| Pages: map `/`, quest `/quest/t0…t10`, plan `/schedule`, guide `/guide`, mentor `/mentor` | `src/app/*` |

Schedule rule: one sitting per day from the learner's first sign-in. Marking a day busy pushes the plan back a day and protects the streak.

## Run locally

```bash
npm install
npm run dev            # needs .env.development.local (below)
npx tsc --noEmit && npx eslint src && npm test
```

`.env.development.local` points at a separate test database, so local testing never touches real learners' data:

```
DATABASE_URL=postgresql://…/quest_test?sslmode=require
OPENAI_API_KEY=…            # Cloudflare Workers AI token
OPENAI_BASE_URL=https://api.cloudflare.com/client/v4/accounts/<id>/ai/v1
OPENAI_CHAT_MODEL=@cf/meta/llama-3.3-70b-instruct-fp8-fast
AUTH_SECRET=…               # any long random string (signs session cookies)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=…   # optional; Google Auth Platform → Clients (JS origin http://localhost:3100)
ADMIN_EMAILS=you@example.com
SMTP_USER=… SMTP_PASS=…     # optional; Gmail + app password for email codes (without it, dev prints codes to the console)
BLOB_READ_WRITE_TOKEN=…     # from `vercel env pull` (Blob store creative-quest-files)
```

## Deploy

Vercel project `creative-ai-agent-quest` (functions pinned to `sin1`, next to the Neon DB in Singapore).

```bash
vercel deploy --prod
```

Production env: `DATABASE_URL` (Neon integration), `BLOB_READ_WRITE_TOKEN` (Blob store), the three `OPENAI_*` vars, `AUTH_SECRET`, `ADMIN_EMAILS`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, and optionally `SMTP_USER` / `SMTP_PASS` to switch on email codes. The Google client's Authorized JavaScript origin is `https://creative-ai-agent-quest.vercel.app`, and the app is published (Google Auth Platform → Audience) so anyone can sign in. Public pages: `/privacy`, `/terms`.

## Costs and limits

- Neon free plan: 0.5 GB. Check-in screenshots are shrunk to ≤1 MB JPEGs before they're stored.
- Spark uses the Cloudflare Workers AI free allowance (10k neurons/day, roughly 60–100 coach replies/day by my estimate). Each learner can send 30 messages per 10 minutes.

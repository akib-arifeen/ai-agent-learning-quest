# Deploy

**Status: deployed 2026-10-23** (app build `f365910`). Verified 2026-10-24 against `main`
`e04758f`, whose only delta is this `docs/` folder: production is current and needs no redeploy.
Evidence: `/Users/seechange/work-dir/akib/HANDOFF/reports/quest.md`, screenshots in
`HANDOFF/reports/quest-shots/`.

Freshness check (the project has **no Git integration**, so a push never deploys): build `main`
locally, then compare a shared chunk in the live HTML with `.next/static/chunks/`. On 2026-10-24
both served and local had `1255-dc3ddf72a1dc71a7.js`, so the live bundle was the current source.

**Known gap / pending decision (owner):** `SMTP_*` is not set in Production, so the email-code
step is hidden. The sign-in card then offers Google plus email + password, so it does not
dead-end, but the README still advertises 6-digit codes. Decide one:

- **(a)** set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` in Production — the code step
  appears automatically, no code change; or
- **(b)** commit to Google + password and update the README and landing copy.

Do not change the sign-in UI until that call is made.

## What the deploy changes

Application code only (pacing, diagrams, official docs, pro track). The database change is
**additive** and idempotent — it is applied by `initDb()` on the first request:

```sql
create table if not exists quest_profiles (
  user_id text primary key references quest_users (id) on delete cascade,
  role text not null default '',
  role_other text not null default '',
  experience text not null default '',
  goal text not null default '',
  tool text not null default '',
  tool_other text not null default '',
  os text not null default '',
  weekly_minutes int,
  completed_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

No column is dropped or renamed. Existing tables are untouched.

## Pre-flight

- [ ] `git status` clean; the branch is the one you intend to ship.
- [ ] `npx tsc --noEmit` clean.
- [ ] `npm test` all pass (422 at the time of writing).
- [ ] `npm run build` clean.
- [ ] These env vars exist in the Vercel project (names only): `DATABASE_URL`, `AUTH_SECRET`,
      `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_SITE_URL`, `OPENAI_API_KEY`,
      `OPENAI_BASE_URL`, `OPENAI_CHAT_MODEL`, `ADMIN_EMAILS`. Add `SMTP_HOST`, `SMTP_PORT`,
      `SMTP_USER`, `SMTP_PASS` only if the owner chooses email codes (see the pending decision).
- [ ] A database backup or snapshot exists if the provider offers one.

## Deploy

The project has **no Git integration**; pushing does not deploy.

```bash
cd /Users/seechange/work-dir/akib/kiki-quest
vercel link --yes --project creative-ai-agent-quest   # once; authenticated as simulatedhope17
vercel deploy --prod --yes
```

Record the deployment URL from the output. The project is `creative-ai-agent-quest` even though
the gitignored `.vercel/project.json` still carries the old name `kiki-quest`; the project id in
that file is the one in use.

## Post-deploy checks

1. `curl -s -o /dev/null -w '%{http_code}' https://creative-ai-agent-quest.vercel.app/` → 200.
2. `/guide`, `/pro` and `/pro/p2` render for a signed-in user at 390x844, 768x1024 and 1280x800.
3. `curl -s -o /dev/null -w '%{http_code}' -X POST https://creative-ai-agent-quest.vercel.app/api/mcp`
   without a token → 401.
4. `curl -s https://creative-ai-agent-quest.vercel.app/api/session` → `{"google":"…","otp":false}`
   while SMTP is unset (the code step is hidden, so sign-in does not dead-end); `otp:true` once
   SMTP is configured.
5. Connect a real agent with a token from `/pro`, submit one level's evidence, and confirm PASSED
   in the app.
6. Confirm `quest_profiles` exists:
   `select to_regclass('public.quest_profiles');`
7. Confirm redaction: submit a payload containing a fake `sk-...` string; the result says how many
   secret-looking strings were removed, the footer says `[REDACTED]`, and the fake value is absent.

### Verification log — 2026-10-24

- `npx tsc --noEmit` 0 errors; `npm test` 422 passed; `npm run build` clean.
- `/`, `/guide`, `/pro`, `/pro/p2` 200 and render at 390x844, 768x1024 and 1280x800.
- POST `/api/mcp` without a token → 401.
- Kilo Code (free Auto Free model) connected through the card and submitted `p1`: **PASSED**, both
  required checks passed, **1 secret-looking string removed**, stored content shows
  `EXAMPLE_API_KEY=[REDACTED]`; the fake key is absent. `quest_whoami` and `quest_get_task` were
  called over the same token.
- axe 4.12.1: `/pro` 0 violations (1 incomplete, diagram SVG contrast), `/pro/p2` 0 violations,
  `/guide` 0 violations, connect card 0 violations (same 1 incomplete). Screenshots and JSON:
  `HANDOFF/reports/quest-shots/`.
- Verification created one test learner (`qa-verify@example.com`) on Production; remove it from
  Mentor HQ if unwanted.

## Rollback

- **Code:** promote the previous deployment in Vercel → Deployments → the last production build →
  Promote to Production.
- **Database:** none needed. `quest_profiles` is additive; leaving it in place is harmless.

## Notes

- The MCP route is documented for a remote streamable-HTTP client with a bearer token. Tokens are
  stored hashed; a token is shown once.
- Never put a token, database URL or SMTP password in this file, a brief or a report.

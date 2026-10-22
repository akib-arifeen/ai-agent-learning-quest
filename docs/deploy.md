# Deploy

**Status: not deployed.** Production still serves the pre-pacing build. The lead holds approval
because the deploy applies one additive table. Do not run this without that approval.

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
      `OPENAI_BASE_URL`, `OPENAI_CHAT_MODEL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
      `SMTP_PASS`, `ADMIN_EMAILS`.
- [ ] A database backup or snapshot exists if the provider offers one.

## Deploy

The project has **no Git integration**; pushing does not deploy.

```bash
cd /Users/seechange/work-dir/akib/kiki-quest
vercel link --project creative-ai-agent-quest   # once
vercel deploy --prod --yes
```

Record the deployment URL from the output.

## Post-deploy checks

1. `curl -s -o /dev/null -w '%{http_code}' https://creative-ai-agent-quest.vercel.app/` → 200.
2. `/pro` and `/pro/p2` render for a signed-in user.
3. `curl -s -o /dev/null -w '%{http_code}' -X POST https://creative-ai-agent-quest.vercel.app/api/mcp`
   without a token → 401.
4. Submit one evidence item from a real connected agent; it appears on the level and in the DB.
5. Confirm `quest_profiles` exists:
   `select to_regclass('public.quest_profiles');`
6. Confirm redaction: submit a payload containing a fake `sk-...` string and verify it is not
   stored.

## Rollback

- **Code:** promote the previous deployment in Vercel → Deployments → the last production build →
  Promote to Production.
- **Database:** none needed. `quest_profiles` is additive; leaving it in place is harmless.

## Notes

- The MCP route is documented for a remote streamable-HTTP client with a bearer token. Tokens are
  stored hashed; a token is shown once.
- Never put a token, database URL or SMTP password in this file, a brief or a report.

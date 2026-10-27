# Deploy

## Status

Production was deployed on 2026-10-23 (app build `f365910`) and verified on 2026-10-24 against `main` `e04758f`. This feature branch `feat/self-directed-quest` is **not** merged, deployed, or migrated. **No production merge, deploy, migration, or credential change was performed for this branch.**

Freshness check (the project has **no Git integration**, so a push never deploys): build `main` locally, then compare a shared chunk in the live HTML with `.next/static/chunks/`. On 2026-10-24 both served and local had `1255-dc3ddf72a1dc71a7.js`, so the live bundle was the current source then.

`SMTP_*` remains optional. Email sign-in codes and self-service password recovery are unavailable in production until SMTP is configured, and the `/recover` page says so honestly. Do not claim production recovery works.

## Historical deploy (2026-10-23)

Application build `f365910` was deployed to Vercel. Evidence: `/Users/seechange/work-dir/akib/HANDOFF/reports/quest.md`, with screenshots in `HANDOFF/reports/quest-shots/`.

```bash
cd /Users/seechange/work-dir/akib/kiki-quest
vercel link --yes --project creative-ai-agent-quest   # once
vercel deploy --prod --yes
```

Record the deployment URL from the output. The project is `creative-ai-agent-quest` even though the gitignored `.vercel/project.json` may still carry the old name `kiki-quest`; the project id in that file is the one in use.

## What this branch changes (additive only)

The schema change is additive and idempotent. `ensureSchema()` applies it on the first database request; there is no separate production migration step. No column is dropped or renamed, and old tables — including `quest_cheers` — remain in place.

```sql
create sequence if not exists quest_session_seq;
alter table quest_users add column if not exists session_version int not null default 0;

create table if not exists quest_recovery (
  email text primary key,
  code_hash text not null default '',
  code_expires_at timestamptz,
  token_hash text,
  token_expires_at timestamptz,
  attempts int not null default 0,
  created_at timestamptz not null default now()
);
```

The account deletion path removes user-keyed rows in one transaction. A verified-account deletion also removes all same-email password, OTP and recovery records; a password-only deletion removes that password account’s password and recovery records while preserving the separate verified identity’s pending sign-in OTP. Because `session_version` lives on `quest_users`, deleting that row makes every old cookie fail its version lookup.

## SMTP and recovery

`SMTP_*` is optional. Without `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` and `SMTP_PASS`, production email sign-in codes and self-service password recovery are unavailable, and the UI says so. Local development logs codes to the console instead. Enabling email delivery is a credential/configuration change and requires a redeploy; make that change only with owner approval.

## Pre-flight

- [ ] `git status` clean; the branch is the one you intend to ship.
- [ ] `npx tsc --noEmit` clean.
- [ ] `npm test` all pass.
- [ ] `npm run build` clean.
- [ ] These env vars exist in the Vercel project (names only): `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `AUTH_SECRET`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_SITE_URL`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_CHAT_MODEL`.
- [ ] Optionally set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` for email codes and password recovery. Without them, keep the honest unavailable UI.
- [ ] A database backup or snapshot exists if the provider offers one.

## Local and test data rules

- Use only a separate test database whose name contains `test` (for example `kiki_quest_test`). Never point local tests or the guarded integration test at production.
- The guarded integration tests run only with `QUEST_INTEGRATION=1` and a `DATABASE_URL` whose database name contains `test`. They use synthetic ids/emails and clean up after themselves.
- `npm test` mocks database, Blob and mail calls and does not touch a real database.

## Account deletion and Blob caveat

Uploads are removed from Vercel Blob before the database transaction. The two stores cannot share a transaction:

- If Blob URL lookup / prefix listing or deletion fails, the account and database rows are left intact and the route returns an honest retryable error. `del` may already have removed some objects before throwing, so the message says some files may be gone.
- If Blob deletion succeeds but the database deletion fails, the account stays active and the route returns an honest partial-failure message. Retrying repeats the idempotent Blob step and then attempts the database transaction again.
- If `BLOB_READ_WRITE_TOKEN` is absent, deletion fails closed before any lookup or deletion and the account stays active; missing credentials must never produce a false success.
- Only after the database transaction succeeds is the session cookie cleared and success returned.

## Post-deploy checks

1. `curl -s -o /dev/null -w '%{http_code}' https://creative-ai-agent-quest.vercel.app/` → 200.
2. `/guide`, `/pro` and `/pro/p2` render for a signed-in user at 390x844, 768x1024 and 1280x800.
3. `curl -s -o /dev/null -w '%{http_code}' -X POST https://creative-ai-agent-quest.vercel.app/api/mcp` without a token → 401 with a `WWW-Authenticate` challenge pointing at `/.well-known/oauth-protected-resource`.
4. `/mcp` is public and renders the MCP setup guide; `/privacy`, `/terms` and `/recover` are public too.
5. `curl -s https://creative-ai-agent-quest.vercel.app/api/session` → `{"google":"…","otp":false}` while SMTP is unset; `otp:true` once SMTP is configured.
6. Connect an agent with a token from `/pro`, submit one level's evidence, and confirm PASSED in the app.
7. Confirm `quest_profiles`, `quest_users.session_version` and `quest_recovery` exist:
   `select to_regclass('public.quest_recovery');`
8. Confirm redaction: submit a payload containing a fake `sk-...` string; the result says how many secret-looking strings were removed, the footer says `[REDACTED]`, and the fake value is absent.
9. Verify `/recover` and `/account` render; account deletion must fail closed when Blob credentials are missing and must only be exercised on a synthetic test account.
10. Check that no learner-data dashboard or default sharing path is exposed.

### Verification log — 2026-10-24 (historical)

- `npx tsc --noEmit` 0 errors; `npm test` 422 passed; `npm run build` clean.
- `/`, `/guide`, `/pro`, `/pro/p2` 200 and render at 390x844, 768x1024 and 1280x800.
- POST `/api/mcp` without a token → 401.
- Kilo Code (free Auto Free model) connected through the card and submitted `p1`: **PASSED**, both required checks passed, **1 secret-looking string removed**, stored content shows `EXAMPLE_API_KEY=[REDACTED]`; the fake key is absent. `quest_whoami` and `quest_get_task` were called over the same token.
- axe 4.12.1: `/pro` 0 violations (1 incomplete, diagram SVG contrast), `/pro/p2` 0 violations, `/guide` 0 violations, connect card 0 violations (same 1 incomplete). Screenshots and JSON: `HANDOFF/reports/quest-shots/`.
- Verification created one synthetic test learner (`qa-verify@example.com`) on Production; remove it only via Account & data or the test database, never a real learner.

## Pending production gates

- [ ] Owner approval to merge and deploy this branch.
- [ ] Confirm production env names: `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `AUTH_SECRET`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_SITE_URL`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_CHAT_MODEL`.
- [ ] Optionally set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`; otherwise keep email codes and recovery unavailable.
- [ ] Take a database backup or snapshot if the provider offers one.
- [ ] `npx tsc --noEmit && npm test && npm run build` all pass on the commit to ship.
- [ ] Deploy through the owner-approved Vercel process. The project has no Git integration, so pushing does not deploy.
- [ ] Verify `/`, `/privacy`, `/terms`, `/mcp`, `/recover` and `/account` render.
- [ ] Verify `/api/mcp` returns 401 without a token and the protected-resource metadata is served at `/.well-known/oauth-protected-resource`.
- [ ] Verify Google and password sign-in; if SMTP was enabled, verify one code/recovery email on a synthetic account only.
- [ ] Verify `quest_users.session_version` and `quest_recovery` exist:
  `select to_regclass('public.quest_recovery');`
- [ ] Exercise account deletion on a synthetic, owner-approved test account only — never a real learner — and confirm the Blob/DB result, fail-closed missing-token behavior and honest partial-failure messages.
- [ ] Check that no learner-data dashboard or default sharing path is exposed.
- [ ] No production merge, deploy, migration or credential change without explicit owner approval.

## Rollback

- **Code:** promote the previous deployment in Vercel → Deployments → the last production build → Promote to Production.
- **Database:** none needed. The sequence, session-version column and `quest_recovery` table are additive; leaving them in place is harmless.

## Notes

- The MCP route is documented for a remote streamable-HTTP client with a bearer token. Tokens are stored hashed; a token is shown once.
- `/.well-known/oauth-protected-resource` serves RFC 9728 metadata for `/api/mcp` and deliberately has no `authorization_servers`: the app has no OAuth authorization server, so clients still need the manual token. The 401 `WWW-Authenticate` header points at this URL.
- Never put a token, database URL or SMTP password in this file, a brief or a report.
- Production recovery has not been exercised from this branch. Do not claim it works until SMTP is configured and a synthetic send is verified.

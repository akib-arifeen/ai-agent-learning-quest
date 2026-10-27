# Deploy

## Status: this branch is not deployed

`feat/self-directed-quest` (based on `main` `e04758f`) has not been merged, deployed, or migrated. Production still serves the earlier build described under the historical note. **No production merge, deploy, migration, or credential change was performed for this branch.**

Self-service password recovery and email sign-in codes are not live in production until SMTP is configured. The `/recover` page says that honestly when email delivery is unavailable.

## Historical deploy (2026-10-23, `f365910`)

Production was deployed on 2026-10-23 at commit `f365910`. That historical build did not have `SMTP_*` configured in Production, so email sign-in codes did not send. That note is historical; it is not evidence that this branch or recovery is live.

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

The new account deletion path removes user-keyed rows in one transaction and then removes the email-keyed password, OTP and recovery records. Because `session_version` lives on `quest_users`, deleting that row makes every old cookie fail its version lookup.

## SMTP and recovery

`SMTP_*` is optional. Without `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` and `SMTP_PASS`, production email sign-in codes and self-service password recovery are unavailable, and the UI says so. Local development logs codes to the console instead. Enabling email delivery is a credential/configuration change and requires a redeploy; make that change only with owner approval.

## Local and test data rules

- Use only a separate test database whose name contains `test` (for example `kiki_quest_test`). Never point local tests or the guarded integration test at production.
- The guarded integration test runs only with `QUEST_INTEGRATION=1` and a `DATABASE_URL` whose database name contains `test`. It uses synthetic ids/emails and cleans up after itself.
- `npm test` mocks database, Blob and mail calls and does not touch a real database.

## Account deletion and Blob caveat

Uploads are removed from Vercel Blob before the database transaction. The two stores cannot share a transaction:

- If Blob URL lookup / prefix listing or deletion fails, the account and database rows are left intact and the route returns an honest retryable error. `del` may already have removed some objects before throwing, so the message says some files may be gone.
- If Blob deletion succeeds but the database deletion fails, the account stays active and the route returns an honest partial-failure message. Retrying repeats the idempotent Blob step and then attempts the database transaction again.
- Only after the database transaction succeeds is the session cookie cleared and success returned.

## Pending production gates

- [ ] Owner approval to merge and deploy this branch.
- [ ] Confirm production env names: `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_CHAT_MODEL`, `AUTH_SECRET`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
- [ ] Optionally set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` for email codes and password recovery; otherwise keep the unavailable UI.
- [ ] Take a database backup or snapshot if the provider offers one.
- [ ] `npx tsc --noEmit && npm test && npm run build` all pass on the commit to ship.
- [ ] Deploy through the owner-approved Vercel process. The project has no Git integration, so pushing does not deploy.
- [ ] Verify `/`, `/privacy`, `/terms`, `/recover` and `/account` render.
- [ ] Verify Google and password sign-in; if SMTP was enabled, verify one code/recovery email on a synthetic account only.
- [ ] Verify `quest_users.session_version` and `quest_recovery` exist:
  `select to_regclass('public.quest_recovery');`
- [ ] Exercise account deletion on a synthetic, owner-approved test account only — never a real learner — and confirm the Blob/DB result and honest partial-failure messages.
- [ ] Check that no learner-data dashboard or default sharing path is exposed.

## Rollback

- **Code:** promote the previous deployment in Vercel → Deployments → the last production build → Promote to Production.
- **Database:** none needed. The sequence, session-version column and `quest_recovery` table are additive; leaving them in place is harmless.

## Notes

- The MCP route is documented for a remote streamable-HTTP client with a bearer token. Tokens are stored hashed; a token is shown once.
- Never put a token, database URL or SMTP password in this file, a brief or a report.
- Production recovery has not been exercised from this branch. Do not claim it works until SMTP is configured and a synthetic send is verified.

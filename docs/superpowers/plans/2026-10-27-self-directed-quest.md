# Creative AI Agent Quest Self-Directed Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Quest into a self-directed learning product with optional Spark guidance, no mentor dependency or default third-party learner-data access, self-service password recovery, and self-service account deletion.

**Architecture:** Preserve Next.js/Postgres/Blob and existing quest content structure. Remove mentor UI/API/read paths, reuse the existing OTP/mail infrastructure for recovery, add account-security session versioning, and implement owner-only deletion with explicit Blob cleanup. Visible copy says guide/reflection; internal coach identifiers may remain where renaming adds risk without user value.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Postgres, Vercel Blob, Nodemailer, Vitest, Playwright.

**Spec:** Owner-approved correction on 27 October 2026: remove learner mentor references; private reflection; optional Spark hints; self-service recovery/deletion; no default exposure of chats/uploads/progress; separate any future moderation role accurately. No production merge/deploy or credential changes.

## Global Constraints

- New isolated worktree from `main` (`e04758f`), preserving the current `fix/mcp-protected-resource-metadata` checkout and its untracked `.kimi-code/` instructions.
- Read `.kimi-code/AGENTS.md`; run `npx tsc --noEmit && npm test && npm run build` after final edits.
- No production deploy/merge, live database migration, credential access/change, email sending to real learners, or deletion of production data.
- Local tests use only the separate test database and synthetic users/files. Never point tests at production.
- Do not silently drop learner content/XP. No destructive schema migration; additive security metadata only.
- Mentor UI/API and default mentor read access must actually stop working, not merely be hidden.
- Keep Spark optional, helpful and non-monitorial. No change to its model/provider or quota.
- Sign-in provider remains Google + existing password/OTP options. SMTP production enablement is an owner follow-up; never print/log real codes in production or claim live email recovery without configured delivery.
- Quest wording lives in `src/lib/quest.ts`; tool facts stay in `src/lib/tools.ts`.

## Review Focus

- Password reset: generic anti-enumeration responses, expiring single-use codes, attempt/rate limits, old-session revocation, and no password/hash/token leakage; test in Task 2.
- Stateless sessions: password reset and deletion must invalidate existing cookies; test in Tasks 2–3.
- Account deletion: owner-only, correct password for password accounts, explicit Google confirmation, all user-keyed tables plus password/OTP records and Blob pathnames; test in Task 3.
- Partial Blob/DB failure: never report full success; make retry/error behavior explicit and leave no false deletion state; test in Task 3.
- Mentor removal: legacy `/mentor`, `/api/mentor`, `/api/cheer`, owner-or-mentor reads and `state.mentor` no longer grant data; test in Task 4.
- Privacy accuracy: no “no one else sees it” claim while service providers process data; document model/Blob/Postgres processors and self-service deletion; test in Task 5.
- Existing learner flows: onboarding, quests, uploads, coach chats, MCP evidence and Google sign-in continue; verify in Task 6.

---

### Task 1: Self-directed learner language and reflection

**Files:**
- Modify: `src/components/SignIn.tsx`, `Coach.tsx`, `ConnectAgent.tsx`, `Diagram.tsx`, `QuestView.tsx`, `Shell.tsx`, `QuestProvider.tsx`
- Modify: `src/app/page.tsx`, `src/app/error.tsx`, `src/app/layout.tsx`, `src/app/opengraph-image.tsx`
- Modify: `src/lib/quest.ts`, `src/lib/coach.ts`, `src/lib/pro.ts`, `src/lib/profile.ts`
- Test: `src/lib/__tests__/coach.test.ts` and quest/profile tests

**Interfaces:**
- Produces: learner-facing `Spark guide` and private `reflection` semantics; internal coach/task IDs remain stable.

- [ ] **Step 1: Write failing copy/behavior tests**
  Pin no mentor wording in learner journeys, private reflection label, optional Spark guidance, and unchanged quest IDs/XP.
- [ ] **Step 2: Run tests and confirm current mentor assumptions fail them**
- [ ] **Step 3: Implement the copy correction**
  Replace mentor sharing with sharing one's own work/reflection. Keep Spark hints, not monitoring. Preserve all quest content structure and tool-specific facts.
- [ ] **Step 4: Run focused tests/typecheck and commit**
  `git add src && git commit -m "feat: make learner journeys self directed"`

### Task 2: Self-service password recovery with session revocation

**Files:**
- Create: `src/app/api/recovery/route.ts`, `src/components/RecoverPassword.tsx`, `src/app/recover/page.tsx`
- Modify: `src/lib/mail.ts`, `src/lib/db.ts`, `src/lib/session.ts`, `src/lib/http.ts`, `src/components/SignIn.tsx`
- Test: `src/lib/__tests__/recovery.test.ts`, route integration tests

**Interfaces:**
- Produces: `POST /api/recovery` actions `request|verify|reset`; `session_version` additive account metadata; session cookie `sv`; `me()` rejects stale/deleted security versions.

- [ ] **Step 1: Write failing recovery/security tests**
  Cover generic unknown/email responses, 10-minute expiry, single use, attempt/rate limits, wrong code, successful reset, no account creation, no OTP/hash/password response leakage, old-cookie rejection, new-cookie acceptance, and production behavior with SMTP absent.
- [ ] **Step 2: Run tests and confirm recovery is absent**
- [ ] **Step 3: Implement recovery and versioned sessions**
  Reuse OTP hashing/attempt discipline and SMTP delivery; add purpose-specific email copy. Add additive per-account `session_version`, carry `sv` in cookies, and validate it in the existing user-loading path. Reset increments the version and deletes the OTP. Do not weaken Google account separation or verified-email IDs.
- [ ] **Step 4: Add recovery UI**
  Request code, verify, choose new password. Show it only when OTP delivery is enabled; otherwise offer Google and an honest unavailable message, never “ask your mentor.”
- [ ] **Step 5: Run recovery tests/typecheck and commit**
  `git add src && git commit -m "feat: add self service password recovery"`

### Task 3: Self-service account and uploaded-data deletion

**Files:**
- Create: `src/app/api/account/route.ts`, `src/components/AccountSettings.tsx`, `src/app/account/page.tsx`
- Modify: `src/lib/db.ts`, `src/lib/http.ts`, `src/lib/session.ts`, `src/components/Shell.tsx`
- Test: `src/lib/__tests__/account.test.ts`, route integration tests

**Interfaces:**
- Produces: authenticated `DELETE /api/account`; `deleteAccountData(userId,passwordConfirmation)` and Blob cleanup result; stale/deleted sessions denied.

- [ ] **Step 1: Write failing deletion tests**
  Cover unauthenticated/wrong-user/wrong-password denial, Google explicit confirmation, all user-keyed tables, password/OTP rows, Blob pathnames, old-cookie rejection, retry after Blob failure, and no false success on partial failure.
- [ ] **Step 2: Run tests and confirm deletion is absent**
- [ ] **Step 3: Implement owner-only deletion**
  Enumerate Blob pathnames, attempt idempotent Blob deletion before DB commit, abort with an honest retryable error if storage cleanup fails, then delete all user-keyed DB rows plus password/OTP records in a transaction. Invalidate security version/session and clear the cookie. Do not run this against production data.
- [ ] **Step 4: Add accessible account settings**
  Password users confirm current password; Google users type an explicit confirmation. Explain scope and that downloaded/shared copies cannot be recalled.
- [ ] **Step 5: Run deletion tests/typecheck and commit**
  `git add src && git commit -m "feat: add self service account deletion"`

### Task 4: Remove mentor access and legacy privileged flows

**Files:**
- Delete: `src/app/mentor/**`, `src/app/api/mentor/**`, `src/app/api/cheer/**`
- Modify: `src/lib/session.ts`, `src/lib/db.ts`, `src/lib/game.ts`, `src/lib/http.ts`, `src/lib/profile.ts`, `src/lib/pro.ts`
- Modify: `src/app/api/state/route.ts`, `src/app/api/checkin/route.ts`, `src/app/api/mcp/route.ts`, `src/components/Shell.tsx`, `src/app/page.tsx`
- Test: authorization and profile tests

**Interfaces:**
- Produces: owner-only `checkinImage`/evidence/state reads; no `mentor` state or privileged learner listing/reset/cheer route.

- [ ] **Step 1: Write failing authorization tests**
  Legacy admin cookies and `/mentor`, `/api/mentor`, `/api/cheer` cannot read or mutate learner data; owner reads still work.
- [ ] **Step 2: Run tests and confirm old privileged behavior fails them**
- [ ] **Step 3: Remove mentor surface and simplify owner checks**
  Remove mentor-only list/reset/cheer functions and props. Keep old database tables harmlessly untouched but inaccessible. Do not replace this with a hidden renamed mentor role.
- [ ] **Step 4: Run authorization/full unit tests and commit**
  `git add -A src && git commit -m "refactor: remove mentor learner data access"`

### Task 5: Accurate privacy, terms and operator documentation

**Files:**
- Modify: `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`, `README.md`, `docs/deploy.md`
- Modify: `.env.example` or existing non-secret example config only

**Interfaces:**
- Produces: accurate storage/processors/deletion/recovery documentation; no mentor setup instructions.

- [ ] **Step 1: Write failing documentation checks**
  No mentor-dependent recovery/deletion or default mentor visibility claims. SMTP requirement and production-unavailable state are explicit.
- [ ] **Step 2: Update privacy/terms**
  Describe stored data, AI/model processing, Postgres/Blob providers, owner-only access, self-service recovery/deletion, and copies the user exported/shared. No “no one else” absolute claim.
- [ ] **Step 3: Update runbook**
  Document additive schema behavior, SMTP recovery enablement, test-only data rules, and no production migration/deploy performed.
- [ ] **Step 4: Validate docs and commit**
  `git add README.md docs src/app .env.example && git commit -m "docs: explain self directed privacy and recovery"`

### Task 6: Full verification, browser QA and independent review

**Files:**
- Modify only files needed for corrections from Tasks 1–5.

- [ ] **Step 1: Run the standard gate**
  `npx tsc --noEmit && npm test && npm run build`; all pass after the final edit.
- [ ] **Step 2: Exercise real user flows**
  Against the built app and synthetic test data: landing, Google/test sign-in, onboarding, quest, reflection, Spark, upload, recovery, deletion, legacy mentor URLs, mobile and keyboard. No production learner data or real email.
- [ ] **Step 3: Review security/privacy and regression evidence**
  Fresh reviewer inspects complete diff, route authorization, session revocation, deletion failure paths, content preservation and documentation. Return every correction to the executor and rerun affected checks.
- [ ] **Step 4: Commit corrections and report**
  Provide branch/commit/PR if created, tests, screenshots, remaining production SMTP and deploy gates. Do not merge or deploy.

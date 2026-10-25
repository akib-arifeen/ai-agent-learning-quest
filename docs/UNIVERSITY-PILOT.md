# University pilot — Creative AI Agent Quest

**Status:** internal preparation, 2026-10-26, based on `main` at `7a2972c`. No university has been
contacted and no partnership, endorsement or pilot agreement exists. This document proposes a
pilot for review; it does not announce one, and it changes no application code or production
configuration.

The app is the one in this repository (`ai-agent-learning-quest`), live at
<https://creative-ai-agent-quest.vercel.app>. Course copy calls it **Creative AI Agent Quest**.

## At a glance

| Item | Proposal |
|---|---|
| Audience | One class or cohort, one instructor, named mentors |
| Length | 4–6 weeks: a no-live-student-data rehearsal, then 3–4 weeks with students and a review |
| Core scope | Base Camp (`t0`) plus Quests 1–4 (`t1`–`t4`), roughly 5–8 hours of quest time |
| Optional stretch | Quest 5 or 6, or pro-track levels `p1`–`p2`; the capstone (`t10`, 10–20 h) is out of scope |
| Cost to students and the institution | No charge for the app; no paid tier required; students use a free agent path |
| Student data | Only after the rehearsal and all go/no-go gates close |
| Current readiness | **Not ready for a live cohort.** The gaps are listed in [Go/no-go](#13-gono-go-evidence) and [Owner actions](#14-remaining-owner-actions) |

## 1. Purpose and claim boundaries

The pilot would test whether a normal university class can use the existing free course, with an
instructor and mentors, without paid tooling and without exposing students to avoidable privacy or
access-control risk. It is a usability and operations pilot, not a learning-efficacy study.

This document deliberately does **not** claim:

- a partnership, invitation, endorsement or approval from any university;
- legal or regulatory compliance (for example GDPR, FERPA, or any local student-data rule);
- a security audit, penetration test or certification;
- WCAG conformance or an accessibility audit;
- uptime, support response times, data durability or permanent free service;
- learning gains, completion rates or other impact numbers. No targets are set here.

Cost, quota and limit figures come from this repository and its `README.md`; estimates are labelled
as estimates. Anything marked **UNKNOWN** or **GAP** must be closed before a real cohort.

## 2. Learner outcomes and free-access commitment

### Intended outcomes

By the end of the core scope, a learner should be able to:

1. install and run an AI coding agent on their own computer, inside a safe project folder, with a
   working undo path;
2. write a brief (goal, context, constraints, done-when), ask for a plan before building, and
   iterate in small steps;
3. build at least one small creative artefact and one larger project, and explain how they checked
   that it works instead of trusting the agent's "done";
4. use context deliberately: reference files, rules, fresh chats, and a `progress.md` that survives
   a long project;
5. recognise agent limits and hallucination, and verify commands and claims before relying on them;
6. optionally, connect their own agent to the app over MCP, receive a task, and submit evidence that
   passes deterministic checks.

These are intended outcomes, not measured claims. The course supports a "never coded" starting
point; the app's onboarding asks for role, experience, goal, tool, operating system and weekly time
and adapts the wording.

### Proposed free-access commitment (owner to confirm)

For the pilot period, the app is offered to the class at no charge: no licence fee, no per-seat
charge, no paid tier and no advertising. No student is required to buy a tool or subscription to
complete the core scope. The course's suggested free paths are Kilo Code with its free "Auto Free"
model, or OpenCode with a free model; GitHub Copilot's free plan is another option where it is
available. Tools with paid plans (Claude Code, Cursor, Codex or a paid Copilot plan) are optional and
not required.

This commitment covers the pilot only. It is not a promise of permanent free hosting, unlimited AI
usage or institutional support. The database and AI rely on provider free plans and allowances with
finite quotas (see [AI budget](#7-ai-budget-and-abuse-limits)), so the cohort must be sized to them.
Tool free tiers can also change; `src/lib/tools.ts` records a checked date for each tool, and the
instructor should re-check the chosen tool at the start of the pilot.

Instructor and mentor time is the institution's cost and is not priced here.

## 3. Pilot shape: 4–6 weeks for one class

The app schedules one sitting per day from a learner's first sign-in and uses their weekly-time
answer to set the pace; marking a day busy pushes the plan back. The instructor sets the class
scope and the required quests; the app does not know about a class or a term.

A 4-week class at 1–3 hours a week cannot finish all 11 quest entries (about 32–54 hours of quest
time). Choose a scope that fits the class's real weekly hours, and say plainly which quests are
required, optional and out of scope.

| Phase | Timing | What happens | Evidence to keep |
|---|---|---|---|
| 0. Rehearsal | At least 5 working days before any student account | Full run-through with pilot-team test accounts only; no live student data. See [§12](#12-no-live-student-data-testing-phase). | Completed test matrix, deletion drill, signed exit checklist |
| 1. Setup and first quest | Week 1 | Students sign in, complete onboarding and Base Camp, install their agent, start Quest 1. Run a setup clinic. | Setup completion, support issues, baseline survey |
| 2. Creative quests | Weeks 2–3 | Quests 2–4 (or 2–5), first artefact, first check-in, Spark used for stuck points, mentor review of progress and check-ins. | Quest progress, check-ins, mid-point pulse |
| 3. Consolidation and showcase | Week 4 | Final required quest; a voluntary showcase of one artefact; optional pro level `p1` for students who finish early. | Completed quests, showcase count, end survey |
| 4. Review and close-out | Week 5 (optional, for a 6-week version) | Catch-up, interviews, operations review, retention/deletion decisions, go/no-go for any continuation. | Interview notes, metrics, deletion evidence |

For a **4-week** version, use Phase 0 plus Phases 1–3 and a short review in the last session. For a
**6-week** version, add a buffer week or an optional project week; do not add the capstone unless
the class has 10–20 additional hours.

### Scope and time budget

| Quest | Time | XP | Role in the pilot |
|---|---|---|---|
| `t0` Base Camp | 15–30 min | 50 | Required: toolkit, golden rule, brief recipe |
| `t1` Warm-up | 30–45 min | 100 | Required |
| `t2` Own files | 1–1.5 h | 150 | Required |
| `t3` Creative tools | 1–2 h | 150 | Required in the default scope |
| `t4` Larger build | 2–3 h | 200 | Required in the default scope |
| `t5` Story / interaction | 3–4 h | 300 | Optional stretch |
| `t6` 3D / motion | 2–3 h | 250 | Optional stretch |
| `t7`–`t9` | 3–8 h each | 350–450 | Out of scope for a 4-week pilot |
| `t10` Capstone | 10–20 h | 1000 | Out of scope |
| `p1`–`p9` pro track | Not estimated in the app | 9 levels | `p1`–`p2` only as an optional stretch |

Core `t0`–`t4` is about 5–8 hours, which fits a 4-week class at 2–4 hours a week with room for
support and reflection. Do not advertise the capstone as part of a 4-week pilot.

## 4. Instructor and mentor setup

### What the app supports

- Mentor access is controlled only by the `ADMIN_EMAILS` environment variable (comma-separated,
  case-insensitive). A matching email gets Mentor HQ **only after a verified sign-in**.
- "Verified" means Google sign-in or an emailed six-digit code. Password sign-in marks the session
  `verified: false`, so **a password account can never be a mentor**. While email codes are off,
  mentors must use Google.
- Mentor HQ lists every learner who has signed in at that host, most recently active first (limit
  200). There is no class, cohort, term or department filter.
- Mentors can see a learner's progress, onboarding answers, check-ins (including screenshots),
  uploads, Spark chats and pro-track evidence. They can reset a password account's password. They
  **cannot** delete a learner or their data.
- There is no institutional SSO, SAML, domain allow-list or invite code. The Google client is
  published, so anyone with the URL can create an account.

### Setup steps (owner and instructor)

1. **Owner:** decide whether the pilot uses the public production deployment or a dedicated pilot
   deployment. Because Mentor HQ shows all learners on the host, a dedicated deployment is the
   safer default for a class. This is an owner decision and has not been done.
2. **Owner:** add each instructor's and mentor's **Google** email to `ADMIN_EMAILS`, then deploy or
   redeploy so the environment change takes effect. The project has no Git integration; a push does
   not deploy.
3. **Instructor:** sign in with Google, open `/mentor`, and confirm Mentor HQ loads. If it says
   "This page is for mentors", the email is not in `ADMIN_EMAILS`, the account is a password
   account, or the deployment has not picked up the variable.
4. **Instructor:** walk the student path once with a pilot-owned test account before the class:
   onboarding, Base Camp, one quest, a check-in, an upload, Spark, and the MCP path in §5.
5. **Owner:** keep the mentor list in writing (who, why, start and end date). Remove mentors from
   `ADMIN_EMAILS` at the end of the pilot. A mentor's old session cookie can remain valid for up to
   a year, so removing the variable does not instantly revoke an already-issued session; see
   [Access control](#access-control-requirements).

### Instructor workload

Expect a setup clinic in Week 1 and a short triage block each week. Record actual hours; do not
estimate them as a fixed FTE. The app has no instructor analytics beyond Mentor HQ.

## 5. Real MCP verification path

The pro track is driven by the learner's own agent over MCP (streamable HTTP). This is the real
end-to-end check that the class path works; do it in Phase 0 with a **pilot-owned test account**,
never a student account.

### Endpoint and config

Endpoint: `https://creative-ai-agent-quest.vercel.app/api/mcp`
Public setup guide: <https://creative-ai-agent-quest.vercel.app/mcp>
Resource metadata: <https://creative-ai-agent-quest.vercel.app/.well-known/oauth-protected-resource>

Common HTTP config shape (valid JSON; replace `YOUR_TOKEN`):

```json
{
  "mcpServers": {
    "quest": {
      "type": "http",
      "url": "https://creative-ai-agent-quest.vercel.app/api/mcp",
      "headers": { "Authorization": "Bearer YOUR_TOKEN" }
    }
  }
}
```

The app uses a manual bearer token, not OAuth. It has no authorization endpoint, dynamic client
registration or scopes. A client that only supports OAuth discovery cannot connect on its own; use
a client that lets you set a request header. The token is shown once and stored hashed. Creating a
new token revokes the old one immediately.

### Steps and expected results

| # | Action | Expected |
|---|---|---|
| 1 | Sign in with the test account, open `/pro`, choose **Create my token** | Token shown once; `hasToken` becomes true |
| 2 | Put the token in the agent's MCP config as `Authorization: Bearer …` | Token stays out of chats, screenshots and committed files |
| 3 | Ask the agent to call `quest_whoami` | Returns the test learner's name, tool and pro-track standing |
| 4 | Ask for `quest_get_task` with `p1` | Returns the concept, build steps, done-when and evidence list |
| 5 | Do `p1` in a scratch project: approved plan, two commits, one deliberate break and rollback | Real work exists; no student data involved |
| 6 | Submit evidence with `quest_submit_evidence` | `PASSED`, one line per required item |
| 7 | Submit a payload containing a fake key such as `sk-test000000000000000000000000` | Result reports secret-looking strings removed; stored content shows `[REDACTED]`; the fake key is absent |
| 8 | Rotate the token, then retry with the old token | Old token is rejected; new token works |
| 9 | `POST /api/mcp` with no token | `401` |
| 10 | Try a client that only supports OAuth | It cannot connect; document the manual-header workaround |

Negative and boundary checks to add in Phase 0:

- an empty submission must return `NOT YET` and store nothing;
- a token belonging to a deleted learner must fail cleanly;
- rate limiting must return a readable message, not a crash;
- a missing or wrong `Authorization` header must not leak task data.

Record the date, agent name and version, model, token rotation result and the `PASSED` output in the
pilot evidence folder. `docs/deploy.md` records a Kilo Code `p1` pass on 2026-10-24; repeat it with
the pilot account rather than relying on that record.

## 6. Student privacy, retention, deletion and access control

The app is a small, plain-English learning site, but it is **not** a university records system and
its public privacy note is not an institutional privacy notice. The owner and the university must
decide who is responsible for what, and the university's own review decides whether the pilot is
acceptable. This document does not make that decision.

### What is stored, where, and who sees it

| Data | Stored in | Visible to |
|---|---|---|
| Name, email, profile picture, start date, last seen | Postgres (`quest_users`) | Learner, mentors, owner |
| Quest progress, notes, own idea, busy days | Postgres (`quest_progress`, `quest_busy`) | Learner, mentors |
| Onboarding answers: role, experience, goal, tool, OS, weekly minutes | Postgres (`quest_profiles`, `quest_pace`) | Learner, mentors, and Spark's prompt |
| Check-ins: message and optional screenshot (data URL) | Postgres (`quest_checkins`) | Learner, mentors |
| Uploads: images, video, audio, pages, zips, 3D/project files | Vercel Blob, **public access** (`access: 'public'`), indexed in `quest_files` | Anyone with the URL; learner and mentors through the app |
| Spark chats | Postgres (`quest_messages`); prompts sent to Cloudflare Workers AI | Learner, mentors, AI provider |
| Pro evidence: file contents, command output, URLs, written answers, check results, redaction count | Postgres (`quest_evidence`) | Learner, mentors, and Spark when opened from a pro task |
| Activity log (steps, uploads, check-ins, evidence, coach use) | Postgres (`quest_activity`) | Learner, mentors |
| MCP token | Only an HMAC hash in `quest_mcp_tokens`; raw token shown once | Nobody can read the raw token after creation |
| Password hash (password accounts only) | `quest_passwords`, scrypt | Owner/DB access; not mentors |
| Pending email code (only if enabled) | `quest_otps`, hashed | Owner/DB access |
| Session | Signed, httpOnly, same-site cookie; one year, rolled forward | The learner's browser |

There are no analytics or advertising trackers in the app. The public privacy note describes most
of the above, but it does **not** mention the activity log, pro evidence, MCP token metadata or
`last_seen`, and its mentor sentence does not mention check-in screenshots or pro evidence. A
pilot-specific student notice must cover those, plus the mentor visibility and the public-URL
behaviour of uploads.

Uploads are the highest-risk item: the browser uploads with `access: 'public'`, and the app displays
the resulting Blob URL directly. There is no per-viewer check on the file itself. Treat an upload
URL as a shareable link and tell students not to upload identity documents, private journals,
unpublished personal work, or anything they would not put on a public web page.

Spark prompts include the learner's name, profile, progress, notes and recent chat messages, and are
sent to Cloudflare Workers AI. Production is documented as configured for
`@cf/meta/llama-3.3-70b-instruct-fp8-fast`; the code falls back to `gpt-4o-mini` only if the model
environment variable is missing. Confirm the live value before the pilot. The provider's terms
govern retention and training; confirm them and do not claim zero retention. The course's own tool
notes warn that free model prompts may be logged, so students should keep personal details out of
prompts.

### Retention

- There is **no automatic expiry** in the code. Data remains until it is deleted by the owner.
- Evidence keeps only the latest 20 submissions per task. The interface shows the latest 200
  activity entries and check-ins, 500 files and 60 messages per chat, but older rows remain in the
  database.
- Per-person caps: 500 MB of uploads, 50 MB per file, 20 check-ins an hour, check-in images capped
  at about 1.6 million characters (roughly 1 MB of JPEG).
- The Neon free plan is 0.5 GB (`README.md`). Check-in screenshots live in Postgres, so a class that
  checks in often with screenshots can consume database space even though uploads go to Blob.
- The university should set a retention period in writing. The app cannot enforce it, so the owner
  must calendar the deletion date and keep evidence that it happened.

### Deletion — current gap

The public privacy note says a learner can ask a mentor and "everything is removed". **The app has
no self-serve deletion and no mentor deletion control.** A code search finds no delete-account
route, button or function. Until that changes, deletion is an owner-run database and storage
operation, and it must be rehearsed.

Deleting only the `quest_users` row is **not sufficient**. Foreign-key cascades cover only:

- `quest_profiles`
- `quest_pace`
- `quest_mcp_tokens`
- `quest_evidence`

These tables have no foreign key to `quest_users` and must be cleared explicitly by `user_id`:

- `quest_progress`
- `quest_activity`
- `quest_checkins`
- `quest_messages`
- `quest_files`
- `quest_cheers`

Two tables are keyed by **email**, not user id:

- `quest_passwords`
- `quest_otps`

Blob objects are not deleted by deleting rows. Read the URLs from `quest_files` first, then remove
the objects from the Blob store; the app's own file delete uses the Blob SDK's `del()` for one file
at a time, but there is no bulk account deletion.

Finally, a signed session cookie can remain valid for up to a year. An API request calls
`touchUser`, which re-inserts a `quest_users` row if the account was deleted but the cookie is still
present. So deletion must include asking the learner to sign out; for a hard cutoff, the owner can
rotate `AUTH_SECRET`, which signs out everyone and requires a redeploy. Do not rotate it casually
during a live class.

**Deletion runbook (owner only, after a snapshot and a written request):**

1. Record the learner's `quest_users.id` and email; confirm the request and the scope. The same email
   can have both a Google (`u_…`) and a password (`p_…`) row, so check for both and delete each id
   the request covers.
2. Snapshot or back up the database if the provider offers it.
3. Read and record the `quest_files.url` list for that user.
4. Delete by `user_id` from the six non-cascading tables: `quest_progress`, `quest_activity`,
   `quest_checkins`, `quest_messages`, `quest_files`, `quest_cheers`.
5. Delete the `quest_users` row; this cascades `quest_profiles`, `quest_pace`, `quest_mcp_tokens` and
   `quest_evidence`.
6. Delete by `email` from `quest_passwords` and `quest_otps`. `quest_passwords` is keyed by email, so
   this removes the password credential for that address, not one account id.
7. Delete the Blob objects under `quests/<user_id>/` for each id in scope.
8. Verify zero rows remain in every table for each id/email in scope and no objects remain under
   the prefixes.
9. Confirm the learner has signed out; rotate `AUTH_SECRET` only if a hard cutoff is required.
10. Confirm completion to the learner and the university in writing, with the date and the evidence.

Rehearse this in Phase 0 with a synthetic account and keep the zero-count evidence.

### Access-control requirements

- **One host, one tenant.** There is no class or cohort isolation. A mentor sees every learner on
  the host, including people outside the class if the public deployment is used. Either use a
  dedicated pilot deployment or get written acceptance of the shared list.
- **Named mentors only.** `ADMIN_EMAILS` is the only gate. Keep the list short, use individual
  Google accounts, never a shared login, and remove names at the end.
- **Mentors must use Google.** Password accounts are unverified and cannot be mentors. Do not create
  a password account for a mentor and expect Mentor HQ to work.
- **Choose one student sign-in method.** Password and Google sign-ins use different internal ids
  (`p_…` versus `u_…`) for the same email, so switching methods creates a second account with
  separate progress. The README's "one account per email" wording does not match this behaviour.
  Tell students to use the same method all term.
- **No SSO.** If the university requires institutional SSO, this deployment cannot meet that
  requirement without code and identity-provider work. Treat it as a blocker, not a configuration
  detail.
- **Uploads are public-URL objects.** Do not describe them as private. Tell students, and avoid
  collecting sensitive work.
- **MCP tokens are passwords.** One per learner, shown once, revocable by rotation. A leaked token
  can submit evidence as that learner until it is rotated.
- **No MFA beyond Google's.** Password accounts have a six-character minimum and no self-serve
  reset; a mentor resets them. This is not suitable for high-assurance accounts.
- **No audit trail for mentor reads.** There is no log of which mentor viewed which learner. Say so
  in the pilot notice.

## 7. AI budget and abuse limits

### In-app limits

All of these are in-memory, per serverless instance, and reset on a cold start. They are speed
bumps, not a global cap or a billing control.

| Bucket | Limit |
|---|---|
| Spark chat | 30 requests / 10 min / learner |
| MCP tool calls | 60 / 10 min / learner |
| MCP authentication attempts | 120 / 10 min per token prefix |
| New MCP tokens | 10 / 10 min / learner |
| Check-ins | 20 / hour / learner |
| Uploads | 60 / hour / learner; 500 MB total; 50 MB per file |
| Progress writes | 400 / 10 min / learner |
| Profile, busy days | 60 / 10 min / learner |
| Sign-in attempts | 30 / 10 min per IP; 10 / 10 min per email for passwords |
| Email codes (only if enabled) | 4 sends / 15 min; 10 verifies / 10 min per email |

Evidence submission also caps at 12 items, 20,000 characters per item and 100,000 characters total,
and secret-looking strings are redacted before storage.

### The real ceiling

Spark uses the Cloudflare Workers AI free allowance. `README.md` records 10,000 neurons/day and the
owner's estimate of roughly 60–100 coach replies/day. Treat that as an **estimate, not a quota**:
the allowance is account-level and shared with anything else on the account, and the app has no
global counter.

There is **no paid fallback, no spend cap and no feature flag to switch Spark off**. If the
allowance or the upstream model is exhausted, Spark returns a friendly error (HTTP 502 after the
route's own failure handling); quests, uploads, mentor view and MCP evidence still work. The app
does not automatically buy capacity.

### Sizing the cohort

Use a written capacity sum before inviting students:

```
expected coach messages per student per week × students × weeks
```

Compare it with the owner's estimate, and leave headroom for retries, setup questions and a busy
week. For example, **if** 25 students each send 10 messages a week, that is 250 messages a week,
about 36 a day over seven days — within the 60–100/day estimate, but it uses a large share of it and
leaves little room for a second class or a bad week. That is an illustration with stated
assumptions, not a measured capacity figure or a recommended class size.

Monitor daily during the pilot: Cloudflare's Workers AI usage for the account, Vercel function logs
for 429/502 responses, database size and Blob usage. Record the peak and the failure count. If the
allowance is close, reduce Spark-dependent activities, tell students to use the guide and quest text,
or pause the AI part; there is no in-app switch, so this is an instructor and owner decision.

### Abuse and content

The app rate-limits requests and redacts secret-looking strings from evidence. It has **no automated
content moderation, no abuse classifier and no spam detection** beyond those limits. Mentors see
chats and submissions and are the human check. Account removal is manual (see the deletion gap).
Tell students the acceptable-use rules in `/terms`: learning use, no illegal or hateful uploads, no
attempts to overload the service.

## 8. No paid tiers

- The app has no checkout, subscription, licence key, paid plan, upsell or advertising. There is no
  payment code in the repository.
- The core course can be completed with a free agent path. Kilo Code with "Auto Free" and OpenCode
  with a free model are the course's suggested paths; GitHub Copilot's free plan is another option
  where available. Free tiers are time-limited or capacity-limited and can change.
- Tools with paid plans (for example Claude Code, Cursor, Codex or a paid Copilot plan) are
  optional. A student who chooses one is not required to pay the app or the institution.
- The pilot must not make a paid tool a requirement for a grade or for completion. If a student's
  chosen tool has no workable free path, switch them to Kilo Code or OpenCode rather than asking
  them to buy one.
- The database and AI rely on free plans and allowances with finite quotas; "no paid tier" does not
  mean unlimited capacity. See §7.

## 9. Accessibility and device requirements

### What exists

- A responsive Next.js site with a skip link, visible `:focus-visible` outlines, semantic headings
  in the main pages, and a `prefers-reduced-motion` stylesheet that shortens animations.
- Layouts have been checked at 390×844, 768×1024 and 1280×800 (`docs/deploy.md`).
- `docs/deploy.md` records axe 4.12.1 results: `/pro` had 0 violations and 1 incomplete (diagram
  SVG contrast); `/pro/p2` and `/guide` had 0 violations; the connect card had 0 violations and the
  same incomplete.
- The site can be installed to a phone home screen, but the build work needs a computer.

### What is not established

- No WCAG 2.2 AA audit and no conformance claim.
- No screen-reader testing is recorded (VoiceOver, NVDA or TalkBack).
- No keyboard-only end-to-end test is recorded.
- No 200% zoom or reflow test is recorded.
- The app ships no video and has no built-in captions or transcripts; any recording the instructor
  adds needs its own captions or transcript.
- The concept diagrams are SVG with accessible names and captions, but the recorded axe result
  leaves one contrast item incomplete; check it with the university's accessibility adviser.

### Before a real cohort

Run and record: a keyboard-only pass through sign-in, onboarding, a quest, Spark and the mentor
view; a screen-reader smoke test on the same path; 200% zoom; a contrast check on the pages the class
uses; and a text alternative for each diagram used in class. Provide a named accommodation route and
extra time. Do not make audio, video or animation the only way to receive instructions; the quest
text is textual and can be read.

### Devices and software

| Requirement | Detail |
|---|---|
| Computer | Windows, macOS or Linux laptop or desktop. A tablet or phone can read progress but cannot run the desktop agent comfortably. |
| Software | A code editor (VS Code is the course's default), Git, and an AI coding agent (Kilo Code extension, OpenCode CLI, or another supported tool). Some tools need Node.js or a terminal. |
| Permissions | Ability to install applications and browser extensions. Locked-down lab images or no-admin accounts will block Base Camp; check with IT before the class. |
| Browser | A current Chrome, Edge, Firefox or Safari. The app is a standard web app; no browser-specific claim is made beyond the layouts checked. |
| Network | Stable internet. Uploads are capped at 50 MB per file; large video may be slow. There is no offline mode. |
| Hardware | No minimum is asserted here. 3D, video and audio quests may need more memory or a GPU; the core `t0`–`t4` scope is browser- and editor-based. Confirm lab hardware with the department. |
| Accounts | A Google account for Google sign-in, or an email + password account. Password accounts cannot be mentors and cannot reset themselves. Email codes are currently switched off (`otp:false`). |
| Storage | Up to 500 MB of uploads per learner; students should keep their own copies of anything that matters. |

Survey the class's devices and install permissions before Week 1. A single locked-down lab is a
bigger risk than a mixed BYOD class, because the course assumes the learner can install and run an
agent.

## 10. Success metrics without fabricated targets

Collect a baseline in Week 1 and agree any review thresholds with the instructor **after** seeing
it. This document sets no numeric targets and makes no impact claim.

| Area | What to measure | Source | Why it matters |
|---|---|---|---|
| Reach | Enrolled, signed in, onboarded | Mentor HQ, instructor register | Distinguishes interest from activation |
| Setup | Base Camp completed; support contacts per student | Mentor HQ, support log | Setup is the main failure point |
| Progress | Required quests completed; sittings vs plan; pro levels passed | Mentor HQ, app state | Whether the class scope is realistic |
| Help | Check-ins, mentor interventions, repeated attempts | Mentor HQ, activity | Where students get stuck |
| AI | Spark messages; 429 and 502 counts; daily usage vs allowance | Vercel logs, Cloudflare usage | Capacity and reliability |
| Experience | Short survey (usefulness, confidence, blockers); optional interviews | Instructor-owned survey | Qualitative signal, not efficacy proof |
| Accessibility | Accommodation requests; issues found and fixed | Instructor log | Whether the path is usable |
| Operations | Instructor hours; incidents; data requests and deletions | Instructor/owner log | Cost and support load |
| Safety | Redactions, leaked tokens, public uploads containing personal data | Evidence, incident log | Whether the guardrails are understood |
| Data hygiene | Deletion requests completed with zero residual rows/blobs | Owner evidence | Whether the privacy promise can be kept |

Report counts and quotes with their source and limitations. Do not describe completion in a
self-selected pilot as evidence of learning gain; there is no control group and no validated
assessment. If the university wants a learning study, that is a separate design with its own
approvals.

## 11. Support and troubleshooting runbook

### Roles

- **Instructor:** first line during class; owns the class channel and the student notice.
- **Owner:** only person who can change environment variables, the database, Blob storage or the
  deployment. Best-effort support; no SLA and no 24/7 cover is promised.
- **University IT / accessibility office:** device, network and accommodation issues.

### First checks

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://creative-ai-agent-quest.vercel.app/
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://creative-ai-agent-quest.vercel.app/api/mcp
curl -s https://creative-ai-agent-quest.vercel.app/api/session
```

Expected: `200` for the site, `401` for an unauthenticated MCP POST, and JSON such as
`{"google":"…","otp":false}` for the session. `otp:false` means email codes are off.

### Common problems

| Symptom | First check | Action | Escalate |
|---|---|---|---|
| Google button missing or sign-in fails | Browser console/network; Google account status; Workspace third-party app policy | Try another browser; if Google is unavailable for the whole class, decide one alternative before the term and use it consistently | Owner if the Google client is misconfigured; university IT if Workspace blocks the app |
| "No account with that email" on password sign-in | Whether the student signed up with Google | Use the method they started with; do not create a duplicate | Instructor |
| Forgot password | Whether it is a password account | Mentor uses "Reset password" in Mentor HQ and passes the temporary password privately | Owner if no mentor is available |
| Mentor HQ says "for mentors" | Is the email in `ADMIN_EMAILS`? Did they sign in with Google? Was the deployment updated? | Fix the list or the sign-in method; redeploy | Owner |
| Agent install fails | OS, admin rights, Node/terminal prerequisites | Use the Kilo Code extension in VS Code if the terminal path is blocked; follow `/guide` | University IT for locked images |
| Free model is slow or rate-limited | Tool status; model selected | Wait, switch to another free model, or switch tool; this is normal free-tier behaviour | Instructor |
| MCP returns 401 | Token copied fully? Header shape? Token rotated? | Create a new token and update the config; keep it out of chats | Owner if a valid token still fails |
| MCP client only supports OAuth | Client capability | It cannot connect; use a client that accepts an `Authorization` header | Instructor |
| `quest_submit_evidence` returns `NOT YET` | Read each per-check message | Send the required items with real content; empty submissions store nothing | Instructor |
| Secret redaction looks wrong | The fake-key test in §5 | Re-run the test; report the exact input and output | Owner |
| Spark says "needs a breather" (429) | 30 messages / 10 min | Wait a few minutes; use the guide | Instructor |
| Spark says it cannot reach the AI (502) | Cloudflare allowance or upstream model | Use quest text and the guide; try later; reduce AI-dependent work | Owner |
| Upload fails | File size (50 MB), type, 500 MB total, rate limit | Delete old files; zip large folders; use a smaller recording | Owner if storage is full |
| Progress "lost" | Which email and sign-in method is in use | Check the account; mentor can see the correct account; progress does not transfer between methods | Owner if an account must be corrected; there is no supported merge tool |
| Deletion request | Written request and identity | Follow the §6 runbook; sign out; verify zero rows/blobs | Owner |
| Leaked MCP token | Where it was pasted | Rotate the token in `/pro`; update every agent config | Owner if evidence was submitted by someone else |
| Suspected account compromise | Sign-in method and mentor list | Remove the mentor from `ADMIN_EMAILS`; rotate `AUTH_SECRET` if a hard cutoff is needed (signs out everyone) | Owner and university |
| Site down or 5xx | The three checks above; Vercel status | Wait and retry; there is no fallback host | Owner |

Do not paste tokens, database URLs, passwords or student work into a support ticket. Redact
screenshots.

## 12. No-live-student-data testing phase

This phase is mandatory. It runs before Week 1 and uses **no live student data**.

### Rules

- Only pilot-team-owned test accounts. Do not enrol students, do not use a student's email, and do
  not use real student work.
- Use synthetic names and content. Use an obviously fake key for the redaction test, never a real
  one.
- Do not upload screenshots containing real people, identity documents or personal data.
- Do not test against production learner data. Use a separate test database for local runs, as the
  repository's `.env.development.local` does.
- Remove every test account and its rows and blobs at the end; keep the zero-count evidence.

### Minimum test matrix

| # | Test | Pass condition |
|---|---|---|
| 1 | Site, `/privacy`, `/terms`, `/guide`, `/pro`, `/mcp` load | 200 and readable |
| 2 | `POST /api/mcp` without a token | 401 |
| 3 | Google sign-in with a test account | Session created; name and email correct |
| 4 | Email + password signup and sign-in | Works; confirmed separately from Google |
| 5 | Onboarding | Answers save; a refresh keeps them |
| 6 | Base Camp | Steps tick; completion recorded |
| 7 | One creative quest | Progress, notes and a check-in save |
| 8 | Upload and delete a file | File appears, downloads, deletes; Blob removed |
| 9 | Spark normal reply | Streams and saves; history returns |
| 10 | Spark rate limit | 429 with a readable message, not a crash |
| 11 | Mentor HQ | Test learner visible; detail, chats and evidence load |
| 12 | Password reset | Mentor can reset a password account; temporary password works |
| 13 | MCP token + real agent + `p1` | `PASSED` with per-item results |
| 14 | Redaction | Fake key removed; `[REDACTED]` stored |
| 15 | Token rotation | Old token rejected; new token works |
| 16 | Access checks | A learner cannot read another learner's state; a non-mentor gets 403 from `/api/mentor` |
| 17 | Deletion drill | Zero rows in all tables and zero blobs for the synthetic account |
| 18 | Responsive and keyboard | Usable at phone, tablet and desktop widths; focus visible; skip link works |
| 19 | Reduced motion | Animations shortened; no blocked content |
| 20 | Screen-reader smoke | Sign-in, onboarding and one quest are understandable |
| 21 | Sign-out | Session cleared; protected pages return to sign-in |
| 22 | Test-data cleanup | No test account, row or blob remains; QA note recorded |

### Exit criteria

All 22 tests pass, the deletion drill evidence is stored, no test data remains, the instructor has
walked the student path, and the university approvals and retention decision are in writing. Only
then may a real cohort be invited.

## 13. Go/no-go evidence

Review this table with the university. A row marked **GAP** or **UNKNOWN** is a reason to wait, not a
detail to wave through.

| Gate | Evidence needed | Status at 2026-10-26 | Owner |
|---|---|---|---|
| Institution approval | Written approval from the relevant privacy, IT and accessibility reviewers; named contact | **NOT STARTED** | University |
| Student notice and consent | Pilot notice covering all data in §6, mentor visibility, public upload links, AI processing and retention | **NOT STARTED**; the public note is not sufficient | University + owner |
| Data responsibility | Who is controller/processor, who answers requests, retention date, incident contact | **NOT STARTED** | University + owner |
| Deletion | Implemented control, or the §6 runbook rehearsed with zero-row/zero-blob evidence | **GAP**: no UI/API; manual runbook only | Owner |
| Cohort isolation | Dedicated pilot deployment, or written acceptance that Mentor HQ shows all learners on the host | **GAP** on the public deployment | Owner |
| Sign-in path | Every student can sign in; mentor uses Google; one method per student; no SSO requirement | **PARTIAL**: Google works; email codes off; password accounts unverified and separate; no SSO | Owner + university |
| AI capacity | Class-size sum against the free allowance, monitoring owner, pause plan | **UNKNOWN**: estimate only; no global cap or kill switch | Owner |
| MCP path | Real agent, test account, `p1` passed, redaction and rotation checked | **PARTIAL**: production 401 verified; a 2026-10-24 Kilo pass is recorded; repeat in Phase 0 | Owner + instructor |
| Accessibility | Keyboard, screen-reader, zoom and contrast checks; accommodation route | **PARTIAL**: axe evidence for three pages only; no screen-reader test | University + instructor |
| Devices and install | Class survey; lab image checked; free tool path confirmed | **UNKNOWN** | Instructor + IT |
| Support | Named owner, channel, hours, escalation, no-SLA expectation | **PARTIAL**: runbook drafted; owner and hours not named | Owner |
| No-live-data rehearsal | §12 matrix complete; exit checklist signed | **NOT STARTED** | Owner + instructor |
| Test-data cleanup | Any QA account from earlier verification identified and removed | **UNKNOWN**; `docs/deploy.md` records a `qa-verify@example.com` learner on production | Owner |
| Deployment parity | The pilot host runs the commit the university reviewed | **UNKNOWN**: `docs/deploy.md` records `f365910`; this document is based on `7a2972c` | Owner |
| Free-tier storage | Database and Blob usage for the class, with headroom | **UNKNOWN**: 0.5 GB Neon free plan; 500 MB/person app cap | Owner |
| Incident plan | Who does what for a leak, outage, deletion request or safeguarding concern | **PARTIAL** | University + owner |

**Decision rule:** no live student cohort until every row is **PASS** or has a written, university-
accepted compensating control. The owner and the university sign the checklist; an agent or a
document cannot approve it.

## 14. Remaining owner actions

1. Decide the host: public deployment or a dedicated pilot deployment. Do not invite a class to the
   public host without written acceptance of the shared mentor view.
2. Decide the sign-in path for students and mentors. The sign-in provider choice is still pending in
   the project instructions; do not change the UI or copy until that call is made. Mentors must use
   Google.
3. Add and later remove instructor/mentor Google emails in `ADMIN_EMAILS`; confirm the deployment
   picked up the change.
4. Decide whether to implement account deletion or approve the manual §6 runbook; rehearse it and
   keep the evidence. Decide how to invalidate sessions after deletion.
5. Confirm whether public Blob uploads are acceptable for the class. If not, this needs a code
   change to private storage and signed access, which is out of scope for this documentation PR.
6. Confirm the Cloudflare Workers AI allowance, the daily usage review, and the pause plan. There is
   no spend cap or kill switch.
7. Confirm the deployed commit matches the commit reviewed for the pilot, and re-run the §5 MCP path
   with a pilot-owned account.
8. Identify and remove any leftover QA/test accounts from earlier verification.
9. Obtain the university's approvals, student notice and retention date before any student account
   exists.
10. Name the support owner, channel and hours; record actual instructor time.
11. Run the §12 rehearsal and sign the exit checklist.
12. Only then contact an institution. No institution has been contacted for this document.

## Review evidence

Checked on 2026-10-26 against `main` `7a2972c` and the live site:

| Check | Result |
|---|---|
| `npx tsc --noEmit` | 0 errors |
| `npm test` | 19 files, 460 tests passed |
| `npm run build` | Passed (Next.js 15.5.28; static and dynamic routes compiled) |
| `/`, `/privacy`, `/terms`, `/guide`, `/pro`, `/mcp` | 200 |
| `POST /api/mcp` without a token | 401 |
| `/api/session` | `{"google":"…","otp":false}` |
| `/.well-known/oauth-protected-resource` | 200, resource metadata for `/api/mcp` |
| MCP config snippet | Parses as JSON; endpoint and header shape match `src/components/McpDocs.tsx` |

The page and endpoint checks were read-only requests to the owner's public deployment. No
institution was contacted and no production setting was changed.

## What this document does not claim

No partnership, endorsement, approval, legal advice, compliance certification, security audit,
accessibility certification, uptime commitment, permanent free service, learning gain or measured
success target. Where a number appears, it is either a code-level limit, a repository record, or an
estimate labelled as such. The gaps in §6 and §13 are real and must be resolved by the owner and the
university before a class is invited.

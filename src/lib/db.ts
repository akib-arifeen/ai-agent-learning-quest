/**
 * Postgres access — the only file that talks to the database. Every table is keyed by
 * the learner's Google id (`user_id`), so each person who signs in gets their own run.
 * Plain SQL over a standard connection string (DATABASE_URL): Neon today, any Postgres
 * tomorrow. Server-only; API routes import this.
 */

import crypto from 'crypto'
import postgres from 'postgres'
import type { Activity, Checkin, Cheer, Learner, ProgressRow, QuestFile, QuestState, SittingRec } from './game'
import type { CheckResult, EvidenceItem, Submission } from './pro'
import type { Profile, ProfilePatch } from './profile'
import { hmac } from './session'

// One client per server instance. `prepare: false` because Neon's pooled URL sits
// behind PgBouncer, which can't hold prepared statements across transactions.
const g = globalThis as unknown as { __kq_sql?: postgres.Sql }
export const sql =
  g.__kq_sql ||
  (g.__kq_sql = postgres(process.env.DATABASE_URL || '', {
    max: 3,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 15,
    onnotice: () => undefined, // "already exists, skipping" on every cold start is noise
  }))

// Idempotent schema, applied lazily on first use so a fresh database needs no
// migration step. Every statement is IF NOT EXISTS — safe to run on every cold start.
const SCHEMA = `
create table if not exists quest_users (
  id text primary key,
  email text not null,
  name text not null default '',
  image text,
  start_date date,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
create table if not exists quest_passwords (
  email text primary key,
  hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists quest_otps (
  email text primary key,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists quest_progress (
  user_id text not null,
  task_id text not null,
  variant text not null default 'main',
  steps text[] not null default '{}',
  sittings jsonb not null default '[]'::jsonb,
  notes text not null default '',
  own_idea text not null default '',
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, task_id)
);
create table if not exists quest_activity (
  id bigserial primary key,
  user_id text not null,
  at timestamptz not null default now(),
  kind text not null,
  task_id text,
  detail text
);
create index if not exists quest_activity_user on quest_activity (user_id, id);
create table if not exists quest_busy (
  user_id text not null,
  day date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);
create table if not exists quest_checkins (
  id bigserial primary key,
  user_id text not null,
  task_id text not null,
  message text not null default '',
  image text,
  created_at timestamptz not null default now()
);
create index if not exists quest_checkins_user on quest_checkins (user_id, id);
create table if not exists quest_messages (
  id bigserial primary key,
  user_id text not null,
  task_id text not null,
  role text not null,
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists quest_messages_user on quest_messages (user_id, task_id, id);
create table if not exists quest_files (
  id bigserial primary key,
  user_id text not null,
  task_id text not null,
  url text not null,
  pathname text not null,
  name text not null,
  content_type text not null default '',
  size bigint not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists quest_files_user on quest_files (user_id, id);
create unique index if not exists quest_files_url on quest_files (url);
create table if not exists quest_cheers (
  id bigserial primary key,
  user_id text not null,
  from_name text not null default '',
  message text not null,
  created_at timestamptz not null default now(),
  seen_at timestamptz
);
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
create table if not exists quest_pace (
  user_id text not null references quest_users (id) on delete cascade,
  since date not null,
  weekly_minutes int,
  primary key (user_id, since)
);
create table if not exists quest_mcp_tokens (
  user_id text primary key references quest_users (id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create table if not exists quest_evidence (
  id bigserial primary key,
  user_id text not null references quest_users (id) on delete cascade,
  task_id text not null,
  items jsonb not null,
  results jsonb not null,
  passed boolean not null,
  redactions int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists quest_evidence_user on quest_evidence (user_id, task_id, id);
`

let ready: Promise<void> | null = null
/** Make sure the tables exist (once per instance; retried if it failed). */
export const ensureSchema = () =>
  (ready ||= sql
    .unsafe(SCHEMA)
    .then(() => undefined)
    .catch((e) => {
      ready = null
      throw e
    }))

// Postgres returns Date objects for timestamptz; the client wants ISO strings.
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v ? String(v) : null)
// A real calendar day (round-trips through Date, so 2026-02-31 fails) in a sane range.
const isDay = (s: unknown): s is string => {
  if (typeof s !== 'string' || !/^20[2-9]\d-\d{2}-\d{2}$/.test(s)) return false
  const t = new Date(`${s}T00:00:00Z`)
  return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === s
}

/** Map a quest_progress row to the shape the game rules expect. */
const toProgress = (r: Record<string, unknown>): ProgressRow => ({
  task_id: String(r.task_id),
  variant: String(r.variant),
  steps: (r.steps as string[]) || [],
  sittings: (r.sittings as SittingRec[]) || [],
  notes: String(r.notes || ''),
  own_idea: String(r.own_idea || ''),
  completed_at: iso(r.completed_at),
  updated_at: iso(r.updated_at) || undefined,
})

/**
 * Record a sign-in / visit and return the learner. The first visit pins their start
 * date to the day they arrived (their own calendar day, sent by the browser).
 */
export async function touchUser(u: { id: string; email: string; name: string; image?: string | null }, today?: string): Promise<Learner> {
  await ensureSchema()
  const start = isDay(today) ? today : null
  const rows = await sql`
    insert into quest_users (id, email, name, image, start_date)
    values (${u.id}, ${u.email}, ${u.name}, ${u.image || null}, coalesce(${start}::date, current_date))
    on conflict (id) do update set
      email = excluded.email, name = excluded.name, image = excluded.image, last_seen = now(),
      start_date = coalesce(quest_users.start_date, excluded.start_date)
    returning id, email, name, image, to_char(start_date, 'YYYY-MM-DD') as start_date, last_seen`
  const r = rows[0]
  return { id: String(r.id), email: String(r.email), name: String(r.name), image: (r.image as string) || null, startDate: (r.start_date as string) || start || '', lastSeen: iso(r.last_seen) || '' }
}

/** Everything one learner's screens render from. */
export async function loadState(user: Learner): Promise<QuestState> {
  await ensureSchema()
  const id = user.id
  const [progress, busy, checkins, activity, days, cheers, msgs, files, profile, evidence, token, pace] = await Promise.all([
    sql`select * from quest_progress where user_id = ${id}`,
    sql`select to_char(day, 'YYYY-MM-DD') as day from quest_busy where user_id = ${id} order by day`,
    sql`select id, task_id, message, image is not null as has_image, created_at from quest_checkins where user_id = ${id} order by id desc limit 200`,
    sql`select at, kind, task_id, detail from quest_activity where user_id = ${id} order by id desc limit 200`,
    // Streak input: one timestamp per 15 minutes with real progress (15, not 60, so
    // half-hour time zones still land on the right local day). Collapsing keeps this
    // small forever, and no burst of activity can push old days out.
    sql`select min(at) as at from quest_activity
        where user_id = ${id} and kind in ('step', 'sitting', 'complete', 'checkin', 'upload', 'evidence')
        group by floor(extract(epoch from at) / 900) order by 1`,
    sql`select id, from_name, message, created_at, seen_at from quest_cheers where user_id = ${id} order by id desc limit 20`,
    sql`select count(*)::int as n from quest_messages where user_id = ${id} and role = 'user'`,
    sql`select id, task_id, url, name, content_type, size, created_at from quest_files where user_id = ${id} order by id desc limit 500`,
    sql`select * from quest_profiles where user_id = ${id}`,
    sql`select task_id, bool_or(passed) as passed, min(created_at) filter (where passed) as at, count(*)::int as attempts
        from quest_evidence where user_id = ${id} group by task_id`,
    sql`select last_used_at from quest_mcp_tokens where user_id = ${id}`,
    sql`select to_char(since, 'YYYY-MM-DD') as since, weekly_minutes from quest_pace where user_id = ${id} order by since`,
  ])
  return {
    user,
    startDate: user.startDate,
    progress: Object.fromEntries(progress.map((r) => [String(r.task_id), toProgress(r)])),
    busy: busy.map((r) => String(r.day)),
    checkins: checkins.map((r) => ({ ...r, created_at: iso(r.created_at) })) as unknown as Checkin[],
    activity: activity.map((r) => ({ ...r, at: iso(r.at) })) as unknown as Activity[],
    days: days.map((r) => iso(r.at) || ''),
    cheers: cheers.map((r) => ({ ...r, created_at: iso(r.created_at), seen_at: iso(r.seen_at) })) as unknown as Cheer[],
    coachMessages: Number(msgs[0]?.n || 0),
    files: files.map((r) => ({ ...r, id: Number(r.id), size: Number(r.size), created_at: iso(r.created_at) })) as unknown as QuestFile[],
    profile: profile[0] ? toProfile(profile[0]) : null,
    pro: {
      tasks: Object.fromEntries(evidence.map((r) => [String(r.task_id), { passed: !!r.passed, at: iso(r.at), attempts: Number(r.attempts) }])),
      hasToken: token.length > 0,
      lastUsed: token[0] ? iso(token[0].last_used_at) : null,
    },
    paceLog: pace.map((r) => ({ since: String(r.since), weekly: r.weekly_minutes == null ? null : Number(r.weekly_minutes) })),
  }
}

/** Map a quest_profiles row to the client's Profile shape. */
const toProfile = (r: Record<string, unknown>): Profile => ({
  role: String(r.role || '') as Profile['role'],
  role_other: String(r.role_other || ''),
  experience: String(r.experience || '') as Profile['experience'],
  goal: String(r.goal || ''),
  tool: String(r.tool || '') as Profile['tool'],
  tool_other: String(r.tool_other || ''),
  os: String(r.os || '') as Profile['os'],
  weekly_minutes: r.weekly_minutes == null ? null : Number(r.weekly_minutes),
  completed_at: iso(r.completed_at),
  dismissed_at: iso(r.dismissed_at),
})

/**
 * Save onboarding answers: only the fields in the (already validated) patch change, so a
 * later step can't wipe an earlier one. `complete` / `dismiss` stamp their timestamps.
 */
export async function saveProfile(userId: string, patch: ProfilePatch, today: string): Promise<Profile> {
  await ensureSchema()
  const { complete, dismiss, ...fields } = patch
  const row: Record<string, unknown> = { ...fields, updated_at: new Date() }
  if (complete) row.completed_at = new Date()
  if (dismiss) row.dismissed_at = new Date()
  await sql`insert into quest_profiles (user_id) values (${userId}) on conflict do nothing`
  const [before] = await sql`select weekly_minutes from quest_profiles where user_id = ${userId}`
  const rows = await sql`
    update quest_profiles set ${sql(row as Record<string, postgres.ParameterOrJSON<never>>, ...Object.keys(row))}
    where user_id = ${userId} returning *`
  const saved = toProfile(rows[0])
  const old = before?.weekly_minutes == null ? null : Number(before.weekly_minutes)
  if ('weekly_minutes' in fields && saved.weekly_minutes !== old) {
    // Same rows as game.ts withPace: the first change also records the old answer from the start
    // date, so the days before today keep the plan they had.
    await sql`insert into quest_pace (user_id, since, weekly_minutes)
      select id, start_date, ${old} from quest_users
      where id = ${userId} and start_date is not null and not exists (select 1 from quest_pace where user_id = ${userId})`
    await sql`delete from quest_pace where user_id = ${userId} and since > ${today}`
    await sql`insert into quest_pace (user_id, since, weekly_minutes) values (${userId}, ${today}, ${saved.weekly_minutes})
      on conflict (user_id, since) do update set weekly_minutes = excluded.weekly_minutes`
  }
  return saved
}

/** The learner's saved profile (null if they have none yet). */
export async function getProfile(userId: string): Promise<Profile | null> {
  await ensureSchema()
  const rows = await sql`select * from quest_profiles where user_id = ${userId}`
  return rows[0] ? toProfile(rows[0]) : null
}

/** One quest's progress row (null if they haven't started it). */
export async function getProgress(userId: string, taskId: string): Promise<ProgressRow | null> {
  await ensureSchema()
  const rows = await sql`select * from quest_progress where user_id = ${userId} and task_id = ${taskId}`
  return rows[0] ? toProgress(rows[0]) : null
}

/**
 * Update only the given columns of a quest's row (creating it if needed). Touching
 * just those columns means a notes autosave can't overwrite a step ticked a moment
 * earlier by another request.
 */
export async function saveProgress(
  userId: string,
  taskId: string,
  patch: Partial<Pick<ProgressRow, 'variant' | 'steps' | 'sittings' | 'notes' | 'own_idea'>> & { completed_at?: Date | null },
): Promise<ProgressRow> {
  await ensureSchema()
  const row: Record<string, unknown> = { ...patch, updated_at: new Date() }
  if (patch.sittings) row.sittings = sql.json(patch.sittings as unknown as postgres.JSONValue)
  await sql`insert into quest_progress (user_id, task_id) values (${userId}, ${taskId}) on conflict do nothing`
  const rows = await sql`
    update quest_progress set ${sql(row as Record<string, postgres.ParameterOrJSON<never>>, ...Object.keys(row))}
    where user_id = ${userId} and task_id = ${taskId} returning *`
  return toProgress(rows[0])
}

/**
 * Tick or untick one step in a single statement. Done atomically in SQL because steps
 * get ticked in quick succession; a read-modify-write let overlapping requests
 * overwrite each other's tick.
 */
export async function toggleStep(userId: string, taskId: string, stepId: string, done: boolean): Promise<ProgressRow> {
  await ensureSchema()
  const rows = done
    ? await sql`
        insert into quest_progress (user_id, task_id, steps) values (${userId}, ${taskId}, ${[stepId]})
        on conflict (user_id, task_id) do update set
          steps = case when ${stepId} = any(quest_progress.steps) then quest_progress.steps
                       else array_append(quest_progress.steps, ${stepId}) end,
          updated_at = now()
        returning *`
    : await sql`
        insert into quest_progress (user_id, task_id) values (${userId}, ${taskId})
        on conflict (user_id, task_id) do update set steps = array_remove(quest_progress.steps, ${stepId}), updated_at = now()
        returning *`
  return toProgress(rows[0])
}

/** Append to the activity log (feeds the streak and the mentor's feed). */
export async function logActivity(userId: string, kind: string, taskId: string | null, detail: string | null = null) {
  await sql`insert into quest_activity (user_id, kind, task_id, detail) values (${userId}, ${kind}, ${taskId}, ${detail})`
}

/** Mark or unmark a day as busy (an event day that pushes the plan back). */
export async function setBusy(userId: string, day: string, on: boolean) {
  await ensureSchema()
  if (on) await sql`insert into quest_busy (user_id, day) values (${userId}, ${day}) on conflict do nothing`
  else await sql`delete from quest_busy where user_id = ${userId} and day = ${day}`
}

/** Store a check-in (message + optional compressed screenshot data-URL). */
export async function addCheckin(userId: string, taskId: string, message: string, image: string | null) {
  await ensureSchema()
  const rows = await sql`insert into quest_checkins (user_id, task_id, message, image) values (${userId}, ${taskId}, ${message}, ${image}) returning id`
  return Number(rows[0].id)
}

/** A check-in's screenshot as a data URL — only for its owner, or for a mentor. */
export async function checkinImage(id: number, userId: string, mentor: boolean): Promise<string | null> {
  await ensureSchema()
  const rows = mentor
    ? await sql`select image from quest_checkins where id = ${id}`
    : await sql`select image from quest_checkins where id = ${id} and user_id = ${userId}`
  return (rows[0]?.image as string) || null
}

/** Coach chat history for one quest (or 'general'), oldest first. */
export async function listMessages(userId: string, taskId: string, limit = 60) {
  await ensureSchema()
  const rows = await sql`
    select id, role, content, created_at from quest_messages where user_id = ${userId} and task_id = ${taskId}
    order by id desc limit ${limit}`
  return rows.reverse().map((r) => ({ id: Number(r.id), role: String(r.role), content: String(r.content), created_at: iso(r.created_at) }))
}

/** Save one coach chat message. */
export async function addMessage(userId: string, taskId: string, role: 'user' | 'assistant', content: string) {
  await sql`insert into quest_messages (user_id, task_id, role, content) values (${userId}, ${taskId}, ${role}, ${content})`
}

/** A learner's most recent chat messages (mentor view), oldest first. */
export async function recentMessages(userId: string, limit = 400) {
  await ensureSchema()
  const rows = await sql`
    select id, task_id, role, content, created_at from quest_messages where user_id = ${userId}
    order by id desc limit ${limit}`
  return rows.reverse().map((r) => ({ id: Number(r.id), task_id: String(r.task_id), role: String(r.role), content: String(r.content), created_at: iso(r.created_at) }))
}

/** Everyone who has signed in (mentor view), most recently active first. */
export async function listLearners(): Promise<Learner[]> {
  await ensureSchema()
  const rows = await sql`
    select id, email, name, image, to_char(start_date, 'YYYY-MM-DD') as start_date, last_seen
    from quest_users order by last_seen desc limit 200`
  return rows.map((r) => ({ id: String(r.id), email: String(r.email), name: String(r.name), image: (r.image as string) || null, startDate: (r.start_date as string) || '', lastSeen: iso(r.last_seen) || '' }))
}

/** One learner by id. */
export async function getLearner(id: string): Promise<Learner | null> {
  await ensureSchema()
  const rows = await sql`
    select id, email, name, image, to_char(start_date, 'YYYY-MM-DD') as start_date, last_seen from quest_users where id = ${id}`
  const r = rows[0]
  return r ? { id: String(r.id), email: String(r.email), name: String(r.name), image: (r.image as string) || null, startDate: (r.start_date as string) || '', lastSeen: iso(r.last_seen) || '' } : null
}

/** Mentor sends a learner a cheer for their home screen. */
export async function addCheer(userId: string, fromName: string, message: string) {
  await ensureSchema()
  await sql`insert into quest_cheers (user_id, from_name, message) values (${userId}, ${fromName}, ${message})`
}

/** The learner dismisses a cheer. */
export async function seeCheer(userId: string, id: number) {
  await sql`update quest_cheers set seen_at = now() where id = ${id} and user_id = ${userId} and seen_at is null`
}

/** Record a file a learner uploaded (the bytes live in Blob storage; this is the index). */
export async function addFile(userId: string, f: { taskId: string; url: string; pathname: string; name: string; contentType: string; size: number }) {
  await ensureSchema()
  const rows = await sql`
    insert into quest_files (user_id, task_id, url, pathname, name, content_type, size)
    values (${userId}, ${f.taskId}, ${f.url}, ${f.pathname}, ${f.name}, ${f.contentType}, ${f.size})
    on conflict do nothing returning id`
  return Number(rows[0]?.id || 0)
}

/** Remove one of the learner's files from the index; returns its Blob URL so it can be deleted too. */
export async function removeFile(userId: string, id: number): Promise<string | null> {
  await ensureSchema()
  const rows = await sql`delete from quest_files where id = ${id} and user_id = ${userId} returning url`
  return (rows[0]?.url as string) || null
}

/** The stored password hash for an email account, or null if it has none. */
export async function getPasswordHash(email: string): Promise<string | null> {
  await ensureSchema()
  const rows = await sql`select hash from quest_passwords where email = ${email}`
  return (rows[0]?.hash as string) || null
}

/** Create an email account's password; false if that email already has one. */
export async function createPassword(email: string, hash: string): Promise<boolean> {
  await ensureSchema()
  const rows = await sql`insert into quest_passwords (email, hash) values (${email}, ${hash}) on conflict do nothing returning email`
  return rows.length > 0
}

/** Replace an email account's password (mentor reset). */
export async function setPassword(email: string, hash: string) {
  await ensureSchema()
  await sql`
    insert into quest_passwords (email, hash) values (${email}, ${hash})
    on conflict (email) do update set hash = excluded.hash, updated_at = now()`
}

/** Store (or replace) the pending sign-in code for an email. */
export async function saveOtp(email: string, codeHash: string, minutes = 10) {
  await ensureSchema()
  await sql`
    insert into quest_otps (email, code_hash, expires_at, attempts)
    values (${email}, ${codeHash}, now() + make_interval(mins => ${minutes}), 0)
    on conflict (email) do update set code_hash = excluded.code_hash, expires_at = excluded.expires_at, created_at = now(),
      -- A new code doesn't buy new guesses: the budget only resets after 30 quiet minutes.
      attempts = case when quest_otps.created_at > now() - interval '30 minutes' then quest_otps.attempts else 0 end`
}

/**
 * Count one guess against an email's code and return it if still usable. Five guesses per
 * half hour per address (new codes don't reset that) and codes expire after ten minutes.
 */
export async function takeOtpAttempt(email: string): Promise<{ codeHash: string } | null> {
  await ensureSchema()
  const rows = await sql`
    update quest_otps set attempts = attempts + 1
    where email = ${email} and expires_at > now() and attempts < 5
    returning code_hash`
  return rows[0] ? { codeHash: String(rows[0].code_hash) } : null
}

/** A used code can't be used again. */
export async function deleteOtp(email: string) {
  await sql`delete from quest_otps where email = ${email}`
}

/** Total bytes a learner has uploaded (for the per-person storage cap). */
export async function usedBytes(userId: string) {
  await ensureSchema()
  const rows = await sql`select coalesce(sum(size), 0)::bigint as n from quest_files where user_id = ${userId}`
  return Number(rows[0]?.n || 0)
}

// ───────────────────────────── pro track: MCP tokens + evidence ─────────────────────────────

/**
 * Issue a fresh MCP token for a learner, replacing any old one (so a leaked token dies the
 * moment they make a new one). Only an HMAC of it is stored; the raw token is returned
 * once, for the learner to paste into their agent's config.
 */
export async function rotateMcpToken(userId: string): Promise<string> {
  await ensureSchema()
  const token = `qst_${crypto.randomBytes(32).toString('base64url')}`
  await sql`
    insert into quest_mcp_tokens (user_id, token_hash) values (${userId}, ${hmac(token)})
    on conflict (user_id) do update set token_hash = excluded.token_hash, created_at = now(), last_used_at = null`
  return token
}

/** The learner a raw MCP token belongs to (and mark it used), or null for an unknown token. */
export async function userForMcpToken(token: string): Promise<string | null> {
  if (!/^qst_[A-Za-z0-9_-]{20,}$/.test(token)) return null
  await ensureSchema()
  const h = hmac(token)
  const rows = await sql`select user_id, last_used_at from quest_mcp_tokens where token_hash = ${h}`
  if (!rows[0]) return null
  // At most one write a minute per token.
  const last = rows[0].last_used_at ? new Date(rows[0].last_used_at as string | Date).getTime() : 0
  if (Date.now() - last > 60_000) await sql`update quest_mcp_tokens set last_used_at = now() where token_hash = ${h}`
  return String(rows[0].user_id)
}

/** Store one checked submission (items already scrubbed by verify). Returns its id. */
export async function addEvidence(userId: string, taskId: string, v: { passed: boolean; items: EvidenceItem[]; results: CheckResult[]; redactions: number }) {
  await ensureSchema()
  const rows = await sql`
    insert into quest_evidence (user_id, task_id, items, results, passed, redactions)
    values (${userId}, ${taskId}, ${sql.json(v.items as unknown as postgres.JSONValue)}, ${sql.json(v.results as unknown as postgres.JSONValue)}, ${v.passed}, ${v.redactions})
    returning id`
  // Keep only the latest 20 per task.
  await sql`delete from quest_evidence where user_id = ${userId} and task_id = ${taskId} and id not in (select id from quest_evidence where user_id = ${userId} and task_id = ${taskId} order by id desc limit 20)`
  return Number(rows[0].id)
}

/** A learner's submissions, newest first (optionally for one task). */
export async function listEvidence(userId: string, taskId?: string, limit = 10): Promise<Submission[]> {
  await ensureSchema()
  const rows = taskId
    ? await sql`select * from quest_evidence where user_id = ${userId} and task_id = ${taskId} order by id desc limit ${limit}`
    : await sql`select * from quest_evidence where user_id = ${userId} order by id desc limit ${limit}`
  return rows.map((r) => ({
    id: Number(r.id),
    task_id: String(r.task_id),
    passed: !!r.passed,
    redactions: Number(r.redactions),
    items: (r.items as EvidenceItem[]) || [],
    results: (r.results as CheckResult[]) || [],
    created_at: iso(r.created_at) || '',
  }))
}

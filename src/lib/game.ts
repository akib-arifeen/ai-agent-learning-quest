/**
 * Game rules — XP, ranks, streaks, badges and the day-by-day schedule. Everything here is
 * DERIVED from the stored progress, never stored itself, so the numbers can't drift out
 * of sync with what the learner actually did. Runs in the browser (and in the coach route).
 */

import { PRO_TASKS, type ProStatus } from './pro'
import type { Profile } from './profile'
import { QUESTS, LEVELS, questById, variantOf, type Quest } from './quest'

export type SittingRec = { n: number; at: string; next?: string }
export type ProgressRow = {
  task_id: string
  variant: string
  steps: string[]
  sittings: SittingRec[]
  notes: string
  own_idea: string
  completed_at: string | null
  updated_at?: string
}
export type Checkin = { id: number; task_id: string; message: string; has_image: boolean; created_at: string }
export type Activity = { at: string; kind: string; task_id: string | null; detail?: string | null }
export type QuestFile = { id: number; task_id: string; url: string; name: string; content_type: string; size: number; created_at: string }
export type Learner = { id: string; email: string; name: string; image: string | null; startDate: string; lastSeen: string }
export type QuestState = {
  user: Learner
  startDate: string
  progress: Record<string, ProgressRow>
  busy: string[]
  checkins: Checkin[]
  /** Recent activity, newest first (the learner's own activity feed). */
  activity: Activity[]
  /** One timestamp per hour with real progress — the streak's input. */
  days: string[]
  coachMessages: number
  /** What they uploaded for each quest — their record of what they made. */
  files: QuestFile[]
  /** Their onboarding answers (tool, role, goal…); null until they answer anything. */
  profile: Profile | null
  /** Pro track: which tasks their agent's evidence has passed, and whether it's connected. */
  pro: ProStatus
  /** Weekly-time answers by the day they took effect, oldest first; empty until the answer first changes. */
  paceLog?: PaceChange[]
}

/** One weekly-time answer and the day it started to apply. */
export type PaceChange = { since: string; weekly: number | null }

/** "Sam" from "Sam Lee" — the first name the app calls the learner. */
export const firstName = (name: string) => name.trim().split(/\s+/)[0] || 'there'

export const XP = { step: 10, sitting: 25, upload: 40, ownIdea: 50, badge: 50 }

// ─────────────────────────────── dates (YYYY-MM-DD) ───────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0')

/** Local calendar day of a Date (or now) as YYYY-MM-DD. */
export const localDay = (d: Date = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Local calendar day an ISO timestamp falls on. */
export const dayOf = (iso: string) => localDay(new Date(iso))

/** Shift a YYYY-MM-DD by whole days (UTC maths, so DST can't skip a day). */
export const addDays = (day: string, n: number) => {
  const [y, m, d] = day.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + n))
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`
}

/** Whole days from a to b (b − a). */
export const daysBetween = (a: string, b: string) => {
  const ms = (s: string) => {
    const [y, m, d] = s.split('-').map(Number)
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((ms(b) - ms(a)) / 86_400_000)
}

/** "Thu 15 Oct" for a YYYY-MM-DD. */
export const fmtDay = (day: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) => {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { ...opts, timeZone: 'UTC' })
}

/** Is this day a Saturday or Sunday? (Her capacity is bigger on weekends.) */
export const isWeekend = (day: string) => {
  const [y, m, d] = day.split('-').map(Number)
  const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return w === 0 || w === 6
}

// ─────────────────────────────── progress helpers ───────────────────────────────

/** A blank progress row, used before the learner has touched a quest. */
export const emptyProgress = (taskId: string): ProgressRow => ({
  task_id: taskId,
  variant: 'main',
  steps: [],
  sittings: [],
  notes: '',
  own_idea: '',
  completed_at: null,
})

export const progressOf = (s: QuestState, taskId: string) => s.progress[taskId] || emptyProgress(taskId)
export const isComplete = (p?: ProgressRow) => !!p?.completed_at
export const sittingDone = (p: ProgressRow | undefined, n: number) => isComplete(p) || !!p?.sittings.some((x) => x.n === n)

/** A quest unlocks when the one before it is complete. Base Camp is always open. */
export const isUnlocked = (s: QuestState, q: Quest) => {
  const i = QUESTS.findIndex((x) => x.id === q.id)
  return i <= 0 || isComplete(s.progress[QUESTS[i - 1].id])
}

export type QuestStatus = 'done' | 'active' | 'locked'
export const questStatus = (s: QuestState, q: Quest): QuestStatus =>
  isComplete(s.progress[q.id]) ? 'done' : isUnlocked(s, q) ? 'active' : 'locked'

// ─────────────────────────────────── schedule ───────────────────────────────────

/** Weekly time from onboarding (minutes) → planned sittings a week. No answer = every day, the original plan. */
export const sittingsPerWeek = (weeklyMinutes?: number | null): number =>
  !weeklyMinutes ? 7 : weeklyMinutes <= 60 ? 2 : weeklyMinutes <= 180 ? 3 : weeklyMinutes <= 300 ? 5 : 7

/** Study days in each 7-day cycle counted from the start date (0 = the start weekday), spread so rest falls between sittings. */
export const STUDY_DAYS: Record<number, number[]> = { 2: [0, 3], 3: [0, 2, 4], 5: [0, 1, 2, 3, 4], 7: [0, 1, 2, 3, 4, 5, 6] }

/**
 * A planned rest day: not a study day in the learner's weekly pattern. The schedule skips
 * rest days and they shield the streak, like busy days; work done on one still counts.
 */
export const isRestDay = (s: QuestState, day: string): boolean => {
  const n = sittingsPerWeek(weeklyOn(s, day))
  if (n >= 7) return false
  const offset = ((daysBetween(s.startDate, day) % 7) + 7) % 7
  // A missing start date gives NaN; calling every day a rest day would make buildSchedule loop forever.
  if (Number.isNaN(offset)) return false
  return !STUDY_DAYS[n].includes(offset)
}

/**
 * The weekly-time answer that applied on a day. Changing the answer re-plans from that day on
 * only, so past days keep the plan the learner actually had (their streaks and badges with it).
 */
export const weeklyOn = (s: QuestState, day: string): number | null | undefined => {
  const log = s.paceLog
  if (!log?.length) return s.profile?.weekly_minutes
  let weekly = log[0].weekly
  for (const c of log) if (c.since <= day) weekly = c.weekly
  return weekly
}

/** The pace log once the answer changes to `weekly` on `today` (the server stores the same rows). */
export const withPace = (s: QuestState, weekly: number | null, today: string): PaceChange[] => {
  const log = s.paceLog?.length ? s.paceLog : [{ since: s.startDate, weekly: s.profile?.weekly_minutes ?? null }]
  return [...log.filter((c) => c.since < today), { since: today, weekly }]
}

export type SlotItem = { questId: string; n: number; title: string; done: boolean }
export type Slot = { date: string; items: SlotItem[]; done: boolean }

/**
 * One sitting per study day, starting on the start date. Rest days come from the learner's
 * weekly time (see isRestDay); a busy day ("event or activity") is skipped the same way and
 * pushes everything after it back. Base Camp shares day one with Quest 1.
 */
export const buildSchedule = (s: QuestState): Slot[] => {
  const busy = new Set(s.busy)
  const slots: Slot[] = []
  let carry: SlotItem[] = []
  for (const q of QUESTS) {
    const p = s.progress[q.id]
    const v = variantOf(q, p?.variant)
    v.sittings.forEach((sit, n) => {
      const item = { questId: q.id, n, title: sit.title, done: sittingDone(p, n) }
      if (q.pairWithNext) {
        carry.push(item)
        return
      }
      slots.push({ date: '', items: [...carry, item], done: false })
      carry = []
    })
  }
  let d = s.startDate
  for (const slot of slots) {
    while (busy.has(d) || isRestDay(s, d)) d = addDays(d, 1)
    slot.date = d
    slot.done = slot.items.every((i) => i.done)
    d = addDays(d, 1)
  }
  return slots
}

export type Pace = { current?: Slot; behind: number; ahead: number; todayDone: boolean; busyToday: boolean; restToday: boolean; finished: boolean }

/** Where the learner is against the plan, today. `restToday`: today is a planned rest day (see isRestDay). */
export const paceOf = (slots: Slot[], today: string, busy: string[] = [], restToday = false): Pace => {
  const current = slots.find((x) => !x.done)
  const behind = slots.filter((x) => !x.done && x.date < today).length
  const ahead = slots.filter((x) => x.done && x.date > today).length
  const todays = slots.find((x) => x.date === today)
  return { current, behind, ahead, todayDone: !!todays?.done, busyToday: busy.includes(today), restToday, finished: !current }
}

/** The day a quest is due: the date of the slot holding its last sitting. */
export const deadlineOf = (slots: Slot[], questId: string) => {
  let last = ''
  for (const sl of slots) if (sl.items.some((i) => i.questId === questId)) last = sl.date
  return last
}

// ─────────────────────────────────── streaks ───────────────────────────────────

/** Days with real progress (ticks, wrap-ups, completions, check-ins), in local time. */
export const activeDays = (s: QuestState) => new Set(s.days.map(dayOf))

/**
 * Current streak: consecutive active days ending today (or yesterday — today isn't
 * over yet). Busy days and rest days are shields: they neither count nor break the chain.
 */
export const currentStreak = (s: QuestState, today: string) => {
  const active = activeDays(s)
  const busy = new Set(s.busy)
  let d = active.has(today) ? today : addDays(today, -1)
  let n = 0
  for (let guard = 0; guard < 400; guard++) {
    if (active.has(d)) n++
    else if (!busy.has(d) && !isRestDay(s, d)) break
    d = addDays(d, -1)
  }
  return n
}

/** Longest streak ever, with the same busy-day and rest-day shield rule. */
export const bestStreak = (s: QuestState, today: string) => {
  const active = activeDays(s)
  if (!active.size) return 0
  const busy = new Set(s.busy)
  let d = [...active].sort()[0]
  let run = 0
  let best = 0
  while (d <= today) {
    if (active.has(d)) best = Math.max(best, ++run)
    else if (!busy.has(d) && !isRestDay(s, d) && d !== today) run = 0
    d = addDays(d, 1)
  }
  return best
}

// ─────────────────────────────────── badges ───────────────────────────────────

export type Badge = { id: string; name: string; desc: string; icon: string; earned: boolean }

const levelDone = (s: QuestState, level: number) => QUESTS.filter((q) => q.level === level).every((q) => isComplete(s.progress[q.id]))

/** Every badge, earned or not, in display order. */
export const badgesOf = (s: QuestState, today: string): Badge[] => {
  const rows = Object.values(s.progress)
  const slots = buildSchedule(s)
  const best = bestStreak(s, today)
  const done = QUESTS.filter((q) => q.num > 0 && isComplete(s.progress[q.id])).length
  const notes = rows.reduce((a, p) => a + p.sittings.filter((x) => (x.next || '').trim()).length, 0)
  const early = rows.some((p) => p.completed_at && dayOf(p.completed_at) < deadlineOf(slots, p.task_id))
  const comeback = (() => {
    const days = [...activeDays(s)].sort()
    const busy = new Set(s.busy)
    for (let i = 1; i < days.length; i++) {
      let gap = 0
      for (let d = addDays(days[i - 1], 1); d < days[i]; d = addDays(d, 1)) if (!busy.has(d) && !isRestDay(s, d)) gap++
      if (gap >= 2) return true
    }
    return false
  })()
  const list: Array<Omit<Badge, 'earned'> & { test: boolean }> = [
    { id: 'base-camp', name: 'Base Camp', desc: 'Set up your gear', icon: 'tent', test: isComplete(s.progress.t0) },
    { id: 'first-light', name: 'First Light', desc: 'Finish Quest 1', icon: 'sparkles', test: isComplete(s.progress.t1) },
    { id: 'hello-spark', name: 'Hello, Spark', desc: 'Ask your coach anything', icon: 'message', test: s.coachMessages > 0 },
    { id: 'show-tell', name: 'Show & Tell', desc: 'Upload something you made', icon: 'camera', test: s.files.length > 0 },
    { id: 'curator', name: 'Curator', desc: 'Upload work for 3 quests', icon: 'folder', test: new Set(s.files.map((f) => f.task_id)).size >= 3 },
    { id: 'streak-3', name: 'On a Roll', desc: '3-day streak', icon: 'flame', test: best >= 3 },
    { id: 'streak-7', name: 'Week of Wonder', desc: '7-day streak', icon: 'zap', test: best >= 7 },
    { id: 'remixer', name: 'Remixer', desc: 'Swap a quest for an alternative', icon: 'shuffle', test: rows.some((p) => p.variant !== 'main') },
    { id: 'note-taker', name: 'Note Taker', desc: 'Leave 5 “next time” notes', icon: 'notebook', test: notes >= 5 },
    { id: 'own-twist', name: 'Own Twist', desc: 'Add your own idea to a quest', icon: 'lightbulb', test: rows.some((p) => p.own_idea.trim()) },
    { id: 'early-bird', name: 'Early Bird', desc: 'Finish a quest before its deadline', icon: 'sunrise', test: early },
    { id: 'comeback', name: 'Comeback', desc: 'Return after a missed stretch', icon: 'rotate', test: comeback },
    { id: 'level-1', name: 'Warm & Ready', desc: 'Clear Level 1', icon: 'medal', test: levelDone(s, 1) },
    { id: 'level-2', name: 'File Whisperer', desc: 'Clear Level 2', icon: 'folder', test: levelDone(s, 2) },
    { id: 'level-3', name: 'Tool Tamer', desc: 'Clear Level 3', icon: 'wrench', test: levelDone(s, 3) },
    { id: 'halfway', name: 'Halfway Hero', desc: 'Finish 5 quests', icon: 'mountain', test: done >= 5 },
    { id: 'shipped', name: 'Shipped It', desc: 'Beat the final boss', icon: 'rocket', test: isComplete(s.progress.t10) },
    { id: 'plugged-in', name: 'Plugged In', desc: 'Your agent connected over MCP', icon: 'zap', test: !!s.pro.lastUsed },
    { id: 'agent-pro', name: 'Agent Pro', desc: 'Pass every pro-track level', icon: 'medal', test: PRO_TASKS.length > 0 && PRO_TASKS.every((t) => s.pro.tasks[t.id]?.passed) },
  ]
  return list.map(({ test, ...b }) => ({ ...b, earned: test }))
}

// ───────────────────────────────── XP and ranks ─────────────────────────────────

export const RANKS = [
  { min: 0, name: 'Rookie' },
  { min: 150, name: 'Doodler' },
  { min: 400, name: 'Tinkerer' },
  { min: 800, name: 'Prompt Smith' },
  { min: 1300, name: 'Scene Builder' },
  { min: 1900, name: 'Director' },
  { min: 2700, name: 'World Maker' },
  { min: 3600, name: 'Agent Wrangler' },
  { min: 4600, name: 'Creative Technologist' },
  { min: 5600, name: 'Legend' },
]

/** Total XP, from what's been done. Steps are only counted for the variant in play. */
export const xpOf = (s: QuestState, today: string) => {
  let xp = 0
  for (const q of QUESTS) {
    const p = s.progress[q.id]
    if (!p) continue
    const v = variantOf(q, p.variant)
    const valid = new Set(v.sittings.flatMap((sit, si) => sit.steps.map((_, i) => `${si}-${i}`)))
    xp += p.steps.filter((id) => valid.has(id)).length * XP.step
    xp += new Set(p.sittings.map((x) => x.n)).size * XP.sitting
    if (p.completed_at) xp += q.xp
    if (p.own_idea.trim()) xp += XP.ownIdea
  }
  // First upload per quest earns the showcase bonus (more files are welcome, not farmed).
  xp += new Set(s.files.map((f) => f.task_id)).size * XP.upload
  // Pro-track levels count once each, when the agent's evidence first passes.
  xp += PRO_TASKS.reduce((a, t) => a + (s.pro.tasks[t.id]?.passed ? t.xp : 0), 0)
  xp += badgesOf(s, today).filter((b) => b.earned).length * XP.badge
  return xp
}

/** Rank for an XP total, with progress toward the next one. */
export const rankOf = (xp: number) => {
  let i = 0
  while (i + 1 < RANKS.length && xp >= RANKS[i + 1].min) i++
  const cur = RANKS[i]
  const next = RANKS[i + 1]
  const pct = next ? (xp - cur.min) / (next.min - cur.min) : 1
  return { level: i + 1, name: cur.name, min: cur.min, next: next?.min, nextName: next?.name, pct: Math.max(0, Math.min(1, pct)) }
}

/** Everything the HUD needs, in one pass. */
export const summarize = (s: QuestState, today: string) => {
  const slots = buildSchedule(s)
  const xp = xpOf(s, today)
  return {
    slots,
    pace: paceOf(slots, today, s.busy, isRestDay(s, today)),
    xp,
    rank: rankOf(xp),
    streak: currentStreak(s, today),
    best: bestStreak(s, today),
    badges: badgesOf(s, today),
    questsDone: QUESTS.filter((q) => q.num > 0 && isComplete(s.progress[q.id])).length,
  }
}

/** XP still on offer in a slot — used to tempt her into today's mission. */
export const slotXp = (slot: Slot) =>
  slot.items.reduce((a, i) => {
    const q = questById(i.questId)!
    const v = q.variants[0]
    const last = i.n === v.sittings.length - 1
    return a + XP.sitting + v.sittings[i.n].steps.length * XP.step + (last ? q.xp : 0)
  }, 0)

export const levelOf = (q: Quest) => LEVELS[q.level]

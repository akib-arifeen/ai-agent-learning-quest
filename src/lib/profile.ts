/**
 * Who the learner is and what they work with: the onboarding answers. They personalise
 * the course (the tool wording, Base Camp's install steps, Spark's brief) without forking
 * it. Shared by the browser and the server.
 */

import type { QuestState } from './game'
import { OS_IDS, TOOL_IDS, type Os, type Setup, type ToolId } from './tools'

export const ROLES = [
  { id: 'student', label: 'Student' },
  { id: 'educator', label: 'Educator' },
  { id: 'creative', label: 'Designer or creative' },
  { id: 'business', label: 'Marketing or business' },
  { id: 'developer', label: 'Developer' },
  { id: 'other', label: 'Something else' },
] as const
export type Role = (typeof ROLES)[number]['id']

export const EXPERIENCE = [
  { id: 'none', label: 'Never coded', hint: 'No problem: the agent writes the code, you direct it.' },
  { id: 'some', label: 'A little', hint: 'A tutorial or two, some HTML, a formula or a script.' },
  { id: 'comfortable', label: 'Comfortable', hint: 'You can read and change code yourself.' },
] as const
export type Experience = (typeof EXPERIENCE)[number]['id']

export const OSES: { id: Os; label: string }[] = [
  { id: 'windows', label: 'Windows' },
  { id: 'mac', label: 'Mac' },
  { id: 'linux', label: 'Linux' },
]

/** Time-per-week answers, stored as minutes. */
export const WEEKLY = [
  { minutes: 60, label: 'Under an hour' },
  { minutes: 180, label: '1–3 hours' },
  { minutes: 300, label: '3–5 hours' },
  { minutes: 480, label: '5+ hours' },
] as const

/** Tap-to-fill ideas for "what do you want to build?", per role. */
export const GOAL_IDEAS: Record<Role, string[]> = {
  student: ['A quiz app to revise for exams', 'A game to play with friends', 'A portfolio site for applications'],
  educator: ['An interactive lesson for my class', 'A quiz generator for my subject', 'A simple class website'],
  creative: ['An interactive portfolio', 'A generative art toy', 'A script that automates my Blender or After Effects work'],
  business: ['A landing page for a launch', 'A tool that drafts social posts', 'A dashboard for campaign numbers'],
  developer: ['An internal tool my team needs', 'The side project I keep putting off', 'Automate a boring workflow'],
  other: ['A personal website', 'A small game', 'A tool that saves me time every week'],
}

export type Profile = {
  role: Role | ''
  role_other: string
  experience: Experience | ''
  goal: string
  tool: ToolId | ''
  tool_other: string
  os: Os | ''
  weekly_minutes: number | null
  /** Set when they finish onboarding (or finish editing it later). */
  completed_at: string | null
  /** Set when they skip onboarding or dismiss the "personalise" prompt; it stops asking. */
  dismissed_at: string | null
}

/** A partial update from onboarding. `complete` / `dismiss` stamp the matching timestamp. */
export type ProfilePatch = Partial<Omit<Profile, 'completed_at' | 'dismissed_at'>> & { complete?: boolean; dismiss?: boolean }

export const EMPTY_PROFILE: Profile = {
  role: '',
  role_other: '',
  experience: '',
  goal: '',
  tool: '',
  tool_other: '',
  os: '',
  weekly_minutes: null,
  completed_at: null,
  dismissed_at: null,
}

export const LIMITS = { role_other: 60, goal: 300, tool_other: 60 } as const

const pick = <T extends string>(v: unknown, allowed: readonly T[]): T | '' | undefined =>
  v === undefined ? undefined : allowed.includes(v as T) ? (v as T) : v === '' ? '' : undefined

/**
 * Validate an untrusted request body into a patch. Unknown keys are dropped; an enum
 * field with a value outside its list is dropped (not an error), '' clears it; free text
 * is trimmed and capped (LIMITS); weekly_minutes must be one of WEEKLY's values or null.
 * `complete` / `dismiss` are kept only when exactly `true`.
 */
export function cleanProfilePatch(body: unknown): ProfilePatch {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const out: ProfilePatch = {}
  const role = pick(b.role, ROLES.map((r) => r.id))
  if (role !== undefined) out.role = role
  const experience = pick(b.experience, EXPERIENCE.map((e) => e.id))
  if (experience !== undefined) out.experience = experience
  const tool = pick(b.tool, TOOL_IDS)
  if (tool !== undefined) out.tool = tool
  const os = pick(b.os, OS_IDS)
  if (os !== undefined) out.os = os
  for (const k of ['role_other', 'goal', 'tool_other'] as const) {
    if (typeof b[k] === 'string') out[k] = (b[k] as string).replace(/\u0000/g, '').trim().slice(0, LIMITS[k])
  }
  if (b.weekly_minutes === null) out.weekly_minutes = null
  else if (WEEKLY.some((w) => w.minutes === b.weekly_minutes)) out.weekly_minutes = b.weekly_minutes as number
  if (b.complete === true) out.complete = true
  if (b.dismiss === true) out.dismiss = true
  return out
}

/** The tool + OS the course is worded for. No answer = Kilo Code (see DEFAULT_SETUP). */
export const setupOf = (p?: Profile | null): Setup => ({ tool: p?.tool || 'kilo', os: p?.os || '' })

/** Has this learner done anything yet? (Ticks, uploads or a chat with Spark.) */
const hasStarted = (s: QuestState) => Object.keys(s.progress).length > 0 || s.files.length > 0 || s.coachMessages > 0 || Object.values(s.pro?.tasks || {}).some((t) => t.attempts > 0)

/**
 * Show the full-screen onboarding: a brand-new learner who hasn't finished or skipped it.
 * Learners who were already mid-quest when onboarding shipped get the prompt instead, and
 * so do mentors, who mustn't meet a wall on their way to Mentor HQ.
 */
export const needsOnboarding = (s: QuestState) => !s.profile?.completed_at && !s.profile?.dismissed_at && !hasStarted(s) && !s.mentor

/** Show the dismissible "personalise your quest" prompt on the home screen. */
export const showPersonalisePrompt = (s: QuestState) => !s.profile?.completed_at && !s.profile?.dismissed_at && (hasStarted(s) || !!s.mentor)

/** The role as words: the preset label, or what they typed for "something else". */
export const roleLabel = (p?: Profile | null) =>
  !p?.role ? '' : p.role === 'other' ? p.role_other || 'Something else' : ROLES.find((r) => r.id === p.role)?.label || ''

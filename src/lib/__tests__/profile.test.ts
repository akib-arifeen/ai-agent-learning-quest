import { describe, expect, it } from 'vitest'
import type { QuestState } from '../game'
import { EMPTY_PROFILE, LIMITS, WEEKLY, cleanProfilePatch, needsOnboarding, roleLabel, setupOf, showPersonalisePrompt, type Profile } from '../profile'

describe('cleanProfilePatch', () => {
  it('returns {} for non-object bodies', () => {
    for (const body of [null, undefined, 'x', 5, true, [], [1, 2], [{ role: 'student' }]]) expect(cleanProfilePatch(body)).toEqual({})
  })

  it('drops unknown keys', () => {
    expect(cleanProfilePatch({ role: 'student', admin: true, user_id: 'x' })).toEqual({ role: 'student' })
  })

  it('drops invalid enum values and clears with an empty string', () => {
    expect(cleanProfilePatch({ role: 'wizard', experience: 'expert', tool: 'vim', os: 'beos' })).toEqual({})
    expect(cleanProfilePatch({ role: '', experience: '', tool: '', os: '' })).toEqual({ role: '', experience: '', tool: '', os: '' })
    expect(cleanProfilePatch({ role: 5, tool: null })).toEqual({})
  })

  it('keeps valid enum values', () => {
    expect(cleanProfilePatch({ role: 'educator', experience: 'some', tool: 'claude-code', os: 'linux' })).toEqual({
      role: 'educator',
      experience: 'some',
      tool: 'claude-code',
      os: 'linux',
    })
  })

  it('trims and caps text fields at LIMITS', () => {
    expect(cleanProfilePatch({ goal: '   hello   ' })).toEqual({ goal: 'hello' })
    const out = cleanProfilePatch({ goal: 'a'.repeat(LIMITS.goal + 50), role_other: 'b'.repeat(500), tool_other: 'c'.repeat(500) })
    expect(out.goal).toHaveLength(LIMITS.goal)
    expect(out.role_other).toHaveLength(LIMITS.role_other)
    expect(out.tool_other).toHaveLength(LIMITS.tool_other)
  })

  it('keeps an empty text field (clears it) and drops non-string text', () => {
    expect(cleanProfilePatch({ goal: '   ' })).toEqual({ goal: '' })
    expect(cleanProfilePatch({ goal: 5, role_other: null, tool_other: ['x'] })).toEqual({})
  })

  it('accepts only WEEKLY minutes or null', () => {
    for (const w of WEEKLY) expect(cleanProfilePatch({ weekly_minutes: w.minutes })).toEqual({ weekly_minutes: w.minutes })
    expect(cleanProfilePatch({ weekly_minutes: null })).toEqual({ weekly_minutes: null })
    for (const bad of [61, '60', -1, 0, undefined, NaN]) expect(cleanProfilePatch({ weekly_minutes: bad })).toEqual({})
  })

  it('keeps complete and dismiss only when exactly true', () => {
    expect(cleanProfilePatch({ complete: true, dismiss: true })).toEqual({ complete: true, dismiss: true })
    for (const bad of ['true', 1, false, null]) expect(cleanProfilePatch({ complete: bad, dismiss: bad })).toEqual({})
  })
})

describe('setupOf', () => {
  it('defaults to kilo with no os', () => {
    expect(setupOf(null)).toEqual({ tool: 'kilo', os: '' })
    expect(setupOf(undefined)).toEqual({ tool: 'kilo', os: '' })
    expect(setupOf(EMPTY_PROFILE)).toEqual({ tool: 'kilo', os: '' })
  })

  it('uses the profile tool and os', () => {
    expect(setupOf({ ...EMPTY_PROFILE, tool: 'opencode', os: 'mac' })).toEqual({ tool: 'opencode', os: 'mac' })
  })
})

const state = (over: { profile?: Partial<Profile> | null; progress?: number; files?: number; coachMessages?: number }): QuestState =>
  ({
    profile: over.profile === null || over.profile === undefined ? null : { ...EMPTY_PROFILE, ...over.profile },
    progress: Object.fromEntries(Array.from({ length: over.progress ?? 0 }, (_, i) => [`t${i}`, {}])),
    files: Array.from({ length: over.files ?? 0 }, () => ({})),
    coachMessages: over.coachMessages ?? 0,
    pro: { tasks: {}, hasToken: false, lastUsed: null },
  }) as unknown as QuestState

describe('needsOnboarding / showPersonalisePrompt', () => {
  const stamp = '2026-10-22T00:00:00Z'
  const cases: { name: string; s: QuestState; onboarding: boolean; prompt: boolean }[] = [
    { name: 'no profile, nothing started', s: state({}), onboarding: true, prompt: false },
    { name: 'progress row, no profile', s: state({ progress: 1 }), onboarding: false, prompt: true },
    { name: 'files only', s: state({ files: 1 }), onboarding: false, prompt: true },
    { name: 'coach messages', s: state({ coachMessages: 3 }), onboarding: false, prompt: true },
    { name: 'completed, nothing started', s: state({ profile: { completed_at: stamp } }), onboarding: false, prompt: false },
    { name: 'completed, started', s: state({ profile: { completed_at: stamp }, progress: 2 }), onboarding: false, prompt: false },
    { name: 'dismissed, nothing started', s: state({ profile: { dismissed_at: stamp } }), onboarding: false, prompt: false },
    { name: 'dismissed, started', s: state({ profile: { dismissed_at: stamp }, progress: 2 }), onboarding: false, prompt: false },
    { name: 'partial profile, nothing started', s: state({ profile: { role: 'student', tool: 'opencode' } }), onboarding: true, prompt: false },
    { name: 'partial profile, started', s: state({ profile: { role: 'student' }, progress: 1 }), onboarding: false, prompt: true },
  ]

  for (const c of cases)
    it(c.name, () => {
      expect(needsOnboarding(c.s)).toBe(c.onboarding)
      expect(showPersonalisePrompt(c.s)).toBe(c.prompt)
      expect(needsOnboarding(c.s) && showPersonalisePrompt(c.s)).toBe(false)
    })
})

describe('roleLabel', () => {
  it('is empty for none', () => {
    expect(roleLabel(null)).toBe('')
    expect(roleLabel(undefined)).toBe('')
    expect(roleLabel(EMPTY_PROFILE)).toBe('')
  })

  it('gives the preset label', () => {
    expect(roleLabel({ ...EMPTY_PROFILE, role: 'student' })).toBe('Student')
    expect(roleLabel({ ...EMPTY_PROFILE, role: 'creative' })).toBe('Designer or creative')
  })

  it('uses role_other for other, else Something else', () => {
    expect(roleLabel({ ...EMPTY_PROFILE, role: 'other', role_other: 'Chef' })).toBe('Chef')
    expect(roleLabel({ ...EMPTY_PROFILE, role: 'other', role_other: '' })).toBe('Something else')
  })
})

describe('mentors', () => {
  it('never get the full-screen onboarding, only the prompt', () => {
    const s = { ...state({}), mentor: true }
    expect(needsOnboarding(s)).toBe(false)
    expect(showPersonalisePrompt(s)).toBe(true)
  })
})

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { systemPrompt } from '../coach'
import type { QuestState } from '../game'
import { QUESTS } from '../quest'

/** Read a source file relative to src/ (this test lives in src/lib/__tests__). */
const read = (rel: string) => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8')

/** Learner-facing journey source. Privacy and terms are exercised by their own task. */
const LEARNER_FILES = [
  'lib/quest.ts',
  'lib/coach.ts',
  'lib/pro.ts',
  'components/Coach.tsx',
  'components/ConnectAgent.tsx',
  'components/Diagram.tsx',
  'components/QuestView.tsx',
  'components/SignIn.tsx',
  'app/page.tsx',
  'app/error.tsx',
  'app/layout.tsx',
  'app/opengraph-image.tsx',
]

const today = '2026-10-22'

const state: QuestState = {
  user: { id: 'u1', email: 'a@b.co', name: 'Sam Lee', image: null, startDate: today, lastSeen: today },
  startDate: today,
  progress: {},
  busy: [],
  checkins: [],
  activity: [],
  days: [],
  cheers: [],
  coachMessages: 0,
  pro: { tasks: {}, hasToken: false, lastUsed: null },
  files: [],
  profile: null,
}

describe('self-directed learner language', () => {
  it('has no mentor wording in learner-journey source files', () => {
    const bad = LEARNER_FILES.filter((file) => /mentor/i.test(read(file)))
    expect(bad).toEqual([])
  })

  it('asks for a private reflection at the finish line', () => {
    const questView = read('components/QuestView.tsx')
    expect(questView).toMatch(/private reflection/i)
    expect(questView).toMatch(/only you can see/i)
    // The stored check-in field keeps its stable id.
    expect(questView).toContain('htmlFor="msg"')
  })

  it('says Spark chats are private and Spark is optional', () => {
    const coach = read('components/Coach.tsx')
    expect(coach).toMatch(/chats are private/i)
    expect(coach).toMatch(/spark is optional/i)
  })

  it('does not imply default sharing of evidence', () => {
    expect(read('components/ConnectAgent.tsx')).toMatch(/nothing is shared by default/i)
  })
})

describe('Spark system prompt', () => {
  it('describes self-directed learning and never mentions a mentor', () => {
    const out = systemPrompt('Sam', 't0', null, state, today)
    expect(out).not.toMatch(/mentor/i)
    expect(out).toMatch(/self-directed/i)
    expect(out).toMatch(/optional guidance/i)
  })
})

describe('quest structure stays stable', () => {
  it('keeps the known quest ids and numeric XP awards', () => {
    expect(QUESTS.map((q) => q.id)).toEqual(['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9', 't10'])
    expect(QUESTS.every((q) => typeof q.xp === 'number')).toBe(true)
  })
})

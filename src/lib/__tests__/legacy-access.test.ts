import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { QuestState } from '../game'
import { needsOnboarding, showPersonalisePrompt } from '../profile'

const SRC = fileURLToPath(new URL('../..', import.meta.url))
const at = (...parts: string[]) => join(SRC, ...parts)
const read = (...parts: string[]) => readFileSync(at(...parts), 'utf8')

/** Every non-test source file under src/. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(join(dir, entry.name))
    if (!/\.(ts|tsx|js|jsx|css)$/.test(entry.name) || /\.test\.(ts|tsx)$/.test(entry.name)) return []
    return [join(dir, entry.name)]
  })
}

describe('legacy privileged paths are gone', () => {
  it.each(['app/mentor', 'app/api/mentor', 'app/api/cheer'])('does not ship %s', (path) => {
    expect(existsSync(at(path))).toBe(false)
  })

  it('has no ADMIN_EMAILS or isMentor references in non-test source', () => {
    const bad = sourceFiles(SRC)
      .filter((file) => /\bADMIN_EMAILS\b|\bisMentor\b/.test(readFileSync(file, 'utf8')))
      .map((file) => relative(SRC, file))
    expect(bad).toEqual([])
  })

  it('keeps state and check-in reads owner-only', () => {
    expect(read('app/api/state/route.ts')).not.toMatch(/mentor/i)
    expect(read('app/api/checkin/route.ts')).not.toMatch(/mentor/i)
  })
})

describe('onboarding is self-directed', () => {
  const base = {
    profile: null,
    progress: {},
    files: [],
    coachMessages: 0,
    pro: { tasks: {} },
  } as unknown as QuestState
  const started = { ...base, progress: { t0: {} } } as unknown as QuestState

  it('does not depend on a mentor flag', () => {
    for (const s of [base, started]) {
      const flagged = { ...s, mentor: true } as unknown as QuestState
      expect(needsOnboarding(flagged)).toBe(needsOnboarding(s))
      expect(showPersonalisePrompt(flagged)).toBe(showPersonalisePrompt(s))
    }
  })

  it('still onboards a new learner and prompts a started one', () => {
    expect(needsOnboarding(base)).toBe(true)
    expect(showPersonalisePrompt(base)).toBe(false)
    expect(needsOnboarding(started)).toBe(false)
    expect(showPersonalisePrompt(started)).toBe(true)
  })
})

describe('learner state has no legacy mentor/cheer fields', () => {
  it('defines QuestState without mentor or cheers', () => {
    const game = read('lib/game.ts')
    const start = game.indexOf('export type QuestState')
    const block = game.slice(start, game.indexOf('}', start) + 1)
    expect(block).not.toMatch(/\bmentor\b/i)
    expect(block).not.toMatch(/\bcheers\b/i)
  })

  it('loads state without mentor or cheers', () => {
    const db = read('lib/db.ts')
    const start = db.indexOf('export async function loadState')
    const block = db.slice(start, db.indexOf('/** Map a quest_profiles row', start))
    expect(block).not.toMatch(/\bmentor\b/i)
    expect(block).not.toMatch(/\bcheers\b/i)
  })
})

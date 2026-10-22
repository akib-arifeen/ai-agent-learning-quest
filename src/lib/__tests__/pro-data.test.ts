import { describe, expect, it } from 'vitest'
import { PRO_TASKS, type Check } from '../pro'
import { TOOLS } from '../tools'

const EM_DASH = '—'

function strings(v: unknown, path = '$'): [string, string][] {
  if (typeof v === 'string') return [[path, v]]
  if (Array.isArray(v)) return v.flatMap((x, i) => strings(x, `${path}[${i}]`))
  if (v && typeof v === 'object') return Object.entries(v).flatMap(([k, x]) => strings(x, `${path}.${k}`))
  return []
}

const allChecks = (): { where: string; check: Check }[] =>
  PRO_TASKS.flatMap((t) => t.evidence.flatMap((e) => e.checks.map((check, i) => ({ where: `${t.id}/${e.id}#${i}`, check }))))

describe('PRO_TASKS data', () => {
  it('is filled', () => {
    expect(PRO_TASKS.length, 'PRO_TASKS not filled').toBeGreaterThan(0)
  })

  it('has unique ids like p1, p2', () => {
    const ids = PRO_TASKS.map((t) => t.id)
    for (const id of ids) expect(id, id).toMatch(/^p\d+$/)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has levels ascending from 1 and positive xp', () => {
    expect(PRO_TASKS.length, 'PRO_TASKS not filled').toBeGreaterThan(0)
    expect(PRO_TASKS[0].level).toBe(1)
    for (let i = 1; i < PRO_TASKS.length; i++) expect(PRO_TASKS[i].level, PRO_TASKS[i].id).toBeGreaterThan(PRO_TASKS[i - 1].level)
    for (const t of PRO_TASKS) expect(t.xp, t.id).toBeGreaterThan(0)
  })

  it('gives every task a build of 3+ steps, a required evidence item, unique evidence ids and https sources', () => {
    expect(PRO_TASKS.length, 'PRO_TASKS not filled').toBeGreaterThan(0)
    for (const t of PRO_TASKS) {
      expect(t.build.length, `${t.id} build`).toBeGreaterThanOrEqual(3)
      expect(
        t.evidence.some((e) => !e.optional),
        `${t.id} needs a required evidence item`,
      ).toBe(true)
      const ids = t.evidence.map((e) => e.id)
      expect(new Set(ids).size, `${t.id} evidence ids`).toBe(ids.length)
      expect(t.sources.length, `${t.id} sources`).toBeGreaterThan(0)
      for (const s of t.sources) expect(s, `${t.id} source`).toMatch(/^https:\/\/\S+$/)
    }
  })

  it('has every regex and countAtLeast pattern compile with its flags', () => {
    expect(PRO_TASKS.length, 'PRO_TASKS not filled').toBeGreaterThan(0)
    for (const { where, check } of allChecks()) {
      if (check.type === 'regex' || check.type === 'countAtLeast') {
        expect(() => new RegExp(check.pattern, check.flags), where).not.toThrow()
      }
    }
  })

  it('has a non-empty message on every check', () => {
    expect(PRO_TASKS.length, 'PRO_TASKS not filled').toBeGreaterThan(0)
    for (const { where, check } of allChecks()) expect(check.message.trim().length, where).toBeGreaterThan(0)
  })

  it('has no em-dash in any string', () => {
    expect(PRO_TASKS.length, 'PRO_TASKS not filled').toBeGreaterThan(0)
    const bad = strings(PRO_TASKS)
      .filter(([, s]) => s.includes(EM_DASH))
      .map(([p]) => p)
    expect(bad).toEqual([])
  })
})

describe('TOOLS mcp snippets', () => {
  for (const [id, tool] of Object.entries(TOOLS)) {
    it(`${id} has a complete mcp entry`, () => {
      const mcp = tool.mcp
      expect(mcp, `${id} mcp`).toBeTruthy()
      expect(mcp!.where.trim().length, 'where').toBeGreaterThan(0)
      expect(mcp!.snippet.trim().length, 'snippet').toBeGreaterThan(0)
      expect(mcp!.source.trim().length, 'source').toBeGreaterThan(0)
      expect(mcp!.snippet).toContain('{url}')
      const note = mcp!.note ?? ''
      const tokenReaches = mcp!.snippet.includes('{token}') || note.includes('{token}') || (mcp!.snippet.includes('${input:') && note.includes('{token}'))
      expect(tokenReaches, `${id}: the token must reach the learner via {token} in the snippet or the note`).toBe(true)
    })
  }
})

import { describe, expect, it } from 'vitest'
import { buildSchedule, currentStreak, isRestDay, paceOf, sittingsPerWeek, summarize, type QuestState } from '../game'
import { EMPTY_PROFILE } from '../profile'
import { LEARN, QUESTS, diagramFor, learnLinksFor, variantOf } from '../quest'
import { TOOLS, TOOL_IDS, type Setup } from '../tools'

const START = '2026-10-22' // a Thursday
const dow = (d: string) => new Date(`${d}T12:00:00Z`).getUTCDay() // 0 = Sunday

const state = (weekly: number | null | undefined, extra: Partial<QuestState> = {}): QuestState => ({
  user: { id: 'u1', email: 'a@b.c', name: 'Sam Lee', image: null, startDate: START, lastSeen: START },
  startDate: START,
  progress: {},
  busy: [],
  checkins: [],
  activity: [],
  days: [],
  coachMessages: 0,
  files: [],
  profile: weekly === undefined ? null : { ...EMPTY_PROFILE, weekly_minutes: weekly },
  pro: { tasks: {}, hasToken: false, lastUsed: null },
  ...extra,
})

describe('sittingsPerWeek', () => {
  it.each([
    [null, 7],
    [undefined, 7],
    [0, 7],
    [60, 2],
    [61, 3],
    [180, 3],
    [181, 5],
    [300, 5],
    [301, 7],
    [480, 7],
  ])('%s minutes -> %s a week', (m, n) => {
    expect(sittingsPerWeek(m)).toBe(n)
  })
})

describe('isRestDay', () => {
  it('weekly 180: study on offsets 0, 2, 4; rest between; repeats weekly', () => {
    const s = state(180)
    for (const d of ['2026-10-22', '2026-10-24', '2026-10-26']) expect(isRestDay(s, d), d).toBe(false)
    for (const d of ['2026-10-23', '2026-10-25', '2026-10-27', '2026-10-28']) expect(isRestDay(s, d), d).toBe(true)
    expect(isRestDay(s, '2026-10-29')).toBe(false)
    expect(isRestDay(s, '2026-10-30')).toBe(true)
    expect(isRestDay(s, '2026-11-02')).toBe(false)
  })
  it('weekly null (and 0): never rest', () => {
    for (const w of [null, undefined, 0, 480]) {
      const s = state(w)
      for (let i = 0; i < 14; i++) expect(isRestDay(s, new Date(Date.UTC(2026, 9, 22 + i, 12)).toISOString().slice(0, 10))).toBe(false)
    }
  })
  it('does not throw for a day before the start date', () => {
    const s = state(180)
    expect(() => isRestDay(s, '2026-10-01')).not.toThrow()
    expect(typeof isRestDay(s, '2026-10-01')).toBe('boolean')
    expect(typeof isRestDay(s, '2020-01-01')).toBe('boolean')
  })
})

describe('buildSchedule with rest days', () => {
  it('weekly 60: every slot is on a study day (Thu or Sun from the 22nd)', () => {
    const slots = buildSchedule(state(60))
    expect(slots[0].date).toBe('2026-10-22')
    for (const sl of slots) expect([4, 0], sl.date).toContain(dow(sl.date))
    expect(slots[1].date).toBe('2026-10-25')
    const dates = slots.map((x) => x.date)
    expect([...dates].sort()).toEqual(dates)
    expect(new Set(dates).size).toBe(dates.length)
  })
  it('weekly null: slot dates are consecutive days', () => {
    const slots = buildSchedule(state(null))
    expect(slots[0].date).toBe(START)
    for (let i = 1; i < slots.length; i++) {
      const gap = (Date.parse(`${slots[i].date}T12:00:00Z`) - Date.parse(`${slots[i - 1].date}T12:00:00Z`)) / 86_400_000
      expect(gap, `slot ${i}`).toBe(1)
    }
  })
  it('busy days still push slots back, and combine with rest days', () => {
    const base = buildSchedule(state(null))
    const pushed = buildSchedule(state(null, { busy: ['2026-10-23'] }))
    expect(pushed[1].date).toBe('2026-10-24')
    expect(pushed.length).toBe(base.length)
    // weekly 60 studies Thu 22 and Sun 25; Sun 25 busy, 26-28 rest, so the next study day is Thu 29
    const both = buildSchedule(state(60, { busy: ['2026-10-25'] }))
    expect(both.slice(0, 3).map((x) => x.date)).toEqual(['2026-10-22', '2026-10-29', '2026-11-01'])
  })
})

describe('currentStreak with rest days', () => {
  const days = ['2026-10-22', '2026-10-24', '2026-10-26'].map((d) => `${d}T12:00:00`)
  it('weekly 180: rest days shield the streak (3 on a rest day)', () => {
    expect(currentStreak(state(180, { days }), '2026-10-27')).toBe(3)
  })
  it('weekly null: a gap day breaks it', () => {
    expect(currentStreak(state(null, { days }), '2026-10-27')).toBe(1)
  })
})

describe('paceOf and summarize restToday', () => {
  it('defaults restToday to false and passes it through', () => {
    const slots = buildSchedule(state(180))
    expect(paceOf(slots, START, []).restToday).toBe(false)
    expect(paceOf(slots, START, [], true).restToday).toBe(true)
  })
  it('summarize(...).pace.restToday matches isRestDay', () => {
    const s = state(180)
    for (const d of ['2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25']) expect(summarize(s, d).pace.restToday, d).toBe(isRestDay(s, d))
    expect(summarize(state(null), '2026-10-23').pace.restToday).toBe(false)
  })
})

describe('learn links', () => {
  const t0 = QUESTS.find((q) => q.id === 't0')!
  const setupOf = (tool: Setup['tool']): Setup => ({ tool, os: '' })

  it.each(['kilo', 'opencode', 'claude-code'] as const)("t0 for %s includes that agent's start link", (tool) => {
    const setup = setupOf(tool)
    const start = TOOLS[tool].start
    expect(start, tool).toBeDefined()
    const links = learnLinksFor(variantOf(t0, undefined, setup).tools, setup)
    expect(links.some((l) => l.url === start!.url)).toBe(true)
  })

  it.each(['kilo', 'opencode', 'claude-code'] as const)('the raw {tool} chip maps to the %s start link', (tool) => {
    expect(learnLinksFor(['{tool}'], setupOf(tool))).toEqual([TOOLS[tool].start])
  })

  it('dedupes by URL', () => {
    const links = learnLinksFor(['After Effects', 'ExtendScript', '{tool}', '{tool}', 'Blender'], setupOf('opencode'))
    const urls = links.map((l) => l.url)
    expect(new Set(urls).size).toBe(urls.length)
    expect(urls.filter((u) => u === 'https://ae-scripting.docsforadobe.dev/')).toHaveLength(1)
  })

  it('every LEARN key is a chip that appears in some quest variant', () => {
    const chips = new Set(QUESTS.flatMap((q) => q.variants.flatMap((v) => v.tools)))
    for (const key of Object.keys(LEARN)) expect(chips.has(key), `LEARN key "${key}"`).toBe(true)
  })

  it('every LEARN url and Tool.start.url is https', () => {
    for (const [k, links] of Object.entries(LEARN)) {
      for (const l of links) {
        expect(l.url, k).toMatch(/^https:\/\//)
        expect(l.label.trim().length, k).toBeGreaterThan(0)
      }
    }
    for (const id of TOOL_IDS) if (TOOLS[id].start) expect(TOOLS[id].start!.url, id).toMatch(/^https:\/\//)
  })

  it("every tool except 'other' has a start link", () => {
    for (const id of TOOL_IDS) {
      if (id === 'other') continue
      expect(TOOLS[id].start, id).toBeDefined()
      expect(TOOLS[id].start!.label.trim().length, id).toBeGreaterThan(0)
    }
  })

  it('t6 alt-b links include one noted as community', () => {
    const t6 = QUESTS.find((q) => q.id === 't6')!
    const setup = setupOf('kilo')
    const links = learnLinksFor(variantOf(t6, 'alt-b', setup).tools, setup)
    expect(links.some((l) => /community/i.test(l.note ?? ''))).toBe(true)
  })
})

describe('diagramFor', () => {
  it('maps ids to diagrams', () => {
    expect(diagramFor('t0')).toBe('loop')
    expect(diagramFor('t3')).toBe('context')
    expect(diagramFor('p3')).toBe('mcp')
    expect(diagramFor('p5')).toBe('delegate')
    expect(diagramFor('p7')).toBe('team')
    expect(diagramFor('t5')).toBeNull()
  })
})

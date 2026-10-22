import { describe, expect, it } from 'vitest'
import { QUESTS } from '../quest'
import { FREE_STARTS, OS_IDS, TOOLS, TOOL_IDS, forTool, toolOf, type Os, type Setup, type Tool } from '../tools'

const OSES: (Os | '')[] = ['', ...OS_IDS]
const SETUPS: Setup[] = TOOL_IDS.flatMap((tool) => OSES.map((os) => ({ tool, os })))

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Naive reference: split on the slot pattern and look each slot up in a table built from the Tool fields. */
function reference(text: string, setup: Setup): string {
  const t: Tool = TOOLS[setup.tool]
  const table: Record<string, string> = {
    tool: t.name,
    app: t.app,
    plan: t.plan,
    Plan: cap(t.plan),
    planHow: t.planHow,
    mention: t.mention,
    Mention: cap(t.mention),
    undo: t.undo,
    rules: t.rules,
    newChat: t.newChat,
    install: (setup.os && t.installOn?.[setup.os]) || t.install,
    open: t.open,
    ready: t.ready,
    tip1: t.tips[0],
    tip2: t.tips[1],
    setup1: t.setup[0],
    setup2: t.setup[1],
    setup3: t.setup[2],
    setup4: t.setup[3],
  }
  return text
    .split(/\{(\w+)\}/)
    .map((part, i) => (i % 2 === 0 ? part : (table[part] ?? `{${part}}`)))
    .join('')
}

const questStrings = (): string[] => {
  const out: string[] = []
  for (const q of QUESTS)
    for (const v of q.variants) {
      out.push(v.title, v.tagline, ...v.tools, ...v.make, v.expected, ...v.tips, v.concept.name, v.concept.body, v.learning)
      if (v.stretch) out.push(v.stretch)
      if (v.concept.experiment) out.push(v.concept.experiment)
      for (const s of v.sittings) out.push(s.title, ...s.steps)
    }
  return out
}

const HANDMADE = [
  '',
  'plain text',
  '{tool}',
  'Use {tool} in {app}. {Plan} first: {planHow}.',
  '{Mention} a file, then {mention} another. {Plan} and {plan}.',
  '{undo} {rules} {newChat}',
  '{install} / {open} / {ready}',
  '{tip1} {tip2}',
  '{setup1}|{setup2}|{setup3}|{setup4}',
  'unknown {nope} and {tool} together',
  '{{tool}}',
  '{ tool }',
]

describe('forTool', () => {
  it('matches the naive reference on handmade strings for every tool and os', () => {
    for (const setup of SETUPS) for (const s of HANDMADE) expect(forTool(s, setup), `${setup.tool}/${setup.os}: ${s}`).toBe(reference(s, setup))
  })

  it('matches the naive reference on every quest string for every tool and os', () => {
    const strings = questStrings()
    expect(strings.length).toBeGreaterThan(100)
    for (const setup of SETUPS) for (const s of strings) expect(forTool(s, setup), `${setup.tool}/${setup.os}: ${s}`).toBe(reference(s, setup))
  })

  it('leaves an unknown slot as written', () => {
    expect(forTool('hello {nope} world', { tool: 'opencode', os: '' })).toBe('hello {nope} world')
  })

  it('returns text without "{" unchanged', () => {
    expect(forTool('no slots here', { tool: 'cursor', os: 'mac' })).toBe('no slots here')
  })

  it('capitalises {Plan} and {Mention}', () => {
    for (const id of TOOL_IDS) {
      const t = TOOLS[id]
      expect(forTool('{Plan}', { tool: id, os: '' })).toBe(cap(t.plan))
      expect(forTool('{Mention}', { tool: id, os: '' })).toBe(cap(t.mention))
      expect(forTool('{plan}', { tool: id, os: '' })).toBe(t.plan)
    }
  })

  it('uses installOn[os] when present, else install', () => {
    for (const id of TOOL_IDS) {
      const t = TOOLS[id]
      for (const os of OSES) {
        const want = (os && t.installOn?.[os]) || t.install
        expect(forTool('{install}', { tool: id, os })).toBe(want)
      }
    }
  })

  it('defaults to the Kilo Code wording', () => {
    expect(forTool('{tool}')).toBe('Kilo Code')
  })
})

describe('TOOLS data quality', () => {
  const nonEmpty = ['name', 'app', 'kind', 'price', 'install', 'open', 'ready', 'plan', 'planHow', 'mention', 'undo', 'rules', 'newChat', 'docs'] as const

  it('has an entry for every TOOL_ID', () => {
    expect(Object.keys(TOOLS).sort()).toEqual([...TOOL_IDS].sort())
  })

  for (const id of TOOL_IDS) {
    describe(id, () => {
      const t = TOOLS[id]

      it('has a matching id, 4 setup steps and 2 tips', () => {
        expect(t.id).toBe(id)
        expect(t.setup).toHaveLength(4)
        expect(t.tips).toHaveLength(2)
      })

      it('has non-empty text fields', () => {
        for (const k of nonEmpty) expect(typeof t[k] === 'string' && t[k].trim().length > 0, `${id}.${k}`).toBe(true)
        for (const s of t.setup) expect(s.trim().length, `${id}.setup`).toBeGreaterThan(0)
        for (const s of t.tips) expect(s.trim().length, `${id}.tips`).toBeGreaterThan(0)
      })

      it('has 5 to 7 cheat rows with text', () => {
        expect(t.cheats.length).toBeGreaterThanOrEqual(5)
        expect(t.cheats.length).toBeLessThanOrEqual(7)
        for (const c of t.cheats) {
          expect(c.k.trim().length, `${id}.cheats.k`).toBeGreaterThan(0)
          expect(c.v.trim().length, `${id}.cheats.v`).toBeGreaterThan(0)
        }
      })

      it('has https sources and a YYYY-MM-DD checked date', () => {
        expect(t.sources.length).toBeGreaterThan(0)
        for (const s of t.sources) expect(s.startsWith('https://'), `${id} source ${s}`).toBe(true)
        expect(t.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      })

      if (id !== 'kilo') {
        it('has no em-dash in any field', () => {
          const bad: string[] = []
          const walk = (v: unknown, path: string) => {
            if (typeof v === 'string') {
              if (v.includes('—')) bad.push(`${id}.${path}: ${v}`)
            } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`))
            else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`)
          }
          walk(t, '')
          expect(bad).toEqual([])
        })
      }
    })
  }
})

describe('FREE_STARTS and toolOf', () => {
  it('FREE_STARTS are real tools marked free', () => {
    expect(FREE_STARTS.length).toBeGreaterThan(0)
    for (const id of FREE_STARTS) {
      expect(TOOL_IDS).toContain(id)
      expect(TOOLS[id].free).toBe(true)
    }
  })

  it('toolOf falls back to kilo for unknown or blank ids', () => {
    for (const bad of ['nope', '', null, undefined]) expect(toolOf(bad).id).toBe('kilo')
  })

  it('toolOf returns the matching tool for a real id', () => {
    for (const id of TOOL_IDS) expect(toolOf(id)).toBe(TOOLS[id])
  })
})

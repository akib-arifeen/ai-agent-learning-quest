import { describe, expect, it } from 'vitest'
import { FREE_TIER_HABITS, QUESTS, WHEN_STUCK, variantOf, type Variant } from '../quest'
import { OS_IDS, TOOL_IDS, forTool, type Os, type Setup } from '../tools'

const OSES: (Os | '')[] = ['', ...OS_IDS]
const SETUPS: Setup[] = TOOL_IDS.flatMap((tool) => OSES.map((os) => ({ tool, os })))

const strings = (v: Variant): string[] => {
  const out = [v.title, v.tagline, ...v.tools, ...v.make, v.expected, ...v.tips, v.concept.name, v.concept.body, v.learning]
  if (v.stretch) out.push(v.stretch)
  if (v.concept.experiment) out.push(v.concept.experiment)
  for (const s of v.sittings) out.push(s.title, ...s.steps)
  return out
}

const shape = (v: Variant) => v.sittings.map((s) => s.steps.length)

describe('rendered quests', () => {
  it('leave no braces in any string, for every tool x os x quest x variant', () => {
    const bad: string[] = []
    for (const setup of SETUPS)
      for (const q of QUESTS)
        for (const v of q.variants)
          for (const s of strings(variantOf(q, v.id, setup))) if (/[{}]/.test(s)) bad.push(`${setup.tool}/${setup.os} ${q.id}/${v.id}: ${s}`)
    expect(bad).toEqual([])
  })

  it('leave no braces in FREE_TIER_HABITS or WHEN_STUCK for any setup', () => {
    const bad: string[] = []
    for (const setup of SETUPS) for (const s of [...FREE_TIER_HABITS, ...WHEN_STUCK]) if (/[{}]/.test(forTool(s, setup))) bad.push(`${setup.tool}/${setup.os}: ${s}`)
    expect(bad).toEqual([])
  })

  it('keep the same sittings and step counts across tools', () => {
    for (const q of QUESTS)
      for (const v of q.variants) {
        const base = shape(variantOf(q, v.id))
        for (const setup of SETUPS) expect(shape(variantOf(q, v.id, setup)), `${setup.tool}/${setup.os} ${q.id}/${v.id}`).toEqual(base)
      }
  })

  it('have no duplicate tool chips', () => {
    for (const setup of SETUPS)
      for (const q of QUESTS)
        for (const v of q.variants) {
          const tools = variantOf(q, v.id, setup).tools
          expect(new Set(tools).size, `${setup.tool} ${q.id}/${v.id}: ${tools.join(', ')}`).toBe(tools.length)
        }
  })
})

describe('variantOf', () => {
  it('defaults to the Kilo wording', () => {
    for (const q of QUESTS)
      for (const v of q.variants) expect(variantOf(q, v.id)).toEqual(variantOf(q, v.id, { tool: 'kilo', os: '' }))
  })

  it('returns the same object for the same arguments', () => {
    for (const q of QUESTS) {
      expect(variantOf(q, 'main', { tool: 'opencode', os: 'mac' })).toBe(variantOf(q, 'main', { tool: 'opencode', os: 'mac' }))
      expect(variantOf(q)).toBe(variantOf(q))
    }
  })

  it('returns a different object for a different tool', () => {
    for (const q of QUESTS) expect(variantOf(q, 'main', { tool: 'claude-code', os: '' })).not.toBe(variantOf(q, 'main', { tool: 'kilo', os: '' }))
  })

  it('falls back to the first variant for an unknown id', () => {
    for (const q of QUESTS) {
      expect(variantOf(q, 'nope')).toBe(variantOf(q, q.variants[0].id))
      expect(variantOf(q, undefined).id).toBe(q.variants[0].id)
    }
  })
})

describe('Base Camp (t0)', () => {
  const t0 = QUESTS.find((q) => q.id === 't0')!
  const text = (setup: Setup) => strings(variantOf(t0, 'main', setup)).join('\n')

  it('exists', () => expect(t0).toBeDefined())

  it('names Kilo Code for kilo', () => expect(text({ tool: 'kilo', os: '' })).toContain('Kilo Code'))

  it('names OpenCode and not Kilo for opencode', () => {
    const t = text({ tool: 'opencode', os: '' })
    expect(t).toContain('OpenCode')
    expect(t).not.toContain('Kilo')
  })

  it('names Claude Code for claude-code', () => expect(text({ tool: 'claude-code', os: '' })).toContain('Claude Code'))
})

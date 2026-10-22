import { describe, expect, it } from 'vitest'
import { QUESTS, variantOf } from '../quest'
import { FREE_STARTS, toolOf, type Os, type ToolId } from '../tools'

const baseCamp = QUESTS.find((q) => q.id === 't0')!

describe('variantOf is keyed by OS', () => {
  it('renders different install lines per OS, in any call order', () => {
    const make = (os: Os) => variantOf(baseCamp, 'main', { tool: 'opencode', os }).make[0]
    const mac1 = make('mac')
    const win = make('windows')
    const mac2 = make('mac')
    expect(mac1).not.toBe(win)
    expect(mac1).toContain('curl -fsSL https://opencode.ai/install | bash')
    expect(win).toContain('opencode.ai/download')
    expect(mac2).toBe(mac1)
  })
})

describe('install commands match the official sources', () => {
  const cases: [ToolId, Os, string][] = [
    ['opencode', 'mac', 'curl -fsSL https://opencode.ai/install | bash'],
    ['opencode', 'linux', 'curl -fsSL https://opencode.ai/install | bash'],
    ['claude-code', 'mac', 'curl -fsSL https://claude.ai/install.sh | bash'],
    ['claude-code', 'linux', 'curl -fsSL https://claude.ai/install.sh | bash'],
    ['claude-code', 'windows', 'irm https://claude.ai/install.ps1 | iex'],
    ['antigravity', 'mac', 'curl -fsSL https://antigravity.google/cli/install.sh | bash'],
    ['antigravity', 'linux', 'curl -fsSL https://antigravity.google/cli/install.sh | bash'],
    ['antigravity', 'windows', 'irm https://antigravity.google/cli/install.ps1 | iex'],
    ['codex', 'mac', 'curl -fsSL https://chatgpt.com/codex/install.sh | sh'],
    ['codex', 'linux', 'curl -fsSL https://chatgpt.com/codex/install.sh | sh'],
    ['codex', 'windows', 'irm https://chatgpt.com/codex/install.ps1 | iex'],
    ['gemini-cli', 'mac', 'npm install -g @google/gemini-cli'],
    ['gemini-cli', 'windows', 'npm install -g @google/gemini-cli'],
    ['windsurf', 'mac', 'devin.ai/download'],
    ['cursor', 'mac', 'cursor.com/download'],
    ['kilo', 'mac', 'VS Code'],
    ['cline', 'mac', 'VS Code'],
    ['copilot', 'mac', 'VS Code'],
  ]
  it.each(cases)('%s on %s contains %s', (id, os, expected) => {
    const t = toolOf(id)
    expect(t.installOn?.[os] ?? t.install).toContain(expected)
  })
})

describe('prices that matter stay honest', () => {
  it('keeps free flags and the Claude Code price', () => {
    expect(toolOf('claude-code').free).toBe(false)
    expect(toolOf('claude-code').price).toContain('$20')
    expect(toolOf('codex').free).toBe(false)
    expect(toolOf('opencode').free).toBe(true)
    expect(toolOf('kilo').free).toBe(true)
    expect(FREE_STARTS).toEqual(['kilo', 'opencode'])
  })
})

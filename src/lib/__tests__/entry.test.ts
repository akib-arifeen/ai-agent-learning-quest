import { describe, expect, it } from 'vitest'
import { entryFor, gateFor, normalizePath } from '../entry'

describe('entryFor', () => {
  it('keeps the marketing landing only at the root', () => {
    expect(entryFor('/')).toBe('home')
  })

  it('keeps the policy pages and the public MCP guide public', () => {
    for (const p of ['/privacy', '/terms', '/mcp']) expect(entryFor(p)).toBe('public')
  })

  it('gates deep links into the app', () => {
    for (const p of ['/guide', '/pro', '/pro/connect', '/pro/p1', '/profile', '/schedule', '/trophies', '/mentor', '/quest/t1']) {
      expect(entryFor(p), p).toBe('gate')
    }
  })

  it('sends unknown paths to the real not-found page', () => {
    for (const p of ['/nope', '/unknown/deep', '/pro/nope/extra', '/guide/extra', '/privacyy', '/quest']) {
      expect(entryFor(p), p).toBe('notfound')
    }
  })

  it('normalizes trailing slashes and query strings', () => {
    expect(normalizePath('/')).toBe('/')
    expect(normalizePath('/pro/')).toBe('/pro')
    expect(entryFor('/guide/')).toBe('gate')
    expect(entryFor('/?utm=x')).toBe('home')
  })
})

describe('gateFor', () => {
  it('words the gate for the page the learner asked for and keeps that path', () => {
    expect(gateFor('/guide')).toMatchObject({ path: '/guide', title: 'Sign in to open the guide', nextLabel: 'Sign in and open the guide' })
    expect(gateFor('/pro')).toMatchObject({ path: '/pro', title: 'Sign in to start the pro track' })
    expect(gateFor('/pro/connect').title).toBe('Sign in to open this level')
    expect(gateFor('/pro/p1').title).toBe('Sign in to open this level')
    expect(gateFor('/quest/t1').title).toBe('Sign in to open this quest')
    expect(gateFor('/profile').title).toBe('Sign in to keep going')
  })

  it('keeps the destination when the path had a trailing slash', () => {
    expect(gateFor('/guide/').path).toBe('/guide')
  })

  it('never names pro-level content', () => {
    for (const p of ['/guide', '/pro', '/pro/connect', '/pro/p1', '/profile']) {
      const text = Object.values(gateFor(p)).join(' ')
      expect(text, p).not.toMatch(/Plan before you build|rules file|subagents|Ship it safely|MCP server/i)
    }
  })
})

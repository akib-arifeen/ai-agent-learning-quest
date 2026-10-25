import { describe, expect, it } from 'vitest'
import { phaseFor } from '@/components/SignIn'
import { gateFor } from '@/lib/entry'

const guide = gateFor('/guide')

describe('sign-in phase for a gate', () => {
  it('opens the card directly when a gate is present', () => {
    expect(phaseFor(guide, 'hero')).toBe('auth')
    expect(phaseFor(guide, 'takeover')).toBe('takeover')
    expect(phaseFor(guide, 'auth')).toBe('auth')
  })

  it('drops back to the landing when the gate clears', () => {
    // Back to "/" keeps the provider mounted, so the card must not stay over the marketing page.
    expect(phaseFor(undefined, 'auth')).toBe('hero')
    expect(phaseFor(undefined, 'takeover')).toBe('hero')
    expect(phaseFor(undefined, 'hero')).toBe('hero')
  })
})

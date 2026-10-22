import { describe, expect, it } from 'vitest'
import { badgesOf, type QuestState } from '@/lib/game'

const state = (pro: QuestState['pro']): QuestState => ({
  user: {
    id: 'u1',
    email: 'a@b.c',
    name: 'Sam Lee',
    image: null,
    startDate: '2026-01-05',
    lastSeen: '2026-01-05',
  },
  startDate: '2026-01-05',
  progress: {},
  busy: [],
  checkins: [],
  activity: [],
  days: [],
  cheers: [],
  coachMessages: 0,
  files: [],
  profile: null,
  pro,
})

const earned = (s: QuestState, id: string) => badgesOf(s, '2026-01-06').find((b) => b.id === id)?.earned

describe('plugged-in badge', () => {
  it('is earned when the agent has connected, even with zero attempts', () => {
    expect(earned(state({ tasks: {}, hasToken: true, lastUsed: '2026-01-05T10:00:00Z' }), 'plugged-in')).toBe(true)
  })
  it('is not earned with attempts but no connection (lastUsed null)', () => {
    expect(
      earned(
        state({
          tasks: { p1: { passed: false, at: null, attempts: 2 } },
          hasToken: true,
          lastUsed: null,
        }),
        'plugged-in',
      ),
    ).toBe(false)
  })
  it('is not earned with nothing at all', () => {
    expect(earned(state({ tasks: {}, hasToken: false, lastUsed: null }), 'plugged-in')).toBe(false)
  })
})

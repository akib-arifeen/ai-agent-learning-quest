import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

const jar = vi.hoisted(() => ({
  value: undefined as string | undefined,
  sets: [] as string[],
  deletes: 0,
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.value === undefined ? undefined : { name, value: jar.value }),
    set: (name: string, value: string) => {
      jar.value = value
      jar.sets.push(value)
    },
    delete: () => {
      jar.value = undefined
      jar.deletes++
    },
  }),
}))

const db = vi.hoisted(() => ({ getSessionVersion: vi.fn<(userId: string) => Promise<number | null>>() }))
vi.mock('@/lib/db', () => ({ getSessionVersion: db.getSessionVersion }))

import { me } from '../http'
import { endSession, readSession, startSession } from '../session'

const user = (sv?: number) => ({
  id: 'u1',
  email: 'sam@example.com',
  name: 'Sam Lee',
  image: null,
  verified: true,
  ...(sv === undefined ? {} : { sv }),
})

const cookieBody = (value: string) => JSON.parse(Buffer.from(value.split('.')[0], 'base64url').toString())

beforeEach(() => {
  vi.clearAllMocks()
  jar.value = undefined
  jar.sets.length = 0
  jar.deletes = 0
  db.getSessionVersion.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('versioned session cookies', () => {
  it('writes sv into the signed cookie and reads it back', async () => {
    await startSession(user(7))
    expect(jar.sets).toHaveLength(1)
    expect(cookieBody(jar.sets[0]).sv).toBe(7)
    expect((await readSession())?.sv).toBe(7)
  })

  it('accepts a matching current version', async () => {
    await startSession(user(7))
    db.getSessionVersion.mockResolvedValue(7)
    expect(await me()).toMatchObject({ id: 'u1', sv: 7 })
  })

  it('rejects a stale version (for example after a password reset)', async () => {
    await startSession(user(7))
    db.getSessionVersion.mockResolvedValue(8)
    expect(await me()).toBeNull()
  })

  it('rejects a cookie whose account row is gone', async () => {
    await startSession(user(7))
    db.getSessionVersion.mockResolvedValue(null)
    expect(await me()).toBeNull()
  })

  it('rejects malformed, tampered and unsigned cookies', async () => {
    jar.value = 'not-a-cookie'
    expect(await readSession()).toBeNull()
    expect(await me()).toBeNull()

    await startSession(user(1))
    const good = jar.value!
    jar.value = `${good.slice(0, -1)}x`
    expect(await readSession()).toBeNull()
    expect(await me()).toBeNull()
  })

  it('accepts a legacy cookie without sv while the account is at version 0', async () => {
    await startSession(user())
    db.getSessionVersion.mockResolvedValue(0)
    expect(await me()).toMatchObject({ id: 'u1', sv: 0 })
  })

  it('rolls a week-old cookie forward with the current sv', async () => {
    const now = Date.now()
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now)
    await startSession(user(4))
    db.getSessionVersion.mockResolvedValue(4)

    clock.mockReturnValue(now + 8 * 24 * 60 * 60 * 1000)
    const fresh = await me(true)

    expect(fresh).toMatchObject({ id: 'u1', sv: 4 })
    expect(jar.sets).toHaveLength(2)
    expect(cookieBody(jar.sets[1]).sv).toBe(4)
    expect((await readSession())?.sv).toBe(4)
  })

  it('upgrades a legacy cookie to sv 0 when the state route rolls it', async () => {
    await startSession(user())
    db.getSessionVersion.mockResolvedValue(0)
    await me(true)
    expect(jar.sets).toHaveLength(2)
    expect(cookieBody(jar.sets[1]).sv).toBe(0)
  })

  it('clears the cookie on sign-out', async () => {
    await startSession(user(1))
    await endSession()
    expect(jar.deletes).toBe(1)
    expect(await readSession()).toBeNull()
  })
})

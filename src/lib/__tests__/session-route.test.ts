import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined, set: () => undefined, delete: () => undefined }),
}))

const db = vi.hoisted(() => ({
  createPassword: vi.fn<(email: string, hash: string) => Promise<boolean>>(),
  deleteOtp: vi.fn<(email: string) => Promise<void>>(),
  getLearner: vi.fn(),
  getPasswordHash: vi.fn(),
  getSessionVersion: vi.fn<(userId: string) => Promise<number | null>>(),
  saveOtp: vi.fn(),
  takeOtpAttempt: vi.fn(),
  touchUser: vi.fn(),
  // Same calendar-day rule as db.ts (kept local so the test never opens a DB client).
  isDay: (s: unknown): s is string => {
    if (typeof s !== 'string' || !/^20[2-9]\d-\d{2}-\d{2}$/.test(s)) return false
    const t = new Date(`${s}T00:00:00Z`)
    return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === s
  },
}))
vi.mock('@/lib/db', () => db)

const session = vi.hoisted(() => ({
  startSession: vi.fn<(user: unknown) => Promise<void>>(async () => undefined),
  hashPassword: vi.fn<(password: string) => string>(() => 'hashed-password'),
}))
vi.mock('@/lib/session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/session')>()
  return { ...actual, startSession: session.startSession, hashPassword: session.hashPassword }
})

vi.mock('@/lib/mail', () => ({
  otpEnabled: () => true,
  sendCode: vi.fn(async () => undefined),
}))

import { POST } from '@/app/api/session/route'

const post = (body: Record<string, unknown>, ip: string) =>
  POST(
    new Request('http://localhost/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify(body),
    }),
  )

let ipSeq = 0
const nextIp = () => `203.0.113.${++ipSeq}`

beforeEach(() => {
  vi.clearAllMocks()
  db.createPassword.mockResolvedValue(true)
  db.getSessionVersion.mockResolvedValue(7)
  db.touchUser.mockImplementation(async (u: Record<string, unknown>) => ({
    ...u,
    startDate: '2026-10-22',
    lastSeen: '2026-10-22T00:00:00Z',
  }))
  session.hashPassword.mockReturnValue('hashed-password')
  session.startSession.mockResolvedValue(undefined)
})

const signup = (today: unknown) =>
  post({ mode: 'signup', name: 'Sam', email: 'sam@example.com', password: 'secret', today }, nextIp())

describe('POST /api/session local day', () => {
  it('passes a valid browser local day to touchUser and signs the current version', async () => {
    const res = await signup('2026-10-22')
    expect(res.status).toBe(200)
    expect(db.touchUser).toHaveBeenCalledTimes(1)
    const [user, today] = db.touchUser.mock.calls[0] as [Record<string, unknown>, string | undefined]
    expect(user).toMatchObject({ email: 'sam@example.com', verified: false })
    expect(today).toBe('2026-10-22')
    expect(session.startSession).toHaveBeenCalledWith(expect.objectContaining({ id: user.id, sv: 7 }))
  })

  it('ignores an invalid local day instead of pinning a bad start date', async () => {
    const res = await signup('2026-02-31')
    expect(res.status).toBe(200)
    expect(db.touchUser).toHaveBeenCalledTimes(1)
    expect((db.touchUser.mock.calls[0] as unknown[])[1]).toBeUndefined()
  })
})

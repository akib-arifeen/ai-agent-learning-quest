import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined, set: () => undefined, delete: () => undefined }),
}))

const db = vi.hoisted(() => ({
  getPasswordHash: vi.fn<(email: string) => Promise<string | null>>(),
  saveRecoveryCode: vi.fn<(email: string, hash: string) => Promise<void>>(),
  takeRecoveryAttempt: vi.fn<(email: string) => Promise<{ codeHash: string } | null>>(),
  issueRecoveryToken: vi.fn<(email: string, hash: string) => Promise<boolean>>(),
  resetPasswordWithToken: vi.fn<(email: string, tokenHash: string, passwordHash: string, userIds: string[]) => Promise<boolean>>(),
  claimRecoveryToken: vi.fn<(email: string, hash: string) => Promise<boolean>>(),
  deleteOtp: vi.fn<(email: string) => Promise<void>>(),
  bumpSessionVersion: vi.fn<(userId: string) => Promise<number | null>>(),
  deleteRecovery: vi.fn<(email: string) => Promise<void>>(),
  createPassword: vi.fn(),
  touchUser: vi.fn(),
}))
vi.mock('@/lib/db', () => db)

const mail = vi.hoisted(() => ({
  sendRecoveryCode: vi.fn<(to: string, code: string) => Promise<void>>(async () => undefined),
}))
vi.mock('@/lib/mail', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/mail')>()
  return { ...actual, sendRecoveryCode: mail.sendRecoveryCode }
})

const sessionMocks = vi.hoisted(() => ({ hashPassword: vi.fn(() => 'scrypt$test$hash') }))
vi.mock('@/lib/session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/session')>()
  return { ...actual, hashPassword: sessionMocks.hashPassword }
})

import { POST } from '@/app/api/recovery/route'
import { otpEnabled } from '@/lib/mail'
import { hashRecoveryCode, hashRecoveryToken, newRecoveryToken, sameHash, RECOVERY_CODE_TTL_MIN, RECOVERY_TOKEN_TTL_MIN } from '@/lib/recovery'
import { idForEmail, idForPasswordEmail } from '@/lib/session'

const UNAVAILABLE = 'Password recovery by email isn’t available on this site yet. If you signed up with Google, use Google sign-in.'
const GENERIC = 'That code doesn’t match or has expired.'

let emailSeq = 0
let ipSeq = 0
const emailFor = (label: string) => `${label}-${++emailSeq}@example.com`
const ipFor = () => `198.51.100.${++ipSeq}`

const post = (body: Record<string, unknown>, ip = ipFor()) =>
  POST(
    new Request('http://localhost/api/recovery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify(body),
    }),
  )

beforeEach(() => {
  vi.clearAllMocks()
  db.getPasswordHash.mockResolvedValue(null)
  db.saveRecoveryCode.mockResolvedValue(undefined)
  db.takeRecoveryAttempt.mockResolvedValue(null)
  db.issueRecoveryToken.mockResolvedValue(false)
  db.resetPasswordWithToken.mockResolvedValue(false)
  db.claimRecoveryToken.mockResolvedValue(false)
  db.deleteOtp.mockResolvedValue(undefined)
  db.bumpSessionVersion.mockResolvedValue(1)
  db.deleteRecovery.mockResolvedValue(undefined)
  mail.sendRecoveryCode.mockResolvedValue(undefined)
  sessionMocks.hashPassword.mockReturnValue('scrypt$test$hash')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('POST /api/recovery request', () => {
  it('returns the same 200 body for unknown and known addresses', async () => {
    const known = emailFor('known')
    const unknown = emailFor('unknown')
    db.getPasswordHash.mockImplementation(async (email) => (email === known ? 'stored-hash' : null))

    const a = await post({ action: 'request', email: unknown })
    const b = await post({ action: 'request', email: known })

    expect(a.status).toBe(200)
    expect(b.status).toBe(200)
    expect(await a.json()).toEqual({ ok: true })
    expect(await b.json()).toEqual({ ok: true })

    // Only the known address stores and sends anything.
    expect(db.saveRecoveryCode).toHaveBeenCalledTimes(1)
    expect(mail.sendRecoveryCode).toHaveBeenCalledTimes(1)
    expect(db.saveRecoveryCode.mock.calls[0][0]).toBe(known)
    const code = mail.sendRecoveryCode.mock.calls[0][1]
    expect(code).toMatch(/^\d{6}$/)
    expect(db.saveRecoveryCode.mock.calls[0][1]).toBe(hashRecoveryCode(known, code))
    expect(db.createPassword).not.toHaveBeenCalled()
    expect(db.touchUser).not.toHaveBeenCalled()
  })

  it('never creates an account or password row for an unknown address', async () => {
    const res = await post({ action: 'request', email: emailFor('nobody') })
    expect(res.status).toBe(200)
    expect(db.getPasswordHash).toHaveBeenCalledTimes(1)
    expect(db.saveRecoveryCode).not.toHaveBeenCalled()
    expect(mail.sendRecoveryCode).not.toHaveBeenCalled()
    expect(db.createPassword).not.toHaveBeenCalled()
    expect(db.touchUser).not.toHaveBeenCalled()
  })

  it('returns 503 before any lookup when email delivery is off', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('SMTP_USER', '')
    vi.stubEnv('SMTP_PASS', '')
    expect(otpEnabled()).toBe(false)

    const res = await post({ action: 'request', email: emailFor('prod') })
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ error: UNAVAILABLE })
    expect(db.getPasswordHash).not.toHaveBeenCalled()
    expect(db.saveRecoveryCode).not.toHaveBeenCalled()
    expect(mail.sendRecoveryCode).not.toHaveBeenCalled()
  })

  it('rate limits repeated requests for one address', async () => {
    const email = emailFor('rate')
    const ip = ipFor()
    db.getPasswordHash.mockResolvedValue('stored-hash')
    for (let i = 0; i < 3; i++) expect((await post({ action: 'request', email }, ip)).status).toBe(200)
    const res = await post({ action: 'request', email }, ip)
    expect(res.status).toBe(429)
    expect(db.saveRecoveryCode).toHaveBeenCalledTimes(3)
    expect(mail.sendRecoveryCode).toHaveBeenCalledTimes(3)
  })
})

describe('POST /api/recovery verify', () => {
  it('returns a generic 401 for an expired or used code', async () => {
    db.takeRecoveryAttempt.mockResolvedValue(null)
    const res = await post({ action: 'verify', email: emailFor('expired'), code: '123456' })
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: GENERIC })
    expect(db.issueRecoveryToken).not.toHaveBeenCalled()
  })

  it('returns a generic 401 for a wrong code and stores nothing', async () => {
    const email = emailFor('wrong')
    db.takeRecoveryAttempt.mockResolvedValue({ codeHash: hashRecoveryCode(email, '123456') })
    const res = await post({ action: 'verify', email, code: '000000' })
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: GENERIC })
    expect(db.issueRecoveryToken).not.toHaveBeenCalled()
    expect(db.createPassword).not.toHaveBeenCalled()
    expect(db.touchUser).not.toHaveBeenCalled()
  })

  it('returns a single-use token and stores only its hash', async () => {
    const email = emailFor('verify')
    db.takeRecoveryAttempt.mockResolvedValue({ codeHash: hashRecoveryCode(email, '123456') })
    db.issueRecoveryToken.mockResolvedValue(true)

    const res = await post({ action: 'verify', email, code: '123456' })
    const body = (await res.json()) as { ok: boolean; token: string; expiresIn: number }

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.expiresIn).toBe(RECOVERY_TOKEN_TTL_MIN * 60)
    expect(body.token).toMatch(/^[A-Za-z0-9_-]{20,}$/)
    expect(Object.keys(body).sort()).toEqual(['expiresIn', 'ok', 'token'])
    expect(db.issueRecoveryToken).toHaveBeenCalledWith(email, hashRecoveryToken(body.token))
    expect(db.issueRecoveryToken.mock.calls[0][1]).not.toBe(body.token)
    expect(JSON.stringify(body)).not.toContain('123456')
    expect(db.createPassword).not.toHaveBeenCalled()
    expect(db.touchUser).not.toHaveBeenCalled()
  })
})

describe('POST /api/recovery reset', () => {
  it('rejects a bad or reused token generically through the atomic function', async () => {
    const email = emailFor('badtoken')
    const res = await post({ action: 'reset', email, token: 'raw-token', password: 'new-password' })
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: GENERIC })
    expect(db.resetPasswordWithToken).toHaveBeenCalledWith(
      email,
      hashRecoveryToken('raw-token'),
      'scrypt$test$hash',
      [idForPasswordEmail(email), idForEmail(email)],
    )
    // The old multi-step sequence must not run outside the transaction.
    expect(db.claimRecoveryToken).not.toHaveBeenCalled()
    expect(db.deleteOtp).not.toHaveBeenCalled()
    expect(db.bumpSessionVersion).not.toHaveBeenCalled()
    expect(db.deleteRecovery).not.toHaveBeenCalled()
  })

  it('rejects a short password before calling the atomic reset', async () => {
    const res = await post({ action: 'reset', email: emailFor('short'), token: 'raw-token', password: '12345' })
    expect(res.status).toBe(400)
    expect(db.resetPasswordWithToken).not.toHaveBeenCalled()
  })

  it('resets the password and revokes both identities in one atomic call', async () => {
    const email = emailFor('reset')
    db.resetPasswordWithToken.mockResolvedValue(true)

    const res = await post({ action: 'reset', email, token: 'raw-token', password: 'new-password' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })

    expect(db.resetPasswordWithToken).toHaveBeenCalledTimes(1)
    expect(db.resetPasswordWithToken).toHaveBeenCalledWith(
      email,
      hashRecoveryToken('raw-token'),
      'scrypt$test$hash',
      [idForPasswordEmail(email), idForEmail(email)],
    )
    expect(db.claimRecoveryToken).not.toHaveBeenCalled()
    expect(db.deleteOtp).not.toHaveBeenCalled()
    expect(db.bumpSessionVersion).not.toHaveBeenCalled()
    expect(db.deleteRecovery).not.toHaveBeenCalled()
    expect(db.createPassword).not.toHaveBeenCalled()
    expect(db.touchUser).not.toHaveBeenCalled()
  })
})

describe('recovery helpers', () => {
  it('keeps the code and token lifetimes', () => {
    expect(RECOVERY_CODE_TTL_MIN).toBe(10)
    expect(RECOVERY_TOKEN_TTL_MIN).toBe(15)
  })

  it('hashes codes deterministically after normalising the email', () => {
    expect(hashRecoveryCode(' Sam@Example.com ', '123456')).toBe(hashRecoveryCode('sam@example.com', '123456'))
    expect(hashRecoveryCode('sam@example.com', '123456')).not.toBe(hashRecoveryCode('sam@example.com', '123457'))
    expect(hashRecoveryCode('sam@example.com', '123456')).toMatch(/^[0-9a-f]{64}$/)
  })

  it('mints random, URL-safe tokens', () => {
    const tokens = new Set(Array.from({ length: 20 }, () => newRecoveryToken()))
    expect(tokens.size).toBe(20)
    for (const token of tokens) expect(token).toMatch(/^[A-Za-z0-9_-]{40,}$/)
  })

  it('compares hashes safely, including length and empty cases', () => {
    expect(sameHash('abc', 'abc')).toBe(true)
    expect(sameHash('abc', 'abd')).toBe(false)
    expect(sameHash('abc', 'abcd')).toBe(false)
    expect(sameHash('', '')).toBe(false)
  })
})

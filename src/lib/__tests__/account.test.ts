import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const http = vi.hoisted(() => ({
  me: vi.fn(),
  sameUser: vi.fn(),
  withinLimit: vi.fn(() => true),
  json: (data: unknown, status = 200) => Response.json(data, { status }),
  fail: (error: string, status = 400) => Response.json({ error }, { status }),
}))
vi.mock('@/lib/http', () => http)

const db = vi.hoisted(() => ({
  getPasswordHash: vi.fn<(email: string) => Promise<string | null>>(),
  listAccountBlobUrls: vi.fn<(userIds: string[]) => Promise<string[]>>(),
  deleteAccountData: vi.fn<(userIds: string[], email: string, emailAuth: 'all' | 'password') => Promise<void>>(),
}))
vi.mock('@/lib/db', () => db)

const auth = vi.hoisted(() => ({
  checkPassword: vi.fn<(password: string, stored: string) => boolean>(),
  endSession: vi.fn<() => Promise<void>>(async () => undefined),
  idForEmail: vi.fn((email: string) => `u_${email}`),
  idForPasswordEmail: vi.fn((email: string) => `p_${email}`),
}))
vi.mock('@/lib/session', () => auth)

const blob = vi.hoisted(() => ({
  del: vi.fn<(urls: string[], opts: { token?: string }) => Promise<void>>(),
  list: vi.fn<(opts: { prefix?: string; cursor?: string; token?: string }) => Promise<{ blobs: { url: string }[]; cursor?: string; hasMore: boolean }>>(),
}))
vi.mock('@vercel/blob', () => blob)

import { DELETE } from '@/app/api/account/route'

const BLOB_UNAVAILABLE = 'File storage cleanup isn’t available right now, so your account wasn’t deleted. Please try again later.'
const BLOB_ERROR = 'We couldn’t safely finish removing your uploaded files, so your account was not deleted. Some files may already be gone — please try again.'
const PARTIAL_ERROR = 'Your uploaded files were removed, but the rest of your account couldn’t be deleted. Your account is still active — please try again.'

const VERIFIED = { id: 'u1', email: 'sam@example.com', name: 'Sam Lee', image: null, verified: true }
const PASSWORD = { ...VERIFIED, id: 'p1', verified: false }

const request = (body: Record<string, unknown> = {}, who = 'u1') =>
  DELETE(
    new Request('http://localhost/api/account', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-quest-user': who },
      body: JSON.stringify(body),
    }),
  )

const emptyList = async () => ({ blobs: [], hasMore: false })

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'test-token')
  http.me.mockResolvedValue(VERIFIED)
  http.sameUser.mockReturnValue(true)
  http.withinLimit.mockReturnValue(true)
  db.getPasswordHash.mockResolvedValue('stored-hash')
  db.listAccountBlobUrls.mockResolvedValue([])
  db.deleteAccountData.mockResolvedValue(undefined)
  auth.checkPassword.mockReturnValue(true)
  auth.endSession.mockResolvedValue(undefined)
  blob.del.mockResolvedValue(undefined)
  blob.list.mockImplementation(emptyList)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('DELETE /api/account authorization', () => {
  it('rejects an unauthenticated caller', async () => {
    http.me.mockResolvedValue(null)
    const res = await request()
    expect(res.status).toBe(401)
    expect(db.listAccountBlobUrls).not.toHaveBeenCalled()
    expect(blob.list).not.toHaveBeenCalled()
    expect(blob.del).not.toHaveBeenCalled()
    expect(db.deleteAccountData).not.toHaveBeenCalled()
    expect(auth.endSession).not.toHaveBeenCalled()
  })

  it('rejects a stale tab for a different account', async () => {
    http.sameUser.mockReturnValue(false)
    const res = await request({ confirm: 'DELETE MY ACCOUNT' }, 'someone-else')
    expect(res.status).toBe(409)
    expect(db.deleteAccountData).not.toHaveBeenCalled()
    expect(auth.endSession).not.toHaveBeenCalled()
  })

  it('rate limits repeated deletion attempts', async () => {
    http.withinLimit.mockReturnValue(false)
    const res = await request({ confirm: 'DELETE MY ACCOUNT' })
    expect(res.status).toBe(429)
    expect(db.deleteAccountData).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/account confirmation', () => {
  it('requires the current password for password accounts', async () => {
    http.me.mockResolvedValue(PASSWORD)
    const res = await request({}, 'p1')
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'That password doesn’t match.' })
    expect(db.listAccountBlobUrls).not.toHaveBeenCalled()
    expect(blob.list).not.toHaveBeenCalled()
    expect(blob.del).not.toHaveBeenCalled()
    expect(db.deleteAccountData).not.toHaveBeenCalled()
    expect(auth.endSession).not.toHaveBeenCalled()
  })

  it('does not accept the typed phrase instead of a password', async () => {
    http.me.mockResolvedValue(PASSWORD)
    const res = await request({ confirm: 'DELETE MY ACCOUNT' }, 'p1')
    expect(res.status).toBe(403)
    expect(db.deleteAccountData).not.toHaveBeenCalled()
    expect(auth.endSession).not.toHaveBeenCalled()
  })

  it('rejects a wrong password without touching anything', async () => {
    http.me.mockResolvedValue(PASSWORD)
    auth.checkPassword.mockReturnValue(false)
    const res = await request({ password: 'wrong' }, 'p1')
    expect(res.status).toBe(403)
    expect(db.listAccountBlobUrls).not.toHaveBeenCalled()
    expect(db.deleteAccountData).not.toHaveBeenCalled()
    expect(auth.endSession).not.toHaveBeenCalled()
  })

  it('requires the exact phrase for verified accounts', async () => {
    for (const body of [{}, { confirm: 'delete my account' }, { confirm: 'DELETE MY ACCOUNT ' }, { password: 'secret' }]) {
      const res = await request(body)
      expect(res.status).toBe(400)
    }
    expect(db.listAccountBlobUrls).not.toHaveBeenCalled()
    expect(db.deleteAccountData).not.toHaveBeenCalled()
    expect(auth.endSession).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/account identity scope', () => {
  it('verified sessions delete both same-email identities', async () => {
    db.listAccountBlobUrls.mockResolvedValue(['https://blob.example/a'])
    const res = await request({ confirm: 'DELETE MY ACCOUNT' })
    expect(res.status).toBe(200)
    expect(db.listAccountBlobUrls).toHaveBeenCalledWith(['u1', 'u_sam@example.com', 'p_sam@example.com'])
    expect(db.deleteAccountData).toHaveBeenCalledWith(['u1', 'u_sam@example.com', 'p_sam@example.com'], 'sam@example.com', 'all')
    expect(blob.list.mock.calls.map(([opts]) => opts.prefix).sort()).toEqual([
      'quests/p_sam@example.com/',
      'quests/u1/',
      'quests/u_sam@example.com/',
    ])
  })

  it('unverified password sessions delete only their own p_ identity', async () => {
    http.me.mockResolvedValue(PASSWORD)
    db.listAccountBlobUrls.mockResolvedValue(['https://blob.example/p'])
    const res = await request({ password: 'correct' }, 'p1')
    expect(res.status).toBe(200)
    expect(auth.checkPassword).toHaveBeenCalledWith('correct', 'stored-hash')
    expect(db.listAccountBlobUrls).toHaveBeenCalledWith(['p1'])
    expect(db.listAccountBlobUrls).not.toHaveBeenCalledWith(['p1', 'u_sam@example.com', 'p_sam@example.com'])
    expect(db.deleteAccountData).toHaveBeenCalledWith(['p1'], 'sam@example.com', 'password')
    expect(blob.list.mock.calls.map(([opts]) => opts.prefix)).toEqual(['quests/p1/'])
    expect(blob.list.mock.calls.some(([opts]) => String(opts.prefix).startsWith('quests/u_'))).toBe(false)
    expect(blob.del).toHaveBeenCalledWith(['https://blob.example/p'], { token: 'test-token' })
  })

  it('deduplicates a verified user id that equals the verified-email id', async () => {
    http.me.mockResolvedValue({ ...VERIFIED, id: 'u_sam@example.com' })
    const res = await request({ confirm: 'DELETE MY ACCOUNT' }, 'u_sam@example.com')
    expect(res.status).toBe(200)
    expect(db.deleteAccountData).toHaveBeenCalledWith(['u_sam@example.com', 'p_sam@example.com'], 'sam@example.com', 'all')
  })
})

describe('DELETE /api/account Blob handling', () => {
  it('deletes DB URLs and orphaned prefix blobs before the database', async () => {
    db.listAccountBlobUrls.mockResolvedValue(['https://blob.example/a', 'https://blob.example/a'])
    blob.list.mockImplementation(async ({ prefix }) =>
      prefix === 'quests/u1/' ? { blobs: [{ url: 'https://blob.example/orphan' }], hasMore: false } : { blobs: [], hasMore: false },
    )
    const res = await request({ confirm: 'DELETE MY ACCOUNT' })
    expect(res.status).toBe(200)
    expect(blob.del).toHaveBeenCalledWith(['https://blob.example/a', 'https://blob.example/orphan'], { token: 'test-token' })
    expect(blob.del.mock.invocationCallOrder[0]).toBeLessThan(db.deleteAccountData.mock.invocationCallOrder[0])
    expect(db.deleteAccountData.mock.invocationCallOrder[0]).toBeLessThan(auth.endSession.mock.invocationCallOrder[0])
  })

  it('follows Blob pagination cursors', async () => {
    blob.list.mockImplementation(async ({ prefix, cursor }) => {
      if (prefix !== 'quests/u1/') return { blobs: [], hasMore: false }
      if (!cursor) return { blobs: [{ url: 'https://blob.example/one' }], cursor: 'next', hasMore: true }
      return { blobs: [{ url: 'https://blob.example/two' }], hasMore: false }
    })
    const res = await request({ confirm: 'DELETE MY ACCOUNT' })
    expect(res.status).toBe(200)
    expect(blob.list).toHaveBeenCalledWith(expect.objectContaining({ prefix: 'quests/u1/', cursor: undefined }))
    expect(blob.list).toHaveBeenCalledWith(expect.objectContaining({ prefix: 'quests/u1/', cursor: 'next' }))
    expect(blob.del).toHaveBeenCalledWith(['https://blob.example/one', 'https://blob.example/two'], { token: 'test-token' })
  })

  it('reports a DB URL lookup failure before any deletion', async () => {
    db.listAccountBlobUrls.mockRejectedValueOnce(new Error('list down'))
    const res = await request({ confirm: 'DELETE MY ACCOUNT' })
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ error: BLOB_ERROR })
    expect(blob.del).not.toHaveBeenCalled()
    expect(db.deleteAccountData).not.toHaveBeenCalled()
    expect(auth.endSession).not.toHaveBeenCalled()
  })

  it('reports a prefix listing failure before any deletion', async () => {
    blob.list.mockRejectedValueOnce(new Error('prefix down'))
    const res = await request({ confirm: 'DELETE MY ACCOUNT' })
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ error: BLOB_ERROR })
    expect(blob.del).not.toHaveBeenCalled()
    expect(db.deleteAccountData).not.toHaveBeenCalled()
    expect(auth.endSession).not.toHaveBeenCalled()
  })

  it('fails closed before any lookup or deletion when the Blob token is missing', async () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', '')
    // Even a DB-indexed URL must not tempt the route into deleting without Blob cleanup.
    db.listAccountBlobUrls.mockResolvedValue(['https://blob.example/a'])
    const res = await request({ confirm: 'DELETE MY ACCOUNT' })
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ error: BLOB_UNAVAILABLE })
    expect(db.getPasswordHash).not.toHaveBeenCalled()
    expect(db.listAccountBlobUrls).not.toHaveBeenCalled()
    expect(blob.list).not.toHaveBeenCalled()
    expect(blob.del).not.toHaveBeenCalled()
    expect(db.deleteAccountData).not.toHaveBeenCalled()
    expect(auth.endSession).not.toHaveBeenCalled()
  })

  it('reports a Blob failure, deletes nothing, and allows a retry', async () => {
    db.listAccountBlobUrls.mockResolvedValue(['https://blob.example/a'])
    blob.del.mockRejectedValueOnce(new Error('blob down'))
    const failed = await request({ confirm: 'DELETE MY ACCOUNT' })
    expect(failed.status).toBe(502)
    expect(await failed.json()).toEqual({ error: BLOB_ERROR })
    expect(db.deleteAccountData).not.toHaveBeenCalled()
    expect(auth.endSession).not.toHaveBeenCalled()

    const retried = await request({ confirm: 'DELETE MY ACCOUNT' })
    expect(retried.status).toBe(200)
    expect(db.deleteAccountData).toHaveBeenCalledTimes(1)
    expect(auth.endSession).toHaveBeenCalledTimes(1)
  })

  it('reports a database failure after Blob success, keeps the cookie, and allows a retry', async () => {
    db.listAccountBlobUrls.mockResolvedValue(['https://blob.example/a'])
    db.deleteAccountData.mockRejectedValueOnce(new Error('db down'))
    const failed = await request({ confirm: 'DELETE MY ACCOUNT' })
    expect(failed.status).toBe(502)
    expect(await failed.json()).toEqual({ error: PARTIAL_ERROR })
    expect(auth.endSession).not.toHaveBeenCalled()

    const retried = await request({ confirm: 'DELETE MY ACCOUNT' })
    expect(retried.status).toBe(200)
    expect(db.deleteAccountData).toHaveBeenCalledTimes(2)
    expect(auth.endSession).toHaveBeenCalledTimes(1)
  })
})

describe('ACCOUNT_TABLES schema coverage', () => {
  it('includes every user-keyed table, plus quest_users', () => {
    const source = readFileSync(new URL('../db.ts', import.meta.url), 'utf8')
    const schemaStart = source.indexOf('const SCHEMA = `')
    const schemaEnd = source.indexOf('`\n\n/** Every table deleted', schemaStart)
    const schema = source.slice(schemaStart, schemaEnd)
    const tables = [...schema.matchAll(/create table if not exists (\w+) \(([\s\S]*?)\n\);/g)].map((m) => ({
      name: m[1],
      body: m[2],
    }))
    const listStart = source.indexOf('export const ACCOUNT_TABLES = [')
    const listEnd = source.indexOf('] as const', listStart)
    const accountTables = [...source.slice(listStart, listEnd).matchAll(/'([^']+)'/g)].map((m) => m[1])

    const userKeyed = tables.filter((t) => /\buser_id\b/.test(t.body)).map((t) => t.name)
    expect(userKeyed.length).toBeGreaterThan(0)
    expect(userKeyed.filter((name) => !accountTables.includes(name))).toEqual([])
    expect(accountTables).toContain('quest_users')
    // quest_users must be last so every child row is gone before its parent.
    expect(accountTables[accountTables.length - 1]).toBe('quest_users')
  })
})

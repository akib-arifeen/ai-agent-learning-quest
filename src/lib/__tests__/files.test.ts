import { beforeEach, describe, expect, it, vi } from 'vitest'

const http = vi.hoisted(() => ({
  me: vi.fn(),
  sameUser: vi.fn(() => true),
  withinLimit: vi.fn(() => true),
  json: (data: unknown, status = 200) => Response.json(data, { status }),
  fail: (error: string, status = 400) => Response.json({ error }, { status }),
}))
vi.mock('@/lib/http', () => http)

const db = vi.hoisted(() => ({
  getFile: vi.fn<(userId: string, id: number) => Promise<{ url: string } | null>>(),
  removeFile: vi.fn<(userId: string, id: number) => Promise<string | null>>(),
  addFile: vi.fn(),
  logActivity: vi.fn(),
  usedBytes: vi.fn(),
}))
vi.mock('@/lib/db', () => db)

const blob = vi.hoisted(() => ({
  del: vi.fn<(url: string, opts?: { token?: string }) => Promise<void>>(),
  head: vi.fn(),
}))
vi.mock('@vercel/blob', () => blob)
vi.mock('@vercel/blob/client', () => ({ handleUpload: vi.fn() }))

import { DELETE } from '@/app/api/files/route'

const BLOB_ERROR = 'Couldn’t delete that file just now. It’s still in your list — try again.'
const DB_ERROR = 'The file was removed from storage, but its list entry couldn’t be updated. Reload and try again.'

const request = (id = '5') =>
  DELETE(new Request(`http://localhost/api/files?id=${id}`, { method: 'DELETE', headers: { 'x-quest-user': 'u1' } }))

beforeEach(() => {
  vi.clearAllMocks()
  http.me.mockResolvedValue({ id: 'u1', email: 'sam@example.com', name: 'Sam', image: null, verified: false })
  http.sameUser.mockReturnValue(true)
  db.getFile.mockResolvedValue({ url: 'https://blob.example/file' })
  db.removeFile.mockResolvedValue('https://blob.example/file')
  blob.del.mockResolvedValue(undefined)
})

describe('DELETE /api/files', () => {
  it('rejects an unauthenticated caller', async () => {
    http.me.mockResolvedValue(null)
    const res = await request()
    expect(res.status).toBe(401)
    expect(db.getFile).not.toHaveBeenCalled()
    expect(blob.del).not.toHaveBeenCalled()
    expect(db.removeFile).not.toHaveBeenCalled()
  })

  it('returns 404 for a file the learner does not own', async () => {
    db.getFile.mockResolvedValue(null)
    const res = await request()
    expect(res.status).toBe(404)
    expect(blob.del).not.toHaveBeenCalled()
    expect(db.removeFile).not.toHaveBeenCalled()
  })

  it('keeps the index row when Blob deletion fails', async () => {
    blob.del.mockRejectedValueOnce(new Error('blob down'))
    const res = await request()
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ error: BLOB_ERROR })
    expect(db.removeFile).not.toHaveBeenCalled()
  })

  it('deletes the Blob object before the index row', async () => {
    const res = await request()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(blob.del).toHaveBeenCalledWith('https://blob.example/file', { token: process.env.BLOB_READ_WRITE_TOKEN })
    expect(db.removeFile).toHaveBeenCalledWith('u1', 5)
    expect(blob.del.mock.invocationCallOrder[0]).toBeLessThan(db.removeFile.mock.invocationCallOrder[0])
  })

  it('reports a database failure after Blob success without claiming success', async () => {
    db.removeFile.mockRejectedValueOnce(new Error('db down'))
    const res = await request()
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ error: DB_ERROR })
    expect(blob.del).toHaveBeenCalledTimes(1)
  })
})

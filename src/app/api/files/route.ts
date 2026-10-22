import { del, head } from '@vercel/blob'
import { type HandleUploadBody, handleUpload } from '@vercel/blob/client'
import { addFile, logActivity, removeFile, usedBytes } from '@/lib/db'
import { fail, json, me, sameUser, withinLimit } from '@/lib/http'
import { questById } from '@/lib/quest'

const MAX_BYTES = 50 * 1024 * 1024
// Each person gets 500 MB in total, so the free storage can't be filled by one account.
const QUOTA_BYTES = 500 * 1024 * 1024
// What creative work looks like: pictures, video, audio, pages, scripts, PDFs, zips, 3D and
// project files (.blend etc. arrive as octet-stream).
const TYPES = ['image/*', 'video/*', 'audio/*', 'text/*', 'model/*', 'application/pdf', 'application/zip', 'application/x-zip-compressed', 'application/json', 'application/octet-stream']

// Every upload lives under the learner's own folder; the server checks this before recording.
const folder = (userId: string, taskId: string) => `quests/${userId}/${taskId}/`

/**
 * Step 1 of an upload: the browser asks for a short-lived token, then sends the file
 * straight to Blob storage (so big files skip Vercel's 4.5 MB request limit).
 */
export async function POST(req: Request) {
  const u = await me()
  if (!u) return fail('Sign in first.', 401)
  if (!withinLimit('upload', u.id, 60, 60 * 60_000)) return fail('That’s a lot of uploads — try again later.', 429)
  const body = (await req.json().catch(() => null)) as HandleUploadBody | null
  if (!body) return fail('Bad upload request.')
  if ((await usedBytes(u.id)) > QUOTA_BYTES) return fail('Your 500 MB of uploads is full — delete something old first.', 413)
  try {
    return json(
      await handleUpload({
        body,
        request: req,
        onBeforeGenerateToken: async (pathname, clientPayload) => {
          const taskId = String(JSON.parse(clientPayload || '{}').taskId || '')
          if (!questById(taskId) || !pathname.startsWith(folder(u.id, taskId))) throw new Error('Bad upload path')
          return { allowedContentTypes: TYPES, maximumSizeInBytes: MAX_BYTES, addRandomSuffix: true }
        },
      }),
    )
  } catch (e) {
    return fail((e as Error).message || 'Upload refused.', 400)
  }
}

/** Step 2: record the finished upload — { taskId, url, name }. The blob must be in their folder. */
export async function PUT(req: Request) {
  const u = await me()
  if (!u) return fail('Sign in first.', 401)
  if (!sameUser(u, req)) return fail('You signed in as someone else in another tab — reloading.', 409)
  const b = await req.json().catch(() => ({}))
  const q = questById(String(b.taskId || ''))
  if (!q) return fail('Unknown quest.')
  const meta = await head(String(b.url || '')).catch(() => null)
  if (!meta || !meta.pathname.startsWith(folder(u.id, q.id))) return fail('That file isn’t yours.', 403)
  const id = await addFile(u.id, { taskId: q.id, url: meta.url, pathname: meta.pathname, name: String(b.name || meta.pathname.split('/').pop()).slice(0, 200), contentType: meta.contentType || '', size: meta.size })
  await logActivity(u.id, 'upload', q.id, String(b.name || '').slice(0, 120))
  return json({ id })
}

/** Delete one of their files: ?id= */
export async function DELETE(req: Request) {
  const u = await me()
  if (!u) return fail('Sign in first.', 401)
  if (!sameUser(u, req)) return fail('You signed in as someone else in another tab — reloading.', 409)
  const id = Number(new URL(req.url).searchParams.get('id'))
  if (!Number.isSafeInteger(id)) return fail('Unknown file.')
  const url = await removeFile(u.id, id)
  if (!url) return fail('Unknown file.', 404)
  await del(url).catch(() => undefined) // the index row is gone either way
  return json({ ok: true })
}

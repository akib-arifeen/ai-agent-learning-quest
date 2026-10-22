import { addCheckin, checkinImage, logActivity } from '@/lib/db'
import { fail, json, me, sameUser, withinLimit } from '@/lib/http'
import { questById } from '@/lib/quest'

// Screenshots are downscaled to JPEG in the browser first; this caps what's stored.
const MAX_IMAGE_CHARS = 1_600_000

/** Post a check-in for the mentor: { taskId, message, image? (data:image/… URL) }. */
export async function POST(req: Request) {
  const u = await me()
  if (!u) return fail('Sign in first.', 401)
  if (!sameUser(u, req)) return fail('You signed in as someone else in another tab — reloading.', 409)
  // Each one can be ~1 MB, so this also keeps the free database from filling up.
  if (!withinLimit('checkin', u.id, 20, 60 * 60_000)) return fail('That’s a lot of check-ins — try again later.', 429)
  const b = await req.json().catch(() => ({}))
  const q = questById(String(b.taskId || ''))
  if (!q) return fail('Unknown quest.')
  const image = typeof b.image === 'string' && b.image ? b.image : null
  if (image && (!/^data:image\/(jpeg|png|webp);base64,/.test(image) || image.length > MAX_IMAGE_CHARS)) {
    return fail('That image is too big or not a picture.')
  }
  const id = await addCheckin(u.id, q.id, String(b.message || '').slice(0, 2000), image)
  await logActivity(u.id, 'checkin', q.id, image ? 'with screenshot' : null)
  return json({ id })
}

/** A check-in's screenshot as an image: ?id= — its owner or a mentor only. */
export async function GET(req: Request) {
  const u = await me()
  if (!u) return fail('Sign in first.', 401)
  const id = Number(new URL(req.url).searchParams.get('id'))
  const data = Number.isSafeInteger(id) && id > 0 ? await checkinImage(id, u.id, u.mentor) : null
  const m = data?.match(/^data:(image\/[a-z]+);base64,(.*)$/)
  if (!m) return fail('No image.', 404)
  return new Response(Buffer.from(m[2], 'base64'), {
    headers: { 'Content-Type': m[1], 'Cache-Control': 'private, no-store' },
  })
}

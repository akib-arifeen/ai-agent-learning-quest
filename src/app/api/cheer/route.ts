import { addCheer, getLearner, logActivity, seeCheer } from '@/lib/db'
import { firstName } from '@/lib/game'
import { fail, json, me, withinLimit } from '@/lib/http'

/** A mentor sends a learner a cheer for their home screen: { userId, message }. */
export async function POST(req: Request) {
  const u = await me()
  if (!u?.mentor) return fail('Mentors only.', 403)
  if (!withinLimit('cheer', u.id, 60, 10 * 60_000)) return fail('Too many cheers at once — try again in a bit.', 429)
  const b = await req.json().catch(() => ({}))
  const message = String(b.message || '').trim().slice(0, 600)
  if (!message) return fail('Write a message first.')
  const to = await getLearner(String(b.userId || ''))
  if (!to) return fail('Unknown learner.')
  await addCheer(to.id, firstName(u.name), message)
  await logActivity(to.id, 'cheer', null, message.slice(0, 120))
  return json({ ok: true })
}

/** The learner dismisses a cheer: { id }. */
export async function PATCH(req: Request) {
  const u = await me()
  if (!u) return fail('Sign in first.', 401)
  const b = await req.json().catch(() => ({}))
  if (!Number.isSafeInteger(Number(b.id))) return fail('Unknown cheer.')
  await seeCheer(u.id, Number(b.id))
  return json({ ok: true })
}

import crypto from 'crypto'
import { getLearner, getPasswordHash, listEvidence, listLearners, loadState, recentMessages, setPassword } from '@/lib/db'
import { fail, json, me } from '@/lib/http'
import { hashPassword } from '@/lib/session'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Mentor view. No params: every learner with their state (for the overview cards).
 * `?userId=`: one learner's state plus their recent chats with Spark.
 */
export async function GET(req: Request) {
  const u = await me()
  if (!u?.mentor) return fail('Mentors only.', 403)
  const id = new URL(req.url).searchParams.get('userId')
  if (id) {
    const learner = await getLearner(id)
    if (!learner) return fail('Unknown learner.', 404)
    const [state, messages, evidence] = await Promise.all([loadState(learner), recentMessages(learner.id), listEvidence(learner.id, undefined, 10)])
    // Cut long item content in the response only (stored data is untouched) and say so.
    const cut = evidence.map((s) => ({
      ...s,
      items: s.items.map((it) => (it.content.length > 4000 ? { ...it, content: it.content.slice(0, 4000), truncated: true } : it)),
    }))
    return json({ state, messages, evidence: cut })
  }
  const learners = await listLearners()
  const states = await Promise.all(learners.map((l) => loadState(l)))
  return json({ learners: states })
}

/**
 * A mentor resets a learner's password: { userId }. Returns a fresh temporary password to
 * pass on (e.g. by WhatsApp); the learner signs in with it and can carry on as normal.
 */
export async function POST(req: Request) {
  const u = await me()
  if (!u?.mentor) return fail('Mentors only.', 403)
  const b = await req.json().catch(() => ({}))
  const learner = await getLearner(String(b.userId || ''))
  if (!learner) return fail('Unknown learner.', 404)
  if (!(await getPasswordHash(learner.email))) return fail('They sign in with Google or an email code — no password to reset.')
  const temp = `quest-${crypto.randomBytes(6).toString('base64url')}`
  await setPassword(learner.email, hashPassword(temp))
  return json({ password: temp })
}

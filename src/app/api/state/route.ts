import { loadState, touchUser } from '@/lib/db'
import { fail, json, me } from '@/lib/http'

export const dynamic = 'force-dynamic'

/**
 * Everything the signed-in learner's screens render from. `?today=YYYY-MM-DD` (their
 * local day) pins their start date on the very first visit.
 */
export async function GET(req: Request) {
  const u = await me(true)
  if (!u) return fail('Sign in first.', 401)
  const learner = await touchUser(u, new URL(req.url).searchParams.get('today') || undefined)
  // `verified` is an auth fact, not stored on the DB learner row; the account UI needs it.
  return json(await loadState({ ...learner, verified: u.verified }))
}

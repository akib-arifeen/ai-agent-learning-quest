import { getProfile, logActivity, saveProfile, touchUser } from '@/lib/db'
import { fail, json, me, sameUser, withinLimit } from '@/lib/http'
import { cleanProfilePatch } from '@/lib/profile'
import { toolOf } from '@/lib/tools'

export const dynamic = 'force-dynamic'

/**
 * Save onboarding answers: any subset of the profile fields, plus `complete: true` when
 * they finish or `dismiss: true` when they skip. Validated field by field (unknown values
 * are dropped, text is capped), so the body can't write anything the app doesn't offer.
 * Returns the saved profile.
 */
export async function POST(req: Request) {
  const u = await me()
  if (!u) return fail('Sign in first.', 401)
  if (!sameUser(u, req)) return fail('You signed in as someone else in another tab — reloading.', 409)
  if (!withinLimit('profile', u.id, 60, 10 * 60_000)) return fail('Whoa, slow down a little!', 429)
  const patch = cleanProfilePatch(await req.json().catch(() => ({})))
  await touchUser(u) // the profile row points at the user row, so make sure it exists
  const wasDone = !!(await getProfile(u.id))?.completed_at
  const profile = await saveProfile(u.id, patch)
  // Log only the first completion, and only once a tool is chosen.
  if (patch.complete && !wasDone && profile.tool) await logActivity(u.id, 'onboarded', null, profile.tool === 'other' ? profile.tool_other || 'their own agent' : toolOf(profile.tool).name)
  return json(profile)
}

import { getProfile, logActivity, saveProfile, touchUser } from '@/lib/db'
import { fail, json, me, sameUser, withinLimit } from '@/lib/http'
import { addDays, daysBetween } from '@/lib/game'
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
  const body = await req.json().catch(() => ({}))
  const patch = cleanProfilePatch(body)
  // The learner's local day, so a changed weekly answer re-plans from their today. Anything that is
  // not a real date within a day of the server's falls back to the server's, so a sent date can't backdate the change.
  // The round trip through addDays rejects impossible days like 2026-10-32, which Date.UTC would roll over.
  const sent = String(body?.today ?? '')
  const server = new Date().toISOString().slice(0, 10)
  const off = daysBetween(server, sent)
  const today = Math.abs(off) <= 1 && addDays(server, off) === sent ? sent : server
  await touchUser(u) // the profile row points at the user row, so make sure it exists
  const wasDone = !!(await getProfile(u.id))?.completed_at
  const profile = await saveProfile(u.id, patch, today)
  // Log only the first completion, and only once a tool is chosen.
  if (patch.complete && !wasDone && profile.tool) await logActivity(u.id, 'onboarded', null, profile.tool === 'other' ? profile.tool_other || 'their own agent' : toolOf(profile.tool).name)
  return json(profile)
}

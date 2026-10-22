import { logActivity, setBusy } from '@/lib/db'
import { fail, json, me, sameUser, withinLimit } from '@/lib/http'

/** Mark a day as busy (an event or activity) — the plan slides back a day. { day, on } */
export async function POST(req: Request) {
  const u = await me()
  if (!u) return fail('Sign in first.', 401)
  if (!sameUser(u, req)) return fail('You signed in as someone else in another tab — reloading.', 409)
  if (!withinLimit('busy', u.id, 60, 10 * 60_000)) return fail('Too many changes — try again in a bit.', 429)
  const b = await req.json().catch(() => ({}))
  const day = String(b.day || '')
  // Round-trip through Date so impossible days like 2026-13-45 are rejected, not 500s.
  const t = new Date(`${day}T00:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(t.getTime()) || t.toISOString().slice(0, 10) !== day) return fail('Bad day.')
  await setBusy(u.id, day, !!b.on)
  await logActivity(u.id, b.on ? 'busy' : 'unbusy', null, day)
  return json({ ok: true })
}

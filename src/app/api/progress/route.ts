import { getProgress, logActivity, saveProgress, toggleStep } from '@/lib/db'
import { fail, json, me, sameUser, withinLimit } from '@/lib/http'
import { QUESTS, questById, variantOf } from '@/lib/quest'

/**
 * Every change a learner makes to a quest goes through here as one small operation:
 *   step {stepId, done} · sitting {n, next} · unsitting {n} · notes {notes}
 *   ownIdea {text} · variant {variant} · complete · reopen
 * Each op is validated against the quest data, so nobody can write ids that don't
 * exist. Real progress is logged to the activity table (that's the streak).
 */
export async function POST(req: Request) {
  const u = await me()
  if (!u) return fail('Sign in first.', 401)
  if (!sameUser(u, req)) return fail('You signed in as someone else in another tab — reloading.', 409)
  if (!withinLimit('progress', u.id, 400, 10 * 60_000)) return fail('Whoa, slow down a little!', 429)
  const b = await req.json().catch(() => ({}))
  const q = questById(String(b.taskId || ''))
  if (!q) return fail('Unknown quest.')
  const cur = await getProgress(u.id, q.id)
  const v = variantOf(q, cur?.variant)
  const sittings = cur?.sittings || []

  switch (b.op) {
    case 'step': {
      const id = String(b.stepId || '')
      const m = id.match(/^(\d{1,2})-(\d{1,2})$/)
      if (!m || !v.sittings[Number(m[1])]?.steps[Number(m[2])] || id !== `${Number(m[1])}-${Number(m[2])}`) return fail('Unknown step.')
      const row = await toggleStep(u.id, q.id, id, !!b.done)
      if (b.done) await logActivity(u.id, 'step', q.id, v.sittings[Number(m[1])].steps[Number(m[2])])
      return json(row)
    }
    case 'sitting': {
      const n = Number(b.n)
      if (!Number.isInteger(n) || !v.sittings[n]) return fail('Unknown sitting.')
      const next = String(b.next || '').slice(0, 600)
      const rest = sittings.filter((x) => x.n !== n)
      const row = await saveProgress(u.id, q.id, { sittings: [...rest, { n, at: new Date().toISOString(), next }] })
      await logActivity(u.id, 'sitting', q.id, v.sittings[n].title)
      return json(row)
    }
    case 'unsitting': {
      const n = Number(b.n)
      return json(await saveProgress(u.id, q.id, { sittings: sittings.filter((x) => x.n !== n) }))
    }
    case 'notes':
      return json(await saveProgress(u.id, q.id, { notes: String(b.notes || '').slice(0, 5000) }))
    case 'ownIdea': {
      const text = String(b.text || '').slice(0, 1000)
      const row = await saveProgress(u.id, q.id, { own_idea: text })
      if (text.trim()) await logActivity(u.id, 'own_idea', q.id, text.slice(0, 200))
      return json(row)
    }
    case 'variant': {
      if (cur?.completed_at) return fail('This quest is already complete.')
      if (!q.variants.some((x) => x.id === b.variant)) return fail('Unknown variant.')
      // Steps and sittings belong to the old variant's checklist, so they reset.
      const row = await saveProgress(u.id, q.id, { variant: String(b.variant), steps: [], sittings: [] })
      await logActivity(u.id, 'variant', q.id, variantOf(q, b.variant).title)
      return json(row)
    }
    case 'complete': {
      // Quests unlock in order, so the one before must be finished first.
      const prev = QUESTS[QUESTS.findIndex((x) => x.id === q.id) - 1]
      if (prev && !(await getProgress(u.id, prev.id))?.completed_at) return fail('Finish the quest before this one first.')
      // Finishing the quest wraps any sitting they forgot to wrap, so their XP counts.
      const at = new Date().toISOString()
      const missing = v.sittings.map((_, n) => n).filter((n) => !sittings.some((x) => x.n === n))
      const row = await saveProgress(u.id, q.id, { completed_at: new Date(), sittings: [...sittings, ...missing.map((n) => ({ n, at, next: '' }))] })
      await logActivity(u.id, 'complete', q.id, v.title)
      return json(row)
    }
    case 'reopen':
      return json(await saveProgress(u.id, q.id, { completed_at: null }))
    default:
      return fail('Unknown operation.')
  }
}

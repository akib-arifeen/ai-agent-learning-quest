import { listEvidence } from '@/lib/db'
import { fail, json, me } from '@/lib/http'
import { proTaskById } from '@/lib/pro'

export const dynamic = 'force-dynamic'

/** The signed-in learner's evidence submissions, newest first. Optional ?taskId= */
export async function GET(req: Request) {
  const u = await me()
  if (!u) return fail('Sign in first.', 401)
  const taskId = new URL(req.url).searchParams.get('taskId') || undefined
  if (taskId && !proTaskById(taskId)) return fail('Unknown task.', 404)
  const subs = await listEvidence(u.id, taskId, 10)
  // Cut long item content in the response only (stored data is untouched) and say so.
  const submissions = subs.map((s) => ({
    ...s,
    items: s.items.map((it) => (it.content.length > 4000 ? { ...it, content: it.content.slice(0, 4000), truncated: true } : it)),
  }))
  return json({ submissions })
}

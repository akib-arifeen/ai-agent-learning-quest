import { streamReply, systemPrompt } from '@/lib/coach'
import { addMessage, getProgress, listMessages, loadState, logActivity, touchUser } from '@/lib/db'
import { firstName } from '@/lib/game'
import { fail, json, me, sameUser, withinLimit } from '@/lib/http'
import { questById } from '@/lib/quest'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

// 'general' = the coach opened from the map/guide rather than inside a quest.
const scope = (v: unknown) => {
  const id = String(v || 'general')
  return questById(id) ? id : 'general'
}

/** The signed-in learner's chat history for a quest: ?taskId= */
export async function GET(req: Request) {
  const u = await me()
  if (!u) return fail('Sign in first.', 401)
  return json({ messages: await listMessages(u.id, scope(new URL(req.url).searchParams.get('taskId'))) })
}

/** Ask Spark: { taskId, message, today } → streamed plain-text reply. */
export async function POST(req: Request) {
  const u = await me()
  if (!u) return fail('Sign in first.', 401)
  if (!sameUser(u, req)) return fail('You signed in as someone else in another tab — reloading.', 409)
  // The free LLM allowance is shared by everyone, so each person gets a fair slice.
  if (!withinLimit('coach', u.id, 30, 10 * 60_000)) return fail('Spark needs a breather — try again in a few minutes.', 429)
  const b = await req.json().catch(() => ({}))
  const taskId = scope(b.taskId)
  const message = String(b.message || '').trim().slice(0, 4000)
  if (!message) return fail('Say something first.')
  const today = /^\d{4}-\d{2}-\d{2}$/.test(String(b.today)) ? String(b.today) : new Date().toISOString().slice(0, 10)

  const learner = await touchUser(u)
  const [state, progress, history] = await Promise.all([loadState(learner), getProgress(u.id, taskId), listMessages(u.id, taskId, 12)])
  await addMessage(u.id, taskId, 'user', message)
  await logActivity(u.id, 'coach', taskId === 'general' ? null : taskId)

  try {
    const stream = await streamReply(
      [
        { role: 'system', content: systemPrompt(firstName(learner.name), taskId, progress, state, today) },
        ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user', content: message },
      ],
      async (full) => {
        if (full.trim()) await addMessage(u.id, taskId, 'assistant', full)
      },
    )
    return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('coach', e)
    return fail('Spark couldn’t reach the AI right now. Free models get busy — try again in a minute.', 502)
  }
}

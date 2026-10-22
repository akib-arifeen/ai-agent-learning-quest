import { loadState, rotateMcpToken, touchUser } from '@/lib/db'
import { fail, json, me, sameUser, withinLimit } from '@/lib/http'

export const dynamic = 'force-dynamic'

/** Whether the signed-in learner has an MCP token, and when their agent last used it. */
export async function GET() {
  const u = await me()
  if (!u) return fail('Sign in first.', 401)
  const s = await loadState(await touchUser(u))
  return json({ hasToken: s.pro.hasToken, lastUsed: s.pro.lastUsed })
}

/** Create a fresh MCP token (replacing any old one). The raw token is returned once. */
export async function POST(req: Request) {
  const u = await me()
  if (!u) return fail('Sign in first.', 401)
  if (!sameUser(u, req)) return fail('You signed in as someone else in another tab, reloading.', 409)
  if (!withinLimit('mcp-token', u.id, 10, 10 * 60_000)) return fail('Too many new tokens. Try again in a few minutes.', 429)
  const learner = await touchUser(u)
  return json({ token: await rotateMcpToken(learner.id) })
}

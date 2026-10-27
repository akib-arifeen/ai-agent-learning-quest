/**
 * Small helpers every API route shares: JSON responses, "who is calling", and a
 * per-user rate limit. Every route except Auth.js's own must call `me()` first — an
 * ungated route would let anyone spend the coach's LLM quota or touch someone's data.
 */

import { readSession } from './session'

export type Me = { id: string; email: string; name: string; image: string | null; verified: boolean }

/** The signed-in learner (Google or email account), or null. `roll` keeps the cookie fresh. */
export async function me(roll = false): Promise<Me | null> {
  return readSession(roll)
}

/** For writes: the caller must still be the account the page was loaded for (two tabs, two accounts). */
export const sameUser = (u: Me, req: Request) => {
  const expected = req.headers.get('x-quest-user')
  return !expected || expected === u.id
}

export const json = (data: unknown, status = 200) => Response.json(data, { status })
export const fail = (error: string, status = 400) => Response.json({ error }, { status })

const HITS = new Map<string, number[]>()

/**
 * True when this user is within `limit` hits per `windowMs` for this bucket. In-memory
 * per serverless instance — a speed bump against runaway loops, not a hard wall.
 */
export function withinLimit(bucket: string, who: string, limit: number, windowMs: number) {
  const key = `${bucket}:${who}`
  const now = Date.now()
  if (HITS.size > 5000) HITS.clear()
  const recent = (HITS.get(key) || []).filter((t) => t > now - windowMs)
  if (recent.length >= limit) return false
  recent.push(now)
  HITS.set(key, recent)
  return true
}

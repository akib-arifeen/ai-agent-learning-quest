/**
 * Sign-in, all in-house: email + password (scrypt-hashed in our own database) or an
 * optional "Sign in with Google" (we verify Google's ID token ourselves — no Firebase,
 * no third-party auth service, no usage quota). Either way the learner then carries our
 * own signed, httpOnly cookie that lasts a year and rolls forward, so they stay signed
 * in. A person's id comes from their email, so Google and password sign-ins for the
 * same address land in the same account. Server-only.
 */

import crypto from 'crypto'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

/** `verified`: they proved they own the email (Google or an emailed code), not just typed it. */
export type SessionUser = { id: string; email: string; name: string; image: string | null; verified: boolean }

const COOKIE = 'quest_session'
const YEAR_S = 365 * 24 * 60 * 60
const ROLL_AFTER_MS = 7 * 24 * 60 * 60 * 1000 // re-issue a week-old cookie so it never runs out

// Key that makes the cookie unforgeable. Rotating it signs everyone out.
const secret = () => {
  const s = (process.env.AUTH_SECRET || '').trim()
  // Never sign real sessions with a guessable key: refuse to run in production without one.
  if (!s && process.env.NODE_ENV === 'production') throw new Error('AUTH_SECRET is not set')
  return s || 'dev-only-secret'
}
/** HMAC with the app secret (session cookies, sign-in codes). */
export const hmac = (data: string) => crypto.createHmac('sha256', secret()).update(data).digest('hex')
const sign = (body: string) => crypto.createHmac('sha256', secret()).update(body).digest('base64url')

/** Set (or refresh) the session cookie for a user. */
export async function startSession(u: SessionUser) {
  const body = Buffer.from(JSON.stringify({ ...u, iat: Date.now() })).toString('base64url')
  ;(await cookies()).set(COOKIE, `${body}.${sign(body)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: YEAR_S,
  })
}

/** Clear the session cookie. */
export async function endSession() {
  ;(await cookies()).delete(COOKIE)
}

/** The signed-in user from the cookie, or null. Rolls the cookie forward when it's a week old. */
export async function readSession(roll = false): Promise<SessionUser | null> {
  const raw = (await cookies()).get(COOKIE)?.value || ''
  const [body, mac] = raw.split('.')
  if (!body || !mac) return null
  const a = Buffer.from(sign(body))
  const b = Buffer.from(mac)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString())
    if (!p.id || !p.email || Date.now() - Number(p.iat) > YEAR_S * 1000) return null
    const user: SessionUser = { id: String(p.id), email: String(p.email), name: String(p.name || ''), image: p.image || null, verified: p.verified === true }
    if (roll && Date.now() - Number(p.iat) > ROLL_AFTER_MS) await startSession(user)
    return user
  } catch {
    return null
  }
}

/** Normalise an email for lookups (trim + lowercase). */
export const normEmail = (e: string) => String(e || '').trim().toLowerCase()

/** One stable id per *verified* email (Google or emailed code) — the key for all their data. */
export const idForEmail = (email: string) => 'u_' + crypto.createHash('sha256').update(normEmail(email)).digest('hex').slice(0, 24)

/**
 * Password accounts get their own id space. Nobody proved they own the address, so a
 * password sign-up must never land inside (or pre-claim) the real owner's account.
 */
export const idForPasswordEmail = (email: string) => 'p_' + crypto.createHash('sha256').update('password:' + normEmail(email)).digest('hex').slice(0, 24)

/** Hash a password with scrypt and a random salt (stored as scrypt$salt$hash). */
export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16)
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 })
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`
}

/** Check a password against a stored scrypt hash (constant-time). */
export function checkPassword(password: string, stored: string) {
  const [kind, salt, hash] = String(stored || '').split('$')
  if (kind !== 'scrypt' || !salt || !hash) return false
  const want = Buffer.from(hash, 'base64')
  const got = crypto.scryptSync(password, Buffer.from(salt, 'base64'), want.length, { N: 16384, r: 8, p: 1 })
  return crypto.timingSafeEqual(want, got)
}

// Google's public keys for its ID tokens (cached and refreshed by jose).
const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))

/** The Google client id, when "Sign in with Google" is switched on. */
export const googleClientId = () => (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '').trim()

/** Verify a Google ID token from the Sign in with Google button. Throws if invalid. */
export async function verifyGoogleToken(credential: string): Promise<SessionUser> {
  const aud = googleClientId()
  if (!aud) throw new Error('Google sign-in is not configured')
  const { payload } = await jwtVerify(credential, GOOGLE_JWKS, { issuer: ['https://accounts.google.com', 'accounts.google.com'], audience: aud })
  const email = typeof payload.email === 'string' ? normEmail(payload.email) : ''
  if (!email || payload.email_verified !== true) throw new Error('Google account has no verified email')
  return {
    id: idForEmail(email),
    email,
    name: typeof payload.name === 'string' && payload.name ? payload.name : email.split('@')[0],
    image: typeof payload.picture === 'string' ? payload.picture : null,
    verified: true,
  }
}

/** Emails that get the mentor view (comma-separated ADMIN_EMAILS) — only after a verified sign-in. */
export const isMentor = (email: string | null | undefined, verified: boolean) =>
  verified &&
  !!email &&
  (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase())

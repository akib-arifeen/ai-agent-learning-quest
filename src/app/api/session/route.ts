import { createPassword, deleteOtp, getLearner, getPasswordHash, getSessionVersion, saveOtp, takeOtpAttempt, touchUser } from '@/lib/db'
import { fail, json, withinLimit } from '@/lib/http'
import { otpEnabled, sendCode } from '@/lib/mail'
import crypto from 'crypto'
import { checkPassword, endSession, googleClientId, hashPassword, hmac, idForEmail, idForPasswordEmail, normEmail, startSession, verifyGoogleToken, type SessionUser } from '@/lib/session'

// Plain addresses only — no commas, quotes or brackets that a mailer could read as a list.
const EMAIL = /^[^\s@,;"'<>()]+@[^\s@,;"'<>()]+\.[^\s@,;"'<>()]{2,}$/

// Codes are stored hashed (keyed with the app secret), never in plain text.
const hashCode = (email: string, code: string) => hmac(`otp:${email}:${code}`)

/** Ensure the account row exists, then sign the cookie with its current security version. */
async function beginSession(user: SessionUser) {
  await touchUser(user)
  // touchUser has just created the row when needed, so a null here is unexpected; 0 keeps
  // the legacy cookie rule (existing rows predate versioning).
  const sv = (await getSessionVersion(user.id)) ?? 0
  await startSession({ ...user, sv })
}

/** Which sign-in options are switched on — the sign-in card shows only those. */
export async function GET() {
  return json({ google: googleClientId() || null, otp: otpEnabled() })
}

/**
 * Sign in or sign up, then set our year-long session cookie:
 *   { mode: 'otp-send', email }                 — email a 6-digit code
 *   { mode: 'otp-verify', email, code, name? }  — check it (new people also give a name)
 *   { mode: 'signup', name, email, password }   — create a password account
 *   { mode: 'signin', email, password }         — password sign-in
 *   { mode: 'google', credential }              — ID token from the Sign in with Google button
 */
export async function POST(req: Request) {
  const ip = String(req.headers.get('x-forwarded-for') || 'local').split(',')[0].trim()
  if (!withinLimit('session', ip, 30, 10 * 60_000)) return fail('Too many tries — wait a few minutes.', 429)
  const b = await req.json().catch(() => ({}))

  if (b.mode === 'google') {
    try {
      const user = await verifyGoogleToken(String(b.credential || ''))
      await beginSession(user)
      return json({ ok: true })
    } catch (e) {
      console.error('google sign-in', e)
      return fail('Google sign-in didn’t go through. Please try again.', 401)
    }
  }

  const email = normEmail(b.email)
  if (!EMAIL.test(email)) return fail('That email address doesn’t look right.')
  const id = idForEmail(email) // verified account (Google / emailed code)
  const pid = idForPasswordEmail(email) // password account — separate on purpose

  if (b.mode === 'otp-send') {
    if (!otpEnabled()) return fail('Email codes aren’t switched on yet — use a password for now.')
    // Each email can ask for a few codes per window, so nobody can spam someone's inbox.
    if (!withinLimit('otp-send', email, 4, 15 * 60_000)) return fail('We just sent you a code — check your inbox (and spam) or wait a few minutes.', 429)
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
    await saveOtp(email, hashCode(email, code))
    try {
      await sendCode(email, code)
    } catch (e) {
      console.error('otp send', e)
      return fail('Couldn’t send the email just now — try again, or use a password.', 502)
    }
    return json({ ok: true, isNew: !(await getLearner(id)) })
  }

  if (b.mode === 'otp-verify') {
    if (!withinLimit('otp-verify', email, 10, 10 * 60_000)) return fail('Too many tries — wait a few minutes.', 429)
    const code = String(b.code || '').replace(/\D/g, '')
    if (code.length !== 6) return fail('The code is 6 digits.')
    const pending = await takeOtpAttempt(email)
    if (!pending) return fail('That code has expired — tap “Send a new code”.', 401)
    const want = Buffer.from(pending.codeHash)
    const got = Buffer.from(hashCode(email, code))
    if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return fail('That code doesn’t match — check the email and try again.', 401)
    const existing = await getLearner(id)
    const name = String(b.name || '').trim().slice(0, 60)
    // New here: keep the code alive and ask for a first name before creating them.
    if (!existing && !name) return json({ needName: true })
    await deleteOtp(email)
    const user = existing ? { id, email, name: existing.name, image: existing.image, verified: true } : { id, email, name, image: null, verified: true }
    await beginSession(user)
    return json({ ok: true })
  }

  // Password accounts: a per-address limit too, so nobody can grind through guesses.
  if (!withinLimit('session-email', email, 10, 10 * 60_000)) return fail('Too many tries for this email — wait a few minutes.', 429)
  const password = String(b.password || '')

  if (b.mode === 'signup') {
    const name = String(b.name || '').trim().slice(0, 60)
    if (!name) return fail('Tell us your first name.')
    if (password.length < 6) return fail('Use at least 6 characters for your password.')
    if (!(await createPassword(email, hashPassword(password)))) return fail('There’s already an account with that email — sign in instead.')
    const user = { id: pid, email, name, image: null, verified: false }
    await beginSession(user)
    return json({ ok: true })
  }

  if (b.mode === 'signin') {
    const hash = await getPasswordHash(email)
    if (!hash) return fail(otpEnabled() ? 'No password on that account — use “Email me a code” instead.' : 'No account with that email yet — tap “New here” to create one.', 401)
    if (!checkPassword(password, hash)) return fail('That email and password don’t match.', 401)
    const existing = await getLearner(pid)
    await beginSession({ id: pid, email, name: existing?.name || email.split('@')[0], image: existing?.image || null, verified: false })
    return json({ ok: true })
  }

  return fail('Unknown sign-in mode.')
}

/** Sign out. */
export async function DELETE() {
  await endSession()
  return json({ ok: true })
}

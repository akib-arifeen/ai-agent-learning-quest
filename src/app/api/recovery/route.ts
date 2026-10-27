import crypto from 'crypto'
import {
  bumpSessionVersion,
  claimRecoveryToken,
  deleteOtp,
  deleteRecovery,
  getPasswordHash,
  issueRecoveryToken,
  saveRecoveryCode,
  setPassword,
  takeRecoveryAttempt,
} from '@/lib/db'
import { fail, json, withinLimit } from '@/lib/http'
import { otpEnabled, sendRecoveryCode } from '@/lib/mail'
import { RECOVERY_TOKEN_TTL_MIN, hashRecoveryCode, hashRecoveryToken, newRecoveryToken, sameHash } from '@/lib/recovery'
import { hashPassword, idForPasswordEmail, normEmail } from '@/lib/session'

// Same plain addresses only rule as sign-in — no commas, quotes or brackets.
const EMAIL = /^[^\s@,;"'<>()]+@[^\s@,;"'<>()]+\.[^\s@,;"'<>()]{2,}$/
const UNAVAILABLE = 'Password recovery by email isn’t available on this site yet. If you signed up with Google, use Google sign-in.'
const GENERIC = 'That code doesn’t match or has expired.'
const WINDOW = 15 * 60_000

/** Request, verify and reset are three steps of one POST endpoint. */
export async function POST(req: Request) {
  const ip = String(req.headers.get('x-forwarded-for') || 'local').split(',')[0].trim()
  const b = await req.json().catch(() => ({}))

  // Honest off switch: no account lookup, no storage, no email before this check.
  if (!otpEnabled()) return fail(UNAVAILABLE, 503)

  const email = normEmail(b.email)
  if (!EMAIL.test(email)) return fail('That email address doesn’t look right.')

  if (b.action === 'request') {
    if (!withinLimit('recovery-request-ip', ip, 10, WINDOW) || !withinLimit('recovery-request-email', email, 3, WINDOW)) {
      return fail('Too many requests — wait a few minutes and try again.', 429)
    }
    // Never create an account or a password here; unknown addresses look identical.
    const stored = await getPasswordHash(email)
    if (stored) {
      const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
      await saveRecoveryCode(email, hashRecoveryCode(email, code))
      try {
        await sendRecoveryCode(email, code)
      } catch (e) {
        console.error('recovery send', e)
      }
    }
    return json({ ok: true })
  }

  if (b.action === 'verify') {
    if (!withinLimit('recovery-verify-ip', ip, 20, WINDOW) || !withinLimit('recovery-verify-email', email, 10, WINDOW)) {
      return fail('Too many tries — wait a few minutes and try again.', 429)
    }
    const code = String(b.code || '').replace(/\D/g, '')
    if (code.length !== 6) return fail(GENERIC, 401)
    const pending = await takeRecoveryAttempt(email)
    if (!pending || !sameHash(pending.codeHash, hashRecoveryCode(email, code))) return fail(GENERIC, 401)
    const token = newRecoveryToken()
    if (!(await issueRecoveryToken(email, hashRecoveryToken(token)))) return fail(GENERIC, 401)
    return json({ ok: true, token, expiresIn: RECOVERY_TOKEN_TTL_MIN * 60 })
  }

  if (b.action === 'reset') {
    if (!withinLimit('recovery-reset-ip', ip, 10, WINDOW) || !withinLimit('recovery-reset-email', email, 10, WINDOW)) {
      return fail('Too many tries — wait a few minutes and try again.', 429)
    }
    const password = String(b.password || '')
    if (password.length < 6) return fail('Use at least 6 characters for your password.')
    const token = String(b.token || '')
    // Claiming deletes the row: a second caller cannot reuse this token.
    if (!token || !(await claimRecoveryToken(email, hashRecoveryToken(token)))) return fail(GENERIC, 401)
    await setPassword(email, hashPassword(password))
    await deleteOtp(email)
    await bumpSessionVersion(idForPasswordEmail(email))
    await deleteRecovery(email)
    return json({ ok: true })
  }

  return fail('Unknown recovery action.')
}

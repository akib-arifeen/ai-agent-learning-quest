/**
 * Password recovery primitives. Codes and tokens are only ever stored keyed with the
 * app secret, and token hashes are compared in constant time. Server-only.
 */

import crypto from 'crypto'
import { hmac, normEmail } from './session'

export const RECOVERY_CODE_TTL_MIN = 10
export const RECOVERY_TOKEN_TTL_MIN = 15

/** A keyed hash for the 6-digit code sent to an email. */
export const hashRecoveryCode = (email: string, code: string) => hmac(`recovery:${normEmail(email)}:${code}`)

/** A keyed hash for the single-use reset token. */
export const hashRecoveryToken = (token: string) => hmac(`recovery-token:${token}`)

/** 32 random bytes, URL-safe, returned once to the browser. */
export const newRecoveryToken = () => crypto.randomBytes(32).toString('base64url')

/** Constant-time equality for two hex hashes (length first, empty never matches). */
export function sameHash(a: string, b: string) {
  const x = Buffer.from(String(a || ''))
  const y = Buffer.from(String(b || ''))
  return x.length > 0 && x.length === y.length && crypto.timingSafeEqual(x, y)
}

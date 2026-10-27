import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { RECOVERY_MAX_ATTEMPTS } from '../recovery'

const databaseName = (() => {
  try {
    return decodeURIComponent(new URL(process.env.DATABASE_URL || '').pathname.replace(/^\//, ''))
  } catch {
    return ''
  }
})()

const enabled = process.env.QUEST_INTEGRATION === '1' && databaseName.includes('test')

describe.skipIf(!enabled)('recovery storage integration', () => {
  let db: typeof import('../db') | undefined
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const emails = {
    expired: `recovery-expired-${stamp}@example.test`,
    attempts: `recovery-attempts-${stamp}@example.test`,
    replacement: `recovery-replacement-${stamp}@example.test`,
    issue: `recovery-issue-${stamp}@example.test`,
    reset: `recovery-reset-${stamp}@example.test`,
  }
  const ids = [`u_recovery-${stamp}`, `p_recovery-${stamp}`]

  beforeAll(async () => {
    db = await import('../db')
    await db.ensureSchema()
  })

  afterAll(async () => {
    if (!db) return
    for (const email of Object.values(emails)) {
      try {
        await db.deleteAccountData(ids, email, 'all')
      } catch {
        // Best effort: the test body already fails if cleanup is the problem.
      }
    }
    await db.sql.end()
  })

  it('expires codes, exhausts attempts, and preserves the attempt budget across replacement codes', async () => {
    if (!db) throw new Error('integration database was not loaded')
    const { saveRecoveryCode, takeRecoveryAttempt } = db

    await saveRecoveryCode(emails.expired, 'expired-hash', 0)
    await expect(takeRecoveryAttempt(emails.expired)).resolves.toBeNull()

    await saveRecoveryCode(emails.attempts, 'attempt-hash')
    for (let i = 0; i < RECOVERY_MAX_ATTEMPTS; i++) {
      await expect(takeRecoveryAttempt(emails.attempts)).resolves.toEqual({ codeHash: 'attempt-hash' })
    }
    await expect(takeRecoveryAttempt(emails.attempts)).resolves.toBeNull()

    await saveRecoveryCode(emails.replacement, 'first-hash')
    await expect(takeRecoveryAttempt(emails.replacement)).resolves.toEqual({ codeHash: 'first-hash' })
    await expect(takeRecoveryAttempt(emails.replacement)).resolves.toEqual({ codeHash: 'first-hash' })
    await saveRecoveryCode(emails.replacement, 'second-hash')
    for (let i = 0; i < RECOVERY_MAX_ATTEMPTS - 2; i++) {
      await expect(takeRecoveryAttempt(emails.replacement)).resolves.toEqual({ codeHash: 'second-hash' })
    }
    await expect(takeRecoveryAttempt(emails.replacement)).resolves.toBeNull()
  })

  it('issues one token for a correct code and then consumes the code', async () => {
    if (!db) throw new Error('integration database was not loaded')
    const { saveRecoveryCode, takeRecoveryAttempt, issueRecoveryToken } = db

    await saveRecoveryCode(emails.issue, 'code-hash')
    await expect(takeRecoveryAttempt(emails.issue)).resolves.toEqual({ codeHash: 'code-hash' })
    await expect(issueRecoveryToken(emails.issue, 'token-hash')).resolves.toBe(true)
    await expect(issueRecoveryToken(emails.issue, 'token-hash')).resolves.toBe(false)
    await expect(takeRecoveryAttempt(emails.issue)).resolves.toBeNull()
  })

  it('rejects wrong and expired tokens, then resets once and bumps both identities', async () => {
    if (!db) throw new Error('integration database was not loaded')
    const { sql, resetPasswordWithToken, getSessionVersion } = db
    try {
      for (const id of ids) {
        await sql`insert into quest_users (id, email, name, start_date) values (${id}, ${emails.reset}, 'Synthetic', '2026-01-01')`
      }
      await sql`insert into quest_passwords (email, hash) values (${emails.reset}, 'scrypt$old')`
      await sql`insert into quest_otps (email, code_hash, expires_at) values (${emails.reset}, 'synthetic', now() + interval '10 minutes')`
      await sql`insert into quest_recovery (email, code_hash, code_expires_at, token_hash, token_expires_at)
        values (${emails.reset}, '', null, 'good-token', now() + interval '15 minutes')`
      const before = await sql<{ id: string; session_version: number }[]>`select id, session_version from quest_users where id = any(${ids})`

      await expect(resetPasswordWithToken(emails.reset, 'wrong-token', 'scrypt$new', ids)).resolves.toBe(false)
      const unchanged = await sql<{ hash: string }[]>`select hash from quest_passwords where email = ${emails.reset}`
      expect(unchanged[0]?.hash).toBe('scrypt$old')
      const otpStillThere = await sql<{ n: number }[]>`select count(*)::int as n from quest_otps where email = ${emails.reset}`
      expect(Number(otpStillThere[0].n)).toBe(1)

      await sql`update quest_recovery set token_expires_at = now() - interval '1 minute' where email = ${emails.reset}`
      await expect(resetPasswordWithToken(emails.reset, 'good-token', 'scrypt$new', ids)).resolves.toBe(false)
      await sql`update quest_recovery set token_expires_at = now() + interval '15 minutes' where email = ${emails.reset}`

      await expect(resetPasswordWithToken(emails.reset, 'good-token', 'scrypt$new', ids)).resolves.toBe(true)
      const password = await sql<{ hash: string }[]>`select hash from quest_passwords where email = ${emails.reset}`
      expect(password[0]?.hash).toBe('scrypt$new')
      for (const table of ['quest_otps', 'quest_recovery']) {
        const rows = await sql.unsafe<{ n: number }[]>(`select count(*)::int as n from ${table} where email = $1`, [emails.reset])
        expect(Number(rows[0].n), table).toBe(0)
      }
      const after = await sql<{ id: string; session_version: number }[]>`select id, session_version from quest_users where id = any(${ids})`
      expect(after).toHaveLength(before.length)
      for (const row of after) {
        expect(Number(row.session_version), row.id).not.toBe(Number(before.find((b) => b.id === row.id)?.session_version))
        await expect(getSessionVersion(row.id)).resolves.not.toBeNull()
      }

      // The token was consumed by the committed transaction.
      await expect(resetPasswordWithToken(emails.reset, 'good-token', 'scrypt$newer', ids)).resolves.toBe(false)
    } finally {
      try {
        await db.deleteAccountData(ids, emails.reset, 'all')
      } catch {
        // Keep the original failure; the afterAll also retries.
      }
    }
  })
})

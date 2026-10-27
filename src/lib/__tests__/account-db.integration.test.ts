import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const databaseName = (() => {
  try {
    return decodeURIComponent(new URL(process.env.DATABASE_URL || '').pathname.replace(/^\//, ''))
  } catch {
    return ''
  }
})()

// Never run against a non-test database, even if the caller sets the flag.
const enabled = process.env.QUEST_INTEGRATION === '1' && databaseName.includes('test')

describe.skipIf(!enabled)('deleteAccountData integration', () => {
  let db: typeof import('../db') | undefined
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const email = `packet-c-${stamp}@example.test`
  const ids = [`u_packet-c-${stamp}`, `p_packet-c-${stamp}`]
  const resetEmail = `packet-c-reset-${stamp}@example.test`
  const resetIds = [`u_packet-c-reset-${stamp}`, `p_packet-c-reset-${stamp}`]
  const sameEmail = `packet-c-same-${stamp}@example.test`
  const sameIds = [`u_packet-c-same-${stamp}`, `p_packet-c-same-${stamp}`]

  beforeAll(async () => {
    db = await import('../db')
    await db.ensureSchema()
  }, 60_000)

  afterAll(async () => {
    if (!db) return
    const client = db
    await Promise.allSettled([
      client.deleteAccountData(ids, email, 'all'),
      client.deleteAccountData(resetIds, resetEmail, 'all'),
      client.deleteAccountData(sameIds, sameEmail, 'all'),
    ])
    await client.sql.end()
  }, 60_000)

  it('removes every user-keyed row and both email identities', async () => {
    if (!db) throw new Error('integration database was not loaded')
    const { sql, ACCOUNT_TABLES, deleteAccountData } = db
    try {
      for (const id of ids) {
        await sql`insert into quest_users (id, email, name, start_date) values (${id}, ${email}, 'Synthetic', '2026-01-01')`
      }
      await sql`insert into quest_progress (user_id, task_id) values (${ids[0]}, 't0')`
      await sql`insert into quest_activity (user_id, kind) values (${ids[0]}, 'step')`
      await sql`insert into quest_busy (user_id, day) values (${ids[0]}, '2026-01-01')`
      await sql`insert into quest_checkins (user_id, task_id, message) values (${ids[0]}, 't0', 'synthetic')`
      await sql`insert into quest_messages (user_id, task_id, role, content) values (${ids[0]}, 't0', 'user', 'synthetic')`
      await sql`insert into quest_files (user_id, task_id, url, pathname, name, content_type, size) values (${ids[0]}, 't0', ${`https://blob.example/${stamp}`}, ${`packet-c/${stamp}`}, 'synthetic.txt', 'text/plain', 1)`
      await sql`insert into quest_cheers (user_id, from_name, message) values (${ids[0]}, 'Synthetic', 'synthetic')`
      await sql`insert into quest_profiles (user_id) values (${ids[0]})`
      await sql`insert into quest_pace (user_id, since, weekly_minutes) values (${ids[0]}, '2026-01-01', 60)`
      await sql`insert into quest_mcp_tokens (user_id, token_hash) values (${ids[1]}, ${`hash-${stamp}`})`
      await sql`insert into quest_evidence (user_id, task_id, items, results, passed, redactions) values (${ids[1]}, 'p1', ${sql.json([])}, ${sql.json([])}, false, 0)`
      await sql`insert into quest_passwords (email, hash) values (${email}, 'scrypt$test')`
      await sql`insert into quest_otps (email, code_hash, expires_at) values (${email}, 'synthetic', now() + interval '10 minutes')`
      await sql`insert into quest_recovery (email, code_hash, code_expires_at) values (${email}, 'synthetic', now() + interval '10 minutes')`

      await expect(db.listAccountBlobUrls(ids)).resolves.toEqual([`https://blob.example/${stamp}`])
      await deleteAccountData(ids, email, 'all')

      for (const table of ACCOUNT_TABLES) {
        const column = table === 'quest_users' ? 'id' : 'user_id'
        const rows = await sql.unsafe<{ n: number }[]>(`select count(*)::int as n from ${table} where ${column} = any($1)`, [ids])
        expect(Number(rows[0].n), table).toBe(0)
      }
      for (const table of ['quest_passwords', 'quest_otps', 'quest_recovery']) {
        const rows = await sql.unsafe<{ n: number }[]>(`select count(*)::int as n from ${table} where email = $1`, [email])
        expect(Number(rows[0].n), table).toBe(0)
      }

      // Deleting again is harmless and still reports success.
      await expect(deleteAccountData(ids, email, 'all')).resolves.toBeUndefined()
    } finally {
      try {
        await deleteAccountData(ids, email, 'all')
      } catch {
        // Keep the original failure; the afterAll also retries.
      }
    }
  })

  it('resets the password atomically, clears OTP/recovery and revokes both identities', async () => {
    if (!db) throw new Error('integration database was not loaded')
    const { sql, resetPasswordWithToken, deleteAccountData } = db
    const tokenHash = `token-${stamp}`
    try {
      for (const id of resetIds) {
        await sql`insert into quest_users (id, email, name, start_date) values (${id}, ${resetEmail}, 'Synthetic', '2026-01-01')`
      }
      await sql`insert into quest_passwords (email, hash) values (${resetEmail}, 'scrypt$old')`
      await sql`insert into quest_otps (email, code_hash, expires_at) values (${resetEmail}, 'synthetic', now() + interval '10 minutes')`
      await sql`insert into quest_recovery (email, code_hash, code_expires_at, token_hash, token_expires_at)
        values (${resetEmail}, '', null, ${tokenHash}, now() + interval '15 minutes')`
      const before = await sql<{ id: string; session_version: number }[]>`select id, session_version from quest_users where id = any(${resetIds})`

      await expect(resetPasswordWithToken(resetEmail, tokenHash, 'scrypt$new', resetIds)).resolves.toBe(true)
      const password = await sql<{ hash: string }[]>`select hash from quest_passwords where email = ${resetEmail}`
      expect(password[0]?.hash).toBe('scrypt$new')
      for (const table of ['quest_otps', 'quest_recovery']) {
        const rows = await sql.unsafe<{ n: number }[]>(`select count(*)::int as n from ${table} where email = $1`, [resetEmail])
        expect(Number(rows[0].n), table).toBe(0)
      }
      const after = await sql<{ id: string; session_version: number }[]>`select id, session_version from quest_users where id = any(${resetIds})`
      expect(after).toHaveLength(before.length)
      for (const row of after) expect(Number(row.session_version), row.id).not.toBe(Number(before.find((b) => b.id === row.id)?.session_version))

      // The token was consumed by the committed transaction.
      await expect(resetPasswordWithToken(resetEmail, tokenHash, 'scrypt$newer', resetIds)).resolves.toBe(false)
    } finally {
      try {
        await deleteAccountData(resetIds, resetEmail, 'all')
      } catch {
        // Keep the original failure; the afterAll also retries.
      }
    }
  })

  it('password-only deletion leaves the verified same-email identity intact', async () => {
    if (!db) throw new Error('integration database was not loaded')
    const { sql, deleteAccountData, getSessionVersion } = db
    const [uId, pId] = sameIds
    try {
      for (const id of sameIds) {
        await sql`insert into quest_users (id, email, name, start_date) values (${id}, ${sameEmail}, 'Synthetic', '2026-01-01')`
      }
      await sql`insert into quest_progress (user_id, task_id) values (${uId}, 't0'), (${pId}, 't0')`
      await sql`insert into quest_files (user_id, task_id, url, pathname, name, content_type, size) values
        (${uId}, 't0', ${`https://blob.example/${stamp}-u`}, ${`packet-c/${stamp}-u`}, 'u.txt', 'text/plain', 1),
        (${pId}, 't0', ${`https://blob.example/${stamp}-p`}, ${`packet-c/${stamp}-p`}, 'p.txt', 'text/plain', 1)`
      await sql`insert into quest_passwords (email, hash) values (${sameEmail}, 'scrypt$test')`
      await sql`insert into quest_otps (email, code_hash, expires_at) values (${sameEmail}, 'synthetic', now() + interval '10 minutes')`
      await sql`insert into quest_recovery (email, code_hash, code_expires_at) values (${sameEmail}, 'synthetic', now() + interval '10 minutes')`

      await deleteAccountData([pId], sameEmail, 'password')

      const count = async (table: string, where: string, value: string) => {
        const rows = await sql.unsafe<{ n: number }[]>(`select count(*)::int as n from ${table} where ${where} = $1`, [value])
        return Number(rows[0].n)
      }
      expect(await count('quest_users', 'id', pId)).toBe(0)
      expect(await count('quest_users', 'id', uId)).toBe(1)
      expect(await count('quest_progress', 'user_id', pId)).toBe(0)
      expect(await count('quest_progress', 'user_id', uId)).toBe(1)
      expect(await count('quest_files', 'user_id', pId)).toBe(0)
      expect(await count('quest_files', 'user_id', uId)).toBe(1)
      expect(await count('quest_passwords', 'email', sameEmail)).toBe(0)
      expect(await count('quest_recovery', 'email', sameEmail)).toBe(0)
      // The verified identity's pending email-code sign-in must survive a password deletion.
      expect(await count('quest_otps', 'email', sameEmail)).toBe(1)
      // Its quest_users row still exists, so its session version remains valid.
      await expect(getSessionVersion(uId)).resolves.not.toBeNull()
    } finally {
      try {
        await deleteAccountData(sameIds, sameEmail, 'all')
      } catch {
        // Keep the original failure; the afterAll also retries.
      }
    }
  })
})

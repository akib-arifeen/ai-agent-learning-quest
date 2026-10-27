import { del, list } from '@vercel/blob'
import { deleteAccountData, getPasswordHash, listAccountBlobUrls } from '@/lib/db'
import { fail, json, me, sameUser, withinLimit } from '@/lib/http'
import { checkPassword, endSession, idForEmail, idForPasswordEmail } from '@/lib/session'

const BLOB_ERROR = 'We couldn’t safely finish removing your uploaded files, so your account was not deleted. Some files may already be gone — please try again.'
const PARTIAL_ERROR = 'Your uploaded files were removed, but the rest of your account couldn’t be deleted. Your account is still active — please try again.'

/**
 * Permanently delete the signed-in learner's account and uploads. Files go first; the
 * database transaction is only attempted after Blob storage has confirmed cleanup, so a
 * partial failure can never be reported as success. A retry is safe and idempotent.
 *
 * A verified session may delete both same-email identities. An unverified password
 * session may delete only its own password identity, never the verified identity's rows,
 * Blob folder or pending sign-in code.
 */
export async function DELETE(req: Request) {
  const u = await me()
  if (!u) return fail('Sign in first.', 401)
  if (!sameUser(u, req)) return fail('You signed in as someone else in another tab — reloading.', 409)
  if (!withinLimit('account-delete', u.id, 5, 10 * 60_000)) return fail('Too many tries — wait a few minutes.', 429)

  const b = await req.json().catch(() => ({}))
  const verified = u.verified === true
  if (verified) {
    // Google / emailed-code accounts prove intent by typing the phrase; passwords are irrelevant.
    if (b.confirm !== 'DELETE MY ACCOUNT') return fail('Type DELETE MY ACCOUNT exactly to confirm.', 400)
  } else {
    // Password accounts must prove the current password; a typed phrase is not enough.
    const password = String(b.password || '')
    const stored = password ? await getPasswordHash(u.email) : null
    if (!password || !stored || !checkPassword(password, stored)) return fail('That password doesn’t match.', 403)
  }

  // Verified sessions own both identities for this email. Password sessions own only p_.
  const userIds = verified ? [...new Set([u.id, idForEmail(u.email), idForPasswordEmail(u.email)])] : [u.id]
  const emailAuth = verified ? 'all' : 'password'
  const token = process.env.BLOB_READ_WRITE_TOKEN

  let urls: string[]
  try {
    urls = await listAccountBlobUrls(userIds)
    // DB rows are the index, but a failed upload may leave an orphan under the same folder.
    // Only enumerate Blob storage when we have a token; otherwise del will fail honestly.
    if (token) {
      for (const id of userIds) {
        let cursor: string | undefined
        do {
          const page = await list({ prefix: `quests/${id}/`, cursor, token })
          for (const blob of page.blobs) if (blob.url) urls.push(blob.url)
          cursor = page.hasMore ? page.cursor : undefined
        } while (cursor)
      }
    }
  } catch (e) {
    console.error('account blob lookup', e)
    return fail(BLOB_ERROR, 502)
  }
  urls = [...new Set(urls.filter(Boolean))]

  if (urls.length) {
    try {
      await del(urls, { token })
    } catch (e) {
      console.error('account blob delete', e)
      return fail(BLOB_ERROR, 502)
    }
  }

  try {
    await deleteAccountData(userIds, u.email, emailAuth)
  } catch (e) {
    console.error('account database delete', e)
    return fail(PARTIAL_ERROR, 502)
  }

  await endSession()
  return json({ ok: true })
}

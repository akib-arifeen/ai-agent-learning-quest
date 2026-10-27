import { del } from '@vercel/blob'
import { deleteAccountData, getPasswordHash, listAccountBlobUrls } from '@/lib/db'
import { fail, json, me, sameUser, withinLimit } from '@/lib/http'
import { checkPassword, endSession, idForEmail, idForPasswordEmail } from '@/lib/session'

const BLOB_ERROR = 'We couldn’t safely finish removing your uploaded files, so your account was not deleted. Some files may already be gone — please try again.'
const PARTIAL_ERROR = 'Your uploaded files were removed, but the rest of your account couldn’t be deleted. Your account is still active — please try again.'

/**
 * Permanently delete the signed-in learner's account and uploads. Files go first; the
 * database transaction is only attempted after Blob storage has confirmed cleanup, so a
 * partial failure can never be reported as success. A retry is safe and idempotent.
 */
export async function DELETE(req: Request) {
  const u = await me()
  if (!u) return fail('Sign in first.', 401)
  if (!sameUser(u, req)) return fail('You signed in as someone else in another tab — reloading.', 409)
  if (!withinLimit('account-delete', u.id, 5, 10 * 60_000)) return fail('Too many tries — wait a few minutes.', 429)

  const b = await req.json().catch(() => ({}))
  if (u.verified) {
    // Google / emailed-code accounts prove intent by typing the phrase; passwords are irrelevant.
    if (b.confirm !== 'DELETE MY ACCOUNT') return fail('Type DELETE MY ACCOUNT exactly to confirm.', 400)
  } else {
    // Password accounts must prove the current password; a typed phrase is not enough.
    const password = String(b.password || '')
    const stored = password ? await getPasswordHash(u.email) : null
    if (!password || !stored || !checkPassword(password, stored)) return fail('That password doesn’t match.', 403)
  }

  const userIds = [...new Set([u.id, idForEmail(u.email), idForPasswordEmail(u.email)])]

  let urls: string[]
  try {
    urls = await listAccountBlobUrls(userIds)
  } catch (e) {
    console.error('account blob list', e)
    return fail(BLOB_ERROR, 502)
  }

  if (urls.length) {
    try {
      await del(urls, { token: process.env.BLOB_READ_WRITE_TOKEN })
    } catch (e) {
      console.error('account blob delete', e)
      return fail(BLOB_ERROR, 502)
    }
  }

  try {
    await deleteAccountData(userIds, u.email)
  } catch (e) {
    console.error('account database delete', e)
    return fail(PARTIAL_ERROR, 502)
  }

  await endSession()
  return json({ ok: true })
}

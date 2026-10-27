'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuest } from './QuestProvider'

const SCOPE = [
  'your quest progress and XP',
  'your quest notes and private reflections',
  'files you uploaded, stored in Vercel Blob',
  'your chats with Spark',
  'your onboarding and profile answers',
  'your MCP token and evidence submissions',
]

/**
 * Account deletion. Password accounts confirm the current password; Google/emailed-code
 * accounts type an exact phrase. Uploads are removed before the database transaction, so
 * the UI never claims success after a partial failure.
 */
export default function AccountSettings() {
  const { state } = useQuest()
  const verified = state.user.verified
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [status, setStatus] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function removeAccount(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setStatus('')
    setBusy(true)
    try {
      const res = await fetch('/api/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-quest-user': state.user.id },
        body: JSON.stringify(verified ? { confirm } : { password }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        setErr(b?.error || 'The account wasn’t deleted. Please try again.')
        setBusy(false)
        return
      }
      setStatus('Your account was deleted. Redirecting to sign-in…')
      setTimeout(() => window.location.assign('/'), 350)
    } catch {
      setErr(
        'We couldn’t confirm whether deletion finished — the connection dropped. Reload the page: if you’re signed out, it completed; if you’re still signed in, the account is still active, but some uploaded files may already have been removed. Reload and try again to reconcile.',
      )
      setBusy(false)
    }
  }

  return (
    <div className="pagecol" style={{ maxWidth: 720 }}>
      <div className="stack-sm">
        <span className="mono muted">Account &amp; data</span>
        <h1 style={{ fontSize: 'var(--text-3xl)' }}>Delete your account</h1>
        <p className="muted">
          Signed in as <b style={{ color: 'var(--color-ink)' }}>{state.user.email}</b>.{' '}
          {verified
            ? 'This permanently deletes this verified account and any password account for the same email.'
            : 'This permanently deletes this password account.'}{' '}
          It cannot be undone.
        </p>
      </div>

      <section className="card stack" aria-labelledby="account-scope-title">
        <h2 id="account-scope-title">What gets deleted</h2>
        <ul id="account-scope" className="stack-sm" style={{ margin: 0, paddingLeft: '1.2rem' }}>
          {SCOPE.map((item) => (
            <li key={item}>{item}</li>
          ))}
          {verified ? (
            <li>your password, sign-in code and recovery records</li>
          ) : (
            <li>your password and recovery records for this password account</li>
          )}
        </ul>
        <p className="muted">
          Downloaded or shared copies, and copies other people kept, cannot be recalled. Provider backups may age out on their own schedule, so deletion is
          not instantaneous everywhere.
        </p>
      </section>

      <form className="card stack" onSubmit={removeAccount} aria-describedby="account-scope">
        {verified ? (
          <>
            <div className="stack-sm">
              <h2>Confirm with the phrase</h2>
              <p className="muted">
                This account signs in with Google or an emailed code. Type <b>DELETE MY ACCOUNT</b> exactly to confirm. A password is not used for this
                account.
              </p>
            </div>
            <div className="field">
              <label htmlFor="account-confirm">Confirmation phrase</label>
              <input
                id="account-confirm"
                ref={inputRef}
                className="input"
                type="text"
                autoComplete="off"
                spellCheck={false}
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                aria-describedby="account-scope"
              />
            </div>
          </>
        ) : (
          <>
            <div className="stack-sm">
              <h2>Confirm with your password</h2>
              <p className="muted">This account signs in with a password. Enter the current password to confirm deletion.</p>
            </div>
            <div className="field">
              <label htmlFor="account-password">Current password</label>
              <input
                id="account-password"
                ref={inputRef}
                className="input"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-describedby="account-scope"
              />
            </div>
          </>
        )}

        <button className="btn btn--coral btn--lg btn--block" disabled={busy}>
          {busy ? 'Deleting…' : 'Permanently delete my account'}
        </button>
      </form>

      {err && (
        <p className="signin__err" role="alert" aria-live="assertive">
          {err}
        </p>
      )}
      {status && (
        <p className="signin__note" role="status" aria-live="polite">
          {status}
        </p>
      )}
    </div>
  )
}

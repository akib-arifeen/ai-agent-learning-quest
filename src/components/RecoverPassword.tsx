'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type SessionOpts = { google: string | null; otp: boolean }
type Step = 'email' | 'reset' | 'done'

const GENERIC = 'That code doesn’t match or has expired.'
const SENT =
  'If that address has a password account, a 6-digit code will be sent when email delivery is working. It expires in 10 minutes. No email? Check spam, then try again or use Google sign-in.'

/** POST one recovery step; returns the parsed body without throwing on 4xx. */
async function postRecovery(body: Record<string, unknown>) {
  const res = await fetch('/api/recovery', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data: data as { error?: string; token?: string } }
}

/**
 * Password recovery: request a code, verify it and choose a new password. Public, so the
 * unsigned-in page can use it. The UI never reveals whether an address has an account.
 */
export default function RecoverPassword() {
  const [opts, setOpts] = useState<SessionOpts | null>(null)
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  // The verified reset token is kept so a network/5xx failure does not re-run verify
  // against an already-consumed code.
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [note, setNote] = useState('')
  const emailRef = useRef<HTMLInputElement>(null)
  const codeRef = useRef<HTMLInputElement>(null)
  const doneRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    fetch('/api/session')
      .then((r) => r.json())
      .then((o: SessionOpts) => setOpts(o))
      .catch(() => setOpts({ google: null, otp: false }))
  }, [])

  useEffect(() => {
    if (!opts?.otp) return
    if (step === 'email') emailRef.current?.focus()
    else if (step === 'reset') codeRef.current?.focus()
    else doneRef.current?.focus()
  }, [opts?.otp, step])

  async function requestCode(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setNote('')
    setToken('')
    setCode('')
    setPassword('')
    setBusy(true)
    try {
      const r = await postRecovery({ action: 'request', email: email.trim() })
      if (!r.ok) {
        setErr(r.data.error || 'Couldn’t send a code just now. Try again.')
        return
      }
      setStep('reset')
      setNote(SENT)
    } catch {
      setErr('Couldn’t reach the server. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      let activeToken = token
      if (!activeToken) {
        const verified = await postRecovery({ action: 'verify', email: email.trim(), code })
        if (!verified.ok || !verified.data.token) {
          setErr(verified.data.error || GENERIC)
          return
        }
        activeToken = verified.data.token
        setToken(activeToken)
      }
      // Reuse the stored token: the code was consumed by verify and cannot be verified twice.
      const reset = await postRecovery({ action: 'reset', email: email.trim(), token: activeToken, password })
      if (!reset.ok) {
        if (reset.status === 401) {
          setToken('')
          setCode('')
          setPassword('')
          setNote('')
          setStep('email')
          setErr('That reset link has expired. Request a new code.')
          return
        }
        setErr(reset.data.error || GENERIC)
        return
      }
      setToken('')
      setNote('')
      setStep('done')
    } catch {
      setErr('Couldn’t reach the server. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  if (!opts) {
    return (
      <main className="page" style={{ maxWidth: 560 }}>
        <p className="muted" role="status">
          Checking sign-in options…
        </p>
      </main>
    )
  }

  if (!opts.otp) {
    return (
      <main className="page" style={{ maxWidth: 560 }}>
        <div className="card stack">
          <span className="mono muted">Creative AI Agent Quest</span>
          <h1 style={{ fontSize: 'var(--text-2xl)' }}>Email password recovery isn’t available on this site yet</h1>
          <p className="muted">
            If you signed up with Google, use Google sign-in. If you use a password, sign in with it. Email delivery must be enabled before we can send reset
            codes.
          </p>
          <Link href="/" className="btn btn--lg btn--block">
            Go to sign-in
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="page" style={{ maxWidth: 560 }}>
      <div className="card stack">
        <span className="mono muted">Creative AI Agent Quest</span>

        {step === 'email' && (
          <>
            <div className="stack-sm">
              <h1 style={{ fontSize: 'var(--text-2xl)' }}>Reset your password</h1>
              <p className="muted">Enter the email you used. If it has a password account, we’ll send a 6-digit code.</p>
            </div>
            <form className="stack" onSubmit={requestCode}>
              <div className="field">
                <label htmlFor="recover-email">Email</label>
                <input
                  id="recover-email"
                  ref={emailRef}
                  className="input"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button className="btn btn--lg btn--block" disabled={busy}>
                {busy ? 'Sending…' : 'Send me a code'}
              </button>
            </form>
          </>
        )}

        {step === 'reset' && (
          <>
            <div className="stack-sm">
              <h1 style={{ fontSize: 'var(--text-2xl)' }}>Enter your code</h1>
              <p className="muted">Use the 6-digit code from the email, then choose a new password.</p>
            </div>
            <form className="stack" onSubmit={resetPassword}>
              <div className="field">
                <label htmlFor="recover-code">6-digit code</label>
                <input
                  id="recover-code"
                  ref={codeRef}
                  className="input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  pattern="[0-9]*"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              </div>
              <div className="field">
                <label htmlFor="recover-password">New password</label>
                <input
                  id="recover-password"
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <small className="muted">At least 6 characters.</small>
              </div>
              <button className="btn btn--lg btn--block" disabled={busy}>
                {busy ? 'Saving…' : 'Reset password'}
              </button>
            </form>
            <button
              type="button"
              className="linkbtn"
              style={{ justifySelf: 'center' }}
              onClick={() => {
                setStep('email')
                setErr('')
                setNote('')
                setToken('')
                setCode('')
                setPassword('')
              }}
            >
              Use a different email or request a new code
            </button>
          </>
        )}

        {step === 'done' && (
          <>
            <h1 ref={doneRef} tabIndex={-1} style={{ fontSize: 'var(--text-2xl)' }}>
              Password changed
            </h1>
            <p className="muted">Your other sessions have been signed out. Sign in with your new password.</p>
            <Link href="/" className="btn btn--lg btn--block">
              Sign in
            </Link>
          </>
        )}

        {err && (
          <p className="signin__err" role="alert" aria-live="assertive">
            {err}
          </p>
        )}
        {note && (
          <p className="signin__note" role="status" aria-live="polite">
            {note}
          </p>
        )}

        {step !== 'done' && (
          <Link href="/" className="linkbtn" style={{ justifySelf: 'center' }}>
            <ArrowLeft size={14} style={{ verticalAlign: '-2px' }} /> Back to sign in
          </Link>
        )}
      </div>
    </main>
  )
}

'use client'

import { Check, Copy, KeyRound, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { type Submission, proTaskById } from '@/lib/pro'
import { toolOf } from '@/lib/tools'
import Diagram from './Diagram'
import { useQuest } from './QuestProvider'
import Rich from './Rich'

/** The first thing to ask a connected agent. */
export const FIRST_PROMPT = 'Use the quest MCP server: call quest_whoami, then quest_get_task for p1.'

const stamp = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** "5 minutes ago", "2 hours ago", "3 days ago", or a short date once it is older than a week. */
function ago(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`
  const days = Math.round(hrs / 24)
  if (days <= 7) return `${days} day${days === 1 ? '' : 's'} ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/** Text with a Copy button. Falls back to selecting the text when the clipboard is blocked. Announces "Copied" politely. */
export function CopyBox({ text, label, block }: { text: string; label: string; block?: boolean }) {
  const [msg, setMsg] = useState('')
  const copied = msg.startsWith('Copied')
  const el = useRef<HTMLElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const placeholder = text.includes('YOUR_TOKEN')

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setMsg(placeholder ? 'Copied. Replace YOUR_TOKEN with your token first.' : 'Copied')
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setMsg(''), 2200)
    } catch {
      const node = el.current
      if (!node) return
      const range = document.createRange()
      range.selectNodeContents(node)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
      setMsg('Press Ctrl+C (or Cmd+C) to copy')
    }
  }, [text, placeholder])

  return (
    <div className="copybox">
      {block ? (
        <pre className="code" ref={el as React.RefObject<HTMLPreElement>} tabIndex={0} role="region" aria-label={`${label.charAt(0).toUpperCase()}${label.slice(1)}`}>
          {text}
        </pre>
      ) : (
        <code className="copybox__line" ref={el}>
          {text}
        </code>
      )}
      <button type="button" className="btn btn--sm btn--soft" onClick={copy}>
        {copied ? <Check size={16} /> : <Copy size={16} />} Copy<span className="sr-only"> {label}</span>
      </button>
      <span className="sr-only" aria-live="polite">
        {msg}
      </span>
    </div>
  )
}

type Line = { evidenceId: string; ok: boolean; text: string; n: number }

/** Group results by evidence id in order: one ✓ line for an all-passing id, one ✗ line per failing result otherwise. */
function collapse(results: Submission['results'], labelOf: (id: string, msg: string) => string): Line[] {
  const order: string[] = []
  const groups = new Map<string, Submission['results']>()
  for (const r of results) {
    if (!groups.has(r.evidenceId)) {
      groups.set(r.evidenceId, [])
      order.push(r.evidenceId)
    }
    groups.get(r.evidenceId)!.push(r)
  }
  const out: Line[] = []
  for (const id of order) {
    const rs = groups.get(id)!
    const bad = rs.filter((r) => !r.ok)
    if (bad.length === 0) out.push({ evidenceId: id, ok: true, text: labelOf(id, rs[0].message), n: rs.length })
    else for (const r of bad) out.push({ evidenceId: id, ok: false, text: r.message, n: 1 })
  }
  return out
}

/** One stored submission: when, passed or not yet, what was removed, each result, and what the agent sent. */
export function SubmissionCard({ s, compact }: { s: Submission; compact?: boolean }) {
  const spec = proTaskById(s.task_id)
  const lines = collapse(s.results, (id, msg) => spec?.evidence.find((e) => e.id === id)?.label || msg.split(':')[0])
  return (
    <article className={`card subm ${compact ? 'subm--compact' : ''}`}>
      <div className="row">
        <time className="subm__time" dateTime={s.created_at}>
          {stamp(s.created_at)}
        </time>
        {compact && <span className="chip chip--line mono">{s.task_id}</span>}
        <span className={`chip ${s.passed ? 'chip--mint' : 'chip--coral'}`}>{s.passed ? 'PASSED' : 'NOT YET'}</span>
        {s.redactions > 0 && (
          <span className="chip chip--line">
            {s.redactions} secret-looking string{s.redactions === 1 ? '' : 's'} removed
          </span>
        )}
      </div>
      <ul className="subm__results">
        {lines.map((l, i) => (
          <li key={`${l.evidenceId}-${i}`} className={l.ok ? 'is-ok' : 'is-bad'}>
            <span aria-hidden>{l.ok ? '✓' : '✗'}</span>
            <span className="sr-only">{l.ok ? 'Passed: ' : 'Not yet: '}</span>
            <code>{l.evidenceId}</code>
            <span>
              {l.text}
              {l.n > 1 && <span className="subm__n"> ({l.n} checks)</span>}
            </span>
          </li>
        ))}
      </ul>
      <details className="chat">
        <summary>What your agent sent</summary>
        {s.items.map((it) => (
          <div key={it.id} className="subm__item">
            <b>
              <code>{it.id}</code>
              {it.source && <span className="muted"> · {it.source}</span>}
            </b>
            <pre className="code code--sent" tabIndex={0} role="region" aria-label={`Content of ${it.id}`}>
              {it.content}
            </pre>
          </div>
        ))}
      </details>
    </article>
  )
}

/** "Connect your agent": make a token, show it once, give the config for the learner's tool and a first prompt to try. */
export default function ConnectAgent() {
  const { state, setup, refresh, error } = useQuest()
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const { hasToken, lastUsed } = state.pro
  const mcp = toolOf(setup.tool).mcp

  async function make() {
    if (hasToken && !window.confirm('This replaces your old token. Any agent using it will need the new one.')) return
    setBusy(true)
    try {
      const res = await fetch('/api/pro/token', { method: 'POST' })
      const b = await res.json().catch(() => ({}))
      if (!res.ok || !b.token) return error(b.error || 'Couldn’t make a token. Try again.')
      setToken(b.token)
      void refresh()
    } finally {
      setBusy(false)
    }
  }

  const url = typeof window === 'undefined' ? '/api/mcp' : `${window.location.origin}/api/mcp`
  const fill = (t: string) => t.replaceAll('{url}', url).replaceAll('{token}', token || 'YOUR_TOKEN')
  const snippet = mcp && fill(mcp.snippet)
  const status = lastUsed ? `Connected · last call ${ago(lastUsed)}` : hasToken ? 'Waiting for your agent’s first call' : 'Not connected yet'

  return (
    <section className="card stack connect" id="connect" aria-labelledby="connect-h">
      <div className="row connect__head">
        <h2 id="connect-h">Connect your agent</h2>
        <span className={`chip ${lastUsed ? 'chip--mint' : hasToken ? 'chip--pear' : 'chip--line'}`}>{status}</span>
      </div>
      <p className="muted">Your agent talks to this app over MCP. Make a token, add it to your agent’s settings, then ask it to try a level.</p>
      <Diagram name="mcp" compact />

      <div className="row">
        <button type="button" className="btn btn--cyan" onClick={make} disabled={busy}>
          <KeyRound size={18} /> {hasToken ? 'Make a new token' : 'Create my token'}
        </button>
      </div>

      {token && (
        <div className="stack-sm">
          <b>Your token. Copy it now: it is shown once.</b>
          <CopyBox text={token} label="token" />
          <p className="muted">Shown once. Lost it? Make a new token; the old one stops working straight away.</p>
        </div>
      )}

      {mcp ? (
        <div className="stack-sm">
          <b>{mcp.where}</b>
          <CopyBox text={snippet || ''} label="config snippet" block />
          <p className="muted">Keep the token out of git: use your user (global) config or an environment variable, never a project file you commit.</p>
          {mcp.note && (
            <p className="muted">
              <Rich text={fill(mcp.note)} />
            </p>
          )}
          <a href={mcp.source} target="_blank" rel="noreferrer" className="linkbtn" style={{ justifySelf: 'start' }}>
            Docs
          </a>
        </div>
      ) : (
        <p className="muted">Pick your tool on the You page and the exact steps show up here.</p>
      )}

      <div className="stack-sm">
        <b>Then ask your agent:</b>
        <CopyBox text={FIRST_PROMPT} label="prompt" />
      </div>

      <p className="connect__privacy">
        <ShieldCheck size={18} aria-hidden />
        <span>
          Your agent sends only what a level lists: file contents and command output. Anything that looks like a key or password is removed before saving. Every
          submission appears on its level’s page, and no one else is shown it. Checks look at the shape of your evidence; you, and Spark when you ask, can review what you sent. Nothing is shared by default. It’s a learning loop, not proctoring. Never paste your token anywhere public.
        </span>
      </p>
    </section>
  )
}

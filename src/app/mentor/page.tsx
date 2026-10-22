'use client'

import Link from 'next/link'
import { ArrowLeft, Send } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { SubmissionCard } from '@/components/ConnectAgent'
import { FileThumb } from '@/components/Creations'
import PageHead from '@/components/PageHead'
import { useQuest } from '@/components/QuestProvider'
import { type QuestState, dayOf, deadlineOf, firstName, fmtDay, questStatus, summarize } from '@/lib/game'
import { PRO_TASKS, type Submission, proTaskById } from '@/lib/pro'
import { setupOf } from '@/lib/profile'
import { QUESTS, questById, variantOf } from '@/lib/quest'
import { toolOf } from '@/lib/tools'

type Msg = { id: number; task_id: string; role: string; content: string; created_at: string }

const PRO_CHATS = PRO_TASKS

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

// Plain-English line for each activity kind in the feed.
const FEED: Record<string, string> = {
  step: 'ticked',
  sitting: 'wrapped up',
  complete: 'completed',
  checkin: 'checked in',
  upload: 'uploaded',
  variant: 'swapped to',
  own_idea: 'added their own twist',
  busy: 'marked busy',
  unbusy: 'unmarked busy',
  coach: 'asked Spark',
  cheer: 'you cheered',
  onboarded: 'personalised their quest for',
  evidence: 'sent evidence for',
}

/** Short label for a task id: Base Camp, Qn, or Pro Ln for pro track ids. */
const taskLabel = (id: string) => {
  const pro = proTaskById(id)
  if (pro) return `Pro L${pro.level}`
  const q = questById(id)
  return q?.num === 0 ? 'Base Camp' : `Q${q?.num}`
}

/**
 * Mentor HQ — everyone who has signed in, as cards (rank, streak, pace, last seen).
 * Tap one to open their detail. Only mentor emails (ADMIN_EMAILS) get data back.
 */
export default function MentorPage() {
  const { today, error, state: mine } = useQuest()
  const [learners, setLearners] = useState<QuestState[] | null>(null)
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    if (!mine.mentor) return
    fetch('/api/mentor', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((b) => setLearners(b.learners))
      .catch(() => error('Couldn’t load your learners.'))
  }, [mine.mentor, error, open])

  if (!mine.mentor)
    return (
      <div className="loading">
        This page is for mentors.
        <Link href="/" className="btn">
          Back to my map
        </Link>
      </div>
    )
  if (open) return <LearnerDetail userId={open} onBack={() => setOpen(null)} />
  if (!learners) return <div className="loading">Loading your learners…</div>

  return (
    <div className="mentor">
      <div>
        <PageHead title="Mentor HQ">
          Everyone who signs in at <b style={{ color: 'var(--color-ink)' }}>{typeof window !== 'undefined' ? window.location.host : ''}</b> shows up here. Tap
          someone to see their progress.
        </PageHead>
      </div>
      <div className="learners">
        {learners.map((st) => {
          const sum = summarize(st, today)
          return (
            <button key={st.user.id} className="learner" onClick={() => setOpen(st.user.id)}>
              <span className="avatar" style={{ width: 48, height: 48 }}>
                {st.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={st.user.image} alt="" referrerPolicy="no-referrer" />
                ) : (
                  <span>{firstName(st.user.name).slice(0, 1)}</span>
                )}
              </span>
              <span className="learner__main">
                <b>{st.user.name}</b>
                <small>
                  Rank {sum.rank.level} · {sum.xp} XP · {sum.questsDone}/10 quests · streak {sum.streak}
                </small>
                <small>Last seen {when(st.user.lastSeen)}</small>
                {st.profile?.tool && (
                  <small>
                    <span className="chip chip--line">{toolOf(st.profile.tool).name}</span>
                  </small>
                )}
              </span>
              <span className={`chip ${sum.pace.behind ? 'chip--coral' : sum.pace.ahead ? 'chip--mint' : 'chip--pear'}`}>
                {sum.pace.finished ? 'Finished' : sum.pace.behind ? `${sum.pace.behind} behind` : sum.pace.ahead ? `${sum.pace.ahead} ahead` : 'On track'}
              </span>
            </button>
          )
        })}
        {!learners.length && <p className="muted">No one has signed in yet.</p>}
      </div>
    </div>
  )
}

/** One learner up close: pace, quests vs deadlines, check-ins, notes, chats, and a cheer box. */
function LearnerDetail({ userId, onBack }: { userId: string; onBack: () => void }) {
  const { today, error } = useQuest()
  const [data, setData] = useState<{ state: QuestState; messages: Msg[]; evidence?: Submission[] } | null>(null)
  const [cheer, setCheer] = useState('')
  const [sent, setSent] = useState(false)

  const load = useCallback(() => {
    fetch(`/api/mentor?userId=${encodeURIComponent(userId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => error('Couldn’t load this learner.'))
  }, [error, userId])
  useEffect(load, [load])

  if (!data) return <div className="loading">Loading…</div>
  const { state, messages } = data
  const sum = summarize(state, today)
  const lastAct = state.activity.find((a) => a.kind !== 'cheer')

  // Give a learner who forgot their password a temporary one to pass on.
  async function resetPassword() {
    if (!window.confirm(`Give ${firstName(state.user.name)} a new temporary password?`)) return
    const res = await fetch('/api/mentor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) })
    const b = await res.json().catch(() => ({}))
    if (!res.ok) return error(b.error || 'Couldn’t reset it.')
    window.prompt('Send them this temporary password (copy it now):', b.password)
  }

  async function sendCheer(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/cheer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, message: cheer }) })
    if (!res.ok) return error('Cheer didn’t send.')
    setCheer('')
    setSent(true)
    setTimeout(() => setSent(false), 2500)
    load()
  }

  return (
    <div className="mentor">
      <div>
        <button className="back" onClick={onBack} style={{ border: 0, background: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={18} /> All learners
        </button>
        <h1 style={{ fontSize: 'var(--text-3xl)' }}>How {firstName(state.user.name)}’s doing</h1>
        <p className="muted" style={{ marginTop: 6 }}>
          {state.user.email} · started {state.startDate ? fmtDay(state.startDate) : '—'} · last active: {lastAct ? when(lastAct.at) : 'not started yet'} ·{' '}
          <button className="linkbtn" onClick={resetPassword}>
            Reset password
          </button>
        </p>
      </div>

      <div className="kpis">
        <div className="stat">
          <span className="stat__num">{sum.questsDone}/10</span>
          <span className="stat__label">Quests done</span>
        </div>
        <div className="stat">
          <span className="stat__num" style={{ color: sum.pace.behind ? 'var(--color-accent-3-deep)' : 'var(--color-mint-deep)' }}>
            {sum.pace.finished ? '✓' : sum.pace.behind ? `−${sum.pace.behind}` : sum.pace.ahead ? `+${sum.pace.ahead}` : '0'}
          </span>
          <span className="stat__label">{sum.pace.behind ? 'Days behind' : sum.pace.ahead ? 'Days ahead' : 'On track'}</span>
        </div>
        <div className="stat stat--streak">
          <span className="stat__num">{sum.streak}</span>
          <span className="stat__label">Streak (best {sum.best})</span>
        </div>
        <div className="stat">
          <span className="stat__num">{sum.rank.level}</span>
          <span className="stat__label">
            {sum.rank.name} · {sum.xp} XP
          </span>
        </div>
      </div>

      <form className="card stack-sm" onSubmit={sendCheer}>
        <h2>Send {firstName(state.user.name)} a cheer</h2>
        <p className="muted">It pops up on their home screen until they dismiss it.</p>
        <textarea className="textarea" value={cheer} onChange={(e) => setCheer(e.target.value)} placeholder="Saw your stardust page — the explode effect is so good. Can’t wait for the desk pet!" />
        <div className="row">
          <button className="btn btn--cyan" disabled={!cheer.trim()}>
            <Send size={18} /> Send cheer
          </button>
          {sent && <span className="chip chip--mint">Sent!</span>}
        </div>
      </form>

      <section className="stack">
        <h2 style={{ fontSize: 'var(--text-2xl)' }}>Quests</h2>
        <div className="mq">
          {QUESTS.map((q) => {
            const p = state.progress[q.id]
            const v = variantOf(q, p?.variant, setupOf(state.profile))
            const st = questStatus(state, q)
            const due = deadlineOf(sum.slots, q.id)
            const doneDay = p?.completed_at ? dayOf(p.completed_at) : ''
            const ticks = p?.steps.length || 0
            const steps = v.sittings.reduce((a, s) => a + s.steps.length, 0)
            const checks = state.checkins.filter((c) => c.task_id === q.id)
            const chat = messages.filter((m) => m.task_id === q.id)
            return (
              <div key={q.id} className="mq__row">
                <div className="mq__top">
                  <b>
                    {q.num === 0 ? 'Base Camp' : `Q${q.num} · ${v.title}`}
                    {v.id !== 'main' && <span className="chip chip--lav" style={{ marginLeft: 8 }}>swapped</span>}
                  </b>
                  {st === 'done' ? (
                    <span className={`chip ${doneDay <= due ? 'chip--mint' : 'chip--coral'}`}>
                      Done {fmtDay(doneDay)} {doneDay < due ? '(early)' : doneDay > due ? '(late)' : ''}
                    </span>
                  ) : st === 'active' ? (
                    <span className={`chip ${due < today ? 'chip--coral' : 'chip--pear'}`}>In progress · due {fmtDay(due)}</span>
                  ) : (
                    <span className="chip">Locked · due {fmtDay(due)}</span>
                  )}
                  <span className="chip chip--line tnum">
                    {ticks}/{steps} steps · {p?.sittings.length || 0}/{v.sittings.length} sittings
                  </span>
                </div>
                {p?.sittings.filter((x) => x.next).map((x) => (
                  <small key={x.n} className="muted">
                    Next-time note (sitting {x.n + 1}): {x.next}
                  </small>
                ))}
                {p?.own_idea && <small className="muted">Own twist: {p.own_idea}</small>}
                {p?.notes && (
                  <details className="chat">
                    <summary>Her notes</summary>
                    <p style={{ whiteSpace: 'pre-wrap', fontSize: 'var(--text-sm)', marginTop: 6 }}>{p.notes}</p>
                  </details>
                )}
                {state.files.some((f) => f.task_id === q.id) && (
                  <div className="thumbs-grid">
                    {state.files
                      .filter((f) => f.task_id === q.id)
                      .map((f) => (
                        <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="thumb" title={f.name}>
                          <span className="thumb__media">
                            <FileThumb f={f} />
                          </span>
                          <span className="thumb__name">{f.name}</span>
                        </a>
                      ))}
                  </div>
                )}
                {checks.length > 0 && (
                  <div className="stack-sm">
                    {checks.map((c) => (
                      <div key={c.id} className="row" style={{ alignItems: 'flex-start' }}>
                        {c.has_image && (
                          <a href={`/api/checkin?id=${c.id}`} target="_blank" rel="noreferrer" className="thumbs">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`/api/checkin?id=${c.id}`} alt="Check-in screenshot" />
                          </a>
                        )}
                        <small style={{ flex: 1, minWidth: 160 }}>
                          <b>Check-in {when(c.created_at)}</b>
                          <br />
                          {c.message || <span className="muted">(no message)</span>}
                        </small>
                      </div>
                    ))}
                  </div>
                )}
                {chat.length > 0 && (
                  <details className="chat">
                    <summary>Chats with Spark ({chat.filter((m) => m.role === 'user').length} questions)</summary>
                    {chat.map((m) => (
                      <div key={m.id} className={`bubble ${m.role === 'user' ? 'bubble--me' : 'bubble--spark'}`} style={{ whiteSpace: 'pre-wrap' }}>
                        {m.content}
                      </div>
                    ))}
                  </details>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section className="stack-sm" aria-labelledby="pro-ev-h">
        <h2 id="pro-ev-h" style={{ fontSize: 'var(--text-2xl)' }}>Pro track evidence</h2>
        {data.evidence?.length ? data.evidence.map((s) => <SubmissionCard key={s.id} s={s} compact />) : <p className="muted">No evidence yet.</p>}
      </section>

      {PRO_CHATS.map((t) => {
        const ms = messages.filter((m) => m.task_id === t.id)
        if (!ms.length) return null
        return (
          <details key={t.id} className="chat card">
            <summary>
              Pro L{t.level} · {t.title} ({ms.filter((m) => m.role === 'user').length} questions)
            </summary>
            {ms.map((m) => (
              <div key={m.id} className={`bubble ${m.role === 'user' ? 'bubble--me' : 'bubble--spark'}`} style={{ whiteSpace: 'pre-wrap' }}>
                {m.content}
              </div>
            ))}
          </details>
        )
      })}

      {messages.some((m) => m.task_id === 'general') && (
        <details className="chat card">
          <summary>General chats with Spark</summary>
          {messages
            .filter((m) => m.task_id === 'general')
            .map((m) => (
              <div key={m.id} className={`bubble ${m.role === 'user' ? 'bubble--me' : 'bubble--spark'}`} style={{ whiteSpace: 'pre-wrap' }}>
                {m.content}
              </div>
            ))}
        </details>
      )}

      <section className="card stack-sm">
        <h2>Activity</h2>
        {state.busy.length > 0 && <p className="muted">Busy days: {state.busy.map((d) => fmtDay(d)).join(', ')}</p>}
        <ul className="feed">
          {state.activity.slice(0, 60).map((a, i) => (
            <li key={i}>
              <time>{when(a.at)}</time>
              <span>
                {FEED[a.kind] || a.kind} {a.task_id ? <b>{taskLabel(a.task_id)}</b> : null}
                {a.detail ? `${a.kind === 'onboarded' ? ' ' : ' — '}${a.detail}` : ''}
              </span>
            </li>
          ))}
          {!state.activity.length && <li className="muted">Nothing yet.</li>}
        </ul>
      </section>
    </div>
  )
}

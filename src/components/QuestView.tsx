'use client'

import { AnimatePresence, motion } from 'motion/react'
import Link from 'next/link'
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Clock,
  Crown,
  FlaskConical,
  GraduationCap,
  Lightbulb,
  Lock,
  MessageCircle,
  NotebookPen,
  Shuffle,
  Sparkles,
  Star,
  Target,
  Trophy,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { XP, deadlineOf, dayOf, fmtDay, isComplete, progressOf, questStatus } from '@/lib/game'
import { LEVELS, QUESTS, type Quest, type Variant, variantOf } from '@/lib/quest'
import { confetti } from './Celebrate'
import Creations from './Creations'
import Modal from './Modal'
import { useQuest } from './QuestProvider'
import Spark from './Spark'

/** A full quest: the brief on the left, her checklist + notes on the right. */
export default function QuestView({ quest: q }: { quest: Quest }) {
  const { state, sum, act, openCoach } = useQuest()
  const p = progressOf(state, q.id)
  const v = variantOf(q, p.variant)
  const lv = LEVELS[q.level]
  const status = questStatus(state, q)
  const due = deadlineOf(sum.slots, q.id)
  const prevQuest = QUESTS[QUESTS.findIndex((x) => x.id === q.id) - 1]
  const [swap, setSwap] = useState(false)

  return (
    <div data-tone={lv.tone}>
      <Link href="/" className="back">
        <ArrowLeft size={18} /> Quest map
      </Link>

      <motion.header className="qhero" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
        <div className="qhero__meta">
          <span className="mono">{q.num === 0 ? 'Start' : `Level ${q.level} · Quest ${q.num}`}</span>
          {q.boss && (
            <span className="chip chip--coral">
              <Crown size={14} /> {q.num === 10 ? 'Final boss' : 'Boss quest'}
            </span>
          )}
          {v.id !== 'main' && (
            <span className="chip chip--lav">
              <Shuffle size={14} /> Remix
            </span>
          )}
        </div>
        <h1>{v.title}</h1>
        <p className="qhero__tag">{v.tagline}</p>
        <div className="qhero__chips">
          <span className="chip chip--line">
            <Clock size={14} /> {q.time}
          </span>
          <span className="chip chip--pear">
            <Star size={14} /> +{q.xp} XP
          </span>
          {status === 'done' && p.completed_at ? (
            <span className="chip chip--mint">
              <Check size={14} /> Done {fmtDay(dayOf(p.completed_at))}
            </span>
          ) : (
            due && (
              <span className="chip chip--line">
                <Target size={14} /> Due {fmtDay(due)}
              </span>
            )
          )}
        </div>
        <div className="qhero__actions">
          <button className="btn btn--cyan" onClick={() => openCoach(q.id)}>
            <MessageCircle size={18} /> Ask Spark
          </button>
          {q.variants.length > 1 && status !== 'done' && (
            <button className="btn btn--soft" onClick={() => setSwap(true)}>
              <Shuffle size={18} /> Not feeling it? Swap
            </button>
          )}
        </div>
        {status === 'locked' && (
          <div className="locked-note">
            <Lock size={20} /> Finish {prevQuest?.num === 0 ? 'Base Camp' : `Quest ${prevQuest?.num}`} to unlock this one. Peek all you like.
          </div>
        )}
      </motion.header>

      <div className="qgrid">
        <div className="qgrid__main">
          <Brief v={v} />
          {status !== 'locked' && <Creations taskId={q.id} />}
          <Notes taskId={q.id} initial={p.notes} />
        </div>
        {/* Just the checklist on the side, pinned while the brief scrolls. */}
        <aside className="qgrid__side">
          <Run quest={q} v={v} />
        </aside>
      </div>

      <SwapSheet
        open={swap}
        onClose={() => setSwap(false)}
        quest={q}
        current={v.id}
        hasProgress={p.steps.length > 0 || p.sittings.length > 0}
        onSwap={(id) => act(q.id, 'variant', { variant: id })}
      />
    </div>
  )
}

/**
 * The mission text. Only "what to make" and "done when" are open; tips and the concept
 * card fold away so the page isn't a wall of text — she opens them when she needs them.
 */
function Brief({ v }: { v: Variant }) {
  return (
    <>
      <section className="card">
        <h2 className="section-title">
          <span className="ico">
            <Sparkles size={18} />
          </span>
          The mission
        </h2>
        <ul className="make">
          {v.make.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </section>

      <section className="done-when">
        <span className="mono">Done when</span>
        <p>{v.expected}</p>
        {v.stretch && <small>Stretch goal: {v.stretch}</small>}
      </section>

      <details className="fold card">
        <summary>
          <span className="ico">
            <Lightbulb size={18} />
          </span>
          <span>
            <b>Tips</b>
            <small>{v.tips.length} hints · not prompts, you write those</small>
          </span>
          <ChevronDown className="fold__chev" size={20} />
        </summary>
        <ul className="tips">
          {v.tips.map((t) => (
            <li key={t}>
              <Check size={16} strokeWidth={3} />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </details>

      <details className="fold concept">
        <summary>
          <span className="ico">
            <GraduationCap size={18} />
          </span>
          <span>
            <b>Concept: {v.concept.name}</b>
            <small>What this quest teaches you</small>
          </span>
          <ChevronDown className="fold__chev" size={20} />
        </summary>
        <p>{v.concept.body}</p>
        {v.concept.experiment && (
          <div className="experiment">
            <FlaskConical size={18} />
            <span>
              <b>Try this: </b>
              {v.concept.experiment}
            </span>
          </div>
        )}
        <p className="muted">
          <b>You’re learning:</b> {v.learning}
        </p>
      </details>
    </>
  )
}

/** Her run through the quest: steps grouped by sitting, wrap-ups, and the finish line. */
function Run({ quest: q, v }: { quest: Quest; v: Variant }) {
  const { state, act } = useQuest()
  const p = progressOf(state, q.id)
  const status = questStatus(state, q)
  const done = isComplete(p)
  const locked = status === 'locked'
  const [wrap, setWrap] = useState<number | null>(null)
  const [finish, setFinish] = useState(false)
  const total = v.sittings.reduce((a, s) => a + s.steps.length, 0)
  const ticked = p.steps.filter((id) => {
    const [si, i] = id.split('-').map(Number)
    return !!v.sittings[si]?.steps[i]
  }).length
  const pct = done ? 1 : total ? ticked / total : 0
  const lastN = v.sittings.length - 1
  // Only the sitting she's on is open; the rest collapse to a title row.
  const current = Math.max(
    0,
    v.sittings.findIndex((_, si) => !done && !p.sittings.some((x) => x.n === si)),
  )
  const [open, setOpen] = useState<number>(current)
  useEffect(() => setOpen(current), [current])

  return (
    <section className="card stack">
      <div>
        <div className="run__head">
          <h2>Your run</h2>
          <span className="spacer" />
          <span className="chip chip--tone tnum">
            {ticked}/{total} steps
          </span>
        </div>
        <div className="progressbar">
          <motion.span initial={false} animate={{ scaleX: pct }} transition={{ type: 'spring', stiffness: 140, damping: 22 }} />
        </div>
      </div>

      {v.sittings.map((sit, si) => {
        const rec = p.sittings.find((x) => x.n === si)
        const sitDone = done || !!rec
        return (
          <div key={si} className={`sitting ${sitDone ? 'is-done' : ''}`}>
            <button className="sitting__head" onClick={() => setOpen(open === si ? -1 : si)} aria-expanded={open === si}>
              <span className="mono">{v.sittings.length > 1 ? `Sitting ${si + 1}` : 'One sitting'}</span>
              <span className="spacer" />
              {sitDone && (
                <span className="chip chip--mint">
                  <Check size={13} strokeWidth={3} /> {rec ? fmtDay(dayOf(rec.at)) : 'Done'}
                </span>
              )}
              {v.sittings.length > 1 && <ChevronDown className="fold__chev" size={18} style={{ transform: open === si ? 'rotate(180deg)' : undefined }} />}
            </button>
            <b>{sit.title}</b>
            {open === si && (
              <>
                <div>
                  {sit.steps.map((st, i) => {
                    const id = `${si}-${i}`
                    const on = p.steps.includes(id)
                    return (
                      <button
                        key={id}
                        className={`check ${on ? 'is-on' : ''}`}
                        disabled={locked || done}
                        aria-pressed={on}
                        onClick={(e) => {
                          if (!on) {
                            const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                            confetti(false, { x: (r.left + 20) / window.innerWidth, y: r.top / window.innerHeight })
                          }
                          act(q.id, 'step', { stepId: id, done: !on })
                        }}
                      >
                        <motion.span className="check__box" animate={on ? { scale: [1, 1.25, 1] } : { scale: 1 }} transition={{ duration: 0.3 }}>
                          <AnimatePresence>
                            {on && (
                              <motion.span
                                initial={{ scale: 0, rotate: -30 }}
                                animate={{ scale: 1, rotate: 0 }}
                                exit={{ scale: 0 }}
                                transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                              >
                                <Check size={16} strokeWidth={3.2} />
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </motion.span>
                        <span className="check__text">{st}</span>
                        <span className="check__xp">+{XP.step}</span>
                      </button>
                    )
                  })}
                </div>
                {rec?.next && <div className="next-note">Next time: {rec.next}</div>}
                {!done && !locked && si < lastN && !rec && (
                  <button className="btn btn--soft btn--sm" onClick={() => setWrap(si)}>
                    Wrap up this sitting · +{XP.sitting} XP
                  </button>
                )}
                {!done && rec && si < lastN && (
                  <button className="linkbtn" onClick={() => act(q.id, 'unsitting', { n: si })}>
                    Undo wrap-up
                  </button>
                )}
              </>
            )}
          </div>
        )
      })}

      {done ? (
        <div className="stack-sm" style={{ justifyItems: 'center', textAlign: 'center' }}>
          <Trophy size={28} style={{ color: 'var(--color-accent-deep)' }} />
          <b>Quest complete. Concept card collected!</b>
          <button className="linkbtn" onClick={() => act(q.id, 'reopen')}>
            Reopen this quest
          </button>
        </div>
      ) : (
        !locked && (
          <button className="btn btn--lg btn--block" onClick={() => setFinish(true)}>
            <Trophy size={20} /> Complete quest · +{q.xp} XP
          </button>
        )
      )}

      <WrapModal
        open={wrap !== null}
        n={wrap ?? 0}
        title={wrap !== null ? v.sittings[wrap].title : ''}
        onClose={() => setWrap(null)}
        onWrap={(next) => act(q.id, 'sitting', { n: wrap, next })}
      />
      <FinishModal open={finish} quest={q} v={v} onClose={() => setFinish(false)} />
    </section>
  )
}

/** End-of-sitting wrap-up: the "stop at a working point and note what's next" rule. */
function WrapModal({
  open,
  n,
  title,
  onClose,
  onWrap,
}: {
  open: boolean
  n: number
  title: string
  onClose: () => void
  onWrap: (next: string) => Promise<unknown>
}) {
  const [next, setNext] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (open) setNext('')
  }, [open])
  return (
    <Modal open={open} onClose={onClose} title={`Sitting ${n + 1} done?`} sub={`“${title}” — stop at a working point and leave a note for future you.`}>
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          await onWrap(next)
          setBusy(false)
          onClose()
        }}
      >
        <div className="field">
          <label htmlFor="next">Next time, I’ll start by…</label>
          <textarea
            id="next"
            maxLength={600}
            className="textarea"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="e.g. Fix the transitions in the loud parts, then record."
            autoFocus
          />
        </div>
        <button className="btn btn--lg btn--block" disabled={busy}>
          {busy ? 'Saving…' : `Wrap up · +${XP.sitting} XP`}
        </button>
      </form>
    </Modal>
  )
}

/** The finish line: upload what you made, a line for your mentor, an optional own twist, then celebration. */
function FinishModal({ open, quest: q, v, onClose }: { open: boolean; quest: Quest; v: Variant; onClose: () => void }) {
  const { act, checkin, sum, today } = useQuest()
  const [msg, setMsg] = useState('')
  const [twist, setTwist] = useState('')
  const [busy, setBusy] = useState(false)
  // Finishing before the deadline = ahead of schedule, which is when the guide asks for their own twist.
  const ahead = deadlineOf(sum.slots, q.id) > today

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      if (msg.trim() && !(await checkin(q.id, msg.trim(), null))) return
      if (twist.trim()) await act(q.id, 'ownIdea', { text: twist.trim() })
      if (await act(q.id, 'complete')) {
        confetti(true)
        onClose()
        setMsg('')
        setTwist('')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={<>Finish “{v.title}”</>} sub={`Done when: ${v.expected}`}>
      <form className="stack" onSubmit={submit}>
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <Spark size={56} mood="happy" />
          <p style={{ color: 'var(--color-ink-2)' }}>Show off what you made — it goes on your Trophies page. First upload here = +{XP.upload} XP.</p>
        </div>
        <Creations taskId={q.id} compact />
        <div className="field">
          <label htmlFor="msg">A line for your mentor: what did you make? What surprised you?</label>
          <textarea
            id="msg"
            maxLength={2000}
            className="textarea"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="It finally explodes into stars! The lazy prompt made a boring grey dot cloud lol"
          />
        </div>
        <div className="field">
          <label htmlFor="twist">
            Your own twist {ahead ? '(you’re ahead — the rule says add one!)' : '(optional)'} · +{XP.ownIdea} XP
          </label>
          <input
            id="twist"
            maxLength={1000}
            className="input"
            value={twist}
            onChange={(e) => setTwist(e.target.value)}
            placeholder="e.g. Added a rainbow mode on double-click"
          />
        </div>
        <button className="btn btn--lg btn--block" disabled={busy}>
          <Trophy size={20} /> {busy ? 'Saving…' : `Complete quest · +${q.xp} XP`}
        </button>
      </form>
    </Modal>
  )
}

/** Choose one of the quest's alternatives — same concept, different thing to make. */
function SwapSheet({
  open,
  onClose,
  quest: q,
  current,
  hasProgress,
  onSwap,
}: {
  open: boolean
  onClose: () => void
  quest: Quest
  current: string
  hasProgress: boolean
  onSwap: (id: string) => Promise<unknown>
}) {
  const [confirm, setConfirm] = useState<string | null>(null)
  useEffect(() => {
    if (!open) setConfirm(null)
  }, [open])
  const choose = async (id: string) => {
    if (id === current) return onClose()
    if (hasProgress && confirm !== id) return setConfirm(id)
    await onSwap(id)
    onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title="Pick your version" sub={`All three teach “${q.variants[0].concept.name}” and take about the same time.`}>
      <div className="stack">
        {q.variants.map((alt) => (
          <button key={alt.id} className={`variant ${alt.id === current ? 'is-current' : ''}`} onClick={() => choose(alt.id)}>
            <span className="row" style={{ gap: 8 }}>
              <span className="mono muted">{alt.id === 'main' ? 'Original' : alt.id === 'alt-a' ? 'Remix A' : 'Remix B'}</span>
              {alt.id === current && <span className="chip chip--tone">Current</span>}
            </span>
            <b>{alt.title}</b>
            <p>{alt.tagline}</p>
            <span className="row" style={{ gap: 6 }}>
              {alt.tools.map((t) => (
                <span key={t} className="chip" style={{ fontSize: 12, padding: '3px 9px' }}>
                  {t}
                </span>
              ))}
            </span>
            {confirm === alt.id && (
              <span className="chip chip--coral" style={{ whiteSpace: 'normal' }}>
                Your ticks on this quest will reset. Tap again to swap.
              </span>
            )}
          </button>
        ))}
      </div>
    </Modal>
  )
}

/** Her scratchpad for the quest — saves itself a moment after she stops typing. */
function Notes({ taskId, initial }: { taskId: string; initial: string }) {
  const { act } = useQuest()
  const [text, setText] = useState(initial)
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => setText(initial), [taskId]) // eslint-disable-line react-hooks/exhaustive-deps
  const onChange = (val: string) => {
    setText(val)
    setSaved('saving')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      await act(taskId, 'notes', { notes: val })
      setSaved('saved')
    }, 900)
  }
  return (
    <details className="fold card" open={!!initial.trim() || undefined}>
      <summary>
        <span className="ico">
          <NotebookPen size={18} />
        </span>
        <span>
          <b>Your notes</b>
          <small>{saved === 'saving' ? 'Saving…' : saved === 'saved' ? 'Saved' : 'Prompts that worked, errors, ideas'}</small>
        </span>
        <ChevronDown className="fold__chev" size={20} />
      </summary>
      <textarea
        className="textarea"
        maxLength={5000}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Prompts that worked, errors you hit, ideas for later…"
        aria-label="Your notes"
      />
    </details>
  )
}

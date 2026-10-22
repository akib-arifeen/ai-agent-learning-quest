'use client'

import { AnimatePresence, motion } from 'motion/react'
import { ArrowUp, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { firstName } from '@/lib/game'
import { proTaskById } from '@/lib/pro'
import { questById, variantOf } from '@/lib/quest'
import { useQuest } from './QuestProvider'
import Spark from './Spark'

type Msg = { role: 'user' | 'assistant' | 'error'; content: string }

/** True on laptop-width screens (the coach becomes a side panel instead of a sheet). */
function useWide() {
  const [wide, setWide] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 60rem)')
    const on = () => setWide(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return wide
}

/**
 * Spark's chat panel. One conversation per quest (plus a general one), saved on the
 * server so it survives reloads and the mentor can see where a learner got stuck. Replies stream
 * in token by token.
 */
export default function Coach({ open, taskId, draft, onClose }: { open: boolean; taskId: string; draft: string; onClose: () => void }) {
  const { today, state, coachSent, setup } = useQuest()
  const wide = useWide()
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [loadedFor, setLoadedFor] = useState('')
  const body = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLTextAreaElement>(null)
  // Which conversation is on screen — a reply still streaming for another quest stops
  // painting the moment she switches, instead of landing in the wrong chat.
  const showing = useRef(taskId)
  showing.current = taskId

  const q = questById(taskId)
  const pro = proTaskById(taskId)
  const v = q ? variantOf(q, state.progress[q.id]?.variant, setup) : null

  // Load this quest's history the first time the panel opens on it.
  useEffect(() => {
    if (!open || loadedFor === taskId) return
    setMsgs([])
    fetch(`/api/coach?taskId=${encodeURIComponent(taskId)}`)
      .then((r) => r.json())
      .then((b) => setMsgs((b.messages || []).map((m: Msg) => ({ role: m.role, content: m.content }))))
      .finally(() => setLoadedFor(taskId))
  }, [open, taskId, loadedFor])

  useEffect(() => {
    if (open && draft) setInput(draft)
    if (open) setTimeout(() => box.current?.focus(), 250)
  }, [open, draft])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Keep the newest words in view while Spark is typing.
  useEffect(() => {
    body.current?.scrollTo({ top: body.current.scrollHeight })
  }, [msgs])

  const send = useCallback(
    async (text: string) => {
      const message = text.trim()
      if (!message || streaming) return
      setInput('')
      setStreaming(true)
      setMsgs((m) => [...m, { role: 'user', content: message }, { role: 'assistant', content: '' }])
      coachSent()
      try {
        const res = await fetch('/api/coach', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-quest-user': state.user.id }, body: JSON.stringify({ taskId, message, today }) })
        if (!res.ok || !res.body) {
          const b = await res.json().catch(() => ({}))
          throw new Error(b.error || 'Spark couldn’t answer right now.')
        }
        const reader = res.body.getReader()
        const dec = new TextDecoder()
        const sentFor = taskId
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          if (showing.current !== sentFor) continue // still saved server-side; just not painted here
          const piece = dec.decode(value, { stream: true })
          setMsgs((m) => {
            const copy = [...m]
            const last = copy[copy.length - 1]
            copy[copy.length - 1] = { ...last, content: last.content + piece }
            return copy
          })
        }
      } catch (e) {
        setMsgs((m) => [...m.filter((x, i) => !(i === m.length - 1 && x.role === 'assistant' && !x.content)), { role: 'error', content: (e as Error).message }])
      } finally {
        setStreaming(false)
      }
    },
    [streaming, taskId, today, coachSent, state.user.id],
  )

  // Starter chips. Ones ending in a newline prefill the box (she pastes her bit); the rest send.
  const quick = q
    ? [
        { label: 'Check my brief', text: 'Check my brief:\n' },
        { label: 'I’m stuck', text: 'I’m stuck. Here’s exactly what I see:\n' },
        { label: 'Explain the concept', text: `Explain “${v?.concept.name}” like I’m a designer, with a tiny example.` },
        { label: 'What’s my next step?', text: 'What’s my next small step on this quest?' },
        { label: 'Hype me up', text: 'I’m losing steam. Give me a quick pep talk and the tiniest next step.' },
      ]
    : [
        { label: 'What’s today’s mission?', text: 'What should I do today?' },
        { label: 'Explain AI agents', text: 'Explain what an AI coding agent is, like I’m a designer.' },
        { label: 'Check my brief', text: 'Check my brief:\n' },
        { label: 'Hype me up', text: 'I’m losing steam. Give me a quick pep talk and the tiniest next step.' },
      ]

  const last = msgs[msgs.length - 1]
  const mood = streaming ? (last?.content ? 'happy' : 'think') : 'idle'

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            className="coach"
            role="dialog"
            aria-label="Spark, your AI coach"
            initial={wide ? { x: 480, opacity: 0.6 } : { y: '100%' }}
            animate={wide ? { x: 0, opacity: 1 } : { y: 0 }}
            exit={wide ? { x: 480, opacity: 0, transition: { duration: 0.22 } } : { y: '100%', transition: { duration: 0.22 } }}
            transition={{ type: 'spring', stiffness: 360, damping: 36 }}
          >
            <div className="coach__head">
              <Spark size={44} mood={mood} follow />
              <div style={{ minWidth: 0 }}>
                <b>Spark</b>
                <small>{q ? `Coaching Quest ${q.num} · ${v?.title}` : pro ? `Level ${pro.level} · ${pro.title}` : 'Your quest coach'}</small>
                {pro && <small style={{ display: 'block' }}>Coaching your pro-track level</small>}
              </div>
              <button className="iconbtn" style={{ marginLeft: 'auto' }} onClick={onClose} aria-label="Close coach">
                <X size={20} />
              </button>
            </div>

            <div className="coach__body" ref={body}>
              {msgs.length === 0 && (
                <div className="coach__intro">
                  <Spark size={72} mood="happy" follow playful />
                  <b>Hey {firstName(state.user.name)}, I’m Spark!</b>
                  <p>I won’t write your prompts for you — but I’ll help you make them great, decode scary errors, and keep you moving.</p>
                </div>
              )}
              {msgs.map((m, i) =>
                m.role === 'assistant' && !m.content ? (
                  <div key={i} className="bubble bubble--spark typing" aria-label="Spark is typing">
                    {[0, 1, 2].map((d) => (
                      <motion.i key={d} animate={{ y: [0, -5, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: d * 0.14 }} />
                    ))}
                  </div>
                ) : (
                  <motion.div
                    key={i}
                    className={`bubble ${m.role === 'user' ? 'bubble--me' : m.role === 'error' ? 'bubble--err' : 'bubble--spark'}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {m.role === 'assistant' ? <ReactMarkdown>{m.content}</ReactMarkdown> : <span style={{ whiteSpace: 'pre-wrap' }}>{m.content}</span>}
                  </motion.div>
                ),
              )}
            </div>

            <div className="coach__quick">
              {quick.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  disabled={streaming}
                  onClick={() => {
                    if (c.text.endsWith('\n')) {
                      setInput(c.text)
                      box.current?.focus()
                    } else send(c.text)
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <form
              className="coach__form"
              onSubmit={(e) => {
                e.preventDefault()
                send(input)
              }}
            >
              <label htmlFor="coach-input" className="sr-only">
                Message Spark
              </label>
              <textarea
                id="coach-input"
                ref={box}
                className="textarea"
                rows={1}
                placeholder="Ask anything, or paste an error…"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault()
                    send(input)
                  }
                }}
              />
              <button className="btn btn--cyan" style={{ minHeight: 48, width: 48, padding: 0, flex: 'none' }} disabled={streaming || !input.trim()} aria-label="Send">
                <ArrowUp size={22} strokeWidth={2.6} />
              </button>
            </form>
            <div className="coach__note">Spark gives hints, not ready-made prompts. Your mentor can read these chats to help you.</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

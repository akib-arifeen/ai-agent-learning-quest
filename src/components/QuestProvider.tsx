'use client'

import { MotionConfig } from 'motion/react'
import { usePathname } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { type ProgressRow, type QuestState, localDay, summarize } from '@/lib/game'
import { LevelUp, type LevelUpInfo, Toasts, type Toast, type ToastInput, confetti } from './Celebrate'
import Coach from './Coach'
import Shell from './Shell'
import SignIn from './SignIn'
import Spark from './Spark'

type Summary = ReturnType<typeof summarize>

type Ctx = {
  state: QuestState
  today: string
  now: Date
  sum: Summary
  /** Run one progress operation (see /api/progress). Steps update instantly. */
  act: (taskId: string, op: string, payload?: Record<string, unknown>) => Promise<ProgressRow | null>
  setBusy: (day: string, on: boolean) => Promise<void>
  checkin: (taskId: string, message: string, image: string | null) => Promise<boolean>
  dismissCheer: (id: number) => Promise<void>
  openCoach: (taskId?: string, draft?: string) => void
  coachSent: () => void
  error: (text: string) => void
  signOut: () => void
  /** Re-fetch state from the server (after uploads, deletes…). */
  refresh: () => Promise<void>
}

const QuestCtx = createContext<Ctx | null>(null)

/** Access the quest state + actions from any client component under the provider. */
export const useQuest = () => {
  const c = useContext(QuestCtx)
  if (!c) throw new Error('useQuest outside QuestProvider')
  return c
}

/**
 * Owns the quest state and every celebration. Shows Google sign-in when there's no
 * session, otherwise loads the learner's state,
 * applies changes optimistically, and diffs XP / rank / badges after each change to
 * fire the +XP pops, badge unlocks and level-up moments.
 */
export default function QuestProvider({ children }: { children: React.ReactNode }) {
  // Public pages (the privacy note and terms Google links to) skip sign-in entirely.
  const path = usePathname()
  if (path === '/privacy' || path === '/terms') return <>{children}</>
  return <SignedInApp>{children}</SignedInApp>
}

/** Everything behind sign-in: state, writes, celebrations, the coach. */
function SignedInApp({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<QuestState | null>(null)
  const [failed, setFailed] = useState(false)
  const [signedOut, setSignedOut] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [toasts, setToasts] = useState<Toast[]>([])
  const [levelUp, setLevelUp] = useState<LevelUpInfo | null>(null)
  const [coach, setCoach] = useState<{ open: boolean; taskId: string; draft: string }>({ open: false, taskId: 'general', draft: '' })
  const prev = useRef<Summary | null>(null)
  const toastId = useRef(1)
  // Writes go out one at a time, in order, so a tick then an untick can't land reversed.
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  // Bumped on every optimistic tick: a load that started before a tick mustn't erase it.
  const ticks = useRef(0)
  // The account this page belongs to — sent with every write so a stale tab can't
  // write into a different account signed in elsewhere.
  const userId = useRef('')

  const today = localDay(now)

  // Tick once every 30s so the countdown and "today" roll over without a reload.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  const pushToast = useCallback((t: ToastInput, ms = 2600) => {
    const id = toastId.current++
    setToasts((xs) => [...xs, { ...t, id }].slice(-4))
    setTimeout(() => setToasts((xs) => xs.filter((x) => x.id !== id)), ms)
  }, [])
  const error = useCallback((text: string) => pushToast({ kind: 'error', text }, 4200), [pushToast])

  const load = useCallback(async (): Promise<void> => {
    const seen = ticks.current
    const res = await fetch(`/api/state?today=${localDay()}`, { cache: 'no-store' }).catch(() => null)
    if (res?.status === 401) return setSignedOut(true)
    if (!res?.ok) {
      setFailed(true)
      return error('Couldn’t load your quest. Check your connection.')
    }
    const next = (await res.json()) as QuestState
    // A tick landed while this was in flight — reload once its write has gone through.
    if (ticks.current !== seen) {
      queue.current = queue.current.then(load, load)
      return
    }
    setFailed(false)
    userId.current = next.user.id
    setState(next)
  }, [error])

  /** JSON write to our API, tagged with the page's account; handles sign-out and account switches. */
  const send = useCallback(
    async (url: string, body: unknown, method = 'POST') => {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'x-quest-user': userId.current }, body: JSON.stringify(body) }).catch(() => null)
      if (res?.status === 401) setSignedOut(true)
      if (res?.status === 409) window.location.reload()
      return res
    },
    [],
  )

  useEffect(() => {
    load()
  }, [load])

  const sum = useMemo(() => (state ? summarize(state, today) : null), [state, today])

  // Celebrate what changed since the last state: XP gained, rank reached, badges earned.
  useEffect(() => {
    if (!sum) return
    const before = prev.current
    prev.current = sum
    if (!before) return
    const gained = sum.xp - before.xp
    const had = new Set(before.badges.filter((b) => b.earned).map((b) => b.id))
    const fresh = sum.badges.filter((b) => b.earned && !had.has(b.id))
    // A rank-up is the big moment: it carries the XP and badges itself, so the small
    // toasts don't pile up on top of it.
    if (sum.rank.level > before.rank.level) {
      setTimeout(() => {
        setLevelUp((cur) => ({
          level: sum.rank.level,
          name: sum.rank.name,
          nextName: sum.rank.nextName,
          gained: (cur?.gained || 0) + gained,
          badges: [...(cur?.badges || []), ...fresh.map((b) => ({ name: b.name, icon: b.icon }))],
        }))
        confetti(true)
      }, 500)
      return
    }
    if (gained > 0) pushToast({ kind: 'xp', amount: gained })
    fresh.forEach((b, i) => setTimeout(() => pushToast({ kind: 'badge', name: b.name, desc: b.desc, icon: b.icon }, 3600), 350 + i * 500))
    if (fresh.length) confetti(false, { x: 0.5, y: 0.2 })
  }, [sum, pushToast])

  const act: Ctx['act'] = useCallback(
    async (taskId, op, payload = {}) => {
      // Ticking a step should feel instant — apply it before the server answers.
      if (op === 'step') {
        ticks.current++
        setState((s) => {
          if (!s) return s
          const cur = s.progress[taskId] || { task_id: taskId, variant: 'main', steps: [], sittings: [], notes: '', own_idea: '', completed_at: null }
          const steps = new Set(cur.steps)
          if (payload.done) steps.add(String(payload.stepId))
          else steps.delete(String(payload.stepId))
          const days = payload.done ? [...s.days, new Date().toISOString()] : s.days
          return { ...s, days, progress: { ...s.progress, [taskId]: { ...cur, steps: [...steps] } } }
        })
      }
      const run = async () => {
        const res = await send('/api/progress', { taskId, op, ...payload })
        const body = await res?.json().catch(() => ({}))
        if (!res?.ok) {
          // Never leave an unsaved tick on screen looking saved — say so and resync.
          error(body?.error || 'That didn’t save — check your connection.')
          await load()
          return null
        }
        // Steps keep their optimistic state; notes only touch the notes field (a slow
        // reply mustn't roll back anything newer); everything else reloads for the streak.
        if (op === 'notes') setState((s) => (s ? { ...s, progress: { ...s.progress, [taskId]: { ...(s.progress[taskId] || body), notes: body.notes } } } : s))
        else if (op !== 'step') await load()
        return body as ProgressRow
      }
      const p = queue.current.then(run, run)
      queue.current = p
      return p
    },
    [error, load, send],
  )

  const setBusy: Ctx['setBusy'] = useCallback(
    async (day, on) => {
      setState((s) => (s ? { ...s, busy: on ? [...new Set([...s.busy, day])].sort() : s.busy.filter((d) => d !== day) } : s))
      const res = await send('/api/busy', { day, on })
      if (!res?.ok) error('Couldn’t update that day.')
      await load()
    },
    [error, load, send],
  )

  const checkin: Ctx['checkin'] = useCallback(
    async (taskId, message, image) => {
      const res = await send('/api/checkin', { taskId, message, image })
      if (!res?.ok) {
        const b = await res?.json().catch(() => ({}))
        error(b?.error || 'Check-in didn’t send.')
        return false
      }
      return true
    },
    [error, send],
  )

  const dismissCheer: Ctx['dismissCheer'] = useCallback(async (id) => {
    setState((s) => (s ? { ...s, cheers: s.cheers.map((c) => (c.id === id ? { ...c, seen_at: new Date().toISOString() } : c)) } : s))
    await send('/api/cheer', { id }, 'PATCH')
  }, [send])

  // Sign out on this device (clears the session cookie).
  const signOut = useCallback(async () => {
    if (!window.confirm('Sign out of your quest on this device?')) return
    await fetch('/api/session', { method: 'DELETE' }).catch(() => null)
    prev.current = null
    userId.current = ''
    setState(null)
    setSignedOut(true)
  }, [])

  const openCoach = useCallback((taskId = 'general', draft = '') => setCoach({ open: true, taskId, draft }), [])
  // The first coach message earns a badge; count it locally so the badge pops right away.
  const coachSent = useCallback(() => setState((s) => (s ? { ...s, coachMessages: s.coachMessages + 1 } : s)), [])

  if (signedOut)
    return (
      <SignIn
        onDone={() => {
          prev.current = null
          setSignedOut(false)
          load()
        }}
      />
    )
  if (!state || !sum) return <Loading failed={failed} retry={load} />

  const ctx: Ctx = { state, today, now, sum, act, setBusy, checkin, dismissCheer, openCoach, coachSent, error, signOut, refresh: load }
  return (
    <QuestCtx.Provider value={ctx}>
      {/* JS-driven springs follow the OS "reduce motion" setting, like the CSS ones do. */}
      <MotionConfig reducedMotion="user">
        <Shell>{children}</Shell>
        <Coach open={coach.open} taskId={coach.taskId} draft={coach.draft} onClose={() => setCoach((c) => ({ ...c, open: false }))} />
        <Toasts items={toasts} />
        <LevelUp level={levelUp} onClose={() => setLevelUp(null)} />
      </MotionConfig>
    </QuestCtx.Provider>
  )
}

/** First-paint placeholder while state loads — with a retry if the load failed. */
function Loading({ failed, retry }: { failed: boolean; retry: () => void }) {
  return (
    <div className="loading">
      <Spark size={72} mood={failed ? 'wow' : 'think'} />
      {failed ? 'Couldn’t reach your quest.' : 'Loading your quest…'}
      {failed && (
        <button className="btn" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  )
}

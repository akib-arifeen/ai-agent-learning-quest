'use client'

import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Check, Code2, GraduationCap, Laptop, Megaphone, Monitor, Palette, Presentation, Sparkles, Terminal, X, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { firstName } from '@/lib/game'
import { EXPERIENCE, GOAL_IDEAS, LIMITS, OSES, ROLES, WEEKLY, type Experience, type ProfilePatch, type Role } from '@/lib/profile'
import { FREE_STARTS, TOOL_IDS, toolOf, type Os, type ToolId } from '@/lib/tools'
import { confetti } from './Celebrate'
import { useQuest } from './QuestProvider'
import Spark, { type Mood } from './Spark'

const STEPS = 6
const OS_STEP = 4
const TONES = ['pear', 'cyan', 'mint', 'lav', 'coral', 'mint'] as const
const ROLE_ICONS: Record<Role, LucideIcon> = { student: GraduationCap, educator: Presentation, creative: Palette, business: Megaphone, developer: Code2, other: Sparkles }
const OS_ICONS: Record<Os, LucideIcon> = { windows: Monitor, mac: Laptop, linux: Terminal }
const MOODS: Mood[] = ['wave', 'happy', 'think', 'wow', 'happy', 'hype']

type Answers = {
  role: Role | ''
  role_other: string
  experience: Experience | ''
  goal: string
  tool: ToolId | ''
  tool_other: string
  os: Os | ''
  weekly: number | null
}

/** Best guess at the learner's computer from the browser; they still confirm it. */
function detectOs(): Os | '' {
  if (typeof navigator === 'undefined') return ''
  const ua = navigator.userAgent
  if (/Win/i.test(ua)) return 'windows'
  if (/Mac/i.test(ua)) return 'mac'
  if (/Linux|X11/i.test(ua)) return 'linux'
  return ''
}

type Choice = { key: string; tone?: string; body: React.ReactNode; className?: string }

/**
 * A single-choice group: a radiogroup of buttons with a roving tab stop and arrow-key
 * movement (arrows move focus and pick, like native radios).
 */
function Group({
  labelledBy,
  label,
  choices,
  value,
  onPick,
  className = 'onb__opts',
  itemClass = 'onb-opt',
  check = true,
}: {
  labelledBy?: string
  label?: string
  choices: Choice[]
  value: string
  onPick: (key: string) => void
  className?: string
  itemClass?: string
  check?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const anyChecked = choices.some((c) => c.key === value)
  const onKeyDown = (e: React.KeyboardEvent) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!d) return
    const items = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]') ?? [])
    const i = items.indexOf(document.activeElement as HTMLButtonElement)
    if (i < 0) return
    e.preventDefault()
    const n = items[(i + d + items.length) % items.length]
    n.focus()
    n.click()
  }
  return (
    <div ref={ref} className={className} role="radiogroup" aria-labelledby={labelledBy} aria-label={label} onKeyDown={onKeyDown}>
      {choices.map((c, i) => {
        const checked = c.key === value
        return (
          <button
            key={c.key}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked || (!anyChecked && i === 0) ? 0 : -1}
            className={`${itemClass} ${c.className || ''}`}
            data-tone={c.tone || TONES[i % TONES.length]}
            onClick={() => onPick(c.key)}
          >
            {c.body}
            {check && checked && (
              <span className="onb-opt__check" aria-hidden="true">
                <Check size={14} strokeWidth={3} />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** One step's heading (it takes focus when the step appears) and its optional sub line. */
function StepShell({ title, sub, edit, children }: { title: string; sub?: string; edit: boolean; children: React.ReactNode }) {
  const h = useRef<HTMLHeadingElement>(null)
  const H = edit ? 'h2' : 'h1'
  useEffect(() => {
    h.current?.focus({ preventScroll: true })
  }, [])
  return (
    <div className="onb__step">
      <H id="onb-title" ref={h} tabIndex={-1}>
        {title}
      </H>
      {sub && <p className="muted onb__sub">{sub}</p>}
      {children}
    </div>
  )
}

/** Whether the Tool step should open as "I already use one", judged from the answers so far. */
function ownDefault(a: Answers): 'pick' | 'own' {
  return a.experience === 'comfortable' || (!!a.tool && !FREE_STARTS.includes(a.tool)) ? 'own' : 'pick'
}

/**
 * The onboarding flow: six one-question screens (role, experience, goal, tool, computer,
 * time a week) with Spark guiding. mode 'first' is a full page for a brand-new learner: each
 * step saves as they go and "Skip" dismisses it for good (the profile page and the guide
 * offer personalising later). mode 'edit' is a full-screen dialog opened later (home prompt
 * or /profile) at step `start` (0 to 5): it keeps every answer locally and "Save" sends them
 * in one go, while Close and Escape discard. `onDone` runs after they finish, skip or close.
 */
export default function Onboarding({ mode, onDone, start }: { mode: 'first' | 'edit'; onDone: () => void; start?: number }) {
  const { state, saveProfile, signOut } = useQuest()
  const edit = mode === 'edit'
  const root = useRef<HTMLDivElement>(null)
  // What had focus when the overlay opened. Read during the first render: by the time this
  // component's effects run, the step heading's own effect has already taken focus.
  const [opener] = useState(() => (typeof document === 'undefined' ? null : document.activeElement))
  const [saving, setSaving] = useState(false)
  const p = state.profile
  const name = firstName(state.user.name)

  const [step, setStep] = useState(() => {
    if (mode === 'edit') return Math.min(Math.max(Math.trunc(start ?? 0), 0), STEPS - 1)
    if (!p) return 0
    const later = !!(p.tool || p.os || p.weekly_minutes)
    const done = [!!p.role, !!p.experience, !!p.goal || later, !!p.tool, !!p.os, !!p.weekly_minutes]
    const first = done.indexOf(false)
    return first < 0 ? STEPS - 1 : first
  })
  // The browser's OS guess is only a preselection on the computer step itself (OS_STEP), so a
  // save from another step never stores a computer they didn't confirm.
  const [a, setA] = useState<Answers>(() => ({
    role: p?.role || '',
    role_other: p?.role_other || '',
    experience: p?.experience || '',
    goal: p?.goal || '',
    tool: p?.tool || '',
    tool_other: p?.tool_other || '',
    os: p?.os || (step === OS_STEP ? detectOs() : ''),
    weekly: p?.weekly_minutes ?? null,
  }))
  const [dir, setDir] = useState(1)
  const [toolMode, setToolMode] = useState<'pick' | 'own'>(() => ownDefault(a))
  const set = (patch: Partial<Answers>) => setA((x) => ({ ...x, ...patch }))

  // The overlay locks page scroll and closes on Escape.
  useEffect(() => {
    if (!edit) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onDone()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [edit, onDone])

  // While the dialog is open the rest of the page is inert; focus goes back to what opened it.
  useEffect(() => {
    if (!edit) return
    const muted = Array.from(document.body.children).filter((el): el is HTMLElement => el instanceof HTMLElement && el !== root.current && !el.inert && !el.matches('[aria-live]'))
    muted.forEach((el) => (el.inert = true))
    return () => {
      muted.forEach((el) => (el.inert = false))
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus()
      else {
        const h1 = document.querySelector<HTMLElement>('h1')
        h1?.setAttribute('tabindex', '-1')
        h1?.focus()
      }
    }
  }, [edit, opener])

  const last = step === STEPS - 1
  const beginner = a.experience === 'none' || a.experience === 'some'
  // Changing tool after ticking Base Camp steps: say so, since those steps get reworded.
  const switching = !!p?.tool && !!a.tool && a.tool !== p.tool && (state.progress.t0?.steps.length || 0) > 0
  const answered = [
    !!a.role,
    !!a.experience,
    true,
    !!a.tool && (toolMode === 'own' || FREE_STARTS.includes(a.tool)),
    !!a.os,
    a.weekly !== null,
  ][step]

  const goTo = (n: number) => {
    setDir(n > step ? 1 : -1)
    if (n === 3) setToolMode(ownDefault(a))
    if (n === OS_STEP && !a.os) set({ os: detectOs() })
    setStep(n)
  }
  const save = async () => {
    if (saving) return
    setSaving(true)
    const patch: ProfilePatch = {
      role_other: a.role === 'other' ? a.role_other.trim() : '',
      goal: a.goal.trim(),
      tool_other: a.tool === 'other' ? a.tool_other.trim() : '',
      complete: true,
    }
    if (a.role) patch.role = a.role
    if (a.experience) patch.experience = a.experience
    if (a.tool) patch.tool = a.tool
    if (a.os) patch.os = a.os
    if (a.weekly !== null) patch.weekly_minutes = a.weekly
    const ok = await saveProfile(patch)
    setSaving(false)
    if (ok) onDone()
  }
  const next = () => {
    if (!answered) return
    if (edit) {
      if (last) void save()
      else goTo(step + 1)
      return
    }
    if (step === 0) void saveProfile({ role: a.role as Role, role_other: a.role === 'other' ? a.role_other.trim() : '' })
    else if (step === 1) void saveProfile({ experience: a.experience as Experience })
    else if (step === 2) void saveProfile({ goal: a.goal.trim() })
    else if (step === 3) void saveProfile({ tool: a.tool as ToolId, tool_other: a.tool === 'other' ? a.tool_other.trim() : '' })
    else if (step === 4) void saveProfile({ os: a.os as Os })
    else {
      void saveProfile({ weekly_minutes: a.weekly, complete: true })
      void confetti(false, { x: 0.5, y: 0.3 })
      onDone()
      return
    }
    goTo(step + 1)
  }
  const back = () => goTo(step - 1)
  const skip = () => {
    void saveProfile({ dismiss: true })
    onDone()
  }

  const lines = [
    `Hi ${name}! I’m Spark. Six quick taps and I’ll shape the quest around you.`,
    'No wrong answer here. I’ll pitch the hints to match.',
    'Big or tiny, anything goes. A rough idea is plenty.',
    'The course works with any of these. Not sure? I’ll point you to a free one.',
    'So I can show the right install steps for your machine.',
    'Last one! A little each week beats a lot once.',
  ]

  const tools = TOOL_IDS.filter((id) => id !== 'other').map(toolOf)
  const startsLabel = 'Free ways to start'

  const body = [
    // 0: role
    <StepShell edit={edit} key="role" title="What do you do?">
      <Group
        labelledBy="onb-title"
        value={a.role}
        onPick={(k) => set({ role: k as Role })}
        choices={ROLES.map((r) => {
          const Icon = ROLE_ICONS[r.id]
          return {
            key: r.id,
            body: (
              <>
                <span className="onb-opt__icon">
                  <Icon size={20} />
                </span>
                <span className="onb-opt__label">{r.label}</span>
              </>
            ),
          }
        })}
      />
      {a.role === 'other' && (
        <div className="field onb__extra">
          <label htmlFor="onb-role-other">Tell me in a few words</label>
          <input id="onb-role-other" className="input" value={a.role_other} maxLength={LIMITS.role_other} onChange={(e) => set({ role_other: e.target.value })} />
        </div>
      )}
    </StepShell>,
    // 1: experience
    <StepShell edit={edit} key="exp" title="How much have you coded?">
      <Group
        labelledBy="onb-title"
        className="onb__opts onb__opts--list"
        value={a.experience}
        onPick={(k) => set({ experience: k as Experience })}
        choices={EXPERIENCE.map((e) => ({
          key: e.id,
          body: (
            <span className="onb-opt__text">
              <b>{e.label}</b>
              <span className="muted">{e.hint}</span>
            </span>
          ),
        }))}
      />
    </StepShell>,
    // 2: goal
    <StepShell edit={edit} key="goal" title="What do you want to build?" sub="Optional. You can change it any time.">
      <div className="field">
        <label htmlFor="onb-goal" className="sr-only">
          What do you want to build?
        </label>
        <textarea id="onb-goal" className="textarea" value={a.goal} maxLength={LIMITS.goal} placeholder="A game, a website, a tool for work…" onChange={(e) => set({ goal: e.target.value })} />
      </div>
      <div className="onb__ideas">
        {GOAL_IDEAS[a.role || 'other'].map((idea) => (
          <button key={idea} type="button" className="onb__idea" onClick={() => set({ goal: idea.slice(0, LIMITS.goal) })}>
            {idea}
          </button>
        ))}
      </div>
    </StepShell>,
    // 3: tool
    <StepShell edit={edit} key="tool" title="Which AI coding tool will you use?">
      <Group
        label="How to choose your tool"
        className="onb__seg"
        itemClass="onb__seg-btn"
        check={false}
        value={toolMode}
        onPick={(k) => {
          setToolMode(k as 'pick' | 'own')
          if (k === 'pick' && a.tool && !FREE_STARTS.includes(a.tool)) set({ tool: '' })
        }}
        choices={[
          { key: 'pick', body: 'Help me pick' },
          { key: 'own', body: 'I already use one' },
        ]}
      />
      {toolMode === 'pick' ? (
        <>
          <Group
            label={startsLabel}
            className="onb__opts onb__opts--picks"
            itemClass="onb-opt onb-opt--big"
            value={a.tool}
            onPick={(k) => set({ tool: k as ToolId })}
            choices={FREE_STARTS.map((id) => {
              const t = toolOf(id)
              return {
                key: id,
                body: (
                  <span className="onb-opt__text">
                    <span className="onb-opt__chips">
                      <span className="chip chip--mint">Free</span>
                      {id === 'kilo' && beginner && <span className="chip chip--pear">Recommended for you</span>}
                    </span>
                    <b>{t.name}</b>
                    <span className="muted">{t.kind}</span>
                    <span className="onb-opt__price">{t.price}</span>
                    {t.suits && <span>{t.suits}</span>}
                  </span>
                ),
              }
            })}
          />
          <p className="muted onb__note">Already paying for Claude, ChatGPT, Copilot or Cursor? Choose “I already use one”: the course works with those too.</p>
        </>
      ) : (
        <>
          <Group
            label="Your tool"
            className="onb__opts onb__opts--tools"
            itemClass="onb-opt onb-opt--compact"
            value={a.tool}
            onPick={(k) => set({ tool: k as ToolId })}
            choices={[
              ...tools.map((t) => ({
                key: t.id,
                body: (
                  <span className="onb-opt__text">
                    <b>{t.name}</b>
                    <span className="muted">{t.kind}</span>
                    <span className="onb-opt__price">{t.price}</span>
                    {t.free && <span className="chip chip--mint onb-opt__free">Free</span>}
                  </span>
                ),
              })),
              {
                key: 'other',
                body: (
                  <span className="onb-opt__text">
                    <b>Other</b>
                    <span className="muted">Something not listed</span>
                  </span>
                ),
              },
            ]}
          />
          {a.tool === 'other' && (
            <div className="field onb__extra">
              <label htmlFor="onb-tool-other">Which one?</label>
              <input id="onb-tool-other" className="input" value={a.tool_other} maxLength={LIMITS.tool_other} onChange={(e) => set({ tool_other: e.target.value })} />
            </div>
          )}
        </>
      )}
      {/* Base Camp's setup steps are worded per tool and ticks are stored by position. */}
      {switching && <p className="muted onb__note">Switching tools rewords Base Camp’s setup steps for the new tool. Your ticks stay where they are, so check those steps still match.</p>}
    </StepShell>,
    // 4: os
    <StepShell edit={edit} key="os" title="What computer are you on?">
      <Group
        labelledBy="onb-title"
        value={a.os}
        onPick={(k) => set({ os: k as Os })}
        choices={OSES.map((o) => {
          const Icon = OS_ICONS[o.id]
          return {
            key: o.id,
            body: (
              <>
                <span className="onb-opt__icon">
                  <Icon size={20} />
                </span>
                <span className="onb-opt__label">{o.label}</span>
              </>
            ),
          }
        })}
      />
    </StepShell>,
    // 5: weekly
    <StepShell edit={edit} key="weekly" title="How much time can you give it each week?">
      <Group
        labelledBy="onb-title"
        value={a.weekly === null ? '' : String(a.weekly)}
        onPick={(k) => set({ weekly: Number(k) })}
        choices={WEEKLY.map((w) => ({ key: String(w.minutes), body: <span className="onb-opt__label">{w.label}</span> }))}
      />
    </StepShell>,
  ]

  const goalEmpty = step === 2 && !a.goal.trim()
  const nextLabel = last ? (edit ? 'Save' : 'Start my quest') : goalEmpty ? 'Not sure yet, continue' : 'Continue'

  const form = (
    <form
      className="onb__col"
      onSubmit={(e) => {
        e.preventDefault()
        next()
      }}
    >
      <div className="onb__top">
        <span className="mono muted onb__stepno">
          Step {step + 1} of {STEPS}
        </span>
        {!edit ? (
          <button type="button" className="btn btn--ghost btn--sm onb__skip" onClick={skip}>
            Skip
          </button>
        ) : (
          <button type="button" className="iconbtn onb__skip" onClick={onDone} aria-label="Close">
            <X size={20} />
          </button>
        )}
        <div className="onb__bars" aria-hidden="true">
          {Array.from({ length: STEPS }, (_, i) => (
            <span key={i} className={i <= step ? 'is-on' : ''} />
          ))}
        </div>
      </div>

      <div className="onb__spark">
        <Spark size={96} mood={MOODS[step]} follow playful />
        <AnimatePresence mode="wait">
          <motion.p
            key={step}
            className="onb__bubble"
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            {lines[step]}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="onb__main">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={step} initial={{ opacity: 0, x: 24 * dir }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 * dir }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}>
            {body[step]}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="onb__bar">
        {step > 0 ? (
          <button type="button" className="btn btn--ghost onb__back" onClick={back}>
            Back
          </button>
        ) : (
          <span />
        )}
        <div className="onb__acts">
          {edit && !last && (
            <button type="button" className="btn btn--soft" onClick={() => void save()} disabled={saving}>
              Save
            </button>
          )}
          <button type="submit" className="btn btn--lg" disabled={!answered || saving}>
            {nextLabel}
            {!last && <ArrowRight size={18} className="btn__arrow" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {!edit && (
        <p className="muted onb__foot">
          Signed in as {state.user.email} ·{' '}
          <button type="button" className="linkbtn" onClick={signOut}>
            Not you? Sign out
          </button>
        </p>
      )}
    </form>
  )

  if (!edit) return <main className="onb">{form}</main>
  return createPortal(
    <div ref={root} className="onb onb--overlay" role="dialog" aria-modal="true" aria-labelledby="onb-title">
      {form}
    </div>,
    document.body,
  )
}

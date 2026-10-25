'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Camera, Check, Compass, Crown, Eye, EyeOff, Flame, Mail, Map as MapIcon, MessageCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Gate } from '@/lib/entry'
import { GOOGLE_BUTTON_LABEL, GOOGLE_BUTTON_OPTIONS, GOOGLE_GSI_SRC } from '@/lib/google'
import { toolOf } from '@/lib/tools'
import { confetti } from './Celebrate'
import Spark, { type Mood } from './Spark'

const POINTS = [
  { icon: MapIcon, text: '10 quests, from glowing toys to a real game' },
  { icon: MessageCircle, text: 'Spark, a coach who helps without doing it for you' },
  { icon: Compass, text: 'Fits your background and the AI tool you use' },
  { icon: Flame, text: 'XP, streaks and a plan that fits your week' },
]

// A miniature of the real quest map: finished levels, where you are, the boss at the top.
const NODES = [
  { tone: 'pear', n: 1, x: 18, y: 86, done: true },
  { tone: 'cyan', n: 3, x: 70, y: 72, done: true },
  { tone: 'mint', n: 6, x: 42, y: 50, here: true },
  { tone: 'lav', n: 8, x: 78, y: 30 },
  { tone: 'coral', n: 10, x: 46, y: 11, boss: true },
] as const

const STEPS = [
  { title: 'Tell Spark about you', body: 'Your background, what you want to build and the AI tool you use. About a minute.' },
  { title: 'Set up your agent', body: 'Start free with Kilo Code or OpenCode, or bring the tool you already pay for. Step by step for your computer.' },
  { title: 'Build ten real things', body: 'One sitting a day, from glowing toys to a game you publish. Spark coaches; you write the prompts.' },
]

// The real map, level by level. Enough to see the shape of the course without a wall of text.
const SYLLABUS = [
  { level: 'Warm-ups', blurb: 'Two tiny builds that make the agent feel like a creative partner.', quests: ['Your Name in Stardust', 'Desk Pet'] },
  { level: 'Your own files', blurb: 'Your art, your music and your story, brought into the browser.', quests: ['Living Poster', 'Beat Cut', 'Choose-Your-Own-Adventure'] },
  { level: 'Creative tools', blurb: 'The agent writes the script; you run it in the big apps.', quests: ['Staircase to Nowhere', 'Haunted Forest'] },
  { level: 'Projects', blurb: 'Multi-day builds that end up online with your name on them.', quests: ['Portfolio Site', 'Blender → Web 360° Turntable', 'Capstone: Browser Game on itch.io'] },
]

const WORKS_WITH = ['kilo', 'opencode', 'claude-code', 'cursor', 'copilot']

const TAKEOVER_SIZE = 220


export type SignInPhase = 'hero' | 'takeover' | 'auth'

/**
 * The beat to show for a gate. A gate opens its card straight away, and leaving one returns
 * to the landing — the provider stays mounted, so it would otherwise leave the card sitting
 * over the marketing page.
 */
export function phaseFor(gate: Gate | undefined, phase: SignInPhase): SignInPhase {
  if (!gate) return 'hero'
  return phase === 'hero' ? 'auth' : phase
}

/**
 * The front door. On `/` it runs in three beats: the landing (one big "Start learning"),
 * Spark's takeover (it hops to the middle, beams, and zooms until it fills the screen),
 * then the sign-in card with Spark perched on top. On an app path it skips the marketing
 * and opens the card directly, worded for the page the learner asked for.
 */
export default function SignIn({ onDone, gate }: { onDone: () => void; gate?: Gate }) {
  const router = useRouter()
  const reduce = useReducedMotion()
  const [phase, setPhase] = useState<SignInPhase>(gate ? 'auth' : 'hero')
  const [from, setFrom] = useState({ x: 0, y: 0 })

  // The gate is a prop, not a mount: moving between `/` and a gated page must restart the beat.
  useEffect(() => {
    setPhase((p) => phaseFor(gate, p))
  }, [gate])

  // Start learning → Spark takes over the screen, then the sign-in card.
  function start(e: React.MouseEvent) {
    if (reduce) return setPhase('auth')
    setFrom({ x: e.clientX - window.innerWidth / 2, y: e.clientY - window.innerHeight / 2 })
    setPhase('takeover')
    // A burst of stars as Spark lands in the middle, just before it zooms.
    setTimeout(() => confetti(false, { x: 0.5, y: 0.5 }), 560)
  }

  // "Back" always returns to the landing. From a gate that means the real page, and until the
  // route catches up the card stays put instead of flashing the landing under the gate's URL.
  function back() {
    setPhase('hero')
    if (gate) router.push('/')
  }

  // A gate keeps its card on screen even after Back reset the beat, until the route changes.
  const view: SignInPhase = gate ? phaseFor(gate, phase) : phase

  return (
    <>
      {view === 'hero' ? <Landing onStart={start} /> : <Auth gate={gate} onDone={onDone} onBack={back} entering={view === 'takeover'} />}

      <AnimatePresence>
        {view === 'takeover' && (
          <motion.div className="takeover" exit={{ opacity: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } }}>
            <motion.div className="takeover__wash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} />
            <motion.div
              className="takeover__spark"
              style={{ width: TAKEOVER_SIZE, height: TAKEOVER_SIZE, marginLeft: -TAKEOVER_SIZE / 2, marginTop: -TAKEOVER_SIZE / 2 }}
              initial={{ x: from.x, y: from.y, scale: 0.3, rotate: -14 }}
              animate={{ x: [from.x, 0, 0, 0], y: [from.y, -60, 0, 0], scale: [0.3, 0.9, 1, 16], rotate: [-14, 8, 0, 0] }}
              transition={{ duration: 1.35, times: [0, 0.32, 0.5, 1], ease: ['easeOut', 'easeIn', [0.7, 0, 0.84, 0]] }}
              onAnimationComplete={() => setPhase('auth')}
            >
              <Spark size={TAKEOVER_SIZE} mood="hype" bob={false} tilt={-6} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/**
 * The hidden state an entrance starts from, or `false` — meaning "render the settled state at
 * once" — when the learner asked for less motion. Nothing on the landing waits behind a fade.
 */
export function entranceFrom<T>(reduce: boolean | null, from: T): T | false {
  return reduce ? false : from
}

/** The landing: what this is, a taste of the map, and one big button. */
export function Landing({ onStart }: { onStart: (e: React.MouseEvent) => void }) {
  const reduce = useReducedMotion()
  return (
    <main className="signin">
      <motion.section className="signin__copy" initial={entranceFrom(reduce, { opacity: 0, y: 16 })} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
        <span className="mono muted">Creative AI Agent Quest</span>
        <h1>Learn to build anything with an AI agent.</h1>
        <ul className="signin__points">
          {POINTS.map((p, i) => (
            <motion.li key={p.text} initial={entranceFrom(reduce, { opacity: 0, x: -10 })} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.06 + i * 0.05, duration: 0.3 }}>
              <span className="signin__ico">
                <p.icon size={18} />
              </span>
              {p.text}
            </motion.li>
          ))}
        </ul>
        <motion.button
          className="btn btn--lg start"
          onClick={onStart}
          initial={entranceFrom(reduce, { opacity: 0, y: 10 })}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14, type: 'spring', stiffness: 300, damping: 20 }}
        >
          Start learning <ArrowRight className="btn__arrow" size={22} strokeWidth={2.6} />
        </motion.button>
        <div className="signin__works">
          <span className="mono muted">Works with</span>
          {WORKS_WITH.map((id) => (
            <span key={id} className="chip">
              {toolOf(id).name}
            </span>
          ))}
          <span className="muted">and more</span>
        </div>
        <p className="signin__fine">The quest is free from Base Camp to the final project — no paid tiers, no locked quests, no ceiling. Bring a free tool (Kilo Code or OpenCode) or one you already pay for. Sign in with Google or email; your progress saves, and you stay signed in.</p>
        <p className="signin__fine">Forgot your password? Ask your mentor — they can reset it for you. There is no self-serve reset email.</p>
        <p className="signin__fine">
          Connecting your own agent? Read the <Link href="/mcp">public MCP setup guide</Link>.
        </p>
        <p className="signin__legal">
          <Link href="/privacy">Privacy</Link>
          <span aria-hidden>·</span>
          <Link href="/terms">Terms of use</Link>
        </p>
      </motion.section>

      <div className="signin__art" aria-hidden>
        <div className="mini">
          <svg className="mini__path" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M18 86 C18 79, 70 79, 70 72 C70 61, 42 61, 42 50 C42 40, 78 40, 78 30 C78 21, 46 20, 46 11" vectorEffect="non-scaling-stroke" />
            <motion.path
              className="mini__done"
              d="M18 86 C18 79, 70 79, 70 72 C70 61, 42 61, 42 50"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.4, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>
          {NODES.map((nd, i) => (
            <motion.span
              key={nd.n}
              className={`mini__node ${'done' in nd ? 'is-done' : ''} ${'here' in nd ? 'is-here' : ''} ${'boss' in nd ? 'is-boss' : ''} ${!('done' in nd) && !('here' in nd) ? 'is-locked' : ''}`}
              data-tone={nd.tone}
              style={{ left: `${nd.x}%`, top: `${nd.y}%`, x: '-50%', y: '-50%' }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25 + i * 0.12, type: 'spring', stiffness: 380, damping: 18 }}
            >
              {'done' in nd ? <Check size={22} strokeWidth={3} /> : nd.n}
              {'boss' in nd && (
                <span className="mini__crown">
                  <Crown size={13} />
                </span>
              )}
            </motion.span>
          ))}
          <motion.span className="mini__here" style={{ left: '42%', top: '50%', x: '-50%', y: 'calc(-100% - 40px)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}>
            You’re here
          </motion.span>
          <span className="mini__spark" style={{ left: '42%', top: '50%' }}>
            <Spark size={110} mood="idle" follow playful />
          </span>
          <motion.span
            className="mini__chip mini__xp"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1, y: [0, -6, 0] }}
            transition={{ opacity: { delay: 1.3 }, scale: { delay: 1.3, type: 'spring', stiffness: 400, damping: 14 }, y: { duration: 3, repeat: Infinity, ease: 'easeInOut' } }}
          >
            +100 XP
          </motion.span>
          <motion.span className="mini__chip mini__streak" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.5, duration: 0.5 }}>
            <Flame size={15} strokeWidth={2.6} /> 4-day streak
          </motion.span>
          <motion.span className="mini__badge" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.7, duration: 0.5 }}>
            <span className="badge__medal" style={{ width: 34, height: 34 }}>
              <Camera size={16} />
            </span>
            <span>
              <small>Badge unlocked</small>
              <b>Show &amp; Tell</b>
            </span>
          </motion.span>
        </div>
      </div>

      <section className="soon" aria-labelledby="how-h">
        <h2 id="how-h" className="soon__h">
          How it works
        </h2>
        <div className="soon__grid">
          {STEPS.map((x, i) => (
            <motion.div
              key={x.title}
              className="soon__card"
              initial={entranceFrom(reduce, { opacity: 0, y: 12 })}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 + i * 0.05, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="soon__dot" data-tone={['cyan', 'mint', 'lav'][i]}>
                {i + 1}
              </span>
              <h3>{x.title}</h3>
              <p>{x.body}</p>
            </motion.div>
          ))}
        </div>
        <p className="soon__later muted">Coming soon: quests generated around your goal, and picture walkthroughs for your exact tool.</p>
      </section>

      <section className="soon" aria-labelledby="syllabus-h">
        <h2 id="syllabus-h" className="soon__h">
          What you build
        </h2>
        <p className="soon__later muted">Base Camp plus ten quests. Each has a main build and two swaps, so it fits your tool and your taste.</p>
        <div className="soon__grid">
          {SYLLABUS.map((g) => (
            <div key={g.level} className="soon__card">
              <h3>{g.level}</h3>
              <p>{g.blurb}</p>
              <p className="soon__quests">{g.quests.join(' · ')}</p>
            </div>
          ))}
        </div>
        <p className="soon__later muted">After that, an optional Pro track: nine levels on planning, rules files, MCP, hooks, subagents and shipping safely — with your own agent sending the proof.</p>
      </section>
    </main>
  )
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (o: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: string; auto_select?: boolean }) => void
          renderButton: (el: HTMLElement, o: Record<string, unknown>) => void
        }
      }
    }
  }
}

/** Load Google's "Sign in with Google" script once, in English. */
const loadGoogle = () =>
  new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve()
    const s = document.createElement('script')
    s.src = GOOGLE_GSI_SRC
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Google sign-in couldn’t load'))
    document.head.appendChild(s)
  })

/** POST to the sign-in endpoint; throws the server's friendly message on failure. */
async function signIn(body: Record<string, unknown>) {
  const res = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const b = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(b.error || 'Sign-in didn’t go through. Please try again.')
  return b as { ok?: boolean; needName?: boolean; isNew?: boolean }
}

type Step = 'email' | 'code' | 'name' | 'password'

/**
 * The sign-in card, with Spark perched on top reacting to everything: it waves hello,
 * watches the cursor, covers its eyes while you type a password, gasps at an error,
 * thinks while we wait, and cheers when you're in. Google is Google's own button; email
 * sends a 6-digit code (or uses a password when codes aren't switched on).
 */
function Auth({ onDone, onBack, entering, gate }: { onDone: () => void; onBack: () => void; entering: boolean; gate?: Gate }) {
  const [opts, setOpts] = useState<{ google: string | null; otp: boolean } | null>(null)
  const [step, setStep] = useState<Step>('email')
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [pass, setPass] = useState('')
  const [show, setShow] = useState(false)
  const [pwFocus, setPwFocus] = useState(false)
  const [yay, setYay] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const gbtn = useRef<HTMLDivElement>(null)

  // Which sign-in options are on (Google client id, email codes).
  useEffect(() => {
    fetch('/api/session')
      .then((r) => r.json())
      .then((o) => {
        setOpts(o)
        if (!o.otp) setStep('password')
      })
      .catch(() => setOpts({ google: null, otp: false }))
  }, [])

  const finish = () => {
    setYay(true)
    confetti(true)
    setTimeout(onDone, 750)
  }

  // Render Google's own button (it handles the popup and hands us an ID token).
  useEffect(() => {
    if (!opts?.google || !gbtn.current) return
    let gone = false
    loadGoogle()
      .then(() => {
        if (gone || !gbtn.current || !window.google) return
        window.google.accounts.id.initialize({
          client_id: opts.google!,
          ux_mode: 'popup',
          callback: async ({ credential }) => {
            setErr('')
            setBusy(true)
            try {
              await signIn({ mode: 'google', credential })
              finish()
            } catch (e) {
              setErr((e as Error).message)
              setBusy(false)
            }
          },
        })
        window.google.accounts.id.renderButton(gbtn.current, { ...GOOGLE_BUTTON_OPTIONS, width: Math.min(360, gbtn.current.offsetWidth || 360) })
      })
      .catch(() => setErr('Google sign-in couldn’t load — try email instead.'))
    return () => {
      gone = true
    }
  }, [opts?.google]) // eslint-disable-line react-hooks/exhaustive-deps

  // "Resend code" waits 30 s between sends.
  useEffect(() => {
    if (!cooldown) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  // A fresh error makes Spark gasp for a moment.
  const [gasp, setGasp] = useState(false)
  useEffect(() => {
    if (!err) return
    setGasp(true)
    const t = setTimeout(() => setGasp(false), 1800)
    return () => clearTimeout(t)
  }, [err])

  /** Run one sign-in action with busy/error handling. */
  async function run(fn: () => Promise<void>) {
    setErr('')
    setBusy(true)
    try {
      await fn()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const sendCode = () =>
    run(async () => {
      await signIn({ mode: 'otp-send', email })
      setStep('code')
      setCode('')
      setCooldown(30)
    })

  const verify = () =>
    run(async () => {
      const r = await signIn({ mode: 'otp-verify', email, code, name: step === 'name' ? name : undefined })
      if (r.needName) return setStep('name')
      finish()
    })

  const withPassword = () =>
    run(async () => {
      await signIn(mode === 'up' ? { mode: 'signup', name, email, password: pass } : { mode: 'signin', email, password: pass })
      finish()
    })

  const mood: Mood = yay ? 'hype' : gasp ? 'wow' : busy ? 'think' : step === 'password' && pwFocus && !show ? 'peek' : step === 'name' ? 'hype' : 'wave'
  const line = yay
    ? 'You’re in! Let’s go!'
    : gasp
      ? 'Oops! Let’s try that again.'
      : busy
        ? 'One sec…'
        : step === 'code'
          ? 'Check your inbox — I just sent you a 6-digit code!'
          : step === 'name'
            ? 'Ooh, a new friend! What should I call you?'
            : step === 'password' && pwFocus && !show
              ? 'I’m not looking, promise!'
              : gate
                ? gate.bubble
                : 'Yay! Let’s save your progress so you never lose a star.'

  return (
    <main className="auth">
      <motion.div
        className="auth__card"
        initial={entering ? { opacity: 0, scale: 0.9, y: 30 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: entering ? 0.9 : 0, type: 'spring', stiffness: 260, damping: 24 }}
      >
        <div className="auth__perch">
          <motion.span initial={entering ? { y: 40, scale: 0.4 } : false} animate={{ y: 0, scale: 1 }} transition={{ delay: entering ? 1.05 : 0, type: 'spring', stiffness: 380, damping: 14 }}>
            <Spark size={120} mood={mood} follow playful />
          </motion.span>
          <AnimatePresence mode="wait">
            <motion.p
              key={line}
              className="auth__bubble"
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22 }}
            >
              {line}
            </motion.p>
          </AnimatePresence>
        </div>

        <h1>{step === 'name' ? 'Nice to meet you!' : gate ? gate.title : 'Let’s get you in'}</h1>
        {gate && step !== 'name' && <p className="auth__gate">{gate.body}</p>}

        {opts?.google && (step === 'email' || step === 'password') && (
          <>
            <div className="gsi" ref={gbtn} role="group" aria-label={GOOGLE_BUTTON_LABEL} lang="en" />
            <div className="or">
              <span>or</span>
            </div>
          </>
        )}

        {step === 'email' && (
          <form
            className="eform"
            onSubmit={(e) => {
              e.preventDefault()
              sendCode()
            }}
          >
            <input className="input" type="email" placeholder="Your email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required aria-label="Email" />
            <button className="btn btn--lg btn--block" disabled={busy}>
              <Mail size={20} /> Email me a code
            </button>
            <button type="button" className="linkbtn" onClick={() => setStep('password')}>
              Use a password instead
            </button>
          </form>
        )}

        {(step === 'code' || step === 'name') && (
          <form
            className="eform"
            onSubmit={(e) => {
              e.preventDefault()
              verify()
            }}
          >
            {step === 'code' ? (
              <>
                <p className="muted" style={{ textAlign: 'center', fontSize: 'var(--text-sm)' }}>
                  Sent to <b style={{ color: 'var(--color-ink)' }}>{email}</b>
                </p>
                <input
                  className="input otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="••••••"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  autoFocus
                  aria-label="6-digit code"
                />
              </>
            ) : (
              <input className="input" placeholder="Your first name" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} autoFocus aria-label="Your first name" />
            )}
            <button className="btn btn--lg btn--block" disabled={busy || (step === 'code' ? code.length !== 6 : !name.trim())}>
              {step === 'name' ? 'Start my quest' : 'Let’s go'} <ArrowRight className="btn__arrow" size={20} />
            </button>
            {step === 'code' && (
              <div className="row" style={{ justifyContent: 'center', gap: 'var(--space-4)' }}>
                <button type="button" className="linkbtn" disabled={cooldown > 0 || busy} onClick={sendCode}>
                  {cooldown > 0 ? `Send a new code (${cooldown}s)` : 'Send a new code'}
                </button>
                <button type="button" className="linkbtn" onClick={() => setStep('email')}>
                  Different email
                </button>
              </div>
            )}
          </form>
        )}

        {step === 'password' && (
          <form
            className="eform"
            onSubmit={(e) => {
              e.preventDefault()
              withPassword()
            }}
          >
            <div className="eform__tabs" role="tablist">
              <button type="button" role="tab" aria-selected={mode === 'in'} onClick={() => setMode('in')}>
                Sign in
              </button>
              <button type="button" role="tab" aria-selected={mode === 'up'} onClick={() => setMode('up')}>
                New here
              </button>
            </div>
            {mode === 'up' && (
              <input className="input" placeholder="Your first name" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} aria-label="Your first name" />
            )}
            <input className="input" type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required aria-label="Email" />
            <div className="pw">
              <input
                className="input"
                type={show ? 'text' : 'password'}
                placeholder={mode === 'up' ? 'Make a password (6+ characters)' : 'Password'}
                autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                onFocus={() => setPwFocus(true)}
                onBlur={() => setPwFocus(false)}
                required
                minLength={6}
                aria-label="Password"
                style={{ paddingRight: 52 }}
              />
              <button type="button" className="iconbtn" onClick={() => setShow((x) => !x)} aria-label={show ? 'Hide password' : 'Show password'}>
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button className="btn btn--lg btn--block" disabled={busy}>
              {mode === 'up' ? 'Create my account' : gate ? gate.nextLabel : 'Sign in'}
            </button>
            {mode === 'in' && <p className="signin__fine">Forgot your password? Ask your mentor — they can reset it for you. There is no self-serve reset email.</p>}
            {opts?.otp && (
              <button type="button" className="linkbtn" onClick={() => setStep('email')}>
                Sign in with an email code instead
              </button>
            )}
          </form>
        )}

        {err && (
          <p className="signin__err" role="alert">
            {err}
          </p>
        )}
        <p className="signin__fine">You’ll stay signed in on this device.</p>
        {gate && (
          <p className="signin__fine">
            Connecting your own agent? The <Link href="/mcp" className="linkbtn">MCP setup guide</Link> is public and needs no sign-in.
          </p>
        )}
        <button className="linkbtn auth__back" onClick={onBack}>
          <ArrowLeft size={14} style={{ verticalAlign: '-2px' }} /> {gate ? 'Back to the start' : 'Back'}
        </button>
      </motion.div>
    </main>
  )
}

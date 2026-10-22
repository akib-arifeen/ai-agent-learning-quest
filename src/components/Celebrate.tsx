'use client'

import { AnimatePresence, motion } from 'motion/react'
import BadgeIcon from './BadgeIcon'
import Spark from './Spark'

// canvas-confetti needs hex/rgb, not OKLCH — these mirror the accent tokens in globals.css.
const CONFETTI = ['#f0d543', '#1d9bea', '#f2475f', '#5ad78c', '#b98af0']

/** A burst of stars + confetti. `big` for quest completes and level-ups. */
export async function confetti(big = false, origin?: { x: number; y: number }) {
  if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const fire = (await import('canvas-confetti')).default
  const o = origin || { x: 0.5, y: 0.35 }
  fire({ particleCount: big ? 140 : 50, spread: big ? 100 : 70, startVelocity: big ? 48 : 34, origin: o, colors: CONFETTI, shapes: ['star', 'circle'], scalar: big ? 1.15 : 0.9, zIndex: 90 })
  if (big) {
    setTimeout(() => fire({ particleCount: 70, angle: 60, spread: 70, origin: { x: 0, y: 0.6 }, colors: CONFETTI, shapes: ['star'], zIndex: 90 }), 180)
    setTimeout(() => fire({ particleCount: 70, angle: 120, spread: 70, origin: { x: 1, y: 0.6 }, colors: CONFETTI, shapes: ['star'], zIndex: 90 }), 300)
  }
}

export type ToastInput =
  | { kind: 'xp'; amount: number }
  | { kind: 'badge'; name: string; desc: string; icon: string }
  | { kind: 'error'; text: string }
export type Toast = ToastInput & { id: number }

/** The floating stack under the app bar: +XP pops, badge unlocks, errors. */
export function Toasts({ items }: { items: Toast[] }) {
  return (
    <div className="toasts" aria-live="polite">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -14, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 520, damping: 30 }}
          >
            {t.kind === 'xp' && <div className="toast-xp">+{t.amount} XP</div>}
            {t.kind === 'error' && <div className="toast-err">{t.text}</div>}
            {t.kind === 'badge' && (
              <div className="toast-badge">
                <span className="badge__medal">
                  <BadgeIcon name={t.icon} />
                </span>
                <span>
                  <small>Badge unlocked · +50 XP</small>
                  <b>{t.name}</b>
                </span>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export type LevelUpInfo = { level: number; name: string; nextName?: string; gained: number; badges: { name: string; icon: string }[] }

/** Full-screen level-up moment — also shows the XP and badges that got her there. */
export function LevelUp({ level, onClose }: { level: LevelUpInfo | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {level && (
        <>
          <motion.div className="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <div className="modal-wrap" style={{ placeItems: 'center' }}>
            <motion.div
              className="levelup"
              role="dialog"
              aria-label={`Level ${level.level}`}
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <span className="mono">Level up</span>
              <motion.div
                className="levelup__num"
                initial={{ rotate: -12, scale: 0.6 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 12, delay: 0.1 }}
              >
                {level.level}
              </motion.div>
              <h2>{level.name}</h2>
              <p>
                <b>+{level.gained} XP</b> · {level.nextName ? `Next rank: ${level.nextName}. Keep that streak glowing.` : 'Top rank. Legendary.'}
              </p>
              {level.badges.length > 0 && (
                <div className="levelup__badges">
                  {level.badges.map((b, i) => (
                    <motion.span
                      key={b.name}
                      className="chip chip--pear"
                      initial={{ opacity: 0, y: 8, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: 0.35 + i * 0.12, type: 'spring', stiffness: 420, damping: 20 }}
                    >
                      <BadgeIcon name={b.icon} size={15} /> {b.name}
                    </motion.span>
                  ))}
                </div>
              )}
              <Spark size={64} mood="hype" />
              <button className="btn btn--lg" onClick={onClose} autoFocus>
                Let’s keep going
              </button>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

'use client'

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { Flame } from 'lucide-react'
import { useEffect, useState } from 'react'
import BadgeIcon from './BadgeIcon'
import { useQuest } from './QuestProvider'

/** A number that ticks up to its value (instantly with reduced motion). */
export function Count({ value }: { value: number }) {
  const reduce = useReducedMotion()
  const mv = useMotionValue(reduce ? value : 0)
  const shown = useTransform(mv, (v) => Math.round(v).toLocaleString())
  useEffect(() => {
    const c = animate(mv, value, { duration: reduce ? 0 : 1.2, ease: [0.22, 1, 0.36, 1] })
    return () => c.stop()
  }, [value, mv, reduce])
  return <motion.span className="tnum">{shown}</motion.span>
}

/** One card: rank ring + XP, with the streak and quest count beside it. */
export function Stats() {
  const { sum } = useQuest()
  const C = 2 * Math.PI * 34
  return (
    <div className="card rank">
      <div className="rank__ring">
        <svg viewBox="0 0 84 84" aria-hidden>
          <circle cx="42" cy="42" r="34" fill="none" stroke="var(--color-paper-3)" strokeWidth="9" />
          <motion.circle
            cx="42"
            cy="42"
            r="34"
            fill="none"
            stroke="var(--color-accent-deep)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={C}
            initial={{ strokeDashoffset: C }}
            animate={{ strokeDashoffset: C * (1 - sum.rank.pct) }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <b>{sum.rank.level}</b>
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <h3>{sum.rank.name}</h3>
        <p>
          <b>
            <Count value={sum.xp} /> XP
          </b>
          {sum.rank.next ? ` · ${sum.rank.next - sum.xp} to ${sum.rank.nextName}` : ' · max rank'}
        </p>
        <div className="rank__mini">
          <span className="rank__streak">
            <Flame size={15} strokeWidth={2.6} /> <Count value={sum.streak} /> day streak
          </span>
          <span>{sum.questsDone}/10 quests</span>
        </div>
      </div>
    </div>
  )
}

/**
 * The badge shelf — earned medals in colour, then the next few to chase as dashed
 * outlines. Eight at a time so it reads as goals, not a checklist; the rest are a tap away.
 */
export function Badges({ all: showAll = false }: { all?: boolean }) {
  const { sum } = useQuest()
  const [all, setAll] = useState(showAll)
  const earned = sum.badges.filter((b) => b.earned)
  const shown = all ? sum.badges : [...earned, ...sum.badges.filter((b) => !b.earned)].slice(0, Math.max(8, earned.length))
  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 'var(--space-4)' }}>
        <h2>Badges</h2>
        <span className="chip tnum">
          {earned.length}/{sum.badges.length}
        </span>
      </div>
      <div className="badges">
        {shown.map((b, i) => (
          <motion.div
            key={b.id}
            className={`badge ${b.earned ? '' : 'is-locked'}`}
            title={`${b.name} — ${b.desc}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * i, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="badge__medal">
              <BadgeIcon name={b.icon} />
            </span>
            <span>{b.earned ? b.name : b.desc}</span>
          </motion.div>
        ))}
      </div>
      {shown.length < sum.badges.length && (
        <button className="linkbtn" style={{ marginTop: 'var(--space-3)' }} onClick={() => setAll(true)}>
          See all {sum.badges.length} badges
        </button>
      )}
    </div>
  )
}

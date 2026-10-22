'use client'

import { motion, useReducedMotion } from 'motion/react'
import Link from 'next/link'
import { Check, Crown, Lock, Tent } from 'lucide-react'
import { useEffect, useState } from 'react'
import { deadlineOf, fmtDay, questStatus } from '@/lib/game'
import { LEVELS, QUESTS, variantOf } from '@/lib/quest'
import { useQuest } from './QuestProvider'

const NODE_ROW = 128
const LEVEL_ROW = 112
const LEFT = 0.24
const RIGHT = 0.76

type Row =
  | { kind: 'level'; level: number; y: number; h: number }
  | { kind: 'node'; questIndex: number; y: number; x: number; side: 'l' | 'r' }

// Lay the quest out as a snake: a level header, then its quests alternating left/right.
function layout() {
  const rows: Row[] = []
  let y = 0
  let n = 0
  for (const lv of LEVELS) {
    rows.push({ kind: 'level', level: lv.num, y, h: LEVEL_ROW })
    y += LEVEL_ROW
    QUESTS.forEach((q, qi) => {
      if (q.level !== lv.num) return
      const side = n % 2 === 0 ? 'l' : 'r'
      rows.push({ kind: 'node', questIndex: qi, y: y + NODE_ROW / 2, x: side === 'l' ? LEFT : RIGHT, side })
      y += NODE_ROW
      n++
    })
    y += 18
  }
  return { rows, height: y }
}

/**
 * The quest map — Base Camp to the final boss as one winding path. Finished quests
 * fill with their level's colour, the current one pulses with Spark beside it, and
 * the inked line shows how far she's travelled.
 */
export default function QuestMap() {
  const { state, sum, setup } = useQuest()
  const reduce = useReducedMotion()
  const [width, setWidth] = useState(560)
  const [el, setEl] = useState<HTMLDivElement | null>(null)

  // The path is drawn in pixels, so track the map's width.
  useEffect(() => {
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [el])

  const { rows, height } = layout()
  const nodes = rows.filter((r): r is Extract<Row, { kind: 'node' }> => r.kind === 'node')
  const pts = nodes.map((r) => ({ x: r.x * width, y: r.y }))
  const curve = (upto: number) =>
    pts.slice(0, upto + 1).reduce((d, p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`
      const a = pts[i - 1]
      const my = (a.y + p.y) / 2
      return `${d} C ${a.x} ${my}, ${p.x} ${my}, ${p.x} ${p.y}`
    }, '')
  const currentIdx = QUESTS.findIndex((q) => questStatus(state, q) === 'active')
  const reached = currentIdx === -1 ? QUESTS.length - 1 : currentIdx

  return (
    <div className="map" ref={setEl} style={{ height }} aria-label="Quest map">
      {LEVELS.map((lv) => {
        const own = rows.filter((r) => (r.kind === 'level' ? r.level === lv.num : QUESTS[r.questIndex].level === lv.num))
        const top = own[0].y
        const last = own[own.length - 1]
        const bottom = last.kind === 'node' ? last.y + NODE_ROW / 2 : last.y + last.h
        return <div key={lv.num} className="map__band" data-tone={lv.tone} style={{ top: top - 4, height: bottom - top + 8 }} />
      })}

      <svg className="map__svg" style={{ height }} aria-hidden>
        <path className="map__path" d={curve(pts.length - 1)} />
        {reached > 0 && (
          <motion.path
            className="map__progress"
            d={curve(reached)}
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
          />
        )}
      </svg>

      {rows.map((r) => {
        if (r.kind === 'level') {
          const lv = LEVELS[r.level]
          const cleared = QUESTS.filter((q) => q.level === lv.num).every((q) => questStatus(state, q) === 'done')
          return (
            <div key={`lv${r.level}`} className="map__level" data-tone={lv.tone} style={{ top: r.y + 18 }}>
              <div className="map__levelcard">
                <span className="mono">{lv.num === 0 ? 'Start' : `Level ${lv.num}`}</span>
                <h3>{lv.name}</h3>
                {cleared ? (
                  <span className="map__cleared">
                    <Check size={14} strokeWidth={3} /> Cleared
                  </span>
                ) : (
                  <p>{lv.blurb}</p>
                )}
              </div>
            </div>
          )
        }
        const q = QUESTS[r.questIndex]
        const lv = LEVELS[q.level]
        const p = state.progress[q.id]
        const v = variantOf(q, p?.variant, setup)
        const status = questStatus(state, q)
        const due = deadlineOf(sum.slots, q.id)
        const meta =
          status === 'done' ? `Done · +${q.xp} XP` : status === 'active' ? `Due ${fmtDay(due)} · +${q.xp} XP` : `${q.time} · +${q.xp} XP`
        const nodeX = r.x * width
        const R = q.boss ? 44 : 36
        const labelStyle: React.CSSProperties =
          r.side === 'l' ? { top: r.y, left: nodeX + R + 16, maxWidth: width - nodeX - R - 24 } : { top: r.y, right: width - nodeX + R + 16, maxWidth: nodeX - R - 24 }
        return (
          <div key={q.id}>
            <motion.div
              className={`node is-${status} ${q.boss ? 'is-boss' : ''}`}
              data-tone={status === 'done' ? (lv.tone === 'ink' ? 'mint' : lv.tone) : undefined}
              style={{ left: nodeX, top: r.y, x: '-50%', y: '-50%' }}
              initial={reduce ? false : { opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            >
              {status === 'active' && (
                <>
                  <motion.span
                    className="node__ring"
                    animate={reduce ? undefined : { scale: [1, 1.18, 1], opacity: [0.9, 0.2, 0.9] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  {/* a little flag planted on the node you're on, flapping in the breeze */}
                  <span className="node__flag" aria-hidden>
                    <svg viewBox="0 0 26 34" width="34" height="44">
                      <rect x="2" y="2" width="2.6" height="31" rx="1.3" fill="var(--color-ink)" />
                      <circle cx="3.3" cy="2.6" r="2.4" fill="var(--color-accent)" stroke="var(--color-ink)" strokeWidth="1.2" />
                      <motion.path
                        d="M4.6 4 C10 2.4 14 6.4 22 4.2 L19 10 L22.6 15.6 C15 17.4 10 13.6 4.6 15.4 Z"
                        fill="var(--color-accent-3)"
                        stroke="var(--color-accent-3-deep)"
                        strokeWidth="1"
                        strokeLinejoin="round"
                        animate={reduce ? undefined : { skewY: [0, -6, 0, 5, 0], scaleX: [1, 0.92, 1, 0.95, 1] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                        style={{ transformBox: 'fill-box', transformOrigin: '0% 50%' }}
                      />
                    </svg>
                  </span>
                </>
              )}
              <Link href={`/quest/${q.id}`} className="node__btn" aria-label={`Quest ${q.num}: ${v.title} (${status})`}>
                {status === 'locked' ? <Lock size={24} /> : q.num === 0 ? <Tent size={28} /> : q.num}
              </Link>
              {q.boss && status !== 'locked' && (
                <span className="node__crown" title="Boss quest">
                  <Crown size={16} />
                </span>
              )}
              {status === 'done' && (
                <span className="node__check">
                  <Check size={15} strokeWidth={3} />
                </span>
              )}
            </motion.div>
            <Link href={`/quest/${q.id}`} className={`label ${r.side === 'r' ? 'is-right' : ''} is-${status}`} data-tone={lv.tone} style={labelStyle}>
              {status === 'active' && <small className="label__here">You’re here</small>}
              {q.boss && <small style={{ color: 'var(--color-accent-3-deep)', fontWeight: 800 }}>{q.num === 10 ? 'FINAL BOSS' : 'BOSS'}</small>}
              <b>{v.title}</b>
              <small>{meta}</small>
            </Link>
          </div>
        )
      })}
    </div>
  )
}

'use client'

import { motion } from 'motion/react'
import Link from 'next/link'
import { ArrowRight, Clock, PartyPopper, Trophy } from 'lucide-react'
import { fmtDay, slotXp } from '@/lib/game'
import { questById, variantOf } from '@/lib/quest'
import { useQuest } from './QuestProvider'

/** Hours and minutes until local midnight — the push behind "today's mission". */
function leftToday(now: Date) {
  const end = new Date(now)
  end.setHours(24, 0, 0, 0)
  const mins = Math.max(0, Math.round((end.getTime() - now.getTime()) / 60000))
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

/**
 * Today's mission: the next sitting(s) on the plan, how much XP they're worth, and a
 * countdown to midnight. Turns green when done, coral-edged when she's behind.
 */
export default function Today() {
  const { sum, state, today, now } = useQuest()
  const { pace } = sum
  const slot = pace.current

  if (pace.finished) {
    return (
      <div className="today is-done">
        <div className="today__top">
          <Trophy size={18} /> <span className="today__label">Quest complete</span>
        </div>
        <h2>You beat the whole quest. Legend.</h2>
        <p style={{ marginTop: 8 }}>Ten quests, one game shipped. Time to pick your next big thing.</p>
      </div>
    )
  }
  if (!slot) return null
  if (pace.busyToday)
    return (
      <div className="today is-done">
        <div className="today__top">
          <span className="today__label">Busy day</span>
        </div>
        <h2>Enjoy your event — the plan slid back a day and your streak is shielded.</h2>
        <p style={{ marginTop: 8 }}>
          Next up · {fmtDay(slot.date)} ·{' '}
          <Link href={`/quest/${slot.items[0].questId}`} style={{ fontWeight: 700 }}>
            peek at it
          </Link>
        </p>
      </div>
    )

  // Done for today = today's sitting is finished and the next one is planned for later.
  const doneToday = slot.date > today && sum.slots.some((s) => s.date <= today)
  const behind = pace.behind > 0
  const first = slot.items.find((i) => !i.done) || slot.items[0]
  const cta = `/quest/${first.questId}`
  const started = slot.items.some((i) => (state.progress[i.questId]?.steps || []).some((s) => s.startsWith(`${i.n}-`)))

  return (
    <motion.div
      className={`today ${doneToday ? 'is-done' : ''} ${behind ? 'is-behind' : ''}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="today__top">
        <span className="today__label">{doneToday ? 'Today: done' : 'Today’s mission'}</span>
        {behind ? (
          <span className="chip chip--coral">{pace.behind} day{pace.behind > 1 ? 's' : ''} behind</span>
        ) : pace.ahead > 0 ? (
          <span className="chip chip--mint">{pace.ahead} day{pace.ahead > 1 ? 's' : ''} ahead</span>
        ) : (
          <span className="chip" style={{ background: 'oklch(99% 0.01 95 / 0.6)' }}>On track</span>
        )}
      </div>

      <h2>
        {doneToday
          ? 'Mission complete! Rest up — or add your own twist.'
          : behind
            ? 'Catch-up time. One focused sitting puts you back on track.'
            : started
              ? 'You’re mid-mission. Keep that momentum.'
              : 'Your next adventure is ready.'}
      </h2>

      <div className="today__items">
        {doneToday && <small style={{ fontWeight: 700 }}>Next up · {fmtDay(slot.date)}</small>}
        {slot.items.map((i) => {
          const q = questById(i.questId)!
          const v = variantOf(q, state.progress[q.id]?.variant)
          const total = v.sittings.length
          return (
            <Link key={`${i.questId}-${i.n}`} href={`/quest/${q.id}`} className="today__item">
              <span className="today__num">{q.num === 0 ? '★' : q.num}</span>
              <span style={{ minWidth: 0 }}>
                <b>{v.title}</b>
                <small>
                  {total > 1 ? `Sitting ${i.n + 1} of ${total} · ` : ''}
                  {i.title} {i.done ? '· done' : ''}
                </small>
              </span>
            </Link>
          )
        })}
      </div>

      <div className="today__foot">
        <Link href={cta} className={`btn ${behind ? 'btn--coral' : doneToday ? 'btn--soft' : 'btn--ink'}`}>
          {doneToday ? 'Peek ahead' : started ? 'Continue' : 'Start mission'} <ArrowRight className="btn__arrow" size={18} />
        </Link>
        {!doneToday ? (
          <span className="today__clock">
            <Clock size={15} /> {leftToday(now)} left · up to +{slotXp(slot)} XP
          </span>
        ) : (
          <span className="today__clock">
            <PartyPopper size={15} /> Streak safe for today
          </span>
        )}
      </div>
    </motion.div>
  )
}

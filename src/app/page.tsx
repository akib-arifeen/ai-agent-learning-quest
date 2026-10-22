'use client'

import { AnimatePresence, motion } from 'motion/react'
import { Heart, Rocket, X } from 'lucide-react'
import Onboarding from '@/components/Onboarding'
import QuestMap from '@/components/QuestMap'
import { useQuest } from '@/components/QuestProvider'
import Link from 'next/link'
import Spark from '@/components/Spark'
import { Stats } from '@/components/Stats'
import { useEffect, useState } from 'react'
import Today from '@/components/Today'
import { dayOf, firstName, fmtDay } from '@/lib/game'
import { PRO_TASKS } from '@/lib/pro'
import { showPersonalisePrompt } from '@/lib/profile'

/** Time-of-day greeting. */
const hello = (h: number) => (h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening')

/** Spark's one-liner on the home screen — reacts to pace and streak so it never feels canned. */
function sparkLine(sum: ReturnType<typeof useQuest>['sum'], today: string, workedToday: boolean) {
  const { pace, streak } = sum
  if (pace.finished) return 'You did it. Every single quest.'
  if (pace.busyToday) return 'Busy day — your plan and streak are safe. See you tomorrow!'
  if (pace.restToday && pace.current && pace.current.date > today) {
    return workedToday ? 'A bonus sitting on a rest day. Nice work.' : `Rest day. Your plan picks up ${fmtDay(pace.current.date)}.`
  }
  if (pace.behind > 1) return `${pace.behind} sittings to catch up — start with the smallest step.`
  if (pace.behind === 1) return 'Just one sitting behind. Today fixes it.'
  if (pace.todayDone) return streak > 1 ? `${streak} days in a row. You’re on fire.` : 'Done for today. Proud of you.'
  if (streak >= 3) return `${streak}-day streak. Don’t let it go cold!`
  if (streak > 0) return 'Keep the streak alive — one sitting today.'
  return 'Small steps, every day. Let’s light the first star.'
}

/** Home: today's mission, stats and badges on the side, the quest map on the right. */
export default function Home() {
  const { sum, state, today, now, dismissCheer, saveProfile } = useQuest()
  const name = firstName(state.user.name)
  const cheer = state.cheers.find((c) => !c.seen_at)
  const proPassed = PRO_TASKS.filter((t) => state.pro.tasks[t.id]?.passed).length
  const proFirst = state.profile?.experience === 'comfortable' || state.profile?.role === 'developer'
  const proCard = (
    <Link href="/pro" className="card procard">
      <span className="procard__ico" aria-hidden>
        <Rocket size={22} />
      </span>
      <span className="procard__txt">
        <b>Pro track</b>
        <span className="muted">Work like a pro: MCP, skills, hooks, subagents and more. Your agent sends the proof.</span>
      </span>
      <span className="chip chip--mint tnum">
        {proPassed} of {PRO_TASKS.length} passed
      </span>
    </Link>
  )
  // Spark waves for the first few seconds after you arrive, then settles into its mood.
  const [hi, setHi] = useState(true)
  const [personalising, setPersonalising] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setHi(false), 3500)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="home">
      <div className="home__side">
        {/* Home's one Spark: waves hello, then reacts to your day and your cursor. */}
        <div className="greet">
          <Spark size={78} mood={hi ? 'wave' : sum.pace.todayDone ? 'hype' : sum.pace.behind ? 'wow' : 'idle'} follow playful />
          <div style={{ minWidth: 0 }}>
            <h1>
              {hello(now.getHours())}, {name}
            </h1>
            <motion.p className="greet__say" initial={{ opacity: 0, x: -8, scale: 0.96 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 22 }}>
              {sparkLine(sum, today, state.days.some((x) => dayOf(x) === today))}
            </motion.p>
          </div>
        </div>

        <AnimatePresence>
          {cheer && (
            <motion.div
              className="cheer"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <Heart size={20} style={{ color: 'var(--color-accent-3)', flex: 'none', marginTop: 2 }} />
              <div style={{ minWidth: 0 }}>
                <b>{cheer.from_name || 'Your mentor'} says</b>
                <p style={{ whiteSpace: 'pre-wrap' }}>{cheer.message}</p>
              </div>
              <button className="iconbtn" style={{ marginLeft: 'auto', flex: 'none' }} onClick={() => dismissCheer(cheer.id)} aria-label="Dismiss">
                <X size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showPersonalisePrompt(state) && (
            <motion.div
              className="personalise"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <Spark size={44} mood="wave" bob={false} />
              <div style={{ minWidth: 0 }}>
                <b>Make the quest yours</b>
                <p>Tell me your tool, goal and computer, and every quest speaks your tool’s language. About a minute.</p>
                <button type="button" className="btn btn--sm" onClick={() => setPersonalising(true)}>
                  Personalise
                </button>
              </div>
              <button type="button" className="iconbtn" onClick={() => void saveProfile({ dismiss: true })} aria-label="Dismiss">
                <X size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {proFirst && proCard}
        <Today />
        <Stats />
        {!proFirst && proCard}
        <Link href="/trophies" className="linkbtn" style={{ justifySelf: 'start' }}>
          See your trophies & badges →
        </Link>
      </div>
      <section aria-label="Quest map">
        <QuestMap />
      </section>
      {personalising && <Onboarding mode="edit" onDone={() => setPersonalising(false)} />}
    </div>
  )
}

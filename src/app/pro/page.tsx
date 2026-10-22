'use client'

import Link from 'next/link'
import ConnectAgent from '@/components/ConnectAgent'
import PageHead from '@/components/PageHead'
import { useQuest } from '@/components/QuestProvider'
import { PRO_TASKS } from '@/lib/pro'

/** The pro track: connect your own agent, then work through the levels. */
export default function ProPage() {
  const { state } = useQuest()
  const passed = PRO_TASKS.filter((t) => state.pro.tasks[t.id]?.passed).length

  return (
    <div className="pagecol">
      <PageHead title="Pro track">Nine levels on how professionals work with an AI coding agent. Your own agent sends the proof, over MCP.</PageHead>
      <div className="row">
        <span className="chip chip--mint tnum">
          {passed} of {PRO_TASKS.length} passed
        </span>
      </div>
      {state.profile?.experience === 'none' && <p className="muted">New to coding? The quests on the map come first; this track is for when you want to work like a pro.</p>}

      <ConnectAgent />

      <section className="stack" aria-labelledby="levels-h">
        <h2 id="levels-h">The levels</h2>
        <ul className="prolist">
          {PRO_TASKS.map((t) => {
            const st = state.pro.tasks[t.id]
            return (
              <li key={t.id}>
                <Link href={`/pro/${t.id}`} className="card prolist__item">
                  <span className="mono prolist__lvl">Level {t.level}</span>
                  <b className="prolist__title">{t.title}</b>
                  <span className="prolist__concept muted">{t.concept}</span>
                  <span className="row prolist__meta">
                    <span className="chip chip--line tnum">+{t.xp} XP</span>
                    {st?.passed ? (
                      <span className="chip chip--mint">Passed</span>
                    ) : st?.attempts ? (
                      <span className="chip chip--pear">
                        {st.attempts} {st.attempts === 1 ? 'try' : 'tries'}
                      </span>
                    ) : (
                      <span className="chip chip--line">Not started</span>
                    )}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
        <p className="muted">
          Some levels need features not every agent has (hooks, subagents, permission rules). Each level’s Other agents section says what to do instead.
        </p>
      </section>
    </div>
  )
}

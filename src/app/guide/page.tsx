'use client'

import Link from 'next/link'
import { ChevronDown, GraduationCap, LifeBuoy, Lock, Rocket, Terminal, Wrench, Zap } from 'lucide-react'
import PageHead from '@/components/PageHead'
import { useQuest } from '@/components/QuestProvider'
import Rich from '@/components/Rich'
import { fmtDay, isComplete } from '@/lib/game'
import { BRIEF_RECIPE, FREE_TIER_HABITS, LEVELS, QUESTS, UPGRADE_SIGNS, WHEN_STUCK, variantOf } from '@/lib/quest'
import { forTool, toolOf } from '@/lib/tools'

/** A titled section that stays folded until it's needed — the guide shows two things open, not seven. */
function Fold({ icon: Icon, title, hint, children }: { icon: typeof Zap; title: string; hint: string; children: React.ReactNode }) {
  return (
    <details className="fold card">
      <summary>
        <span className="ico">
          <Icon size={18} />
        </span>
        <span>
          <b>{title}</b>
          <small>{hint}</small>
        </span>
        <ChevronDown className="fold__chev" size={20} />
      </summary>
      {children}
    </details>
  )
}

/**
 * The guide: the two things to always keep in mind (golden rule, brief recipe) open at
 * the top; everything else — cheat sheet, habits, when stuck, concept cards, upgrading —
 * folded into one tidy list.
 */
export default function GuidePage() {
  const { state, setup } = useQuest()
  const tool = toolOf(setup.tool)
  const collected = QUESTS.filter((q) => isComplete(state.progress[q.id])).length

  return (
    <div className="pagecol">
      <PageHead title="Guide">The habits and shortcuts that make the agent work for you.</PageHead>

      <section className="card stack-sm" style={{ background: 'var(--color-accent-soft)', boxShadow: '0 0 0 1px oklch(85% 0.12 95)' }}>
        <h2>The golden rule: never point the agent at the only copy of your work.</h2>
        <p>Copy the project or art file into your ai-quest folder first. Agents edit files for real.</p>
      </section>

      <section className="card" style={{ padding: 0 }}>
        <div style={{ padding: 'var(--space-5) var(--space-5) var(--space-2)' }}>
          <h2>Brief recipe</h2>
          <p className="muted">A checklist for every prompt, not a template.</p>
        </div>
        <div className="recipe">
          {BRIEF_RECIPE.map((b) => (
            <div key={b.k}>
              <b>{b.k}</b>
              <p>{forTool(b.v, setup)}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="stack-sm">
        <Fold icon={Terminal} title={tool.id === 'other' ? 'Your agent’s cheat sheet' : `${tool.name} cheat sheet`} hint="Modes, models, adding files, undo, rules">
          <div className="cheat">
            {tool.cheats.map((c) => (
              <div key={c.k}>
                <b>{c.k}</b>
                <p>
                  <Rich text={c.v} />
                </p>
              </div>
            ))}
          </div>
          <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
            Docs:{' '}
            <a href={tool.docs} target="_blank" rel="noreferrer">
              {tool.docs.replace(/^https?:\/\//, '')}
            </a>
          </p>
          <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
            Checked {fmtDay(tool.checked, { day: 'numeric', month: 'long', year: 'numeric' })} against the official docs
          </p>
          <details className="muted" style={{ fontSize: 'var(--text-sm)' }}>
            <summary>Sources</summary>
            <ul>
              {tool.sources.map((u) => (
                <li key={u}>
                  <a href={u} target="_blank" rel="noreferrer">
                    {u.replace(/^https?:\/\//, '')}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        </Fold>
        <Fold icon={Zap} title="Habits that keep the agent sharp" hint="Five habits that keep any agent on track">
          <ol className="numlist">
            {FREE_TIER_HABITS.map((h) => (
              <li key={h}>{forTool(h, setup)}</li>
            ))}
          </ol>
        </Fold>
        <Fold icon={LifeBuoy} title="When you’re stuck" hint="What to try before you give up">
          <ol className="numlist">
            {WHEN_STUCK.map((h) => (
              <li key={h}>{forTool(h, setup)}</li>
            ))}
          </ol>
        </Fold>
        <Fold icon={GraduationCap} title="Concept cards" hint={`${collected} of ${QUESTS.length} collected — every finished quest adds one`}>
          <div className="concepts">
            {QUESTS.map((q) => {
              const v = variantOf(q, state.progress[q.id]?.variant, setup)
              const got = isComplete(state.progress[q.id])
              return (
                <div key={q.id} className={`concept-card ${got ? '' : 'is-locked'}`} data-tone={LEVELS[q.level].tone}>
                  <span className="muted" style={{ fontSize: 'var(--text-xs)', fontWeight: 700 }}>
                    {q.num === 0 ? 'Base Camp' : `Quest ${q.num}`}
                  </span>
                  <b>
                    {!got && <Lock size={14} style={{ verticalAlign: '-2px' }} />} {v.concept.name}
                  </b>
                  <p>{got ? v.concept.body : 'Finish this quest to collect the card.'}</p>
                </div>
              )
            })}
          </div>
        </Fold>
        {tool.free && (
          <Fold icon={Rocket} title="When to upgrade" hint="Signs you’ve outgrown the free models">
            <ol className="numlist">
              {UPGRADE_SIGNS.map((h) => (
                <li key={h}>{forTool(h, setup)}</li>
              ))}
            </ol>
          </Fold>
        )}
        <Fold icon={Wrench} title="Using a different tool?" hint="Switch any time; the quests reword themselves">
          <p>
            <Link href="/profile">Change your tool in your profile →</Link>
          </p>
        </Fold>
      </div>
    </div>
  )
}

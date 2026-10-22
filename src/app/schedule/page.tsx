'use client'

import Link from 'next/link'
import { Check, ChevronDown, Flag, Shield, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import PageHead from '@/components/PageHead'
import { useQuest } from '@/components/QuestProvider'
import { addDays, daysBetween, deadlineOf, fmtDay } from '@/lib/game'
import { DAY_RULES, questById, variantOf } from '@/lib/quest'

/**
 * The plan: one sitting a day from the start date, week by week. Tapping the shield
 * marks a day busy (event or activity) — the plan slides back a day and her streak
 * is protected. Past days she skipped without marking show as "missed".
 */
export default function SchedulePage() {
  const { sum, state, today, setBusy } = useQuest()
  const busy = new Set(state.busy)
  const bySlot = new Map(sum.slots.map((s) => [s.date, s]))
  const last = sum.slots[sum.slots.length - 1]?.date || today
  const [all, setAll] = useState(false)
  const days: string[] = []
  for (let d = state.startDate; d <= last; d = addDays(d, 1)) days.push(d)
  // By default just the week around today (yesterday → six days ahead), so the plan
  // reads as "what's next", not a month-long wall. The full plan is one tap away.
  const near = (d: string) => daysBetween(today, d) >= -1 && daysBetween(today, d) <= 6
  const hidden = days.filter((d) => !near(d)).length

  // Group into weeks of seven from the start date.
  const weeks: string[][] = []
  days.forEach((d, i) => {
    if (!all && !near(d)) return
    const w = Math.floor(i / 7)
    ;(weeks[w] ||= []).push(d)
  })
  const deadlines = new Map<string, string[]>()
  for (const s of sum.slots)
    for (const i of s.items) {
      if (questById(i.questId)!.num > 0 && deadlineOf(sum.slots, i.questId) === s.date)
        deadlines.set(s.date, [...new Set([...(deadlines.get(s.date) || []), i.questId])])
    }
  const canToggle = (d: string) => daysBetween(d, today) <= 7

  return (
    <div className="sched">
      <div>
        <PageHead title="Your plan">
          One sitting a day · finish line <b style={{ color: 'var(--color-ink)' }}>{fmtDay(last, { weekday: 'long', day: 'numeric', month: 'long' })}</b>
        </PageHead>

        {weeks.map(
          (w, wi) =>
            w && (
              <div key={wi} className="week">
                <h3>Week {wi + 1}</h3>
                {w.map((d) => {
                  const slot = bySlot.get(d)
                  const isBusy = busy.has(d)
                  const missed = !!slot && !slot.done && d < today
                  const cls = isBusy ? 'is-busy' : slot?.done ? 'is-done' : missed ? 'is-missed' : d === today ? 'is-today' : ''
                  return (
                    <div key={d} className={`day ${cls} ${d === today ? 'is-today' : ''}`}>
                      <div className="day__date">
                        <small>{d === today ? 'Today' : fmtDay(d, { weekday: 'short' })}</small>
                        <b>{fmtDay(d, { day: 'numeric' })}</b>
                        <small>{fmtDay(d, { month: 'short' })}</small>
                      </div>
                      <div className="day__what">
                        {isBusy ? (
                          <>
                            <b>Busy day — plan shifted</b>
                            <small>Streak shield on</small>
                          </>
                        ) : slot ? (
                          slot.items.map((i) => {
                            const q = questById(i.questId)!
                            const v = variantOf(q, state.progress[q.id]?.variant)
                            return (
                              <span key={`${i.questId}-${i.n}`} style={{ display: 'grid' }}>
                                <span className="row" style={{ gap: 6, flexWrap: 'nowrap', minWidth: 0 }}>
                                  <Link href={`/quest/${q.id}`}>{q.num === 0 ? 'Base Camp' : `Q${q.num} · ${v.title}`}</Link>
                                  {deadlines.get(d)?.includes(q.id) && !i.done && (
                                    <span className="due" title="Check-in due">
                                      <Flag size={11} /> Due
                                    </span>
                                  )}
                                </span>
                                <small>
                                  {v.sittings.length > 1 ? `Sitting ${i.n + 1}/${v.sittings.length} · ` : ''}
                                  {i.title}
                                  {i.done ? ' · done' : ''}
                                </small>
                              </span>
                            )
                          })
                        ) : (
                          <small>Free day</small>
                        )}
                      </div>
                      <div className="row" style={{ gap: 4 }}>
                        {slot?.done && !isBusy && (
                          <span className="chip chip--mint" aria-label="Done">
                            <Check size={14} strokeWidth={3} />
                          </span>
                        )}
                        {canToggle(d) && !slot?.done && (
                          <button
                            className="iconbtn"
                            onClick={() => setBusy(d, !isBusy)}
                            aria-pressed={isBusy}
                            aria-label={isBusy ? `Unmark ${fmtDay(d)} as busy` : `Mark ${fmtDay(d)} as busy`}
                            title={isBusy ? 'Busy — tap to undo' : 'Busy this day? Tap to shift the plan'}
                          >
                            {isBusy ? <ShieldCheck size={20} style={{ color: 'var(--color-accent-2-deep)' }} /> : <Shield size={20} />}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ),
        )}
        {hidden > 0 && (
          <button className="btn btn--soft" style={{ marginTop: 'var(--space-5)' }} onClick={() => setAll((x) => !x)}>
            {all ? 'Show just this week' : `Show the full plan (${hidden} more days)`}
          </button>
        )}
      </div>

      <aside className="sched__side stack">
        <p className="pace">
          {sum.pace.behind > 0
            ? `You’re ${sum.pace.behind} sitting${sum.pace.behind > 1 ? 's' : ''} behind — a weekend double-sitting catches you up fast.`
            : sum.pace.ahead > 0
              ? `You’re ${sum.pace.ahead} day${sum.pace.ahead > 1 ? 's' : ''} ahead — add your own twist before racing on.`
              : 'Right on schedule. Nice.'}
        </p>
        <details className="fold card">
          <summary>
            <span className="ico">
              <Shield size={18} />
            </span>
            <span>
              <b>How the plan works</b>
              <small>Busy days, your rhythm, the day rules</small>
            </span>
            <ChevronDown className="fold__chev" size={20} />
          </summary>
          <p>
            <b>Busy day?</b> Tap the shield on that day — the plan slides back one day and your streak stays safe.
          </p>
          <p className="muted">Weekdays: about 1–2 hours. Weekends: 2–4 hours. Bigger quests span a few days — that’s by design.</p>
          <ol className="numlist">
            {DAY_RULES.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ol>
        </details>
      </aside>
    </div>
  )
}

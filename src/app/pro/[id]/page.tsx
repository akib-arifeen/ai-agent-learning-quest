'use client'

import { ArrowLeft, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import Diagram from '@/components/Diagram'
import { diagramFor } from '@/lib/quest'
import { CopyBox, SubmissionCard } from '@/components/ConnectAgent'
import { useQuest } from '@/components/QuestProvider'
import Rich from '@/components/Rich'
import Spark from '@/components/Spark'
import { type Submission, proTaskById } from '@/lib/pro'

/** /pro/p3: one pro level, what to build, what evidence your agent sends, and what it has sent so far. */
export default function ProTaskPage() {
  const { id } = useParams<{ id: string }>()
  const task = proTaskById(id)
  if (!task)
    return (
      <div className="loading">
        <Spark size={72} mood="wow" />
        That level doesn’t exist.
        <Link href="/pro" className="btn">
          Back to the Pro track
        </Link>
      </div>
    )
  return <ProTaskView key={task.id} taskId={task.id} />
}

function ProTaskView({ taskId }: { taskId: string }) {
  const { state, openCoach, refresh } = useQuest()
  const task = proTaskById(taskId)!
  const st = state.pro.tasks[task.id]
  const [subs, setSubs] = useState<Submission[] | null>(null)
  const [failed, setFailed] = useState(false)
  const wasPassed = useRef(!!st?.passed)

  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setFailed(false)
    setLoading(true)
    try {
      const res = await fetch(`/api/pro/evidence?taskId=${encodeURIComponent(taskId)}`, { cache: 'no-store' })
      if (!res.ok) throw new Error()
      const b = await res.json()
      const list: Submission[] = b.submissions || []
      setSubs(list)
      // A fresh pass: reload the app state so XP and badges catch up.
      if (list.some((s) => s.passed) && !wasPassed.current) {
        wasPassed.current = true
        void refresh()
      }
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [taskId, refresh])
  useEffect(() => {
    void load()
  }, [load])
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load()
    }
    const onFocus = () => void load()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
    }
  }, [load])

  const latest = subs?.[0]
  const latestFailed = !!latest && !latest.passed

  return (
    <div className="pagecol">
      <div>
        <Link href="/pro" className="back">
          <ArrowLeft size={18} /> Pro track
        </Link>
        <header className="stack-sm">
          <span className="mono muted">Level {task.level}</span>
          <h1>{task.title}</h1>
          <p>
            <Rich text={task.concept} />
          </p>
          <div className="row">
            <span className="chip chip--line tnum">+{task.xp} XP</span>
            {st?.passed ? (
              <span className="chip chip--mint">Passed</span>
            ) : st?.attempts ? (
              <span className="chip chip--pear">
                {st.attempts} {st.attempts === 1 ? 'try' : 'tries'}
              </span>
            ) : (
              <span className="chip chip--line">Not started</span>
            )}
            <button type="button" className="btn btn--sm btn--soft" onClick={() => openCoach(task.id, '')}>
              Ask Spark
            </button>
          </div>
        </header>
      </div>

      <section className="card stack-sm" aria-labelledby="build-h">
        <h2 id="build-h">Build</h2>
        <ol className="prosteps">
          {task.build.map((b, i) => (
            <li key={i}>
              <Rich text={b} />
            </li>
          ))}
        </ol>
      </section>

      {diagramFor(task.id) && <Diagram name={diagramFor(task.id)!} />}

      <div className="done-when">
        <span className="mono">Done when</span>
        <p>
          <Rich text={task.done} />
        </p>
      </div>

      <section className="card stack" aria-labelledby="ev-h">
        <h2 id="ev-h">Evidence your agent sends</h2>
        <ul className="evlist">
          {task.evidence.map((e) => (
            <li key={e.id}>
              <span className="row">
                <code>{e.id}</code>
                <span className="chip chip--lav">{e.kind}</span>
                {e.optional && <span className="chip chip--line">optional</span>}
              </span>
              <b>{e.label}</b>
              <span className="muted">
                <Rich text={e.hint} />
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card stack-sm" aria-labelledby="how-h">
        <h2 id="how-h">How to submit</h2>
        <p className="muted">Paste this to your connected agent.</p>
        <CopyBox text={`Use the quest MCP server: get task ${task.id}, gather the evidence it lists, show me what you’ll send, then submit it.`} label="prompt" />
        {!state.pro.hasToken && (
          <Link href="/pro#connect" className="linkbtn" style={{ justifySelf: 'start' }}>
            Connect your agent first
          </Link>
        )}
      </section>

      <section className="card stack-sm" aria-labelledby="eq-h">
        <h2 id="eq-h">Other agents</h2>
        <p>
          <Rich text={task.equivalents} />
        </p>
        {task.sources.length > 0 && (
          <>
            <h3 id="src-h">Sources</h3>
            <ul className="prosrc" aria-labelledby="src-h">
              {task.sources.map((s) => (
                <li key={s}>
                  <a href={s} target="_blank" rel="noreferrer" className="linkbtn">
                    {s.replace(/^https?:\/\//, '')}
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="stack" aria-labelledby="subs-h">
        <div className="row">
          <h2 id="subs-h">Your submissions</h2>
          <button type="button" className="btn btn--sm btn--soft" onClick={() => void load()} disabled={loading} aria-busy={loading}>
            <RefreshCw size={16} /> {loading ? 'Refreshing' : 'Refresh'}
          </button>
          {latestFailed && (
            <button type="button" className="btn btn--sm" onClick={() => openCoach(task.id, 'My latest evidence for this level did not pass yet. What should I fix?')}>
              Ask Spark about this
            </button>
          )}
        </div>
        <div className="stack" aria-live="polite">
        {failed && !subs ? (
          <div className="card stack-sm" role="alert">
            <p>Couldn’t load your submissions.</p>
            <button type="button" className="btn btn--sm" onClick={() => void load()} style={{ justifySelf: 'start' }}>
              Try again
            </button>
          </div>
        ) : !subs ? (
          <p className="row muted" role="status">
            <Spark size={28} mood="think" bob={false} /> Loading…
          </p>
        ) : subs.length === 0 ? (
          <p className="muted">No evidence yet. Connect your agent, then ask it to submit.</p>
        ) : (
          subs.map((s) => <SubmissionCard key={s.id} s={s} />)
        )}
        </div>
      </section>
    </div>
  )
}

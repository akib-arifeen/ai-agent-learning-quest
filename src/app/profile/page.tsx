'use client'

import { LogOut, Pencil } from 'lucide-react'
import { useState } from 'react'
import Onboarding from '@/components/Onboarding'
import PageHead from '@/components/PageHead'
import { useQuest } from '@/components/QuestProvider'
import { EXPERIENCE, OSES, WEEKLY, roleLabel } from '@/lib/profile'
import { firstName } from '@/lib/game'
import { toolOf } from '@/lib/tools'

const NOT_SET = <span className="muted">Not set</span>

/** You: who you are, the answers that shape your course, and sign out. */
export default function ProfilePage() {
  const { state, signOut } = useQuest()
  const [editing, setEditing] = useState<number | null>(null)
  const p = state.profile
  const { user } = state

  const tool = p?.tool ? toolOf(p.tool) : null
  const toolName = !p?.tool ? '' : p.tool === 'other' ? p.tool_other || 'Other' : toolOf(p.tool).name
  const rows: { label: string; step: number; value: React.ReactNode }[] = [
    { label: 'Role', step: 0, value: roleLabel(p) || NOT_SET },
    { label: 'Coding', step: 1, value: EXPERIENCE.find((e) => e.id === p?.experience)?.label || NOT_SET },
    { label: 'Building', step: 2, value: p?.goal || NOT_SET },
    {
      label: 'Tool',
      step: 3,
      value: tool ? (
        <>
          {toolName}
          {p?.tool !== 'other' && (
            <>
              <span className="muted profile__price">{tool.price}</span>
              {tool.docs && (
                <a href={tool.docs} target="_blank" rel="noreferrer" className="linkbtn">
                  Docs
                </a>
              )}
            </>
          )}
        </>
      ) : (
        NOT_SET
      ),
    },
    { label: 'Computer', step: 4, value: OSES.find((o) => o.id === p?.os)?.label || NOT_SET },
    { label: 'Time a week', step: 5, value: WEEKLY.find((w) => w.minutes === p?.weekly_minutes)?.label || NOT_SET },
  ]
  const answered = !!p && !!(p.role || p.experience || p.goal || p.tool || p.os || p.weekly_minutes)

  return (
    <div className="pagecol profile">
      <PageHead title="You">Your answers shape the course: the tool wording, Base Camp’s install steps and what Spark knows about you.</PageHead>

      <section className="card profile__who" aria-label="Account">
        <span className="profile__avatar">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="" referrerPolicy="no-referrer" />
          ) : (
            <span>{firstName(user.name).slice(0, 1).toUpperCase()}</span>
          )}
        </span>
        <div style={{ minWidth: 0 }}>
          <h2>{user.name}</h2>
          <p className="muted profile__email">{user.email}</p>
        </div>
      </section>

      <section className="card stack" aria-labelledby="profile-setup">
        <h2 id="profile-setup">Your setup</h2>
        <dl className="profile__rows">
          {rows.map((r) => (
            <div key={r.label} className="profile__row">
              <dt>{r.label}</dt>
              <dd>
                {r.value}
                <button type="button" className="linkbtn profile__change" onClick={() => setEditing(r.step)}>
                  Change<span className="sr-only"> {r.label.toLowerCase()}</span>
                </button>
              </dd>
            </div>
          ))}
        </dl>
        <button type="button" className="btn btn--soft" style={{ justifySelf: 'start' }} onClick={() => setEditing(0)}>
          <Pencil size={16} aria-hidden="true" /> {answered ? 'Edit answers' : 'Personalise your quest'}
        </button>
      </section>

      <div>
        <button type="button" className="btn btn--ghost" onClick={signOut}>
          <LogOut size={16} aria-hidden="true" /> Sign out
        </button>
      </div>

      {editing !== null && <Onboarding mode="edit" start={editing} onDone={() => setEditing(null)} />}
    </div>
  )
}

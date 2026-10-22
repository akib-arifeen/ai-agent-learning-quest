'use client'

import { motion } from 'motion/react'
import Link from 'next/link'
import { FileThumb } from '@/components/Creations'
import PageHead from '@/components/PageHead'
import { useQuest } from '@/components/QuestProvider'
import Spark from '@/components/Spark'
import { Badges, Stats } from '@/components/Stats'
import { QUESTS, variantOf } from '@/lib/quest'

/** Trophies: their rank, every badge, and everything they've made — quest by quest. */
export default function TrophiesPage() {
  const { state, setup } = useQuest()
  const made = QUESTS.map((q) => ({ q, v: variantOf(q, state.progress[q.id]?.variant, setup), files: state.files.filter((f) => f.task_id === q.id) })).filter((x) => x.files.length)

  return (
    <div>
      <PageHead title="Trophies">Everything you’ve made and earned, quest by quest.</PageHead>
      <div className="trophies">
        <div className="trophies__stats">
          <Stats />
        </div>
        <section className="stack trophies__made">
          {made.length === 0 ? (
            <div className="card stack-sm" style={{ justifyItems: 'center', textAlign: 'center', padding: 'var(--space-10) var(--space-6)' }}>
              <Spark size={72} mood="idle" />
              <b>Your gallery is waiting.</b>
              <p className="muted">Finish a quest and upload what you made — it’ll live here.</p>
              <Link href="/" className="btn" style={{ marginTop: 'var(--space-2)' }}>
                Back to the map
              </Link>
            </div>
          ) : (
            made.map(({ q, v, files }, i) => (
              <motion.div
                key={q.id}
                className="card stack-sm"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link href={`/quest/${q.id}`} className="row" style={{ textDecoration: 'none' }}>
                  <span className="mono muted">{q.num === 0 ? 'Start' : `Quest ${q.num}`}</span>
                  <b style={{ fontSize: 'var(--text-lg)' }}>{v.title}</b>
                </Link>
                <div className="thumbs-grid">
                  {files.map((f) => (
                    <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="thumb" title={f.name}>
                      <span className="thumb__media">
                        <FileThumb f={f} />
                      </span>
                      <span className="thumb__name">{f.name}</span>
                    </a>
                  ))}
                </div>
              </motion.div>
            ))
          )}
        </section>
        {/* After the gallery on phones; under the rank card on laptops. */}
        <div className="trophies__badges">
          <Badges all />
        </div>
      </div>
    </div>
  )
}

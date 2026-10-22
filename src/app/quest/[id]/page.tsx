'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import QuestView from '@/components/QuestView'
import Spark from '@/components/Spark'
import { questById } from '@/lib/quest'

/** /quest/t3 — one quest's page. */
export default function QuestPage() {
  const { id } = useParams<{ id: string }>()
  const q = questById(id)
  if (!q)
    return (
      <div className="loading">
        <Spark size={72} mood="wow" />
        That quest doesn’t exist.
        <Link href="/" className="btn">
          Back to the map
        </Link>
      </div>
    )
  return <QuestView key={q.id} quest={q} />
}

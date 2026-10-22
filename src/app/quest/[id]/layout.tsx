import type { Metadata } from 'next'
import { questById } from '@/lib/quest'

/**
 * The quest's tab title, as route metadata so it holds on client-side navigation. Just the
 * quest number: the learner may be on a remix, whose title the server doesn't know.
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const q = questById((await params).id)
  return { title: !q ? 'Quest map' : q.num === 0 ? 'Base Camp' : `Quest ${q.num}` }
}

export default function QuestLayout({ children }: { children: React.ReactNode }) {
  return children
}

import type { Metadata } from 'next'
import { proTaskById } from '@/lib/pro'

/**
 * The level's title in the tab. Set as route metadata (not from the client page) so it
 * also holds on client-side navigation, where Next re-applies metadata after effects run.
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const task = proTaskById((await params).id)
  // `absolute`: the parent pro layout's plain title stops the root template from reaching here.
  return { title: { absolute: `${task ? `Level ${task.level}: ${task.title}` : 'Pro track'} · AI Quest` } }
}

export default function ProTaskLayout({ children }: { children: React.ReactNode }) {
  return children
}

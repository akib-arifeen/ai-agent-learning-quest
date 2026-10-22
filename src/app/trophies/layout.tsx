import type { Metadata } from 'next'

// The tab title, as route metadata so it holds on client-side navigation too.
export const metadata: Metadata = { title: 'Trophies' }

export default function TrophiesLayout({ children }: { children: React.ReactNode }) {
  return children
}

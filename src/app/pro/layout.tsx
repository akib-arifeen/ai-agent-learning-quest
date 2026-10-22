import type { Metadata } from 'next'

// The tab title, as route metadata so it holds on client-side navigation too.
export const metadata: Metadata = { title: 'Pro track' }

export default function ProLayout({ children }: { children: React.ReactNode }) {
  return children
}

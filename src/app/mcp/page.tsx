import type { Metadata } from 'next'
import { headers } from 'next/headers'
import McpDocs from '@/components/McpDocs'

export const metadata: Metadata = { title: 'Connect your agent' }

// The origin is read per request so the copy/paste config matches the host the learner is on.
export const dynamic = 'force-dynamic'

export default async function McpPage() {
  const h = await headers()
  const host = (h.get('x-forwarded-host') || h.get('host') || 'localhost:3000').replace(/\/$/, '')
  const proto = h.get('x-forwarded-proto') || (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? 'http' : 'https')
  return <McpDocs origin={`${proto}://${host}`} />
}

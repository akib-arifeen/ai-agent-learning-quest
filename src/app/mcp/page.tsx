import type { Metadata } from 'next'
import { headers } from 'next/headers'
import McpDocs from '@/components/McpDocs'
import { publicOrigin } from '@/lib/public-origin'

export const metadata: Metadata = { title: 'Connect your agent' }

// The origin is read per request so the copy/paste config matches the host the learner is on.
export const dynamic = 'force-dynamic'

export default async function McpPage() {
  const h = await headers()
  return <McpDocs origin={publicOrigin(h, process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')} />
}

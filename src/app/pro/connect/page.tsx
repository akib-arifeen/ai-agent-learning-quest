'use client'

import ConnectAgent from '@/components/ConnectAgent'
import PageHead from '@/components/PageHead'

/** A focused page for the "connect your agent" step, with the same panel the pro track uses. */
export default function ProConnectPage() {
  return (
    <div className="pagecol">
      <PageHead title="Connect your agent">Make a token, add it to your agent’s MCP settings, then ask it to start level 1.</PageHead>
      <ConnectAgent />
    </div>
  )
}

'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import Spark from '@/components/Spark'

/** Route-level error boundary. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="loading">
      <Spark size={72} mood="wow" />
      <h1>Something broke on our side.</h1>
      <p>It’s not you. Try again, and if it keeps happening, come back in a little while.</p>
      <button type="button" className="btn" onClick={() => reset()}>
        Try again
      </button>
      <Link href="/" className="btn">
        Back to the map
      </Link>
    </div>
  )
}

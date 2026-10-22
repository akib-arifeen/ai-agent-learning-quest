import Link from 'next/link'
import Spark from '@/components/Spark'

/** Any unknown URL. */
export default function NotFound() {
  return (
    <div className="loading">
      <Spark size={72} mood="wow" />
      <h1>This page wandered off.</h1>
      <p>The link might be old, or the page moved. Your quest is safe.</p>
      <Link href="/" className="btn">
        Back to the map
      </Link>
    </div>
  )
}

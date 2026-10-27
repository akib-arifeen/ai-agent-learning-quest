/** Public password-recovery page: no session needed. */
import type { Metadata } from 'next'
import RecoverPassword from '@/components/RecoverPassword'

export const metadata: Metadata = { title: 'Recover your password' }

export default function RecoverPage() {
  return <RecoverPassword />
}

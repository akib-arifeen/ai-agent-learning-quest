/** Signed-in account and data deletion settings. */
import type { Metadata } from 'next'
import AccountSettings from '@/components/AccountSettings'

export const metadata: Metadata = { title: 'Account & data' }

export default function AccountPage() {
  return <AccountSettings />
}

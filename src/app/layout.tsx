import type { Metadata, Viewport } from 'next'
import { JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google'
import QuestProvider from '@/components/QuestProvider'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({ variable: '--font-jakarta', subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] })
const jetbrains = JetBrains_Mono({ variable: '--font-jetbrains', subsets: ['latin'], weight: ['400', '500'] })

export const metadata: Metadata = {
  title: 'Creative AI Agent Quest',
  description: '10 quests, one AI coach, and a lot of glowing things — learn to build with AI agents.',
  appleWebApp: { capable: true, title: 'AI Quest', statusBarStyle: 'default' },
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#fbf8ec',
}

/** Root layout: fonts + the quest provider (state, coach, celebrations). */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${jakarta.variable} ${jetbrains.variable}`}>
      <body>
        <QuestProvider>{children}</QuestProvider>
      </body>
    </html>
  )
}

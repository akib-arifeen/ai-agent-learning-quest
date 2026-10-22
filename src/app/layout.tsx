import type { Metadata, Viewport } from 'next'
import { JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google'
import QuestProvider from '@/components/QuestProvider'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({ variable: '--font-jakarta', subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] })
const jetbrains = JetBrains_Mono({ variable: '--font-jetbrains', subsets: ['latin'], weight: ['400', '500'] })

const title = 'Creative AI Agent Quest'
const description = 'A gamified, AI-coached course for building real things with AI coding agents. Works with Kilo Code, OpenCode, Claude Code, Cursor and more. Free to start.'

export const metadata: Metadata = {
  metadataBase: new URL('https://creative-ai-agent-quest.vercel.app'),
  title: { default: title, template: '%s · AI Quest' },
  description,
  openGraph: { type: 'website', siteName: title, title, description, url: '/' },
  twitter: { card: 'summary_large_image', title, description },
  appleWebApp: { capable: true, title: 'AI Quest', statusBarStyle: 'default' },
  robots: { index: true, follow: true },
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

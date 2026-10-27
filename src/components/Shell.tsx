'use client'

import { motion } from 'motion/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, CalendarDays, Flame, Map as MapIcon, Rocket, Trophy } from 'lucide-react'
import { firstName } from '@/lib/game'
import { questById } from '@/lib/quest'
import { toolOf } from '@/lib/tools'
import { useQuest } from './QuestProvider'
import Spark from './Spark'

const NAV = [
  { href: '/', label: 'Map', icon: MapIcon },
  { href: '/schedule', label: 'Plan', icon: CalendarDays },
  { href: '/trophies', label: 'Trophies', icon: Trophy },
  { href: '/guide', label: 'Guide', icon: BookOpen },
  { href: '/pro', label: 'Pro', icon: Rocket },
]

/** App chrome: the top bar with the XP/streak HUD, phone tab bar, and the Spark button. */
export default function Shell({ children }: { children: React.ReactNode }) {
  const { sum, state, openCoach, setup } = useQuest()
  const path = usePathname() || '/'
  const active = (href: string) => (href === '/' ? path === '/' || path.startsWith('/quest') : path === href || path.startsWith(`${href}/`))
  const questId = path.startsWith('/quest/') ? path.split('/')[2] : 'general'
  const toNext = sum.rank.next ? sum.rank.next - sum.xp : 0
  const toolName = setup.tool === 'other' ? state.profile?.tool_other || 'your agent' : toolOf(setup.tool).name

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="topbar">
        <div className="topbar__inner">
          <Link href="/" className="brand" aria-label="Quest map">
            <Spark size={34} bob={false} />
            <span>
              AI Quest
              <small>{firstName(state.user.name)} × {toolName}</small>
            </span>
          </Link>
          <nav className="nav" aria-label="Main">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} aria-current={active(n.href) ? 'page' : undefined}>
                <n.icon size={17} /> {n.label}
              </Link>
            ))}
          </nav>
          <div className="hud">
            <span className={`hud__streak tnum ${sum.streak ? '' : 'is-cold'}`} title={`Best streak: ${sum.best} days`}>
              <Flame size={16} strokeWidth={2.6} /> {sum.streak}
              <span className="sr-only">day streak</span>
            </span>
            <span className="hud__level" title={sum.rank.next ? `${toNext} XP to ${sum.rank.nextName}` : 'Max rank'}>
              <span className="hud__lvl">{sum.rank.level}</span>
              <span className="hud__xp">
                <b>
                  {sum.rank.name} · <span className="tnum">{sum.xp}</span> XP
                </b>
                <span className="xpbar">
                  <motion.span initial={false} animate={{ scaleX: sum.rank.pct }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
                </span>
              </span>
            </span>
            <Link href="/profile" className="avatar" title={`Signed in as ${state.user.email}`} aria-label="Your profile" aria-current={path.startsWith('/profile') ? 'page' : undefined}>
              {state.user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={state.user.image} alt="" referrerPolicy="no-referrer" />
              ) : (
                <span>{firstName(state.user.name).slice(0, 1).toUpperCase()}</span>
              )}
            </Link>
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="page">{children}</main>

      <motion.button
        className="fab"
        onClick={() => openCoach(questById(questId) ? questId : 'general')}
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.4 }}
        aria-label="Ask Spark, your AI coach"
      >
        <span className="fab__face">
          <Spark size={32} bob={false} />
        </span>
        Ask Spark
      </motion.button>

      <nav className="tabbar" aria-label="Main" style={{ gridTemplateColumns: `repeat(${NAV.length}, 1fr)` }}>
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} aria-current={active(n.href) ? 'page' : undefined}>
            <span className="tabbar__dot" />
            <n.icon size={22} />
            {n.label}
          </Link>
        ))}
      </nav>
    </>
  )
}

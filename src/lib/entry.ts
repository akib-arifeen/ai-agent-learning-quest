/**
 * Which front door a path gets. `/` is the marketing landing, the policy pages and the
 * public MCP guide skip sign-in, and the real app shows a destination-aware gate instead
 * of the marketing page. Anything else falls through to the not-found page.
 */

export type Entry = 'home' | 'public' | 'gate' | 'notfound'

export type Gate = {
  /** The path the learner was trying to open; sign-in keeps them here. */
  path: string
  title: string
  body: string
  /** What Spark says while they sign in. */
  bubble: string
  /** The primary sign-in button, worded for where they are going. */
  nextLabel: string
}

const PUBLIC = new Set(['/privacy', '/terms', '/mcp'])

const GATED = new Set(['/guide', '/pro', '/profile', '/schedule', '/trophies', '/mentor'])

/** Trim the trailing slash and the query/hash, keeping the root as "/". */
export function normalizePath(pathname: string): string {
  const path = (pathname.split(/[?#]/, 1)[0] || '/').replace(/\/+$/, '')
  return path === '' ? '/' : path.startsWith('/') ? path : `/${path}`
}

export function entryFor(pathname: string): Entry {
  const path = normalizePath(pathname)
  if (path === '/') return 'home'
  if (PUBLIC.has(path)) return 'public'
  if (GATED.has(path)) return 'gate'
  // One level deep only: `/pro/p1` and `/quest/t1` are real pages, deeper paths are not.
  const parts = path.split('/').filter(Boolean)
  if (parts.length === 2 && (parts[0] === 'pro' || parts[0] === 'quest')) return 'gate'
  return 'notfound'
}

/** The sign-in gate's copy for the page they asked for. Names no pro-level content. */
export function gateFor(pathname: string): Gate {
  const path = normalizePath(pathname)

  if (path === '/guide') {
    return {
      path,
      title: 'Sign in to open the guide',
      body: 'The guide is part of your quest: the brief recipe, a cheat sheet for your own AI tool, and the concept cards you collect as you build.',
      bubble: 'Sign in first — your guide is one tap away.',
      nextLabel: 'Sign in and open the guide',
    }
  }

  if (path === '/pro') {
    return {
      path,
      title: 'Sign in to start the pro track',
      body: 'Nine levels on how professionals work with an AI coding agent. Your own agent sends the proof over MCP.',
      bubble: 'Sign in first — then we’ll connect your agent.',
      nextLabel: 'Sign in and open the pro track',
    }
  }

  if (path.startsWith('/pro/')) {
    return {
      path,
      title: 'Sign in to open this level',
      body: 'Pro levels, your evidence and your progress live in your account.',
      bubble: 'Sign in first — your progress is waiting.',
      nextLabel: 'Sign in and open this level',
    }
  }

  if (path.startsWith('/quest/')) {
    return {
      path,
      title: 'Sign in to open this quest',
      body: 'Quests, notes and every saved step live in your account.',
      bubble: 'Sign in first — your spot is saved.',
      nextLabel: 'Sign in and open this quest',
    }
  }

  return {
    path,
    title: 'Sign in to keep going',
    body: 'Your progress, schedule and trophies are saved to your account.',
    bubble: 'Sign in first — I saved your spot.',
    nextLabel: 'Sign in and continue',
  }
}

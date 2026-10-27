import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Landing, entranceFrom } from '@/components/SignIn'

// `SignIn` must be imported as a component for its client boundary to exist; the landing
// itself renders to static markup with no browser APIs.
const html = renderToStaticMarkup(createElement(Landing, { onStart: () => undefined }))

describe('marketing landing', () => {
  it('keeps the policy pages one click away', () => {
    expect(html).toContain('href="/privacy"')
    expect(html).toContain('href="/terms"')
    expect(html).toContain('Privacy')
    expect(html).toContain('Terms of use')
  })

  it('points at the public MCP guide without a sign-in gate', () => {
    expect(html).toContain('href="/mcp"')
    expect(html).toContain('public MCP setup guide')
  })

  it('says the course is free with no paid ceiling', () => {
    expect(html).toContain('no paid tiers')
    expect(html).toContain('no ceiling')
  })

  it('points password recovery at the self-service page', () => {
    expect(html).toContain('href="/recover"')
    expect(html).toContain('Reset it with an email code')
    expect(html).not.toMatch(/mentor/i)
    expect(html).not.toContain('no self-serve reset email')
  })

  it('gives the syllabus a real heading hierarchy', () => {
    expect(html.match(/<h1/g)?.length).toBe(1)
    expect(html.match(/<h2/g)?.length).toBeGreaterThanOrEqual(2)
    expect(html.match(/<h3/g)?.length).toBeGreaterThanOrEqual(7)
    for (const h of ['How it works', 'What you build']) expect(html, h).toContain(`>${h}</h2>`)
    for (const h of ['Tell Spark about you', 'Warm-ups', 'Your own files', 'Creative tools', 'Projects']) expect(html, h).toContain(`>${h}</h3>`)
    expect(html).not.toContain('<span class="mono muted">How it works</span>')
  })

  it('previews the real quests, including the capstone', () => {
    for (const title of ['Your Name in Stardust', 'Desk Pet', 'Living Poster', 'Beat Cut', 'Choose-Your-Own-Adventure', 'Staircase to Nowhere', 'Haunted Forest', 'Portfolio Site', 'Blender → Web 360° Turntable', 'Capstone: Browser Game on itch.io']) {
      expect(html, title).toContain(title)
    }
  })

  it('does not render the sign-in card or any secret', () => {
    expect(html).not.toContain('Let’s get you in')
    expect(html).not.toMatch(/qst_[A-Za-z0-9]{8}|sk-|-----BEGIN|password=/)
  })

  it('never starts hidden when the learner asked for less motion', () => {
    const hidden = { opacity: 0, y: 16 }
    // Settled on the first paint: no fade, no delay, nothing waiting to appear.
    expect(entranceFrom(true, hidden)).toBe(false)
    // With motion allowed, the entrance still starts hidden and animates in.
    expect(entranceFrom(false, hidden)).toEqual(hidden)
    expect(entranceFrom(null, hidden)).toEqual(hidden)
  })
})

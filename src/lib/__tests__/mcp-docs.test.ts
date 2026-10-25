import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import McpDocs from '@/components/McpDocs'

const html = renderToStaticMarkup(createElement(McpDocs, { origin: 'https://quest.example.com' }))

describe('public MCP setup guide', () => {
  it('documents the real endpoint and the metadata URL', () => {
    expect(html).toContain('https://quest.example.com/api/mcp')
    expect(html).toContain('https://quest.example.com/.well-known/oauth-protected-resource')
  })

  it('shows the manual bearer-token flow without a real token', () => {
    expect(html).toContain('Bearer YOUR_TOKEN')
    expect(html).toContain('Authorization')
    expect(html).toContain('create a connection token')
    expect(html).toContain('quest_whoami')
    expect(html).not.toMatch(/qst_[A-Za-z0-9]{8}/)
  })

  it('says plainly that there is no OAuth authorization server', () => {
    expect(html).toContain('does not run an OAuth authorization server')
    expect(html).toContain('cannot connect automatically')
  })

  it('gives security guidance and links to the policies', () => {
    expect(html).toContain('Treat the token like a password')
    expect(html).toContain('Making a new token stops the old one')
    expect(html).toContain('href="/privacy"')
    expect(html).toContain('href="/terms"')
  })

  it('uses real section headings', () => {
    expect(html.match(/<h2/g)?.length).toBeGreaterThanOrEqual(4)
    expect(html).toContain('Manual setup')
    expect(html).toContain('Keep the token safe')
  })

  it('does not expose pro-level content', () => {
    for (const title of ['Plan before you build', 'A rules file that pulls its weight', 'Delegate to cheap subagents', 'Ship it safely']) {
      expect(html).not.toContain(title)
    }
  })
})

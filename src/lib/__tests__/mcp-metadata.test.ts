import { describe, expect, it } from 'vitest'
import { GET } from '@/app/.well-known/oauth-protected-resource/route'

const at = (origin: string) => new Request(`${origin}/.well-known/oauth-protected-resource`)

describe('OAuth protected resource metadata', () => {
  it('describes the MCP resource with a documentation URL and no invented authorization server', async () => {
    const res = GET(at('https://quest.example.com'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/json; charset=utf-8')
    expect(res.headers.get('cache-control')).toBe('public, max-age=3600')

    const body = await res.json()
    expect(body).toEqual({
      resource: 'https://quest.example.com/api/mcp',
      resource_name: 'Creative AI Agent Quest MCP',
      resource_documentation: 'https://quest.example.com/mcp',
      bearer_methods_supported: ['header'],
    })
    expect(body).not.toHaveProperty('authorization_servers')
    expect(body).not.toHaveProperty('scopes_supported')
  })

  it('uses the public host and protocol from proxy headers', async () => {
    const res = GET(
      new Request('https://internal.vercel.app/.well-known/oauth-protected-resource', {
        headers: { 'x-forwarded-host': 'creative-ai-agent-quest.vercel.app', 'x-forwarded-proto': 'https' },
      }),
    )
    const body = await res.json()
    expect(body.resource).toBe('https://creative-ai-agent-quest.vercel.app/api/mcp')
    expect(body.resource_documentation).toBe('https://creative-ai-agent-quest.vercel.app/mcp')
  })

  it('returns no token, key or other secret-looking value', async () => {
    const text = await GET(at('https://quest.example.com')).text()
    expect(text).not.toMatch(/qst_|Bearer |sk-|-----BEGIN|password=/)
  })
})

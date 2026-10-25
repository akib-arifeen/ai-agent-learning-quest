import { getPublicOrigin } from 'mcp-handler'

export const dynamic = 'force-dynamic'

/**
 * RFC 9728 metadata for the MCP resource at /api/mcp. Quest has no OAuth
 * authorization server: a signed-in learner mints an opaque bearer token on /pro.
 * So this advertises the resource and where its manual setup is documented, but no
 * authorization_servers or scopes, which would be a capability we do not have.
 */
export function GET(req: Request) {
  const origin = getPublicOrigin(req)
  const metadata = {
    resource: `${origin}/api/mcp`,
    resource_name: 'Creative AI Agent Quest MCP',
    resource_documentation: `${origin}/pro`,
    bearer_methods_supported: ['header'],
  }
  return new Response(JSON.stringify(metadata), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}

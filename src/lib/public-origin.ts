/**
 * The public origin of the current request, matching `getPublicOrigin` from mcp-handler for
 * the parts that matter behind a proxy: the first `x-forwarded-host` value, trimmed, with its
 * port; the first `x-forwarded-proto` value, defaulting to HTTPS. Without a forwarded host it
 * uses the `host` header, and without either it uses the configured site URL.
 */
export function publicOrigin(headers: Pick<Headers, 'get'>, fallback = 'http://localhost:3000'): string {
  const forwardedHost = headers.get('x-forwarded-host')
  const forwardedProto = headers.get('x-forwarded-proto')
  const proto = forwardedProto?.split(',')[0].trim()

  const host = (forwardedHost || headers.get('host') || '').split(',')[0].trim()
  if (host) {
    const scheme = proto || (forwardedHost ? 'https' : /^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(host) ? 'http' : 'https')
    return `${scheme}://${host}`
  }

  return fallback.trim().replace(/\/+$/, '')
}

import { describe, expect, it } from 'vitest'
import { publicOrigin } from '../public-origin'

const h = (init: Record<string, string>) => new Headers(init)

describe('publicOrigin', () => {
  it('takes the first forwarded host and keeps its port', () => {
    expect(publicOrigin(h({ 'x-forwarded-host': 'quest.example.com:8443, proxy.internal', 'x-forwarded-proto': 'http' }))).toBe('http://quest.example.com:8443')
  })

  it('trims whitespace and defaults a forwarded host to https', () => {
    expect(publicOrigin(h({ 'x-forwarded-host': '  quest.example.com  ' }))).toBe('https://quest.example.com')
    expect(publicOrigin(h({ 'x-forwarded-host': 'quest.example.com', 'x-forwarded-proto': ' https , http' }))).toBe('https://quest.example.com')
  })

  it('falls back to the host header when nothing was forwarded', () => {
    expect(publicOrigin(h({ host: 'quest.example.com' }))).toBe('https://quest.example.com')
    expect(publicOrigin(h({ host: 'quest.example.com', 'x-forwarded-proto': 'http' }))).toBe('http://quest.example.com')
  })

  it('uses plain http for a local host', () => {
    for (const host of ['localhost:3000', '127.0.0.1:3000', '[::1]:3000']) expect(publicOrigin(h({ host }))).toBe(`http://${host}`)
  })

  it('uses the configured site URL, without a trailing slash, when there is no host', () => {
    expect(publicOrigin(h({}), 'https://quest.example.com/')).toBe('https://quest.example.com')
    expect(publicOrigin(h({}))).toBe('http://localhost:3000')
  })
})

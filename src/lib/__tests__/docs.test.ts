import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const srcRead = (rel: string) => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8')
const rootRead = (rel: string) => readFileSync(new URL(`../../../${rel}`, import.meta.url), 'utf8')

const README = rootRead('README.md')
const DEPLOY = rootRead('docs/deploy.md')
const PRIVACY = srcRead('app/privacy/page.tsx')
const TERMS = srcRead('app/terms/page.tsx')

const DOCS = [
  ['README.md', README],
  ['src/app/privacy/page.tsx', PRIVACY],
  ['src/app/terms/page.tsx', TERMS],
  ['docs/deploy.md', DEPLOY],
] as const

describe('documentation has no removed privileged-role references', () => {
  for (const [name, text] of DOCS) {
    it(`${name} has no mentor or ADMIN_EMAILS wording`, () => {
      expect(text).not.toMatch(/mentor/i)
      expect(text).not.toMatch(/ADMIN_EMAILS/)
    })
  }
})

describe('privacy note is accurate and specific', () => {
  it('names the providers and the self-service paths', () => {
    for (const term of ['Vercel', 'Neon', 'Cloudflare', 'self-service deletion', 'password recovery']) {
      expect(PRIVACY, term).toContain(term)
    }
  })

  it('does not make an absolute no-one-else claim', () => {
    expect(PRIVACY).not.toMatch(/no one else/i)
  })
})

describe('README and deploy runbook describe the real operating state', () => {
  for (const [name, text] of [
    ['README.md', README],
    ['docs/deploy.md', DEPLOY],
  ] as const) {
    it(`${name} documents the separate test database and SMTP-dependent recovery`, () => {
      expect(text).toMatch(/separate test database/i)
      expect(text).toMatch(/SMTP/i)
      expect(text).toMatch(/password recovery/i)
    })

    it(`${name} states that no production action was performed for this branch`, () => {
      expect(text).toMatch(/no production merge, deploy, migration, or credential change was performed for this branch/i)
    })
  }
})

describe('historical production test-learner cleanup is correct', () => {
  it('does not offer the test database as cleanup for a production account', () => {
    expect(DEPLOY).toMatch(/never use the test database to clean a production account/i)
    expect(DEPLOY).not.toMatch(/Account & data or the test database/i)
    expect(DEPLOY).toMatch(/synthetic test learner/i)
  })
})

describe('terms cover self-service deletion', () => {
  it('points at Account & data and self-service deletion', () => {
    expect(TERMS).toMatch(/self-service deletion/i)
    expect(TERMS).toMatch(/Account (?:&amp;|&) data/i)
  })
})

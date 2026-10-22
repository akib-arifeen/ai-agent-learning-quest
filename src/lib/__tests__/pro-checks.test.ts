import { describe, expect, it } from 'vitest'
import { EVIDENCE_LIMITS, type Check, type EvidenceItem, type ProTask } from '../pro'
import { runCheck, scrubSecrets, verify } from '../pro-checks'

const A36 = 'abcdefghijklmnopqrstuvwxyz0123456789'

describe('scrubSecrets', () => {
  const families: Record<string, string> = {
    'sk-ant key': `key sk-ant-api03-${A36}AAAA end`,
    'sk-proj key': `key sk-proj-${A36}${A36} end`,
    'ghp_ token': `token ghp_${A36} end`,
    github_pat_: `token github_pat_11ABCDEFG0${A36}_${A36} end`,
    'xoxb-': 'slack xoxb-1234567890-abcdefghijkl end',
    AKIA: 'aws AKIAIOSFODNN7EXAMPLE end',
    AIza: `google AIza${A36} end`,
    JWT: 'jwt eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U end',
    'PEM block': 'before\n-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEAabc123\ndefghijkl456\n-----END RSA PRIVATE KEY-----\nafter',
    'qst_ token': `mine qst_${A36} end`,
  }

  for (const [name, input] of Object.entries(families)) {
    it(`redacts a ${name} and counts it`, () => {
      const out = scrubSecrets(input)
      expect(out.count).toBe(1)
      expect(out.text).toContain('[REDACTED]')
      expect(out.text).not.toContain(A36)
      expect(out.text).not.toContain('AKIAIOSFODNN7EXAMPLE')
      expect(out.text).not.toContain('MIIEowIBAAKCAQEA')
      expect(out.text).not.toContain('dozjgNryP4J3jVmNHl0w5N')
      expect(out.text).not.toContain('xoxb-1234567890')
    })
  }

  it('keeps user and host of a postgres URL but drops the password', () => {
    const out = scrubSecrets('DATABASE_URL=postgres://appuser:Sup3rS3cretPw@db.example.com:5432/quest')
    expect(out.count).toBe(1)
    expect(out.text).not.toContain('Sup3rS3cretPw')
    expect(out.text).toContain('appuser')
    expect(out.text).toContain('db.example.com')
  })

  it('keeps the Bearer prefix and drops the token', () => {
    const out = scrubSecrets(`Authorization: Bearer ${A36}${A36}`)
    expect(out.count).toBe(1)
    expect(out.text).toContain('Bearer ')
    expect(out.text).not.toContain(A36)
  })

  it('redacts an api_key assignment', () => {
    const out = scrubSecrets('api_key: "longvalue123"')
    expect(out.count).toBe(1)
    expect(out.text).not.toContain('longvalue123')
  })

  it('counts every redaction in a mixed text', () => {
    const out = scrubSecrets(`a ghp_${A36} b AKIAIOSFODNN7EXAMPLE c qst_${A36}`)
    expect(out.count).toBe(3)
  })

  it.each([
    'Authorization: Bearer {token}',
    'token=${QUEST_TOKEN}',
    'token = {env:QUEST_TOKEN}',
    'key: ${input:api-token}',
    'Authorization: Bearer <TOKEN>',
    'Bearer <TOKEN>',
  ])('leaves the placeholder alone: %s', (s) => {
    expect(scrubSecrets(s)).toEqual({ text: s, count: 0 })
  })

  it.each([
    'the token budget',
    'password reset flow',
    'commit 3f2a9c1d4b5e6f708192a3b4c5d6e7f801234567 fixed it',
    'see https://example.com/docs/page?x=1#top',
    'postgres://user@host:5432/db',
  ])('leaves ordinary text unchanged: %s', (s) => {
    expect(scrubSecrets(s)).toEqual({ text: s, count: 0 })
  })

  it('is idempotent: a scrubbed text scrubs to count 0', () => {
    const once = scrubSecrets(`x ghp_${A36} y postgres://u:Passw0rdXYZ@h/db z Bearer ${A36}${A36}`)
    expect(once.count).toBeGreaterThan(0)
    const twice = scrubSecrets(once.text)
    expect(twice.count).toBe(0)
    expect(twice.text).toBe(once.text)
  })
})

describe('runCheck', () => {
  const m = 'fix it'

  describe('minChars', () => {
    const c: Check = { type: 'minChars', n: 5, message: m }
    it('passes at the threshold', () => expect(runCheck(c, 'abcde')).toBe(true))
    it('fails below it', () => expect(runCheck(c, 'abcd')).toBe(false))
    it('fails on empty content', () => expect(runCheck(c, '')).toBe(false))
  })

  describe('minLines', () => {
    const c: Check = { type: 'minLines', n: 3, message: m }
    it('passes with enough non-blank lines', () => expect(runCheck(c, 'a\nb\nc')).toBe(true))
    it('fails with too few lines', () => expect(runCheck(c, 'a\nb')).toBe(false))
    it('ignores blank and whitespace-only lines', () => {
      expect(runCheck(c, 'a\n\n   \n\t\nb\n\n')).toBe(false)
      expect(runCheck(c, 'a\n\n   \nb\n\nc')).toBe(true)
    })
  })

  describe('includesAny', () => {
    const c: Check = {
      type: 'includesAny',
      terms: ['Alpha', 'beta'],
      message: m,
    }
    it('passes when one term is present', () => expect(runCheck(c, 'xx beta yy')).toBe(true))
    it('fails when none is present', () => expect(runCheck(c, 'gamma')).toBe(false))
    it('is case-insensitive', () => {
      expect(runCheck(c, 'ALPHA')).toBe(true)
      expect(runCheck(c, 'BETA')).toBe(true)
    })
  })

  describe('includesAll', () => {
    const c: Check = {
      type: 'includesAll',
      terms: ['Alpha', 'beta'],
      message: m,
    }
    it('passes when all terms are present', () => expect(runCheck(c, 'beta and alpha')).toBe(true))
    it('fails when one is missing', () => expect(runCheck(c, 'only alpha')).toBe(false))
    it('is case-insensitive', () => expect(runCheck(c, 'ALPHA BETA')).toBe(true))
  })

  describe('regex', () => {
    it('passes on a match', () => expect(runCheck({ type: 'regex', pattern: '^#\\s+\\w+', message: m }, '# Title')).toBe(true))
    it('fails on no match', () => expect(runCheck({ type: 'regex', pattern: '^#\\s+\\w+', message: m }, 'Title')).toBe(false))
    it('honours flags', () => {
      expect(runCheck({ type: 'regex', pattern: 'abc', flags: 'i', message: m }, 'xABCx')).toBe(true)
      expect(runCheck({ type: 'regex', pattern: 'abc', message: m }, 'xABCx')).toBe(true)
      expect(runCheck({ type: 'regex', pattern: 'abc', flags: '', message: m }, 'xABCx')).toBe(false)
      expect(runCheck({ type: 'countAtLeast', pattern: 'foo', n: 2, message: m }, 'FOO foo')).toBe(true)
      expect(
        runCheck(
          {
            type: 'countAtLeast',
            pattern: 'foo',
            flags: 'g',
            n: 2,
            message: m,
          },
          'FOO foo',
        ),
      ).toBe(false)
      expect(
        runCheck(
          {
            type: 'countAtLeast',
            pattern: 'foo',
            flags: 'g',
            n: 2,
            message: m,
          },
          'foo foo',
        ),
      ).toBe(true)
      expect(runCheck({ type: 'regex', pattern: '^b', flags: 'm', message: m }, 'a\nb')).toBe(true)
    })
    it('returns false (does not throw) on an invalid pattern', () => {
      expect(() => runCheck({ type: 'regex', pattern: '(', message: m }, 'x')).not.toThrow()
      expect(runCheck({ type: 'regex', pattern: '(', message: m }, '(')).toBe(false)
      expect(runCheck({ type: 'regex', pattern: 'a', flags: 'zz', message: m }, 'a')).toBe(false)
    })
  })

  describe('countAtLeast', () => {
    const c = (n: number, flags?: string): Check => ({
      type: 'countAtLeast',
      pattern: 'foo',
      flags,
      n,
      message: m,
    })
    it('passes with enough matches', () => expect(runCheck(c(3), 'foo foo foo')).toBe(true))
    it('fails with too few matches', () => expect(runCheck(c(4), 'foo foo foo')).toBe(false))
    it('counts globally even without a g flag', () => {
      expect(runCheck(c(2), 'foo bar foo')).toBe(true)
      expect(runCheck(c(2, 'i'), 'FOO bar foo')).toBe(true)
    })
    it('returns false on an invalid pattern', () => {
      expect(runCheck({ type: 'countAtLeast', pattern: '(', n: 1, message: m }, '(')).toBe(false)
    })
  })

  describe('json', () => {
    const c: Check = { type: 'json', message: m }
    it('accepts plain JSON', () => expect(runCheck(c, '{"a":[1,2,3]}')).toBe(true))
    it('accepts JSONC with // and block comments', () => {
      expect(runCheck(c, '{\n  // line comment\n  "a": 1, /* block\n comment */ "b": 2\n}')).toBe(true)
    })
    it('accepts trailing commas', () => {
      expect(runCheck(c, '{"a":[1,2,],"b":2,}')).toBe(true)
    })
    it('does not treat // inside a string as a comment', () => {
      expect(runCheck(c, '{"url": "http://x", "b": 1}')).toBe(true)
      expect(runCheck(c, '{\n  "url": "http://x" // trailing\n}')).toBe(true)
    })
    it('rejects broken JSON', () => {
      expect(runCheck(c, '{"a": }')).toBe(false)
      expect(runCheck(c, '{"a": 1')).toBe(false)
      expect(runCheck(c, "{'a': 1}")).toBe(false)
    })
    it('rejects empty content', () => expect(runCheck(c, '')).toBe(false))
  })

  describe('frontmatter', () => {
    const c: Check = {
      type: 'frontmatter',
      keys: ['name', 'description'],
      message: m,
    }
    it('passes with both --- lines and every key', () => {
      expect(runCheck(c, '---\nname: review\ndescription: Reviews code\n---\n\nBody')).toBe(true)
    })
    it('fails when a key is missing', () => {
      expect(runCheck(c, '---\nname: review\n---\nBody')).toBe(false)
    })
    it('fails without the closing ---', () => {
      expect(runCheck(c, '---\nname: review\ndescription: x\nBody')).toBe(false)
    })
    it('fails when the block does not start the file', () => {
      expect(runCheck(c, 'intro\n---\nname: review\ndescription: x\n---\n')).toBe(false)
    })
    it('fails with no frontmatter at all', () => expect(runCheck(c, 'name: a\ndescription: b')).toBe(false))
  })

  describe('https', () => {
    const c: Check = { type: 'https', message: m }
    it('passes for one https URL', () => expect(runCheck(c, 'https://github.com/a/b/pull/1')).toBe(true))
    it('rejects http:', () => expect(runCheck(c, 'http://example.com')).toBe(false))
    it('rejects whitespace inside', () => expect(runCheck(c, 'https://exa mple.com')).toBe(false))
    it('rejects two URLs', () => expect(runCheck(c, 'https://a.com https://b.com')).toBe(false))
    it('rejects non-URLs and empty content', () => {
      expect(runCheck(c, 'not a url')).toBe(false)
      expect(runCheck(c, '')).toBe(false)
    })
  })
})

describe('verify', () => {
  const task: ProTask = {
    id: 'ptest',
    level: 1,
    title: 'Test',
    concept: 'c',
    build: ['a', 'b', 'c'],
    done: 'd',
    evidence: [
      {
        id: 'req',
        kind: 'file',
        label: 'Required file',
        hint: 'h',
        checks: [{ type: 'includesAll', terms: ['hello'], message: 'Say hello' }],
      },
      {
        id: 'opt',
        kind: 'text',
        label: 'Optional note',
        hint: 'h',
        optional: true,
        checks: [{ type: 'includesAll', terms: ['world'], message: 'Say world' }],
      },
    ],
    equivalents: 'e',
    sources: ['https://example.com'],
    xp: 10,
  }
  const req = (content = 'hello there'): EvidenceItem => ({
    id: 'req',
    kind: 'file',
    content,
  })
  const opt = (content = 'big world'): EvidenceItem => ({
    id: 'opt',
    kind: 'text',
    content,
  })

  it('passes when everything is ok', () => {
    const v = verify(task, [req(), opt()])
    expect(v.passed).toBe(true)
    expect(v.results.every((r) => r.ok)).toBe(true)
    expect(v.items.map((i) => i.id).sort()).toEqual(['opt', 'req'])
    expect(v.redactions).toBe(0)
  })

  it('passes with only the required item', () => {
    expect(verify(task, [req()]).passed).toBe(true)
  })

  it('fails with a "Missing:" message when a required item is absent', () => {
    const v = verify(task, [opt()])
    expect(v.passed).toBe(false)
    const r = v.results.find((x) => x.evidenceId === 'req')
    expect(r?.ok).toBe(false)
    expect(r?.message).toMatch(/Missing:/)
    expect(r?.message).toContain('Required file')
  })

  it('fails when a required check fails, with that check message', () => {
    const v = verify(task, [req('nope')])
    expect(v.passed).toBe(false)
    expect(v.results.find((r) => r.evidenceId === 'req')?.message).toContain('Say hello')
  })

  it('still passes when the optional item is sent and fails', () => {
    const v = verify(task, [req(), opt('nothing')])
    expect(v.passed).toBe(true)
    expect(v.results.find((r) => r.evidenceId === 'opt')?.ok).toBe(false)
  })

  it('drops an unknown id from items', () => {
    const v = verify(task, [req(), { id: 'bogus', kind: 'text', content: 'hi' }])
    expect(v.passed).toBe(true)
    expect(v.items.map((i) => i.id)).toEqual(['req'])
    expect(v.results.some((r) => r.evidenceId === 'bogus')).toBe(false)
  })

  it('uses the last item when an id is duplicated', () => {
    const v = verify(task, [req('nope'), req('hello again')])
    expect(v.passed).toBe(true)
    expect(v.items.filter((i) => i.id === 'req')).toHaveLength(1)
    expect(v.items.find((i) => i.id === 'req')?.content).toBe('hello again')
    const v2 = verify(task, [req('hello first'), req('nope')])
    expect(v2.passed).toBe(false)
  })

  it('fails an item over itemChars as "too long" and truncates the stored content', () => {
    const big = 'hello' + 'x'.repeat(EVIDENCE_LIMITS.itemChars)
    const v = verify(task, [req(big)])
    expect(v.passed).toBe(false)
    const r = v.results.find((x) => x.evidenceId === 'req')
    expect(r?.ok).toBe(false)
    expect(r?.message).toMatch(/too long/i)
    const stored = v.items.find((i) => i.id === 'req')
    expect(stored?.content.length).toBeLessThanOrEqual(EVIDENCE_LIMITS.itemChars)
    expect(stored?.content.length).toBeGreaterThan(0)
  })

  it('accepts an item of exactly itemChars', () => {
    const exact = 'hello' + 'x'.repeat(EVIDENCE_LIMITS.itemChars - 5)
    expect(verify(task, [req(exact)]).passed).toBe(true)
  })

  it('fails the whole submission when there are more than EVIDENCE_LIMITS.items items', () => {
    const many = Array.from({ length: EVIDENCE_LIMITS.items + 1 }, () => req())
    const v = verify(task, many)
    expect(v.passed).toBe(false)
    expect(v.items).toEqual([])
    expect(v.results).toHaveLength(1)
    expect(v.results[0].evidenceId).toBe('*')
    expect(v.results[0].ok).toBe(false)
  })

  it('accepts exactly EVIDENCE_LIMITS.items items', () => {
    const many = Array.from({ length: EVIDENCE_LIMITS.items }, () => req())
    expect(verify(task, many).passed).toBe(true)
  })

  it('fails the whole submission when the total is over totalChars', () => {
    const each = 'hello' + 'x'.repeat(EVIDENCE_LIMITS.itemChars - 5 - 1000)
    const count = Math.floor(EVIDENCE_LIMITS.totalChars / each.length) + 1
    const items = Array.from({ length: count }, (_, i) => ({
      id: i === 0 ? 'req' : 'opt',
      kind: 'text' as const,
      content: each,
    }))
    expect(count).toBeLessThanOrEqual(EVIDENCE_LIMITS.items)
    expect(count * each.length).toBeGreaterThan(EVIDENCE_LIMITS.totalChars)
    const v = verify(task, items)
    expect(v.passed).toBe(false)
    expect(v.items).toEqual([])
    expect(v.results).toHaveLength(1)
    expect(v.results[0].evidenceId).toBe('*')
  })

  it('scrubs secrets in content and source and counts the redactions', () => {
    const v = verify(task, [
      {
        id: 'req',
        kind: 'command',
        source: `curl -H "Authorization: Bearer ${A36}${A36}"`,
        content: `hello ghp_${A36} and AKIAIOSFODNN7EXAMPLE`,
      },
    ])
    const stored = v.items[0]
    expect(stored.content).not.toContain(A36)
    expect(stored.content).not.toContain('AKIAIOSFODNN7EXAMPLE')
    expect(stored.source).not.toContain(A36)
    expect(stored.content).toContain('hello')
    expect(v.redactions).toBe(3)
  })

  describe('garbage input never throws', () => {
    const garbage: unknown[] = [
      null,
      undefined,
      'a string',
      42,
      { id: 'req' },
      [null, undefined, 3, 'x', []],
      [{ id: 'req' }],
      [{ id: 'req', kind: 'file' }],
      [{ id: 'req', kind: 'file', content: 5 }],
      [{ id: 'req', kind: 'file', content: null }],
      [{ id: 'req', kind: 'file', content: { a: 1 } }],
      [{ id: 5, kind: 'file', content: 'hello' }],
    ]
    garbage.forEach((g, i) => {
      it(`case ${i}`, () => {
        let v: ReturnType<typeof verify> | undefined
        expect(() => {
          v = verify(task, g as EvidenceItem[])
        }).not.toThrow()
        expect(v?.passed).toBe(false)
        expect(Array.isArray(v?.items)).toBe(true)
        expect(Array.isArray(v?.results)).toBe(true)
        expect(typeof v?.redactions).toBe('number')
      })
    })
  })

  it('does not throw on a bad kind or a non-string source', () => {
    expect(() =>
      verify(task, [
        {
          id: 'req',
          kind: 'nope',
          content: 'hello',
          source: 12,
        } as unknown as EvidenceItem,
      ]),
    ).not.toThrow()
  })

  it('never passes a task with zero required specs', () => {
    const optionalOnly: ProTask = {
      ...task,
      evidence: [{ ...task.evidence[1] }],
    }
    expect(verify(optionalOnly, [opt()]).passed).toBe(false)
    expect(verify(optionalOnly, []).passed).toBe(false)
    expect(verify({ ...task, evidence: [] }, []).passed).toBe(false)
  })
})

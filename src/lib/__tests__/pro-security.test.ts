import { afterAll, describe, expect, it } from 'vitest'
import { PRO_TASKS, type ProTask } from '../pro'
import { runCheck, scrubSecrets, verify } from '../pro-checks'

const T = (n: number) => 'Zx9Qw3Er7Ty1Ui5Op2As4Df6Gh8Jk0Lm'.repeat(3).slice(0, n)

/** Every check of one evidence spec of one pro task must pass. */
const specPasses = (taskId: string, evidenceId: string, content: string) => {
  const spec = PRO_TASKS.find((t) => t.id === taskId)?.evidence.find((e) => e.id === evidenceId)
  expect(spec, `${taskId}/${evidenceId} exists`).toBeDefined()
  return spec!.checks.every((c) => runCheck(c, content))
}

describe('ReDoS: scrubSecrets and verify stay fast on adversarial input', () => {
  const N = 20_000
  const inputs: Record<string, string> = {
    a: 'a'.repeat(N),
    'a.': 'a.'.repeat(N / 2),
    'a:': 'a:'.repeat(N / 2),
    'x://': 'x://'.repeat(N / 4),
    'Bearer ': 'Bearer '.repeat(Math.ceil(N / 7)).slice(0, N),
    'password=': 'password='.repeat(Math.ceil(N / 9)).slice(0, N),
    eyJ: 'eyJ'.repeat(Math.ceil(N / 3)).slice(0, N),
    'secret_key=': 'secret_key='.repeat(Math.ceil(N / 11)).slice(0, N),
    'unterminated PEM': ('-----BEGIN PRIVATE KEY-----' + 'A'.repeat(N)).slice(0, N),
  }
  for (const [name, input] of Object.entries(inputs)) {
    it(`scrubSecrets on ${N} chars of ${name} takes under 200 ms`, () => {
      expect(input.length).toBe(N)
      const t0 = performance.now()
      scrubSecrets(input)
      expect(performance.now() - t0).toBeLessThan(200)
    })
  }

  it('verify with one 20,000-character adversarial item takes under 500 ms', () => {
    const task = PRO_TASKS[0]
    const spec = task.evidence[0]
    for (const content of ['a.'.repeat(10_000), 'password='.repeat(2223).slice(0, 20_000), 'Bearer '.repeat(2858).slice(0, 20_000)]) {
      const t0 = performance.now()
      verify(task, [{ id: spec.id, kind: spec.kind, content }])
      expect(performance.now() - t0).toBeLessThan(500)
    }
  })
})

describe('Bearer tokens', () => {
  it('leaves a short value alone', () => {
    expect(scrubSecrets('Authorization: Bearer abc')).toEqual({
      text: 'Authorization: Bearer abc',
      count: 0,
    })
  })
  it('redacts a 20-character token and keeps the prefix', () => {
    const out = scrubSecrets(`Bearer ${T(20)}`)
    expect(out.count).toBe(1)
    expect(out.text).toContain('Bearer ')
    expect(out.text).not.toContain(T(20))
  })
})

describe('newly covered secrets are redacted', () => {
  const jwtLike = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.' + T(30)
  // [label, input, secret value that must be gone, name that must stay (or '')]
  const cases: [string, string, string, string][] = [
    ['stripe key=value', `STRIPE_SECRET_KEY=sk_live_${T(24)}`, T(24), 'STRIPE_SECRET_KEY'],
    ['supabase service role', `SUPABASE_SERVICE_ROLE_KEY=${jwtLike}`, T(30), 'SUPABASE_SERVICE_ROLE_KEY'],
    ['django secret key', `SECRET_KEY=django-insecure-${T(20)}`, T(20), 'SECRET_KEY'],
    ['password=hunter2', 'password=hunter2', 'hunter2', 'password'],
    ['client_secret json', `"client_secret": "${T(20)}"`, T(20), 'client_secret'],
    ['npm token', `//registry.npmjs.org/:_authToken=npm_${T(36)}`, T(36), ''],
    ['sk_test key', `key sk_test_${T(20)} end`, T(20), ''],
    ['hugging face token', `HF hf_${T(34)} end`, T(34), ''],
    ['google oauth token', `token ya29.${T(30)} end`, T(30), ''],
    ['slack webhook', 'post to https://hooks.slack.com/services/T000/B000/XXXX now', 'B000/XXXX', ''],
    ['postgres slash password', 'postgres://u:pa/ss@h', 'pa/ss', ''],
    ['redis empty user', 'redis://:pw123456@h', 'pw123456', ''],
    ['unterminated PEM', '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7\nabcdef0123456789', 'MIIEvQIBADANBgkq', ''],
  ]
  for (const [label, input, secret, name] of cases) {
    it(label, () => {
      const out = scrubSecrets(input)
      expect(out.count, out.text).toBeGreaterThanOrEqual(1)
      expect(out.text).not.toContain(secret)
      if (name) expect(out.text).toContain(name)
    })
  }

  it('keeps user and host of a postgres URL whose password contains a slash', () => {
    const out = scrubSecrets('postgres://u:pa/ss@h')
    expect(out.text).toContain('u')
    expect(out.text).toContain('@h')
  })
  it('keeps the host of a redis URL', () => {
    expect(scrubSecrets('redis://:pw123456@h').text).toContain('@h')
  })
})

describe('non-secrets survive unchanged', () => {
  it.each([
    'token budget',
    'max_tokens: 700',
    'keyboard shortcuts',
    'the password reset flow',
    'tokenizer',
    'export QUEST_TOKEN=${QUEST_TOKEN}',
    'Authorization: Bearer {token}',
  ])('%s', (s) => {
    expect(scrubSecrets(s)).toEqual({ text: s, count: 0 })
  })
})

describe('evidence kind mismatch', () => {
  const task: ProTask = {
    id: 'ptest',
    level: 1,
    title: 'T',
    concept: 'c',
    build: ['a', 'b', 'c'],
    done: 'd',
    evidence: [
      {
        id: 'f',
        kind: 'file',
        label: 'A file',
        hint: 'h',
        checks: [{ type: 'includesAll', terms: ['hello'], message: 'Say hello' }],
      },
    ],
    equivalents: 'e',
    sources: ['https://example.com'],
    xp: 1,
  }
  it('passes with the right kind', () => {
    expect(verify(task, [{ id: 'f', kind: 'file', content: 'hello world' }]).passed).toBe(true)
  })
  it('fails when sent as another kind, even with passing content, and says "kind"', () => {
    const v = verify(task, [{ id: 'f', kind: 'text', content: 'hello world' }])
    expect(v.passed).toBe(false)
    expect(v.results.some((r) => !r.ok && /kind/i.test(r.message))).toBe(true)
  })
})

describe('level checks', () => {
  describe('p6 run', () => {
    it.each(['Tests 1 failed | 4 passed', 'not ok 3 - x', ' FAIL  src/a.test.ts', '$ npm test\n FAIL  src/a.test.ts\n Tests  1 failed | 4 passed (5)'])(
      'fails on: %s',
      (s) => {
        expect(specPasses('p6', 'run', s)).toBe(false)
      },
    )
    it('passes on a green vitest run', () => {
      expect(specPasses('p6', 'run', 'Test Files 3 passed (3)\n Tests 42 passed (42)')).toBe(true)
    })
  })

  describe('p3 mcp-list', () => {
    it('fails when only quest is connected', () => {
      expect(specPasses('p3', 'mcp-list', '$ claude mcp list\nquest: https://quest.example.com/api/mcp (HTTP) - ✓ Connected')).toBe(false)
    })
    it('passes with 3 connected servers', () => {
      expect(
        specPasses(
          'p3',
          'mcp-list',
          '$ claude mcp list\nquest: https://quest.example.com/api/mcp (HTTP) - ✓ Connected\nweb-search: npx -y web-search - ✓ Connected\nplaywright: npx @playwright/mcp@latest - ✓ Connected',
        ),
      ).toBe(true)
    })
  })

  describe('p4 hook', () => {
    it('fails on prose', () => expect(specPasses('p4', 'hook', 'it stopped working')).toBe(false))
    it('passes on a settings.json with PreToolUse', () => {
      const settings =
        '{\n  "hooks": {\n    "PreToolUse": [\n      { "matcher": "Bash", "hooks": [{ "type": "command", "command": "./.claude/hooks/check.sh" }] }\n    ]\n  }\n}'
      expect(specPasses('p4', 'hook', settings)).toBe(true)
    })
    it('passes on a husky pre-commit script', () => {
      expect(specPasses('p4', 'hook', '#!/usr/bin/env sh\n. "$(dirname -- "$0")/_/husky.sh"\n\nnpx lint-staged\nnpm test --silent\n')).toBe(true)
    })
  })

  describe('p8 worktrees', () => {
    it('passes on paths with spaces', () => {
      expect(specPasses('p8', 'worktrees', '/Users/me/My Projects/app  4c77ed1 [main]\n/Users/me/My Projects/app wt/export  e83b1f4 [feat/export]')).toBe(true)
    })
  })

  describe('p5 agents', () => {
    it('fails when both files say model: inherit', () => {
      const two =
        '---\nname: scout\ndescription: Finds files.\nmodel: inherit\n---\nBody\n\n---\nname: worker\ndescription: Builds.\nmodel: inherit\n---\nBody\n'
      expect(specPasses('p5', 'agents', two)).toBe(false)
    })
  })
})

describe('check timing: no regex or countAtLeast check is slow on adversarial input', () => {
  const N = 20_000
  const unit = ['\n', ' ', ' \n', '- ', '1. ', 'a ', '\t', 'x']
  const slowest = { ms: 0, where: '' }
  afterAll(() => console.info(`slowest runCheck: ${slowest.ms.toFixed(2)} ms at ${slowest.where}`))

  for (const t of PRO_TASKS) {
    for (const e of t.evidence) {
      e.checks.forEach((c, i) => {
        if (c.type !== 'regex' && c.type !== 'countAtLeast') return
        it(`${t.id}/${e.id}#${i} (${c.type} ${c.pattern})`, () => {
          for (const u of unit) {
            const input = u.repeat(Math.ceil(N / u.length)).slice(0, N)
            const t0 = performance.now()
            runCheck(c, input)
            const ms = performance.now() - t0
            if (ms > slowest.ms)
              Object.assign(slowest, {
                ms,
                where: `${t.id}/${e.id}#${i} on ${JSON.stringify(u)}`,
              })
            expect(ms, `${JSON.stringify(u)} x ${N}`).toBeLessThan(100)
          }
        })
      })
    }
  }
})

describe('scrubber precision', () => {
  const L = (n: number) => 'Zx9Qw3Er7Ty1Ui5Op2As4Df6Gh8Jk0Lm'.repeat(3).slice(0, n)
  const redacted: [string, string, string][] = [
    ['api_key', `api_key=${L(32)}`, L(32)],
    ['SECRET_KEY', `SECRET_KEY=${L(40)}`, L(40)],
    ['STRIPE_SECRET_KEY', `STRIPE_SECRET_KEY=${L(32)}`, L(32)],
    ['SUPABASE_SERVICE_ROLE_KEY', `SUPABASE_SERVICE_ROLE_KEY=${L(40)}`, L(40)],
    ['client_secret', `client_secret: "${L(30)}"`, L(30)],
    ['private_key', `private_key = "${L(48)}"`, L(48)],
    ['PASSWORD with spaces', 'PASSWORD="my long pass phrase"', 'long pass'],
    ['secret with spaces', 'secret: "p@ss word"', 'p@ss'],
    ['password=1234567', 'password=1234567', '1234567'],
    ['Basic auth', 'Authorization: Basic dXNlcjpwYXNzd29yZA==', 'dXNlcjpwYXNzd29yZA'],
    ['sk-ant with a zero-width space', `key sk-ant-api03-${L(20)}\u200b${L(20)} end`, L(20)],
  ]
  for (const [label, input, secret] of redacted) {
    it(`redacts ${label}`, () => {
      const out = scrubSecrets(input)
      expect(out.count, out.text).toBeGreaterThanOrEqual(1)
      expect(out.text).not.toContain(secret)
    })
  }

  it.each(['keyboard: abcdefgh', 'monkey=bananas123', 'tokens: 12345678', 'max_tokens: 700', 'bearer_token_env_var = "QUEST_TOKEN"', 'hotkey=ctrl+shift+p'])(
    'leaves alone: %s',
    (s) => {
      expect(scrubSecrets(s)).toEqual({ text: s, count: 0 })
    },
  )
})

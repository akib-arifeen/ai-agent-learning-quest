import { describe, expect, it } from 'vitest'
import { PRO_TASKS, type EvidenceItem, type EvidenceKind } from '../pro'
import { verify } from '../pro-checks'

const f = (id: string, kind: EvidenceKind, content: string, source?: string): EvidenceItem => ({ id, kind, content, ...(source ? { source } : {}) })

type Sample = { required: EvidenceItem[]; optional: EvidenceItem[] }

/** Realistic submissions, as a learner's agent would send them. One per task. */
const FIXTURES: Record<string, Sample> = {
  p1: {
    required: [
      f(
        'plan',
        'text',
        `Plan: add a "mark as done" toggle to the todo list

1. Read src/components/TodoList.tsx and src/lib/store.ts to see how items are stored.
2. Add a done boolean to the Todo type in src/lib/types.ts.
3. Add toggleDone(id) to the store and cover it with a unit test.
4. Render a checkbox in TodoList and strike through finished items.
5. Run npm test and npm run build, then commit.`,
      ),
      f(
        'gitlog',
        'command',
        `$ git log --oneline -5
a41c9e2 Strike through finished todos
7be03d1 Add toggleDone to the store with tests
c92f5a8 Add done flag to Todo type
5d1e7b4 Initial todo list
0f3a6c9 Set up Vite and React`,
        'git log --oneline -5',
      ),
    ],
    optional: [
      f(
        'rewind',
        'text',
        'I let the agent rewrite store.ts wrongly, then used /rewind to restore the files. It did not undo the npm install it had run, so I checked git status and reverted package.json by hand.',
      ),
    ],
  },
  p2: {
    required: [
      f(
        'rules',
        'file',
        `# Kiki Notes

A small Next.js app where students keep reading notes.

## Stack
- Next.js 15 (App Router), TypeScript, Tailwind
- Postgres via the pg package, tests with Vitest

## Commands
- npm run dev: start the dev server on port 3000
- npm test: run the unit tests (run before every commit)
- npm run lint: ESLint, must be clean

## Rules
- Keep components small and in src/components.
- Never edit files under src/generated, they are rebuilt by the build.
- Do not add a new dependency without asking me first.
- Use the existing db helper in src/lib/db.ts, no raw SQL in components.
`,
        'CLAUDE.md',
      ),
      f(
        'lesson',
        'text',
        'The agent kept adding lodash for small helpers. I added "Do not add a new dependency without asking" to CLAUDE.md and the next run wrote a plain function instead.',
      ),
    ],
    optional: [],
  },
  p3: {
    required: [
      f(
        'mcp-list',
        'command',
        `$ claude mcp list
Checking MCP server health...

quest: https://quest.example.com/api/mcp (HTTP) - ✓ Connected
web-search: npx -y web-search - ✓ Connected
playwright: npx @playwright/mcp@latest - ✓ Connected`,
        'claude mcp list',
      ),
      f(
        'mcp-config',
        'file',
        `{
  "mcpServers": {
    "quest": {
      "type": "http",
      "url": "https://quest.example.com/api/mcp",
      "headers": { "Authorization": "Bearer \${QUEST_TOKEN}" }
    },
    "web-search": {
      "command": "npx",
      "args": ["-y", "web-search"]
    },
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}`,
        '.mcp.json',
      ),
      f(
        'research',
        'text',
        `Next.js 15 made fetch requests uncached by default, and the App Router now treats cookies() and headers() as async.
Sources:
- https://nextjs.org/blog/next-15
- https://nextjs.org/docs/app/building-your-application/upgrading/version-15`,
      ),
    ],
    optional: [],
  },
  p4: {
    required: [
      f(
        'skill',
        'file',
        `---
name: release-notes
description: Write release notes from the git log since the last tag. Use when asked to prepare a release or changelog.
---

# Release notes

1. Run \`git describe --tags --abbrev=0\` to find the last tag.
2. Run \`git log <tag>..HEAD --oneline\` and group commits into Added, Fixed, Changed.
3. Skip merge commits and anything starting with "chore".
4. Write the notes as short bullet points in plain language.
5. Put the result in CHANGELOG.md under a new version heading.
`,
        '.claude/skills/release-notes/SKILL.md',
      ),
      f(
        'hook',
        'file',
        `{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "./.claude/hooks/block-force-push.sh" }
        ]
      }
    ]
  }
}`,
        '.claude/settings.json',
      ),
    ],
    optional: [f('fired', 'command', 'PreToolUse:Bash hook blocked: git push --force is not allowed here', './.claude/hooks/block-force-push.sh')],
  },
  p5: {
    required: [
      f(
        'agents',
        'file',
        `---
name: scout
description: Finds files and answers where-is-X questions. Read only. Use for locating code.
tools: Read, Grep, Glob
model: haiku
---

You locate things in the repo. Return file paths with line numbers and nothing else.

---
name: worker
description: Implements a fully specified change in one or two files, then runs the tests.
tools: Read, Edit, Write, Bash
model: sonnet
---

You get a precise brief. Do exactly that, run npm test, and report what changed.
`,
        '.claude/agents/scout.md + .claude/agents/worker.md',
      ),
      f(
        'when-not',
        'text',
        'I keep design decisions and debugging of unknown causes in the main session, because a subagent starts with no context and I would pay the tokens twice. Subagents get small parallel jobs where the brief is complete, like renaming across files or finding callers.',
      ),
    ],
    optional: [],
  },
  p6: {
    required: [
      f(
        'run',
        'command',
        `$ npm test

 RUN  v2.1.8 /home/me/kiki-notes

 ✓ src/lib/store.test.ts (6 tests) 12ms
 ✓ src/lib/db.test.ts (4 tests) 9ms

 Test Files  2 passed (2)
      Tests  10 passed (10)
   Duration  1.04s`,
        'npm test',
      ),
      f(
        'review',
        'text',
        `Fresh-context review of the toggleDone change:
- src/lib/store.ts:42 toggleDone mutates the item in place, so React will not re-render. Copy the item first.
- src/components/TodoList.tsx:18 the checkbox has no label, so screen readers cannot name it.
- src/lib/store.test.ts:30 the test only covers toggling on, add the toggle-off case.`,
      ),
    ],
    optional: [
      f(
        'gate',
        'file',
        `{
  "hooks": {
    "Stop": [{ "hooks": [{ "type": "command", "command": "npm test --silent" }] }]
  }
}`,
        '.claude/settings.json',
      ),
    ],
  },
  p7: {
    required: [
      f(
        'spec',
        'file',
        `# Brief: worker 2, add the export endpoint

## Files in scope
- src/app/api/export/route.ts (new)
- src/lib/export.ts (new)

## Do not touch
- src/lib/db.ts, the database schema, or any existing test.

## Success criteria
- GET /api/export returns the user's notes as JSON with status 200.
- npm test passes, including the new test in src/lib/export.test.ts.
- Done when npx tsc --noEmit exits 0.
`,
        'ledger/brief-worker-2.md',
      ),
      f(
        'tasks',
        'file',
        `# GOAL
Let students export their notes.

# PLAN
Lead specs the work, workers build in parallel, a second worker reviews.

# TASKS
- [x] W1: export serializer in src/lib/export.ts
- [x] W2: export route in src/app/api/export/route.ts
- [ ] W3: review W1 and W2, plant a bug and check the tests catch it
- [ ] Lead: final check and commit
`,
        'ledger/TASKS.md',
      ),
      f(
        'gitlog',
        'command',
        `$ git log --oneline -10
e83b1f4 Add export route and tests
9a2d6c0 Add export serializer
4c77ed1 Fix reviewer finding: escape titles
b15f0a3 Add ledger and worker briefs
2e8d9b7 Add notes list page
6a0c3f5 Add notes table
1d4be82 Set up auth
8f9a7c3 Add landing page
3c2e1a6 Configure Tailwind
f0b9d45 Initial commit`,
        'git log --oneline -10',
      ),
      f(
        'review',
        'text',
        'The reviewer planted a bug that returned notes from every user. The export test survived at first, so we added a second-user test and then the mutant was killed. It also caught an unescaped title.',
      ),
    ],
    optional: [],
  },
  p8: {
    required: [
      f(
        'worktrees',
        'command',
        `$ git worktree list
/home/me/kiki-notes            4c77ed1 [main]
/home/me/kiki-notes-wt/export  e83b1f4 [feat/export]
/home/me/kiki-notes-wt/search  9a2d6c0 [feat/search]`,
        'git worktree list',
      ),
      f(
        'headless',
        'command',
        `$ claude -p "List the exported functions in src/lib/export.ts" --output-format json
{"type":"result","subtype":"success","is_error":false,"duration_ms":4120,"result":"serializeNotes, escapeTitle","total_cost_usd":0.0123}`,
        'claude -p',
      ),
    ],
    optional: [
      f(
        'ci',
        'file',
        `name: Claude review
on:
  pull_request:
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: \${{ secrets.ANTHROPIC_API_KEY }}
`,
        '.github/workflows/claude-review.yml',
      ),
    ],
  },
  p9: {
    required: [
      f(
        'permissions',
        'file',
        `{
  "permissions": {
    "allow": ["Bash(npm run test:*)", "Bash(git status)"],
    "deny": ["Read(./.env*)", "Read(./secrets/**)", "Bash(rm -rf:*)"]
  }
}`,
        '.claude/settings.json',
      ),
      f(
        'usage',
        'command',
        `/usage
Session cost: $1.84
Total tokens: 412,300 (input 389,100, output 23,200)
Model: sonnet`,
        '/usage',
      ),
      f(
        'injection',
        'text',
        'Untrusted text reaches my agent through GitHub issues and web pages it fetches. A malicious issue could tell it to print secrets, so I deny reads of .env files, keep no real keys in the repo, run it in a sandbox, and read each command before approving it.',
      ),
    ],
    optional: [],
  },
}

/** Lazy submissions: every item present but a lazy one-liner. */
const LAZY: Record<string, EvidenceItem[]> = {
  p1: [f('plan', 'text', 'make a plan'), f('gitlog', 'command', 'git log')],
  p2: [f('rules', 'file', 'be good and write clean code')],
  p3: [f('mcp-list', 'command', 'quest'), f('mcp-config', 'file', '{}')],
  p4: [f('skill', 'file', 'a skill about releases'), f('hook', 'file', 'hook')],
  p5: [f('agents', 'file', 'model: haiku'), f('when-not', 'text', 'when needed')],
  p6: [f('run', 'command', 'npm test'), f('review', 'text', 'looks good')],
  p7: [f('spec', 'file', 'build the thing'), f('tasks', 'file', 'todo'), f('gitlog', 'command', 'done'), f('review', 'text', 'fine')],
  p8: [f('worktrees', 'command', 'git worktree list'), f('headless', 'command', 'claude')],
  p9: [f('permissions', 'file', 'safe'), f('usage', 'command', 'cheap'), f('injection', 'text', 'not an issue')],
}

const failing = (v: ReturnType<typeof verify>) => v.results.filter((r) => !r.ok).map((r) => `${r.evidenceId}: ${r.message}`)

describe('pro track samples', () => {
  it('has a fixture for every task, and 9 tasks', () => {
    expect(PRO_TASKS.map((t) => t.id)).toEqual(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'])
    for (const t of PRO_TASKS) {
      expect(FIXTURES[t.id], t.id).toBeDefined()
      expect(LAZY[t.id], t.id).toBeDefined()
    }
  })

  for (const t of PRO_TASKS) {
    const sample = FIXTURES[t.id]
    const requiredIds = t.evidence.filter((e) => !e.optional).map((e) => e.id)

    describe(`${t.id} ${t.title}`, () => {
      it('fixture covers exactly the required items, and optional ones are real specs', () => {
        expect(sample.required.map((i) => i.id).sort()).toEqual([...requiredIds].sort())
        for (const o of sample.optional) expect(t.evidence.find((e) => e.id === o.id)?.optional, o.id).toBe(true)
      })

      it('passes with realistic required evidence only', () => {
        const v = verify(t, sample.required)
        expect(failing(v), JSON.stringify(failing(v))).toEqual([])
        expect(v.passed).toBe(true)
        expect(v.redactions).toBe(0)
      })

      it('passes with the optional items as well', () => {
        const v = verify(t, [...sample.required, ...sample.optional])
        expect(failing(v), JSON.stringify(failing(v))).toEqual([])
        expect(v.passed).toBe(true)
      })

      it('fails with lazy evidence', () => {
        const v = verify(t, LAZY[t.id])
        expect(v.passed).toBe(false)
        expect(failing(v).length).toBeGreaterThan(0)
      })

      it('fails when any required item is missing', () => {
        for (const id of requiredIds) {
          const v = verify(
            t,
            sample.required.filter((i) => i.id !== id),
          )
          expect(v.passed, `without ${id}`).toBe(false)
        }
      })

      it('fails with no evidence at all', () => {
        expect(verify(t, []).passed).toBe(false)
      })
    })
  }
})

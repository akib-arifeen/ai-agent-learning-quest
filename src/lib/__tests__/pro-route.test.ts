import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => {
  const learner = {
    id: 'u1',
    email: 'sam@example.com',
    name: 'Sam Lee',
    image: null,
    startDate: '2026-01-05',
    lastSeen: '2026-01-05',
  }
  return {
    learner,
    userForMcpToken: vi.fn(async (t: string) => (t === 'qst_goodtoken_goodtoken_1234' ? 'u1' : null)),
    getLearner: vi.fn(async (id: string) => (id === 'u1' ? learner : null)),
    loadState: vi.fn(async () => ({
      profile: null,
      pro: { tasks: {}, hasToken: true, lastUsed: null },
    })),
    addEvidence: vi.fn<(userId: string, taskId: string, v: unknown) => Promise<number>>(async () => 1),
    listEvidence: vi.fn(async () => []),
    logActivity: vi.fn<(userId: string, kind: string, taskId: string | null, detail?: string | null) => Promise<void>>(async () => undefined),
    touchUser: vi.fn(async () => learner),
  }
})

vi.mock('@/lib/db', () => ({
  userForMcpToken: db.userForMcpToken,
  getLearner: db.getLearner,
  loadState: db.loadState,
  addEvidence: db.addEvidence,
  listEvidence: db.listEvidence,
  logActivity: db.logActivity,
  touchUser: db.touchUser,
}))

import { GET as protectedResourceMetadata } from '@/app/.well-known/oauth-protected-resource/route'
import { POST } from '@/app/api/mcp/route'
import { PRO_TASKS } from '@/lib/pro'

const URL_ = 'http://localhost:3000/api/mcp'
const GOOD = 'qst_goodtoken_goodtoken_1234'

let nextId = 1
const rpc = (method: string, params: unknown, token: string | null = GOOD) =>
  POST(
    new Request(URL_, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params }),
    }),
  )

/** The JSON-RPC message in a reply, whether it came as SSE `data:` lines or plain JSON. */
async function message(res: Response): Promise<{
  result?: { content?: { text: string }[]; isError?: boolean }
  error?: unknown
}> {
  const body = await res.text()
  const datas = body
    .split('\n')
    .filter((l) => l.startsWith('data:'))
    .map((l) => l.slice(5).trim())
    .filter(Boolean)
  return JSON.parse(datas.length ? datas[datas.length - 1] : body)
}

const call = async (name: string, args: unknown, token: string | null = GOOD) => {
  const res = await rpc('tools/call', { name, arguments: args }, token)
  expect(res.status).toBe(200)
  const m = await message(res)
  const r = m.result
  expect(r, JSON.stringify(m)).toBeDefined()
  return {
    text: r!.content?.map((c) => c.text).join('\n') ?? '',
    isError: !!r!.isError,
  }
}

const PLAN = `Plan: add a "mark as done" toggle

1. Read src/components/TodoList.tsx and src/lib/store.ts.
2. Add a done boolean to the Todo type.
3. Add toggleDone(id) to the store with a unit test.
4. Render a checkbox and strike through finished items.
5. Run npm test and npm run build, then commit.`
const GITLOG = `$ git log --oneline -2
a41c9e2 Strike through finished todos
7be03d1 Add toggleDone to the store with tests`

beforeEach(() => {
  vi.clearAllMocks()
})

describe('MCP route auth', () => {
  const init = {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'test', version: '1.0.0' },
  }

  it('returns 401 with no token, saying one is missing', async () => {
    const res = await rpc('initialize', init, null)
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'invalid_token', error_description: 'No authorization provided' })
    expect(res.headers.get('www-authenticate')).toContain('resource_metadata="http://localhost:3000/.well-known/oauth-protected-resource"')
    expect(db.getLearner).not.toHaveBeenCalled()
  })
  it('returns 401 with a bad token, saying the token is invalid', async () => {
    const res = await rpc('initialize', init, 'qst_not_a_real_token_0000')
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'invalid_token', error_description: 'Invalid or expired token' })
    const challenge = res.headers.get('www-authenticate') || ''
    expect(challenge).toContain('error_description="Invalid or expired token"')
    expect(challenge).toContain('resource_metadata="http://localhost:3000/.well-known/oauth-protected-resource"')
    expect(db.getLearner).not.toHaveBeenCalled()
  })
  it('challenges with a resource_metadata URL that serves this resource', async () => {
    const res = await rpc('initialize', init, null)
    expect(res.status).toBe(401)
    const challenge = res.headers.get('www-authenticate') || ''
    expect(challenge).toContain('Bearer')
    const match = /resource_metadata="([^"]+)"/.exec(challenge)
    expect(match, challenge).not.toBeNull()

    const metadataUrl = new URL(match![1])
    expect(metadataUrl.origin).toBe('http://localhost:3000')
    expect(metadataUrl.pathname).toBe('/.well-known/oauth-protected-resource')
    const metadata = protectedResourceMetadata(new Request(metadataUrl))
    expect(metadata.status).toBe(200)
    expect(metadata.headers.get('content-type')).toContain('application/json')
    expect((await metadata.json()).resource).toBe('http://localhost:3000/api/mcp')
  })
  it('initializes with a good token', async () => {
    const res = await rpc('initialize', init)
    expect(res.status).toBe(200)
    const m = await message(res)
    expect(m.error).toBeUndefined()
  })
})

describe('quest_submit_evidence', () => {
  it('says NOT YET and stores nothing for an empty-content item', async () => {
    const r = await call('quest_submit_evidence', {
      taskId: 'p1',
      items: [{ id: 'plan', kind: 'text', content: '' }],
    })
    expect(r.text).toContain('NOT YET')
    expect(db.addEvidence).not.toHaveBeenCalled()
    expect(db.logActivity).not.toHaveBeenCalled()
  })

  it('stores a failing but real submission, without logging activity', async () => {
    const r = await call('quest_submit_evidence', {
      taskId: 'p1',
      items: [{ id: 'plan', kind: 'text', content: 'do some stuff' }],
    })
    expect(r.text).toContain('NOT YET')
    expect(db.addEvidence).toHaveBeenCalledTimes(1)
    expect(db.logActivity).not.toHaveBeenCalled()
  })

  it('stores a passing p1 submission and logs an evidence activity', async () => {
    const r = await call('quest_submit_evidence', {
      taskId: 'p1',
      items: [
        { id: 'plan', kind: 'text', content: PLAN },
        {
          id: 'gitlog',
          kind: 'command',
          source: 'git log --oneline -2',
          content: GITLOG,
        },
      ],
    })
    expect(r.text).toContain('PASSED')
    expect(db.addEvidence).toHaveBeenCalledTimes(1)
    expect(db.addEvidence.mock.calls[0][0]).toBe('u1')
    expect(db.addEvidence.mock.calls[0][1]).toBe('p1')
    expect(db.logActivity).toHaveBeenCalledTimes(1)
    expect(db.logActivity.mock.calls[0][0]).toBe('u1')
    expect(db.logActivity.mock.calls[0][1]).toBe('evidence')
  })

  it('collapses passing checks to one ✓ line per evidence id', async () => {
    const r = await call('quest_submit_evidence', {
      taskId: 'p1',
      items: [
        { id: 'plan', kind: 'text', content: PLAN },
        { id: 'gitlog', kind: 'command', content: GITLOG },
      ],
    })
    const ticks = r.text.split('\n').filter((l) => l.includes('✓'))
    expect(ticks).toHaveLength(2)
    expect(r.text).not.toContain('✗')
  })

  it('does not store unknown item ids', async () => {
    const r = await call('quest_submit_evidence', {
      taskId: 'p1',
      items: [{ id: 'bogus', kind: 'text', content: 'hello there' }],
    })
    expect(r.text).toContain('NOT YET')
    expect(db.addEvidence).not.toHaveBeenCalled()
  })

  it('answers an unknown taskId with a friendly error listing the valid ids', async () => {
    const r = await call('quest_submit_evidence', { taskId: 'p99', items: [] })
    expect(r.isError).toBe(true)
    for (const t of PRO_TASKS) expect(r.text).toContain(t.id)
    expect(r.text).toContain('p99')
    expect(db.addEvidence).not.toHaveBeenCalled()
  })
})

describe('quest_get_task', () => {
  it('lists every evidence id of p3', async () => {
    const r = await call('quest_get_task', { taskId: 'p3' })
    const p3 = PRO_TASKS.find((t) => t.id === 'p3')!
    for (const e of p3.evidence) expect(r.text).toContain(e.id)
  })
  it('errors on an unknown task', async () => {
    const r = await call('quest_get_task', { taskId: 'nope' })
    expect(r.isError).toBe(true)
  })
})

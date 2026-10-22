import { createMcpHandler, getPublicOrigin, withMcpAuth } from 'mcp-handler'
import { z } from 'zod'
import { addEvidence, getLearner, loadState, logActivity, userForMcpToken } from '@/lib/db'
import { firstName } from '@/lib/game'
import { withinLimit } from '@/lib/http'
import { verify } from '@/lib/pro-checks'
import { EVIDENCE_LIMITS, PRO_TASKS, proTaskById } from '@/lib/pro'
import { setupOf } from '@/lib/profile'
import { toolOf } from '@/lib/tools'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Ctx = { http?: { authInfo?: { clientId?: string }; req?: Request } }

const text = (t: string, isError = false) => ({ content: [{ type: 'text' as const, text: t }], ...(isError ? { isError: true } : {}) })
const unknownTask = (id: string) => text(`There is no task "${id}". Valid task ids: ${PRO_TASKS.map((t) => t.id).join(', ') || '(none yet)'}.`, true)

/** Resolve the calling learner from the verified token, or an error result to return as-is. */
async function learnerFor(ctx: Ctx) {
  const userId = ctx.http?.authInfo?.clientId
  if (!userId) return { error: text('Not signed in. Create a new connection token in the Quest app.', true) }
  if (!withinLimit('mcp', userId, 60, 10 * 60_000)) return { error: text('Too many calls in a short time. Wait a few minutes and try again.', true) }
  const learner = await getLearner(userId)
  if (!learner) return { error: text('That learner no longer exists. Create a new connection token in the Quest app.', true) }
  return { learner }
}

/** The app's public origin: from the request when we have it, else the configured site URL. */
const originOf = (ctx: Ctx) => {
  const req = ctx.http?.req
  if (req) return getPublicOrigin(req)
  return (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      'quest_whoami',
      {
        title: 'Who am I in Quest',
        description:
          'Shows which Quest learner this connection belongs to, which AI tool they use, and how far they are on the pro track (levels passed and the next task to do). Call this first to get oriented.',
        inputSchema: z.object({}),
      },
      async (_args: unknown, ctx: Ctx) => {
        const r = await learnerFor(ctx)
        if (r.error) return r.error
        const s = await loadState(r.learner)
        const passed = PRO_TASKS.filter((t) => s.pro.tasks[t.id]?.passed).length
        const next = PRO_TASKS.find((t) => !s.pro.tasks[t.id]?.passed)
        return text(
          [
            `Learner: ${firstName(r.learner.name)}`,
            `AI tool: ${toolOf(setupOf(s.profile).tool).name}`,
            `Pro track: ${passed} of ${PRO_TASKS.length} levels passed`,
            next ? `Next task: ${next.id} (${next.title}). Call quest_get_task with taskId "${next.id}".` : 'Every level is passed.',
          ].join('\n'),
        )
      },
    )

    server.registerTool(
      'quest_tasks',
      {
        title: 'List pro track tasks',
        description: 'Lists every pro track task with its id, level, title, XP and the learner\'s status (passed, number of attempts, or not started).',
        inputSchema: z.object({}),
      },
      async (_args: unknown, ctx: Ctx) => {
        const r = await learnerFor(ctx)
        if (r.error) return r.error
        const s = await loadState(r.learner)
        const rows = PRO_TASKS.map((t) => {
          const st = s.pro.tasks[t.id]
          const status = !st ? 'not started' : st.passed ? `passed (${st.attempts} attempt${st.attempts === 1 ? '' : 's'})` : `${st.attempts} attempt${st.attempts === 1 ? '' : 's'}, not passed yet`
          return `| ${t.id} | ${t.level} | ${t.title} | ${t.xp} | ${status} |`
        })
        return text(['| id | level | title | xp | status |', '| --- | --- | --- | --- | --- |', ...rows].join('\n'))
      },
    )

    server.registerTool(
      'quest_get_task',
      {
        title: 'Get a pro track task',
        description:
          'Returns one task in full: the concept, the build steps, what done looks like, and exactly which evidence to send. Do the build with the learner first, then submit evidence with quest_submit_evidence. Only send what the task lists; never send secrets or .env files.',
        inputSchema: z.object({ taskId: z.string().max(40).describe('Task id such as p1') }),
      },
      async (args: { taskId: string }, ctx: Ctx) => {
        const r = await learnerFor(ctx)
        if (r.error) return r.error
        const t = proTaskById(args.taskId)
        if (!t) return unknownTask(args.taskId)
        const rows = t.evidence.map((e) => `| ${e.id} | ${e.kind} | ${e.label} | ${e.hint} | ${e.optional ? 'optional' : 'required'} |`)
        return text(
          [
            `# ${t.id}: ${t.title} (level ${t.level}, ${t.xp} XP)`,
            '',
            `## Concept\n${t.concept}`,
            `## Build\n${t.build.map((b, i) => `${i + 1}. ${b}`).join('\n')}`,
            `## Done when\n${t.done}`,
            '## Evidence to send',
            '| id | kind | label | hint | required |',
            '| --- | --- | --- | --- | --- |',
            ...rows,
            '',
            '## How to submit',
            `Call quest_submit_evidence with taskId "${t.id}" and items [{ id, kind, source, content }], one per row above.`,
            '- Send real file contents and real command output, not summaries.',
            '- Send only what is listed. Never send .env files, keys, tokens or passwords.',
            '- Secret-looking strings are removed before anything is stored.',
            '- The learner can see every submission in the Quest app, and so can their mentor.',
          ].join('\n'),
        )
      },
    )

    server.registerTool(
      'quest_submit_evidence',
      {
        title: 'Submit evidence for a task',
        description:
          'Submits the evidence for one pro track task and returns PASSED or NOT YET with a line per check. Only send the items the task lists (get them from quest_get_task), with real file contents and real command output. Privacy rule: never send secrets, API keys, tokens or .env files; secret-looking strings are removed before storing, and the learner sees every submission in the app.',
        inputSchema: z.object({
          taskId: z.string().max(40),
          items: z
            .array(
              z.object({
                id: z.string().max(40).describe('The evidence id from the task table'),
                kind: z.enum(['file', 'command', 'url', 'text']),
                source: z.string().max(300).optional().describe('File path, or the command that was run'),
                content: z.string().max(EVIDENCE_LIMITS.itemChars * 2),
              }),
            )
            .max(EVIDENCE_LIMITS.items),
        }),
      },
      async (args: { taskId: string; items: { id: string; kind: 'file' | 'command' | 'url' | 'text'; source?: string; content: string }[] }, ctx: Ctx) => {
        const r = await learnerFor(ctx)
        if (r.error) return r.error
        const t = proTaskById(args.taskId)
        if (!t) return unknownTask(args.taskId)
        const v = verify(t, args.items)
        const origin = originOf(ctx)
        // No required spec has real content: don't store it, so an empty call can't earn the badge or a streak day.
        const required = t.evidence.filter((e) => !e.optional)
        const hasAttempt = required.some((e) => v.items.some((i) => i.id === e.id && i.content.trim() !== ''))
        if (!hasAttempt) {
          return text(
            [
              '# NOT YET',
              '',
              ...v.results.filter((x) => x.evidenceId === '*').map((x) => `- ✗ ${x.message}`),
              `Nothing was stored: no required item had content. Required evidence: ${required.map((e) => `${e.id} (${e.label}: ${e.hint})`).join('; ')}. Call quest_get_task with taskId "${t.id}" for the details.`,
            ].join('\n'),
          )
        }
        await addEvidence(r.learner.id, t.id, v)
        // The streak counts passes, not attempts.
        if (v.passed) await logActivity(r.learner.id, 'evidence', t.id, `${t.title}: passed`)
        // One line per evidence id when all its checks pass, one per failing check otherwise; '*' first.
        const lines: string[] = v.results.filter((x) => x.evidenceId === '*').map((x) => `- ✗ ${x.message}`)
        for (const e of t.evidence) {
          const rs = v.results.filter((x) => x.evidenceId === e.id)
          if (rs.length === 0) continue
          if (rs.every((x) => x.ok)) lines.push(`- ✓ ${e.label}${rs.length > 1 ? ` (${rs.length} checks)` : ''}`)
          else for (const x of rs) if (!x.ok) lines.push(`- ✗ ${x.message}`)
        }
        return text(
          [
            v.passed ? '# PASSED' : '# NOT YET',
            '',
            ...lines,
            ...(v.redactions > 0 ? ['', `Removed ${v.redactions} secret-looking strings before saving.`] : []),
            '',
            `See it in the app: ${origin}/pro/${t.id}`,
          ].join('\n'),
        )
      },
    )
  },
  { serverInfo: { name: 'kiki-quest', version: '1.0.0' } },
)

const authed = withMcpAuth(
  handler,
  async (_req, bearer) => {
    if (!bearer) return undefined
    // Throttle before touching the DB so a guessing loop can't hammer it.
    if (!withinLimit('mcp-auth', bearer.slice(0, 20), 120, 10 * 60_000)) return undefined
    const userId = await userForMcpToken(bearer)
    return userId ? { token: bearer, clientId: userId, scopes: [] } : undefined
  },
  { required: true },
)

export { authed as GET, authed as POST }

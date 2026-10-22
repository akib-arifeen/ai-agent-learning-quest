/**
 * The pro track: levels that show how a professional works with an AI coding agent. Each
 * level is a real build, and it's checked by evidence the learner's OWN agent submits to
 * the Quest app's MCP server (src/app/api/mcp/route.ts): file contents, command output,
 * git history, a URL. Learning MCP by using MCP is the point.
 *
 * Checks are declarative data (no code in tasks), run deterministically by `verify` in
 * pro-checks.ts; Spark can then review the same evidence for meaning. Nothing here is a
 * proctoring system: a determined learner could fake evidence, and that's fine. It's a
 * learning loop, and the mentor sees what was sent.
 * Shared by the browser and the server.
 */

/** What kind of proof an item is: a file's contents, a command and its output, a link, or a written answer. */
export type EvidenceKind = 'file' | 'command' | 'url' | 'text'

/**
 * One deterministic check on one submitted item. `message` is what the learner sees when
 * it fails, so write it as a fix ("Add a Commands section…"), not a verdict.
 * All matching is case-insensitive by default: `regex` and `countAtLeast` use the 'i'
 * flag (plus 'gm' for counts) unless the check passes its own `flags`.
 */
export type Check =
  | { type: 'minChars'; n: number; message: string }
  | { type: 'minLines'; n: number; message: string }
  | { type: 'includesAny'; terms: string[]; message: string }
  | { type: 'includesAll'; terms: string[]; message: string }
  | { type: 'regex'; pattern: string; flags?: string; message: string }
  /** At least `n` matches of the regex (the global flag is added for you). */
  | { type: 'countAtLeast'; pattern: string; flags?: string; n: number; message: string }
  /** Parses as JSON once `//` and block comments are removed (so JSONC config files pass). */
  | { type: 'json'; message: string }
  /** Starts with a `---` frontmatter block that has every key (e.g. a SKILL.md or an agent file). */
  | { type: 'frontmatter'; keys: string[]; message: string }
  /** The whole item is one https:// URL (we never fetch it). */
  | { type: 'https'; message: string }

/** One piece of proof a task asks for. */
export type EvidenceSpec = {
  /** Unique within the task; the learner's agent sends items with this id. */
  id: string
  kind: EvidenceKind
  /** What to send, e.g. "Your project rules file". */
  label: string
  /** Where it comes from, tool-agnostic, e.g. "CLAUDE.md, AGENTS.md or GEMINI.md at the project root". */
  hint: string
  /** Optional items are checked when sent, but never block a pass. */
  optional?: boolean
  checks: Check[]
}

export type ProTask = {
  /** 'p1'…'p9'. Never reuse an id: submissions are stored against it. */
  id: string
  level: number
  title: string
  /** One or two sentences: what professionals do here, and why it works. */
  concept: string
  /** The build, as short imperative steps. */
  build: string[]
  /** What done looks like, in one sentence. */
  done: string
  evidence: EvidenceSpec[]
  /** How this maps to other agents (OpenCode, Cursor, Codex, Kilo…), saying plainly where there's no equivalent. */
  equivalents: string
  /** Official docs or practitioner posts the task is based on. */
  sources: string[]
  xp: number
}

/** What the learner's agent sends for one evidence item. */
export type EvidenceItem = {
  id: string
  kind: EvidenceKind
  /** Where it came from: a file path, or the command that was run. Shown to mentors. */
  source?: string
  content: string
}

export type CheckResult = { evidenceId: string; ok: boolean; message: string }

export type Verdict = {
  /** Every required item present and every one of its checks ok. */
  passed: boolean
  results: CheckResult[]
  /** Items as stored: scrubbed of secrets and trimmed to size. */
  items: EvidenceItem[]
  /** How many secret-looking strings were removed before storing. */
  redactions: number
}

/** A learner's pro-track standing, derived from their stored submissions. */
export type ProStatus = {
  /** Per task: passed at least once (`at` = first pass), and how many submissions. */
  tasks: Record<string, { passed: boolean; at: string | null; attempts: number }>
  /** They have a live MCP token. */
  hasToken: boolean
  /** Last time their agent called the MCP server (null = never connected). */
  lastUsed: string | null
}

/** One stored submission, as the learner and mentor see it. */
export type Submission = { id: number; task_id: string; passed: boolean; redactions: number; items: EvidenceItem[]; results: CheckResult[]; created_at: string }

/** Size caps for one submission, enforced by `verify` and the MCP tool's schema. */
export const EVIDENCE_LIMITS = { items: 12, itemChars: 20_000, totalChars: 100_000 } as const

/** The track, ordered by level. */
export const PRO_TASKS: ProTask[] = [
  {
    id: 'p1',
    level: 1,
    title: 'Plan before you build',
    concept:
      'Professionals read and plan first, then let the agent edit: Anthropic’s best-practices guide has the agent explore and plan in plan mode before it writes code, and it keeps sessions short with /clear because context fills up. They also save git commits as their real undo, since checkpoints do not track shell commands.',
    build: [
      'Connect the Quest server to your agent (the “Connect your agent” card on the Pro track page), so it can send evidence.',
      'Pick a small change in a real project and switch your agent to its plan mode, so it cannot edit files yet.',
      'Ask for a plan with numbered steps, and the files it will touch. Edit the plan until you would approve it.',
      'Approve the plan, then let the agent build one step at a time. Commit after each step that works.',
      'Break something on purpose, then roll it back with your agent’s checkpoint or rewind or git. Start a fresh chat for the next task.',
    ],
    done: 'You have an approved numbered plan, at least two commits made while following it, and you know how to roll back.',
    evidence: [
      {
        id: 'plan',
        kind: 'text',
        label: 'The plan you approved',
        hint: 'Paste the numbered plan your agent wrote in plan mode, after your edits.',
        checks: [
          { type: 'minLines', n: 5, message: 'Send the whole plan, at least 5 lines. Ask your agent to print the approved plan and paste it as it is.' },
          {
            type: 'countAtLeast',
            pattern: '^[ \\t]*(\\d+[.)]|[-*])[ \\t]+',
            flags: 'gim',
            n: 3,
            message: 'Write the plan as a list with at least 3 steps, numbered (1. 2. 3.) or bulleted (- step).',
          },
        ],
      },
      {
        id: 'gitlog',
        kind: 'command',
        label: 'Your recent commits',
        hint: 'Run `git log --oneline -5` in the project and send the command and its output.',
        checks: [
          {
            type: 'countAtLeast',
            pattern: '^[0-9a-f]{7,}[ \\t]',
            flags: 'gim',
            n: 2,
            message: 'Commit after each working step, then send `git log --oneline -5`. It needs at least 2 lines that start with a commit hash.',
          },
        ],
      },
      {
        id: 'rewind',
        kind: 'text',
        label: 'What you rolled back, and how',
        hint: 'Say what you broke, which undo you used (checkpoint, rewind, /undo or git), and what it did and did not restore.',
        optional: true,
        checks: [{ type: 'minChars', n: 40, message: 'Write at least 40 characters: what you rolled back, and which undo you used.' }],
      },
    ],
    equivalents:
      'Every agent in the course has a plan or ask mode and some kind of undo: Claude Code uses plan mode with /rewind, OpenCode has the Plan agent with /undo, Cursor has Plan mode with Restore Checkpoint, and Kilo Code has the plan agent with Revert to here. Codex CLI has no undo button, so make git commits as your save points.',
    sources: [
      'https://code.claude.com/docs/en/best-practices',
      'https://code.claude.com/docs/en/permission-modes',
      'https://code.claude.com/docs/en/checkpointing',
    ],
    xp: 75,
  },
  {
    id: 'p2',
    level: 2,
    title: 'A rules file that pulls its weight',
    concept:
      'A short rules file is the cheapest way to improve every session. Claude Code loads CLAUDE.md at the start, and Anthropic says to keep it under about 200 lines and cut anything the agent would get right without it. Rules are advisory, so Mitchell Hashimoto’s habit applies: each time the agent gets something wrong, fix it once in the file so it never repeats.',
    build: [
      'Create the rules file for your agent in your project (run /init if your agent has it, then cut it down).',
      'Add short sections: Commands (the exact install, test and run commands), Layout, and Rules.',
      'Add at least two "never" or "do not" rules for mistakes that would really hurt in your project.',
      'Delete every line that fails the test: would removing this cause the agent to make mistakes?',
      'Make the agent get something wrong on purpose, add a rule that fixes it, and run the task again to see the change.',
    ],
    done: 'Your rules file is short, has exact commands and real "never" rules, and holds a lesson from a real mistake.',
    evidence: [
      {
        id: 'rules',
        kind: 'file',
        label: 'Your project rules file',
        hint: 'CLAUDE.md for Claude Code, GEMINI.md for Gemini CLI, AGENTS.md for OpenCode, Codex, Kilo Code and Cursor, or .clinerules/ for Cline.',
        checks: [
          { type: 'minLines', n: 12, message: 'Your rules file is too thin. Aim for at least 12 lines of real project rules.' },
          { type: 'countAtLeast', pattern: '^#{1,3}[ \\t]', flags: 'gim', n: 3, message: 'Add at least 3 headings (for example # Commands, # Layout, # Rules) so the file is easy to scan.' },
          {
            type: 'includesAny',
            terms: ['npm ', 'pnpm ', 'yarn ', 'bun ', 'npx ', 'python', 'pytest', 'make ', 'cargo ', 'go test', 'dotnet ', 'gradle', 'mvn '],
            message: 'Add the exact commands to install, test and run',
          },
          { type: 'regex', pattern: '\\b(never|don[\'’]t|do not|avoid)\\b', message: 'Add at least one hard rule that says never, do not or avoid, such as "Never edit generated files".' },
        ],
      },
      {
        id: 'lesson',
        kind: 'text',
        label: 'A rule you added after a mistake',
        hint: 'Describe what the agent got wrong, the rule you added, and what changed on the next run.',
        checks: [
          { type: 'minChars', n: 60, message: 'Write at least 60 characters: the mistake, the rule you added, and what changed after.' },
          { type: 'countAtLeast', pattern: '\\b[a-z]{3,}\\b', flags: 'gi', n: 12, message: 'Write it in your own words: a few real sentences' },
        ],
      },
    ],
    equivalents:
      'The idea is the same everywhere; only the file name changes. AGENTS.md is read by OpenCode, Codex CLI, Kilo Code and Cursor (Cursor also has .cursor/rules). Claude Code reads CLAUDE.md, Gemini CLI reads GEMINI.md, and Cline reads .clinerules/.',
    sources: [
      'https://code.claude.com/docs/en/memory',
      'https://code.claude.com/docs/en/best-practices',
      'https://mitchellh.com/writing/my-ai-adoption-journey',
    ],
    xp: 75,
  },
  {
    id: 'p3',
    level: 3,
    title: 'Plug in tools with MCP',
    concept:
      'MCP lets your agent use outside tools: a local web search and fetch server, browser automation, and now the Quest server itself. Pros keep this list short: Armin Ronacher uses very few MCP servers and prefers plain CLI tools, and Anthropic says CLI tools like gh use less context than MCP servers. Turn off servers you are not using.',
    build: [
      'Connect the Quest server with the “Connect your agent” card at the top of the Pro track page, using the snippet for your agent. Check it shows as connected.',
      'Add one web search and fetch MCP server that runs locally, and ask your agent a question that needs it.',
      'Add one browser automation MCP server if your agent does not drive a browser already.',
      'For GitHub, git and similar, use the CLI (gh, git) instead of an MCP server, and note why.',
      'Ask your agent to research one real question using the web tool, and to list its sources.',
      'List your MCP servers and turn off any you do not need for this project.',
    ],
    done: 'The Quest server and at least one more MCP server show as connected, and your agent has used the web tool for a cited answer.',
    evidence: [
      {
        id: 'mcp-list',
        kind: 'command',
        label: 'Your connected MCP servers',
        hint: 'Run `claude mcp list` (Claude Code), or open your agent’s MCP panel or MCP command and copy the list of servers and their status.',
        checks: [
          { type: 'includesAny', terms: ['quest'], message: 'Connect the Quest server first' },
          {
            type: 'countAtLeast',
            pattern: '^.*(connected|✓|enabled|running|\\bok\\b).*$',
            flags: 'gim',
            n: 2,
            message: 'Show at least two connected servers (the Quest server plus one more).',
          },
        ],
      },
      {
        id: 'mcp-config',
        kind: 'file',
        label: 'Your MCP config file',
        hint: '.mcp.json (Claude Code: `claude mcp add --scope project …` writes it), opencode.json, kilo.jsonc, .cursor/mcp.json, .vscode/mcp.json, or ~/.codex/config.toml. Otherwise send the output of `claude mcp get quest` and your other servers’ config. Take the token out first if you can; we remove secrets we spot.',
        checks: [
          { type: 'includesAny', terms: ['quest'], message: 'Include the quest server entry' },
          {
            type: 'includesAny',
            terms: ['mcpServers', '"mcp"', '"servers"', 'mcp_servers'],
            message: 'Send the real MCP config file. It should have an mcpServers, mcp, servers or mcp_servers section.',
          },
          {
            type: 'countAtLeast',
            pattern: '("(type|url|command|serverUrl|httpUrl)"\\s*:|^[ \\t]*(url|command)[ \\t]*=)',
            flags: 'gim',
            n: 2,
            message: 'The file should show a server with a url or command, plus its type. Send the real config with the Quest server in it.',
          },
        ],
      },
      {
        id: 'research',
        kind: 'text',
        label: 'A researched answer with sources',
        hint: 'Paste an answer your agent wrote using the web search or fetch tool, with its source links.',
        checks: [{ type: 'countAtLeast', pattern: 'https?://', flags: 'gi', n: 2, message: 'Ask your agent to cite its sources as full links, at least 2, then paste the answer.' }],
      },
    ],
    equivalents:
      'Every agent in the course supports MCP: OpenCode, Cursor, Codex CLI, Kilo Code, Claude Code, Cline, Copilot in VS Code, Gemini CLI, Antigravity CLI and Devin Desktop. Only the config file differs (opencode.json, kilo.jsonc, .cursor/mcp.json, .vscode/mcp.json, config.toml). The “Connect your agent” card on the Pro track page shows the exact snippet for yours.',
    sources: [
      'https://code.claude.com/docs/en/mcp',
      'https://lucumr.pocoo.org/2025/6/12/agentic-coding/',
      'https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel',
    ],
    xp: 100,
  },
  {
    id: 'p4',
    level: 4,
    title: 'Teach it skills, enforce it with hooks',
    concept:
      'A skill is a folder with a SKILL.md: only its short description sits in context, and the body loads when needed. A hook is a command the tool runs at an event such as PreToolUse or Stop. Anthropic’s docs are plain that hooks are deterministic and CLAUDE.md is advisory, so use a skill to teach and a hook for anything that must always happen.',
    build: [
      'Pick a task you repeat, and write a SKILL.md for it with name and description in the frontmatter, then clear steps in the body.',
      'Ask your agent to do that task and check that it picks up the skill from the description.',
      'Pick one rule that must never be skipped, such as running tests after an edit or blocking edits to a secrets file.',
      'Write a hook for it on the right event (for example PostToolUse after edits, or PreToolUse to block).',
      'Trigger the hook once and copy the output that shows it ran.',
    ],
    done: 'You have a working skill and a hook that fired, and you can say when to use each.',
    evidence: [
      {
        id: 'skill',
        kind: 'file',
        label: 'Your SKILL.md',
        hint: '.claude/skills/<name>/SKILL.md, or .kilo/skills/<name>/SKILL.md for Kilo Code. OpenCode also reads .claude/skills.',
        checks: [
          { type: 'frontmatter', keys: ['name', 'description'], message: 'Start the file with a --- block that has both name: and description:, then close it with ---.' },
          { type: 'minLines', n: 8, message: 'Add real steps under the frontmatter. A useful skill is at least 8 lines.' },
        ],
      },
      {
        id: 'hook',
        kind: 'file',
        label: 'Your hook config, or if your agent has no hooks, a git pre-commit hook or CI check that does the same job',
        hint: 'The hooks section of .claude/settings.json, Cursor’s hooks.json, your Codex hooks config, an OpenCode plugin file, or (if your agent has no hooks) a git pre-commit hook or CI check that does the same job.',
        checks: [
          {
            type: 'regex',
            pattern: '["\'](?:PreToolUse|PostToolUse|Stop|SubagentStop|SessionStart|UserPromptSubmit|PreCompact|preToolUse|postToolUse|stop|beforeSubmitPrompt|beforeShellExecution|beforeMCPExecution|afterFileEdit|beforeReadFile|subagentStart|subagentStop|afterAgentResponse|tool\\.execute\\.(?:before|after))["\']|pre-commit|husky|lint-staged|^on:',
            flags: 'm',
            message: 'Send the hook config. It should name an event such as PreToolUse, PostToolUse, Stop or tool.execute.after.',
          },
          { type: 'minChars', n: 60, message: 'The hook looks empty. Send the whole config, including the command it runs.' },
        ],
      },
      {
        id: 'fired',
        kind: 'command',
        label: 'Proof the hook ran',
        hint: 'Output from the hook firing, such as its log line or the message it printed in your agent.',
        optional: true,
        checks: [{ type: 'minChars', n: 10, message: 'Paste the output that shows the hook ran, at least a line.' }],
      },
    ],
    equivalents:
      'Skills work in OpenCode (it also reads .claude/skills), Cursor, Codex CLI and Kilo Code (.kilo/skills). Hooks: OpenCode does them through plugins, Cursor has hooks.json, Codex CLI has hooks, and Kilo Code’s docs don’t describe hooks. There, put hard rules in your test and CI scripts instead.',
    sources: [
      'https://code.claude.com/docs/en/skills',
      'https://code.claude.com/docs/en/hooks',
      'https://cursor.com/docs/hooks',
      'https://opencode.ai/docs/plugins',
    ],
    xp: 100,
  },
  {
    id: 'p5',
    level: 5,
    title: 'Delegate to cheap subagents',
    concept:
      'Pros send routine work to subagents on cheaper models, so the main session keeps its context and costs less: Anthropic’s docs suggest routing tasks to lower-cost models like Haiku. But delegation is not free. Anthropic measured agents using about 4 times the tokens of a chat and multi-agent systems about 15 times, and says most coding tasks have few parts that can truly run in parallel.',
    build: [
      'Write a scout agent: read-only, on the cheapest model, for finding files and answering "where is X".',
      'Write a worker agent on a mid-priced model for small, fully specified edits, with a short rule on when to stop and report.',
      'Give each agent a name, a description that says when to use it, and an explicit model.',
      'Run one real task through the scout, and one through the worker. Check the output yourself.',
      'Write down one kind of task you would not delegate, and why.',
    ],
    done: 'You have two agent files with explicit cheaper models, you have used them, and you know when not to delegate.',
    evidence: [
      {
        id: 'agents',
        kind: 'file',
        label: 'Two agent definition files',
        hint: 'Paste both files together: .claude/agents/*.md for Claude Code, or your agent’s equivalent (OpenCode agents, Cursor subagents, or Codex’s TOML agent config).',
        checks: [
          { type: 'countAtLeast', pattern: '^(---|\\[[^\\]\\n]{1,100}\\])[ \\t]*$', flags: 'gim', n: 2, message: 'Send at least two agent files, each with its frontmatter (--- lines) or, for Codex, its [table] header' },
          { type: 'countAtLeast', pattern: '^model[ \\t]*[:=][ \\t]*["\']?(?!inherit\\b)[A-Za-z0-9]', flags: 'gim', n: 2, message: 'Give each agent an explicit (cheaper) model' },
          { type: 'countAtLeast', pattern: '^description[ \\t]*[:=]', flags: 'gim', n: 2, message: 'Give each agent a description line that says when to use it.' },
        ],
      },
      {
        id: 'when-not',
        kind: 'text',
        label: 'When you would not delegate',
        hint: 'A few sentences: which tasks stay in the main session, and the cost or context reason.',
        checks: [
          { type: 'minChars', n: 120, message: 'Write at least 120 characters. Give a real example of a task you would keep, and say why.' },
          { type: 'countAtLeast', pattern: '\\b[a-z]{3,}\\b', flags: 'gi', n: 30, message: 'Write it in your own words: a few real sentences' },
          {
            type: 'includesAny',
            terms: ['token', 'cost', 'context', 'parallel', 'overhead', 'sequential'],
            message: 'Explain the reason: mention cost, tokens, context, overhead, or whether the work can run in parallel.',
          },
        ],
      },
    ],
    equivalents:
      'OpenCode has agents and subagents, Cursor has subagents, and Codex CLI has subagents. Kilo Code has custom agents (modes), but its docs don’t confirm that one agent can hand work to another, so treat it as manual there: run the cheap agent yourself and carry its result back. Cline, Copilot, Antigravity CLI, Gemini CLI and Devin Desktop: check your agent’s docs for subagents; if it has none, do this level in an agent that does (Claude Code, OpenCode, Cursor or Codex CLI).',
    sources: [
      'https://code.claude.com/docs/en/sub-agents',
      'https://www.anthropic.com/engineering/multi-agent-research-system',
      'https://code.claude.com/docs/en/costs',
      'https://opencode.ai/docs/agents',
    ],
    xp: 125,
  },
  {
    id: 'p6',
    level: 6,
    title: 'Prove it before you call it done',
    concept:
      'Anthropic’s best-practices guide leads with "give Claude a way to verify its work": tests, a build exit code, a screenshot. Pros add a reviewer with fresh context, and a gate that runs on its own, and never let the agent that did the work grade it. If you cannot verify it, do not ship it.',
    build: [
      'Pick a real change and write down how you will prove it works: a test, a command, or a request you can run.',
      'Run it for real after the last edit and keep the output. Test the edge case, not only the happy path.',
      'Start a fresh session or a reviewer subagent that has not seen the work, and ask it to review your diff and find bugs.',
      'Make the reviewer quote each finding as file:line. Fix what is real.',
      'Add a gate that runs the check for you, such as a Stop hook that runs the tests before the agent can finish.',
    ],
    done: 'Real passing output from after your last edit, plus a file:line review from an agent that did not write the code.',
    evidence: [
      {
        id: 'run',
        kind: 'command',
        label: 'A test or probe run that passes',
        hint: 'The command and its output: `npm test`, `pytest`, `curl` on your endpoint, or a script. Run it after your last edit.',
        checks: [
          {
            type: 'regex',
            pattern: '^(?![\\s\\S]*(?:\\b[1-9]\\d*[ \\t]+(?:failed|failing|failures?)\\b|\\bnot ok\\b|(?:^|\\n)[ \\t]*FAIL\\b))[\\s\\S]*\\b(?:pass(?:ed|es|ing)?|ok|success(?:ful)?)\\b',
            flags: 'i',
            message: 'Send a run where everything passes (no failures, no \'not ok\' lines).',
          },
        ],
      },
      {
        id: 'review',
        kind: 'text',
        label: 'An independent review of your diff',
        hint: 'Paste what a fresh-context reviewer agent found. It must not be the session that wrote the code.',
        checks: [
          { type: 'minLines', n: 4, message: 'Paste the whole review, at least 4 lines.' },
          { type: 'minChars', n: 120, message: 'Paste the whole review, at least 120 characters.' },
          { type: 'regex', pattern: '[\\w./-]{1,200}\\.\\w{1,10}:\\d{1,6}', message: 'Quote at least one finding as file:line' },
        ],
      },
      {
        id: 'gate',
        kind: 'file',
        label: 'Your gate config',
        hint: 'A Stop hook in .claude/settings.json, a Cursor or Codex hook, or a CI step that runs the tests.',
        optional: true,
        checks: [{ type: 'minChars', n: 30, message: 'Send the real gate config, at least 30 characters, including the command it runs.' }],
      },
    ],
    equivalents:
      'A fresh-context reviewer works anywhere: open a new chat, or a read-only agent, and give it only the diff. A gate that runs by itself needs hooks: Claude Code, Cursor and Codex CLI have them, and OpenCode can do it with a plugin. Kilo Code’s docs don’t describe hooks, so use a CI check or a git pre-commit script as the gate.',
    sources: [
      'https://code.claude.com/docs/en/best-practices',
      'https://code.claude.com/docs/en/hooks',
      'https://simonwillison.net/2025/Oct/7/vibe-engineering/',
    ],
    xp: 125,
  },
  {
    id: 'p7',
    level: 7,
    title: 'Run a team: lead and workers',
    concept:
      'For bigger work, one session leads: it plans, writes precise specs and checks the result, while cheaper workers build. There is no single official recipe, but the practice is shared. Harper Reed works spec, then plan, then todo files, and Simon Willison says strong tests are what make parallel agents safe and review the bottleneck. Claude Code also has an experimental agent-teams feature, and Anthropic notes teams use about 7 times the tokens of a standard session, so use it only for genuinely parallel work.',
    build: [
      'Write a ledger file with GOAL, PLAN and TASKS sections, and a status on each task (todo, doing, done).',
      'Split the work into tasks on different files, so workers cannot collide.',
      'Write one spec per worker: the files in scope, what not to touch, and the success criteria as a command that must pass.',
      'Run the workers (in parallel if the files are separate). Commit each finished task.',
      'Have the workers review each other’s code. Plant one bug in a change, and see if the review or the tests catch it.',
    ],
    done: 'A ledger, a real worker spec, several commits from the run, and a peer review that says what happened to a planted bug.',
    evidence: [
      {
        id: 'spec',
        kind: 'file',
        label: 'One worker spec',
        hint: 'The brief you gave one worker, as a file or pasted text.',
        checks: [
          { type: 'includesAny', terms: ['success criteria', 'done when', 'acceptance'], message: 'Add the success criteria: a command or check that proves the task is done.' },
          { type: 'includesAny', terms: ['files in scope', 'in scope', 'do not touch', 'out of scope'], message: 'Say which files are in scope and what the worker must not touch.' },
        ],
      },
      {
        id: 'tasks',
        kind: 'file',
        label: 'Your task ledger',
        hint: 'Your ledger file, such as TASKS.md or a ledger/ folder file, with GOAL, PLAN and TASKS.',
        checks: [
          {
            type: 'countAtLeast',
            pattern: '^[ \\t]*-[ \\t]*(\\[[ x]\\]|\\[(todo|doing|done)\\]|(todo|doing|done)\\b)',
            flags: 'gim',
            n: 3,
            message: 'List at least 3 tasks, each on its own line with a status, like "- [ ] task", "- [x] task" or "- todo: task".',
          },
        ],
      },
      {
        id: 'gitlog',
        kind: 'command',
        label: 'Commits from the run',
        hint: 'Run `git log --oneline -10` and send the command and its output.',
        checks: [
          { type: 'countAtLeast', pattern: '^[0-9a-f]{7,}[ \\t]', flags: 'gim', n: 3, message: 'Send `git log --oneline -10` with at least 3 commits, ideally one per finished task.' },
        ],
      },
      {
        id: 'review',
        kind: 'text',
        label: 'The peer review and the planted bug',
        hint: 'What the reviewer found, and whether the planted bug was caught or survived the tests.',
        checks: [
          {
            type: 'includesAny',
            terms: ['mutation', 'mutant', 'planted', 'survived', 'killed', 'caught'],
            message: 'Say what happened to the planted bug: was it caught or killed by a test or the reviewer, or did it survive?',
          },
        ],
      },
    ],
    equivalents:
      'This is a way of working, not a feature, so it runs in any agent: the ledger and specs are plain files, and workers are separate sessions or subagents. Agents with subagents (OpenCode, Cursor, Codex CLI) can be the workers directly. In Kilo Code, whose docs don’t confirm delegation, run each worker as its own chat.',
    sources: [
      'https://harper.blog/2025/02/16/my-llm-codegen-workflow-atm/',
      'https://simonwillison.net/2025/Oct/5/parallel-coding-agents/',
      'https://code.claude.com/docs/en/costs',
      'https://simonwillison.net/2025/Oct/7/vibe-engineering/',
    ],
    xp: 150,
  },
  {
    id: 'p8',
    level: 8,
    title: 'Parallel sessions, headless runs and CI',
    concept:
      'Boris Cherny, who created Claude Code, says running 3 to 5 sessions at once in separate git worktrees is the team’s top tip. Pros also run the agent without a screen: `claude -p` in scripts, and anthropics/claude-code-action in GitHub Actions. Use a budget cap on anything unattended.',
    build: [
      'Create two git worktrees for two separate tasks (`git worktree add`, or `claude --worktree <name>`).',
      'Start an agent session in each worktree and let both run at the same time.',
      'Run your agent headless once on a small job and capture the structured output. Add a budget cap if your tool has one.',
      'Optionally add a CI workflow that runs an agent on a pull request or an issue.',
      'Merge one worktree’s branch, then remove both worktrees.',
    ],
    done: 'Two worktrees listed at once, one headless run captured, and optionally a CI workflow that runs an agent.',
    evidence: [
      {
        id: 'worktrees',
        kind: 'command',
        label: 'Your worktrees',
        hint: 'Run `git worktree list` while both worktrees exist, and send the command and its output.',
        checks: [
          {
            type: 'countAtLeast',
            pattern: '[0-9a-f]{7,}[ \\t]+\\[[^\\]\\n]{1,200}\\]',
            flags: 'gim',
            n: 2,
            message: 'Show at least 2 worktrees. Create a second one with `git worktree add ../name -b branch`, then send `git worktree list` again.',
          },
        ],
      },
      {
        id: 'headless',
        kind: 'command',
        label: 'A headless run',
        hint: 'The command and its output: `claude -p "…" --output-format json`, `opencode run "…"`, `codex exec "…"`, or `cursor -p "…"`.',
        checks: [
          { type: 'minChars', n: 40, message: 'Send the headless command and the output it printed, at least 40 characters.' },
          { type: 'includesAny', terms: ['"result"', '"type"', 'session', 'cost', 'duration', 'exit', 'tokens'], message: 'Send the real output of the headless run (for example the JSON from --output-format json)' },
        ],
      },
      {
        id: 'ci',
        kind: 'file',
        label: 'A CI workflow that runs an agent',
        hint: 'A file from .github/workflows/ that calls an agent, such as anthropics/claude-code-action.',
        optional: true,
        checks: [
          {
            type: 'regex',
            pattern: '^on:|claude-code-action|codex|opencode|cursor',
            flags: 'im',
            message: 'Send the whole workflow file. It should have an on: trigger and a step that runs your agent.',
          },
        ],
      },
    ],
    equivalents:
      'Worktrees are plain git, so they work with every agent. Headless: opencode run, cursor -p, codex exec (Codex also has a GitHub Action), and kilo run --auto in Kilo Code. The `claude -p` flags and claude-code-action are specific to Claude Code.',
    sources: [
      'https://code.claude.com/docs/en/headless',
      'https://code.claude.com/docs/en/github-actions',
      'https://code.claude.com/docs/en/worktrees',
      'https://x.com/bcherny/status/2017742743125299476',
    ],
    xp: 150,
  },
  {
    id: 'p9',
    level: 9,
    title: 'Ship it safely',
    concept:
      'Pros assume the agent can be wrong or tricked. In Claude Code, deny rules block an action in every permission mode (for example deny Read of .env files), /sandbox adds OS-level limits for shell commands, and anything the agent reads from the web, an issue or an email is untrusted. Watch cost too: Anthropic reports about $13 per developer per active day.',
    build: [
      'Add deny rules to your settings so the agent cannot read .env files or other secrets.',
      'Check that secrets are never in your rules file, your prompts or your MCP config. Use environment variables.',
      'Name one place untrusted text reaches your agent (a web page, an issue, a README, an email, tool output) and decide how you guard it.',
      'Turn on your agent’s sandbox or run it in a container if you ever skip permission prompts.',
      'Check your usage and cost, and name one change that would lower it.',
    ],
    done: 'Deny rules for secrets in place, your usage shown, and a written note on how you guard against prompt injection.',
    evidence: [
      {
        id: 'permissions',
        kind: 'file',
        label: 'Settings that keep secrets out of your agent’s reach',
        hint: 'Deny rules (Claude Code: permissions.deny in .claude/settings.json or settings.local.json), or an ignore file your agent respects (for example .cursorignore). Send only the relevant part.',
        checks: [
          { type: 'includesAny', terms: ['deny', 'ignore', 'exclude', 'block'], message: 'Add deny rules or an ignore file for your secrets, then send it again.' },
          { type: 'regex', pattern: '\\.env', message: 'Deny reading .env files, for example "Read(./.env*)".' },
        ],
      },
      {
        id: 'usage',
        kind: 'command',
        label: 'Your usage or cost',
        hint: 'Run /usage in Claude Code, or your agent’s cost or usage command, and paste what it shows.',
        checks: [
          { type: 'regex', pattern: '\\$[ \\t]?\\d+\\.\\d{2}|\\d{1,3}(,\\d{3})+[ \\t]*tokens?|\\d{3,}[ \\t]*tokens?', flags: 'i', message: 'Send output that shows a cost (like $1.20) or a token count. Run /usage or your agent’s cost command.' },
        ],
      },
      {
        id: 'injection',
        kind: 'text',
        label: 'A prompt-injection risk and your guard',
        hint: 'Where untrusted text reaches your agent in your setup, and what limits the damage (deny rules, no secrets, a sandbox, review before acting).',
        checks: [
          { type: 'countAtLeast', pattern: '\\b[a-z]{3,}\\b', flags: 'gi', n: 30, message: 'Write it in your own words: a few real sentences' },
          { type: 'minChars', n: 200, message: 'Write at least 200 characters: the risk in your setup, and the specific guard.' },
          {
            type: 'includesAny',
            terms: ['inject', 'untrusted', 'web page', 'issue', 'readme', 'tool output', 'email'],
            message: 'Name where the untrusted text comes from, such as a web page, an issue, a README, an email or tool output.',
          },
        ],
      },
    ],
    equivalents:
      'The ideas hold everywhere: keep secrets out of the repo and the prompt, review what the agent will run, and treat fetched text as untrusted. Deny rules and /sandbox are documented for Claude Code. For OpenCode, Cursor, Codex CLI and Kilo Code, this course hasn’t checked their permission and sandbox settings, so read your tool’s docs and send its real config.',
    sources: [
      'https://code.claude.com/docs/en/security',
      'https://code.claude.com/docs/en/sandboxing',
      'https://code.claude.com/docs/en/costs',
      'https://lucumr.pocoo.org/2025/6/12/agentic-coding/',
    ],
    xp: 175,
  },
]

export const proTaskById = (id: string) => PRO_TASKS.find((t) => t.id === id)

/**
 * Every AI coding tool the course supports, as data. The quests are written once, with
 * slots like {plan} or {mention}; `forTool` fills them with the learner's tool's own words,
 * so one curriculum reads natively in Kilo Code, OpenCode, Claude Code and the rest.
 *
 * Every fact here (install steps, prices, free models, mode names, file names) was checked
 * against the vendor's official pages on `checked`, and `sources` lists those pages. These
 * tools change monthly: re-check before editing, never fill a gap from memory.
 * Shared by the browser and the server; no imports, so anything can depend on it.
 */

export const TOOL_IDS = ['kilo', 'opencode', 'claude-code', 'cursor', 'windsurf', 'copilot', 'antigravity', 'gemini-cli', 'codex', 'cline', 'other'] as const
export type ToolId = (typeof TOOL_IDS)[number]

export const OS_IDS = ['windows', 'mac', 'linux'] as const
export type Os = (typeof OS_IDS)[number]

/** What decides the course's wording: the learner's tool and computer. */
export type Setup = { tool: ToolId; os: Os | '' }

/**
 * No answer yet = Kilo Code, the course's original (free) tool. Learners who signed up
 * before onboarding existed therefore see the course exactly as they always have.
 */
export const DEFAULT_SETUP: Setup = { tool: 'kilo', os: '' }

export type Tool = {
  id: ToolId
  /** Display name: "Kilo Code". */
  name: string
  /** Where you use it, as a quest tool chip: "VS Code", "Terminal", "Cursor". */
  app: string
  /** One line under the name in the picker: "Extension for VS Code". */
  kind: string
  /** The honest cost line, from the vendor's pricing page: "Free models built in". */
  price: string
  /** True only when a beginner can do the whole course without paying (verified, sourced). */
  free: boolean
  /** "Help me pick" only: who it suits, in one line. */
  suits?: string
  /** Base Camp's first "make" line: what to install. */
  install: string
  /** Per-OS replacements for `install`, where the steps really differ. */
  installOn?: Partial<Record<Os, string>>
  /** How to start it inside the ai-quest folder, as a clause: "open it in VS Code". */
  open: string
  /** Base Camp's four tool-specific checklist steps. Always exactly four: saved ticks are stored by position. */
  setup: [string, string, string, string]
  /** Base Camp's "done when". */
  ready: string
  /** Base Camp's two tool tips: how its modes work, then the model/cost situation. */
  tips: [string, string]
  /** Its planning mode as a lower-case noun phrase: "the plan agent", "plan mode". */
  plan: string
  /** How to get into planning, as an imperative sentence: "Switch to the plan agent (Ctrl+. / Cmd+.)". */
  planHow: string
  /** How to add a file to its context, as a lower-case verb: "@-mention". */
  mention: string
  /** How to roll back an agent's change, as one or two sentences. */
  undo: string
  /** Where standing project rules live, as a sentence naming the file. */
  rules: string
  /** How to start a fresh chat, as a short clause: "type /new". */
  newChat: string
  /** The guide's cheat sheet: 5–7 rows of { what, how }. */
  cheats: { k: string; v: string }[]
  /** The main docs page. */
  docs: string
  /** The official pages every fact above came from. */
  sources: string[]
  /** YYYY-MM-DD the facts were checked. */
  checked: string
}

const KILO: Tool = {
  id: 'kilo',
  name: 'Kilo Code',
  app: 'VS Code',
  kind: 'Extension for VS Code',
  price: 'Free models built in (“Auto Free”)',
  free: true,
  suits: 'You like buttons and menus. Works inside VS Code, the free editor.',
  install: 'Install VS Code and Git, then the Kilo Code extension, and choose the free model “Auto Free”.',
  open: 'open it in VS Code',
  setup: [
    'Install VS Code and Git',
    'Install the Kilo Code extension',
    'Sign in and pick “Auto Free”',
    'Make the ai-quest folder, open it in VS Code, and turn on Git (Source Control → Initialize Repository)',
  ],
  ready: 'Kilo Code is open in VS Code with Auto Free selected, inside your ai-quest folder.',
  tips: [
    'Kilo calls its modes “agents”: code (default), ask (read-only), plan (plans only), debug. Switch with the agent dropdown, by typing /agents, or with Ctrl+. (Windows) / Cmd+. (Mac).',
    'Auto Free sends your requests to whichever free models are up. They can be slow or rate-limited (normal, not you), and free prompts may be logged, so keep personal details out.',
  ],
  plan: 'the plan agent',
  planHow: 'Switch to the plan agent (Ctrl+. / Cmd+.)',
  mention: '@-mention',
  undo: 'Click “Revert to here” on a message in the Kilo chat to undo what the agent did after it. These snapshots need Git turned on in the folder: in VS Code, Source Control → Initialize Repository (once per folder). Ctrl/Cmd+Z also works on open files.',
  rules: 'Project rules go in an AGENTS.md file at the root of your project folder; Kilo reads it in every chat. (Rule files in .kilo/rules/ also work.)',
  newChat: 'start a new session from the Kilo panel',
  cheats: [
    { k: 'Agents', v: 'code (default) · ask (read-only) · plan (writes plans only) · debug. Switch with the dropdown or /agents. Ctrl+. / Cmd+. switches agents, not models.' },
    { k: 'Free model', v: '“Auto Free” routes to whichever free models are up. Click the model name under the chat box to pick it. Slow or rate-limited at times: normal.' },
    { k: 'Add context', v: 'Type @ and pick a file or folder · drag files from the VS Code explorer into the chat · open tabs are included automatically · paste a full path for files outside the project (it asks before reading).' },
    { k: 'Undo', v: '“Revert to here” on any message rolls back the agent’s changes after it (needs Git in the folder). Ctrl/Cmd+Z undoes edits inside a file you have open.' },
    { k: 'Project rules', v: 'AGENTS.md at the project root, read in every chat. Rule files in .kilo/rules/*.md listed in kilo.jsonc also work.' },
    { k: 'Copy a path', v: 'Windows: Shift + right-click → Copy as path · Mac: right-click, hold Option → Copy “…” as Pathname · VS Code: right-click → Copy Path.' },
  ],
  docs: 'https://kilo.ai/docs',
  sources: [
    'https://kilo.ai/docs/getting-started/installing',
    'https://kilo.ai/docs/getting-started/using-kilo-for-free',
    'https://kilo.ai/docs/code-with-ai/agents/using-agents',
    'https://kilo.ai/docs/code-with-ai/agents/context-mentions',
    'https://kilo.ai/docs/code-with-ai/features/checkpoints',
    'https://kilo.ai/docs/customize/custom-instructions',
  ],
  checked: '2026-10-22',
}

/** Any other tool: plain wording that holds for every agent, and points at its own docs. */
const OTHER: Tool = {
  id: 'other',
  name: 'Your agent',
  app: 'Your editor',
  kind: 'Any AI coding agent',
  price: 'Check your tool’s pricing page',
  free: false,
  install: 'Install your AI coding agent and sign in, following its own setup guide.',
  open: 'open it in your agent',
  setup: ['Install your AI coding agent', 'Sign in and pick a model', 'Find its plan (or ask) mode and its undo', 'Make the ai-quest folder and open it in your agent'],
  ready: 'Your agent is running inside your ai-quest folder, and you know where its plan mode and undo are.',
  tips: [
    'Most agents have a mode that plans or answers without editing files. Find yours: it is how you think before you build.',
    'Find out how your agent undoes a change (checkpoints, rewind or undo) before you need it.',
  ],
  plan: 'plan mode',
  planHow: 'Switch to your agent’s plan (or ask) mode, or start your message with “Don’t change anything yet:”',
  mention: '@-mention',
  undo: 'Use your agent’s checkpoints or undo. If it has none, keep a copy of the folder before big changes.',
  rules: 'Project rules usually go in an AGENTS.md file at the root of your project; many agents read it. Check your tool’s docs for its own rules file.',
  newChat: 'start a new chat',
  cheats: [
    { k: 'Plan first', v: 'Find the mode that plans or answers without editing. Use it before every big change.' },
    { k: 'Add context', v: 'Most agents use @ to add a file or folder to the chat. Some use # or drag-and-drop.' },
    { k: 'Undo', v: 'Find its checkpoints / rewind / undo before you need them. No undo? Copy the folder first.' },
    { k: 'Project rules', v: 'AGENTS.md at the project root works in many agents. Check your tool’s docs for its own file.' },
    { k: 'Copy a path', v: 'Windows: Shift + right-click → Copy as path · Mac: right-click, hold Option → Copy “…” as Pathname.' },
  ],
  docs: 'https://agents.md',
  sources: ['https://agents.md'],
  checked: '2026-10-22',
}

const COPY_PATH = 'Windows: Shift + right-click → Copy as path · Mac: right-click, hold Option → Copy “…” as Pathname.'

const OPENCODE: Tool = {
  id: 'opencode',
  name: 'OpenCode',
  app: 'Terminal',
  kind: 'Runs in your terminal',
  price: 'Free models built in (for a limited time)',
  free: true,
  suits: 'You are happy typing short commands in a terminal. Free to start, no account needed.',
  install: 'Open a terminal and install OpenCode (Mac or Linux: `curl -fsSL https://opencode.ai/install | bash`). On Windows, use the desktop app from opencode.ai/download.',
  installOn: {
    mac: 'Open Terminal and run `curl -fsSL https://opencode.ai/install | bash`.',
    linux: 'Open a terminal and run `curl -fsSL https://opencode.ai/install | bash`.',
    windows: 'Install the OpenCode desktop app from opencode.ai/download, or run `npm install -g opencode-ai` if you have Node.js. It needs a modern terminal.',
  },
  open: 'open a terminal in it and type opencode',
  setup: [
    'Open a terminal (Terminal on Mac, PowerShell on Windows)',
    'Install Git if you do not have it',
    'Install OpenCode',
    'Make the ai-quest folder, go into it (mkdir ai-quest, then cd ai-quest), turn on Git (git init), type opencode, then type /models and pick a free model such as Big Pickle',
  ],
  ready: 'OpenCode is running in your ai-quest folder with a free model selected, and Git is turned on.',
  tips: [
    'OpenCode has two built-in agents: Build (the default) and Plan. Press Tab to switch. In OpenCode 2, press Shift+Tab or type /agents.',
    'OpenCode comes with free models you can use without an account. They are free for a limited time and the limits are not published, so they can change. Type /models to pick or change one.',
  ],
  plan: 'the Plan agent',
  planHow: 'Switch to the Plan agent (press Tab; in OpenCode 2 it’s Shift+Tab)',
  mention: '@-mention',
  undo: 'Type /undo to roll back your last message and the file changes it made. Type /redo to bring them back. It uses Git, so turn Git on in the folder first: run git init there once.',
  rules: 'Project rules go in an AGENTS.md file at the root of your project folder. Type /init and OpenCode makes one for you.',
  newChat: 'type /new',
  cheats: [
    { k: 'Agents', v: 'Build (default) edits your files · Plan plans first. Press Tab to switch (Shift+Tab or /agents in OpenCode 2).' },
    { k: 'Model', v: 'Type /models and pick a free model, for example Big Pickle. Free models are free for a limited time. /connect adds a provider.' },
    { k: 'Add context', v: 'Type @ and pick a file (it searches as you type).' },
    { k: 'Undo', v: '/undo rolls back the last message and its file changes. /redo brings them back. Needs Git in the folder.' },
    { k: 'Project rules', v: 'AGENTS.md at the project root. Type /init to make one.' },
    { k: 'New chat', v: 'Type /new (also /clear).' },
  ],
  docs: 'https://opencode.ai/docs/',
  sources: [
    'https://opencode.ai/',
    'https://opencode.ai/docs/',
    'https://opencode.ai/docs/agents/',
    'https://opencode.ai/docs/tui/',
    'https://opencode.ai/docs/rules/',
    'https://opencode.ai/v2/docs/console/models/',
  ],
  checked: '2026-10-22',
}

const CLAUDE_CODE: Tool = {
  id: 'claude-code',
  name: 'Claude Code',
  app: 'Terminal',
  kind: 'Runs in your terminal (also VS Code and a desktop app)',
  price: 'Needs a Claude Pro plan (from $20/month) or API credits',
  free: false,
  suits: 'You already pay for Claude, or want the tool built by Anthropic.',
  install: 'Open a terminal and install Claude Code (Mac or Linux: `curl -fsSL https://claude.ai/install.sh | bash`; Windows PowerShell: `irm https://claude.ai/install.ps1 | iex`).',
  installOn: {
    mac: 'Open Terminal and run `curl -fsSL https://claude.ai/install.sh | bash`.',
    linux: 'Open a terminal and run `curl -fsSL https://claude.ai/install.sh | bash`.',
    windows: 'Open PowerShell and run `irm https://claude.ai/install.ps1 | iex`.',
  },
  open: 'open a terminal in it and type claude',
  setup: [
    'Get a Claude Pro plan (or API credits). The free claude.ai plan does not include Claude Code',
    'Open a terminal (Terminal on Mac, PowerShell on Windows)',
    'Install Claude Code, then check it with claude --version',
    'Make the ai-quest folder, go into it (mkdir ai-quest, then cd ai-quest), type claude, and sign in through your browser the first time',
  ],
  ready: 'Claude Code is running in your ai-quest folder and you are signed in.',
  tips: [
    'Claude Code has permission modes. Press Shift+Tab to cycle through them until the status bar says “plan mode on”. In plan mode it plans before it builds.',
    'There is no free way to use Claude Code. You need a Claude Pro plan (from $20/month) or API credits. Type /model to change the model.',
  ],
  plan: 'plan mode',
  planHow: 'Press Shift+Tab until the status bar says “plan mode on”',
  mention: '@-mention',
  undo: 'Claude Code saves a checkpoint at every prompt. Press Esc twice, or type /rewind, to restore your code or the chat to an earlier point. It does not track changes made by terminal commands.',
  rules: 'Project rules go in a CLAUDE.md file at the root of your project folder. Type /init and Claude makes one for you.',
  newChat: 'type /clear',
  cheats: [
    { k: 'Modes', v: 'Press Shift+Tab to cycle the permission modes until the status bar says “plan mode on”.' },
    { k: 'Model', v: 'Type /model. Claude Code needs a Pro plan (from $20/month) or API credits.' },
    { k: 'Add context', v: 'Type @ and a file or folder name.' },
    { k: 'Undo', v: 'Press Esc twice or type /rewind to restore code or the chat. Changes made by terminal commands are not tracked.' },
    { k: 'Project rules', v: 'CLAUDE.md at the project root. Type /init to make one.' },
    { k: 'New chat', v: 'Type /clear (also /new or /reset).' },
  ],
  docs: 'https://code.claude.com/docs/en/overview',
  sources: [
    'https://code.claude.com/docs/en/setup',
    'https://claude.com/pricing',
    'https://code.claude.com/docs/en/quickstart',
    'https://code.claude.com/docs/en/permission-modes',
    'https://code.claude.com/docs/en/checkpointing',
    'https://code.claude.com/docs/en/memory',
    'https://code.claude.com/docs/en/commands',
  ],
  checked: '2026-10-22',
}

const CURSOR: Tool = {
  id: 'cursor',
  name: 'Cursor',
  app: 'Cursor',
  kind: 'An AI code editor (desktop app)',
  price: 'Free plan with limited agent use; Plus from $8/month',
  free: false,
  suits: 'You want an all-in-one editor with the AI built in.',
  install: 'Download Cursor from cursor.com/download, install it, and open it.',
  open: 'open it in Cursor',
  setup: [
    'Install Cursor (from cursor.com/download) and Git',
    'Open Cursor and sign in',
    'Find the agent chat: press Cmd+I on Mac or Ctrl+I on Windows',
    'Make the ai-quest folder, open it in Cursor (File → Open Folder), and turn on Git (Source Control → Initialize Repository)',
  ],
  ready: 'Cursor is open on your ai-quest folder, you are signed in, and the agent chat works.',
  tips: [
    'Cursor’s chat has modes. Press Shift+Tab in the chat box, or use the mode picker, to switch to Plan mode, where it plans before it builds.',
    'The Free plan has limited agent use and Cursor’s own models only. Plus is $8/month. Use the model picker at the top of the chat box to choose a model.',
  ],
  plan: 'plan mode',
  planHow: 'Switch the chat to Plan mode (Shift+Tab, or the mode picker)',
  mention: '@-mention',
  undo: 'Cursor makes a checkpoint automatically. Click “Restore Checkpoint” on an earlier request in the chat to put your files back to that point.',
  rules: 'Project rules go in an AGENTS.md file at the root of your project folder. Rule files in .cursor/rules/ also work.',
  newChat: 'press Cmd+N on Mac or Ctrl+N on Windows',
  cheats: [
    { k: 'Modes', v: 'Agent chat: Cmd+I (Mac) / Ctrl+I. Switch to Plan mode with Shift+Tab in the chat box or the mode picker.' },
    { k: 'Model', v: 'Use the model picker at the top of the chat box. The Free plan has Cursor’s own models only.' },
    { k: 'Add context', v: 'Type @ and a file or folder name.' },
    { k: 'Undo', v: 'Click “Restore Checkpoint” on an earlier request in the chat.' },
    { k: 'Project rules', v: 'AGENTS.md at the project root, or .cursor/rules/*.mdc.' },
    { k: 'New chat', v: 'Cmd+N (Mac) / Ctrl+N (Windows).' },
    { k: 'Copy a path', v: COPY_PATH },
  ],
  docs: 'https://cursor.com/docs',
  sources: [
    'https://cursor.com/docs/models-and-pricing',
    'https://cursor.com/docs/get-started/quickstart',
    'https://cursor.com/docs/agent/plan-mode',
    'https://cursor.com/docs/agent/overview',
    'https://cursor.com/docs/rules',
    'https://cursor.com/docs/reference/keyboard-shortcuts',
  ],
  checked: '2026-10-22',
}

const WINDSURF: Tool = {
  id: 'windsurf',
  name: 'Devin Desktop (Windsurf)',
  app: 'Devin Desktop',
  kind: 'AI code editor, formerly Windsurf',
  price: 'Free plan with a light agent quota; Pro $20/month',
  free: false,
  suits: 'You already use Windsurf, which is now called Devin Desktop.',
  install: 'Download Devin Desktop (formerly Windsurf) from devin.ai/download, install it, and sign in with a Devin account.',
  open: 'open it in Devin Desktop',
  setup: [
    'Install Devin Desktop (from devin.ai/download) and Git',
    'Open Devin Desktop and sign in with a Devin account',
    'Open the agent panel: press Cmd+L on Mac or Ctrl+L on Windows',
    'Make the ai-quest folder, open it in Devin Desktop (File → Open Folder), and turn on Git (Source Control → Initialize Repository)',
  ],
  ready: 'Devin Desktop is open on your ai-quest folder, you are signed in, and the agent panel is open.',
  tips: [
    'The agent in Devin Desktop has Normal, Plan and Ask modes. Look in the agent panel’s mode options to switch to Plan.',
    'The Free plan has a light agent quota and limited models. Pro is $20/month. Windsurf was renamed Devin Desktop in June 2026.',
  ],
  plan: 'plan mode',
  planHow: 'Switch the agent to Plan mode (in the agent panel’s mode options)',
  mention: '@-mention',
  undo: 'Hover over an earlier prompt in the agent panel and click the revert arrow to put your code back to that step. If you do not see it, use Git as a backup: git add . then git commit -m "save" before big changes.',
  rules: 'Project rules go in an AGENTS.md file at the root of your project folder. Files in .devin/rules/ also work.',
  newChat: 'start a new conversation in the agent panel',
  cheats: [
    { k: 'Modes', v: 'The agent has Normal, Plan and Ask modes. Switch in the agent panel’s mode options. Open the panel with Cmd+L (Mac) / Ctrl+L.' },
    { k: 'Model', v: 'The Free plan has limited models. Choose from what the agent panel offers.' },
    { k: 'Add context', v: 'Type @ and pick a file or folder.' },
    { k: 'Undo', v: 'Hover over an earlier prompt and click the revert arrow, if you see one (it is documented for Cascade; not confirmed for Devin Local). Keep Git as a backup: git add . then git commit -m "save" before big changes.' },
    { k: 'Project rules', v: 'AGENTS.md at the project root, or .devin/rules/*.md.' },
    { k: 'New chat', v: 'Start a new conversation in the agent panel.' },
    { k: 'Copy a path', v: COPY_PATH },
  ],
  docs: 'https://docs.devin.ai/desktop/getting-started',
  sources: [
    'https://docs.devin.ai/desktop/devin-desktop-faq',
    'https://devin.ai/pricing',
    'https://docs.devin.ai/desktop/getting-started',
    'https://docs.devin.ai/desktop/devin-local',
    'https://docs.devin.ai/desktop/cascade/cascade',
    'https://docs.devin.ai/desktop/cascade/memories',
  ],
  checked: '2026-10-22',
}

const COPILOT: Tool = {
  id: 'copilot',
  name: 'GitHub Copilot',
  app: 'VS Code',
  kind: 'Built into VS Code',
  price: 'Free plan with a monthly allowance; Pro $10/month; free for verified students',
  free: false,
  suits: 'You have a GitHub account, or you are a student.',
  install: 'Install VS Code from code.visualstudio.com/download, then click Sign In in the title bar and sign in with your GitHub account.',
  open: 'open it in VS Code',
  setup: [
    'Install VS Code and Git',
    'Make a free GitHub account if you do not have one',
    'Click Sign In in the VS Code title bar and sign in with GitHub (the Free plan starts on its own)',
    'Make the ai-quest folder, open it in VS Code (File → Open Folder, then Trust), turn on Git (Source Control → Initialize Repository), and open the Chat view',
  ],
  ready: 'Copilot is open in the VS Code Chat view, inside your ai-quest folder.',
  tips: [
    'The Chat view has an agent picker: Ask (answers only), Agent (edits your files) and Plan. Open the Chat view with Ctrl+Alt+I (Windows) or Ctrl+Cmd+I (Mac).',
    'Copilot Free has a monthly allowance and uses the Auto model only. Pro is $10/month, and verified students can get Copilot Student for free. You need a GitHub account.',
  ],
  plan: 'the Plan agent',
  planHow: 'Pick Plan in the chat’s agent picker (or type /plan)',
  mention: '#-mention',
  undo: 'Hover over an earlier request in the Chat view and click Restore Checkpoint. It puts back your files and the chat, but it does not undo anything run in the terminal.',
  rules: 'Project rules go in an AGENTS.md file at the root of your project folder. A .github/copilot-instructions.md file also works.',
  newChat: 'click + in the Chat view or type /clear',
  cheats: [
    { k: 'Agents', v: 'Ask (answers only) · Agent (edits files) · Plan. Use the agent picker in the chat input, or type /plan.' },
    { k: 'Model', v: 'Use the model picker in the chat input. The Free plan uses Auto only.' },
    { k: 'Add context', v: 'Type # and a file name (for example #file) · drag files into the Chat · or use Add Context.' },
    { k: 'Undo', v: 'Hover over an earlier request and click Restore Checkpoint. It does not undo terminal commands.' },
    { k: 'Project rules', v: 'AGENTS.md or .github/copilot-instructions.md at the project root.' },
    { k: 'New chat', v: 'Click + in the Chat view, press Ctrl/Cmd+N, or type /clear.' },
    { k: 'Copy a path', v: 'Windows: Shift + right-click → Copy as path · Mac: right-click, hold Option → Copy “…” as Pathname · VS Code: right-click → Copy Path.' },
  ],
  docs: 'https://code.visualstudio.com/docs/agents/overview',
  sources: [
    'https://docs.github.com/en/copilot/get-started/plans',
    'https://code.visualstudio.com/docs/setup/copilot',
    'https://code.visualstudio.com/docs/agents/quickstart',
    'https://code.visualstudio.com/docs/chat/copilot-chat-context',
    'https://code.visualstudio.com/docs/agents/run/planning',
    'https://code.visualstudio.com/docs/agents/run/review-code-edits',
    'https://code.visualstudio.com/docs/agent-customization/custom-instructions',
  ],
  checked: '2026-10-22',
}

const ANTIGRAVITY: Tool = {
  id: 'antigravity',
  name: 'Antigravity CLI',
  app: 'Terminal',
  kind: 'Google’s terminal agent (replaced Gemini CLI’s free tier)',
  price: 'Free plan with weekly limits (Google account)',
  free: false,
  install: 'Open a terminal and install Antigravity CLI (Mac or Linux: `curl -fsSL https://antigravity.google/cli/install.sh | bash`; Windows PowerShell: `irm https://antigravity.google/cli/install.ps1 | iex`).',
  installOn: {
    mac: 'Open Terminal and run `curl -fsSL https://antigravity.google/cli/install.sh | bash`.',
    linux: 'Open a terminal and run `curl -fsSL https://antigravity.google/cli/install.sh | bash`.',
    windows: 'Open PowerShell and run `irm https://antigravity.google/cli/install.ps1 | iex`.',
  },
  open: 'open a terminal in it and type agy',
  setup: [
    'Open a terminal (Terminal on Mac, PowerShell on Windows)',
    'Install Git if you do not have it',
    'Install Antigravity CLI, then check it with agy --version',
    'Make the ai-quest folder, go into it (mkdir ai-quest, then cd ai-quest), turn on Git (git init), type agy, trust the folder, and sign in with your Google account',
  ],
  ready: 'Antigravity CLI is running in your ai-quest folder, you are signed in, and Git is turned on.',
  tips: [
    'By default Antigravity CLI asks before it writes files. Type /planning to turn on plan mode, where it makes a plan before it builds.',
    'The Free plan has weekly rate limits (the numbers are not published) and uses a personal Google account. If it stops, wait and try again later. Type /model to change the model.',
  ],
  plan: 'planning mode',
  planHow: 'Type /planning so it plans before it builds',
  mention: '@-mention',
  undo: 'Type /rewind to step the chat back. It may not undo file changes, so make a Git save point (git add . then git commit -m "save") before big changes.',
  rules: 'Project rules go in a GEMINI.md or AGENTS.md file at the root of your project folder.',
  newChat: 'type /clear',
  cheats: [
    { k: 'Modes', v: 'Type /planning to plan before it builds. By default it asks before it writes files.' },
    { k: 'Model', v: 'Type /model. The Free plan has weekly limits that are not published.' },
    { k: 'Add context', v: 'Type @ and pick a file.' },
    { k: 'Undo', v: '/rewind steps the chat back (also /undo). It may not undo files, so make Git save points: git add . then git commit -m "save".' },
    { k: 'Project rules', v: 'GEMINI.md or AGENTS.md at the project root.' },
    { k: 'New chat', v: 'Type /clear (also /new).' },
  ],
  docs: 'https://antigravity.google/docs',
  sources: [
    'https://antigravity.google/docs/cli',
    'https://antigravity.google/docs/cli/install',
    'https://antigravity.google/docs/cli/reference',
    'https://antigravity.google/pricing',
    'https://antigravity.google/docs/gcli-migration',
    'https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/',
  ],
  checked: '2026-10-22',
}

const GEMINI_CLI: Tool = {
  id: 'gemini-cli',
  name: 'Gemini CLI',
  app: 'Terminal',
  kind: 'Google’s open-source terminal agent',
  price: 'Needs a paid Gemini API key or Code Assist licence (free users moved to Antigravity CLI)',
  free: false,
  install: 'Install Node.js 20 or newer, then open a terminal and run `npm install -g @google/gemini-cli` (on a Mac you can use `brew install gemini-cli`).',
  open: 'open a terminal in it and type gemini',
  setup: [
    'Open a terminal (Terminal on Mac, PowerShell on Windows)',
    'Install Node.js 20 or newer',
    'Install Gemini CLI',
    'Make the ai-quest folder, go into it (mkdir ai-quest, then cd ai-quest), type gemini, and sign in or add your Gemini API key',
  ],
  ready: 'Gemini CLI is running in your ai-quest folder and you are signed in.',
  tips: [
    'Gemini CLI has a Plan Mode. Press Shift+Tab to cycle Default, Auto-Edit and Plan, or type /plan.',
    'Since 18 June 2026, Gemini CLI no longer serves free users. It needs a paid Gemini API key or a Gemini Code Assist Standard or Enterprise licence. Free users moved to Antigravity CLI. Type /model to change the model.',
  ],
  plan: 'plan mode',
  planHow: 'Press Shift+Tab until it shows Plan mode (or type /plan)',
  mention: '@-mention',
  undo: 'Type /rewind (or press Esc twice) to step the chat back; it can put code back too. For a stronger safety net, turn on checkpointing (general.checkpointing.enabled: true in settings.json), then use /restore.',
  rules: 'Project rules go in a GEMINI.md file at the root of your project folder. Type /init and Gemini makes one for you.',
  newChat: 'type /clear',
  cheats: [
    { k: 'Modes', v: 'Press Shift+Tab to cycle Default → Auto-Edit → Plan, or type /plan.' },
    { k: 'Model', v: 'Type /model. Gemini CLI needs a paid Gemini API key or Code Assist licence.' },
    { k: 'Add context', v: 'Type @ and a file path.' },
    { k: 'Undo', v: '/rewind or Esc twice steps back. Checkpointing is off by default; turn it on in settings.json, then use /restore.' },
    { k: 'Project rules', v: 'GEMINI.md at the project root. Type /init to make one.' },
    { k: 'New chat', v: 'Type /clear.' },
  ],
  docs: 'https://geminicli.com/docs/',
  sources: [
    'https://geminicli.com/docs/resources/quota-and-pricing/',
    'https://geminicli.com/docs/get-started/installation/',
    'https://geminicli.com/docs/cli/plan-mode/',
    'https://geminicli.com/docs/cli/checkpointing/',
    'https://geminicli.com/docs/cli/gemini-md/',
    'https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/',
  ],
  checked: '2026-10-22',
}

const CODEX: Tool = {
  id: 'codex',
  name: 'Codex CLI',
  app: 'Terminal',
  kind: 'OpenAI’s terminal agent',
  price: 'Needs ChatGPT Plus (from $20/month) or API credits',
  free: false,
  install:
    'Open a terminal and install Codex (Mac or Linux: `curl -fsSL https://chatgpt.com/codex/install.sh | sh`; Windows PowerShell: `powershell -ExecutionPolicy ByPass -c "irm https://chatgpt.com/codex/install.ps1 | iex"`).',
  installOn: {
    mac: 'Open Terminal and run `curl -fsSL https://chatgpt.com/codex/install.sh | sh`.',
    linux: 'Open a terminal and run `curl -fsSL https://chatgpt.com/codex/install.sh | sh`.',
    windows: 'Open PowerShell and run `powershell -ExecutionPolicy ByPass -c "irm https://chatgpt.com/codex/install.ps1 | iex"`.',
  },
  open: 'open a terminal in it and type codex',
  setup: [
    'Open a terminal (Terminal on Mac, PowerShell on Windows)',
    'Install Git if you do not have it',
    'Install Codex CLI',
    'Make the ai-quest folder, go into it (mkdir ai-quest, then cd ai-quest), turn on Git (git init), type codex, and choose “Sign in with ChatGPT”',
  ],
  ready: 'Codex is running in your ai-quest folder, you are signed in, and Git is turned on.',
  tips: [
    'Type /plan (or press Shift+Tab) for plan mode. For a chat where it cannot change files, type /permissions and choose Read Only.',
    'The Codex CLI works with ChatGPT Plus (from $20/month) or higher, or with API credits. Type /model to change the model.',
  ],
  plan: 'plan mode',
  planHow: 'Type /plan (or press Shift+Tab) to switch to plan mode',
  mention: '@-mention',
  undo: 'Codex has no undo button. Make a Git save point before each change (git add . then git commit -m "save"), and ask Codex to go back to it if something breaks.',
  rules: 'Project rules go in an AGENTS.md file at the root of your project folder. Type /init and Codex makes one for you.',
  newChat: 'type /new',
  cheats: [
    { k: 'Modes', v: 'Type /plan (or press Shift+Tab) for plan mode. /permissions → Read Only makes it unable to change files.' },
    { k: 'Model', v: 'Type /model. The CLI needs ChatGPT Plus (from $20/month) or API credits.' },
    { k: 'Add context', v: 'Type @ and pick a file, or type /mention and a path.' },
    { k: 'Undo', v: 'No undo button. Make Git save points (git add . then git commit -m "save"). Type /diff to see what changed.' },
    { k: 'Project rules', v: 'AGENTS.md at the project root. Type /init to make one.' },
    { k: 'New chat', v: 'Type /new.' },
  ],
  docs: 'https://developers.openai.com/codex',
  sources: [
    'https://github.com/openai/codex',
    'https://learn.chatgpt.com/docs/codex/cli',
    'https://learn.chatgpt.com/docs/pricing',
    'https://learn.chatgpt.com/docs/cli/slash-commands',
    'https://learn.chatgpt.com/docs/agent-configuration/agents-md',
  ],
  checked: '2026-10-22',
}

const CLINE: Tool = {
  id: 'cline',
  name: 'Cline',
  app: 'VS Code',
  kind: 'Extension for VS Code',
  price: 'Free models with a Cline account (they rotate, limited quota)',
  free: false,
  install: 'Install VS Code and Git, then open Extensions (Ctrl+Shift+X, or Cmd+Shift+X on Mac), search “Cline”, and click Install.',
  open: 'open it in VS Code',
  setup: [
    'Install VS Code and Git',
    'Install the Cline extension (Extensions, search “Cline”)',
    'Open Cline from the robot icon in the Activity Bar, then sign in with a Cline account and pick a model tagged FREE',
    'Make the ai-quest folder, open it in VS Code (File → Open Folder), and turn on Git (Source Control → Initialize Repository)',
  ],
  ready: 'Cline is open in VS Code with a free model selected, inside your ai-quest folder.',
  tips: [
    'Cline has a Plan/Act toggle at the bottom of its panel. In Plan it can talk and plan but cannot change your files. Flip to Act to build.',
    'Cline is free, and the free models (tagged FREE) rotate for a limited time with a limited quota. After that you use credits, ClinePass ($9.99/month) or your own key. Pick the model from the gear icon.',
  ],
  plan: 'plan mode',
  planHow: 'Flip the Plan/Act toggle at the bottom of the Cline panel to Plan',
  mention: '@-mention',
  undo: 'Cline saves checkpoints for you. After a step, click Compare to see the change, or Restore and choose the option that restores your files.',
  rules: 'Project rules go in a .clinerules/ folder of .md files at the root of your project folder. Cline also reads AGENTS.md.',
  newChat: 'click + in the Cline panel',
  cheats: [
    { k: 'Plan / Act', v: 'The toggle at the bottom of the Cline panel. Plan cannot change files; Act builds.' },
    { k: 'Model', v: 'Click the gear, then the Model dropdown. Models tagged FREE rotate and have a limited quota.' },
    { k: 'Add context', v: 'Type @ and pick a file or folder · or use the + button.' },
    { k: 'Undo', v: 'Each step has Compare and Restore. Choose the option that restores files.' },
    { k: 'Project rules', v: '.clinerules/ folder of .md files at the project root. AGENTS.md also works.' },
    { k: 'New chat', v: 'Click + in the Cline panel, or type /newtask.' },
    { k: 'Copy a path', v: 'Windows: Shift + right-click → Copy as path · Mac: right-click, hold Option → Copy “…” as Pathname · VS Code: right-click → Copy Path.' },
  ],
  docs: 'https://docs.cline.bot',
  sources: [
    'https://docs.cline.bot/getting-started/installing-cline.md',
    'https://docs.cline.bot/getting-started/free-models.md',
    'https://docs.cline.bot/core-workflows/plan-and-act.md',
    'https://docs.cline.bot/core-workflows/checkpoints.md',
    'https://docs.cline.bot/customization/cline-rules.md',
    'https://cline.bot/pricing',
  ],
  checked: '2026-10-22',
}

export const TOOLS: Record<ToolId, Tool> = {
  kilo: KILO,
  opencode: OPENCODE,
  'claude-code': CLAUDE_CODE,
  cursor: CURSOR,
  windsurf: WINDSURF,
  copilot: COPILOT,
  antigravity: ANTIGRAVITY,
  'gemini-cli': GEMINI_CLI,
  codex: CODEX,
  cline: CLINE,
  other: OTHER,
}

/** The free starts "Help me pick" recommends, in order: an editor extension, then a terminal agent. */
export const FREE_STARTS: ToolId[] = ['kilo', 'opencode']

/** A tool by id; anything unknown or blank falls back to Kilo Code. */
export const toolOf = (id?: string | null): Tool => TOOLS[id as ToolId] || KILO

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * Fill a text's tool slots with the learner's tool's words. Slots: {tool} {app} {plan}
 * {Plan} {planHow} {mention} {Mention} {undo} {rules} {newChat} {install} {open} {ready}
 * {tip1} {tip2} {setup1}…{setup4}. Capitalised names ({Plan}, {Mention}) start a sentence.
 * Unknown slots are left as written, so a typo shows up on screen instead of vanishing.
 */
export function forTool(text: string, setup: Setup = DEFAULT_SETUP): string {
  if (!text.includes('{')) return text
  const t = toolOf(setup.tool)
  const slots: Record<string, string> = {
    tool: t.name,
    app: t.app,
    plan: t.plan,
    Plan: cap(t.plan),
    planHow: t.planHow,
    mention: t.mention,
    Mention: cap(t.mention),
    undo: t.undo,
    rules: t.rules,
    newChat: t.newChat,
    install: (setup.os && t.installOn?.[setup.os]) || t.install,
    open: t.open,
    ready: t.ready,
    tip1: t.tips[0],
    tip2: t.tips[1],
    setup1: t.setup[0],
    setup2: t.setup[1],
    setup3: t.setup[2],
    setup4: t.setup[3],
  }
  return text.replace(/\{(\w+)\}/g, (m, k: string) => slots[k] ?? m)
}

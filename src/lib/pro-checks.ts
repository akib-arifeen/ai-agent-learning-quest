/**
 * The deterministic half of checking pro-track evidence: scrub secrets, cap sizes, and
 * run each task's declarative checks. Pure functions, no I/O, so they're cheap to test
 * and identical in the MCP route and anywhere else. Shared by the browser and the server.
 */

import { EVIDENCE_LIMITS, type Check, type CheckResult, type EvidenceItem, type ProTask, type Verdict } from './pro'

const REDACTED = '[REDACTED]'

/** A value that is already scrubbed or is a placeholder like ${VAR}, {env:VAR}, <TOKEN>, {token}. */
const isPlaceholder = (v: string) => /^(\$\{|\{|<|\[REDACTED\])/i.test(v)

/**
 * Whole-match patterns, applied in order. Earlier matches become [REDACTED], so later ones can't double count.
 * Every open-ended run is bounded or a plain greedy run that cannot fail after consuming, so none backtracks
 * quadratically (a 40k-character run of one letter once took 7 s in the URL-password pattern).
 */
const WHOLE_PATTERNS: RegExp[] = [
  // PEM block; an unterminated one is redacted to the end of the text.
  /-----BEGIN [A-Z ]{0,30}PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]{0,30}PRIVATE KEY-----|$)/g,
  /(?<![A-Za-z0-9_-])eyJ[A-Za-z0-9_-]{10,200}\.[A-Za-z0-9_-]{10,1000}\.[A-Za-z0-9_-]{10,200}/g,
  /sk-ant-[A-Za-z0-9_-]{20,}/g,
  /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/g,
  /(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}/g,
  /gh[pousr]_[A-Za-z0-9]{30,}/g,
  /github_pat_[A-Za-z0-9_]{30,}/g,
  /xox[abprs]-[A-Za-z0-9-]{10,}/g,
  /AKIA[0-9A-Z]{16}/g,
  /AIza[0-9A-Za-z_-]{35}/g,
  /qst_[A-Za-z0-9_-]{20,}/g,
  /npm_[A-Za-z0-9]{36}/g,
  /hf_[A-Za-z0-9]{30,}/g,
  /ya29\.[A-Za-z0-9_-]{20,}/g,
  /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/]+/g,
]

/** Password in a connection string: scheme://user:password@host. User may be empty (redis://:pw@h). */
const URL_PASSWORD = /([a-z][a-z0-9+.-]{0,30}:\/\/[^\s:@/]{0,256}:)([^\s@]{1,256})(@)/gi

/**
 * key=value / "key": "value". The name is one run of name characters (bounded, and the lookbehind stops a
 * second attempt inside the same run, so scanning stays linear); whether it is a secret name is decided in
 * code by segments. Value is a quoted string (up to the closing quote, same line) or an unquoted run.
 */
const KEY_VALUE =
  /((?<![A-Za-z0-9_.-])[A-Za-z0-9_.-]{1,80})(["']?[ \t]{0,20}[:=][ \t]{0,20})(?:"([^"\r\n]{1,300})"|'([^'\r\n]{1,300})'|([^\s"',}]{6,300}))/g

const SECRET_SEGMENTS = new Set([
  'key', 'apikey', 'secret', 'token', 'password', 'passwd', 'pwd', 'credential', 'credentials', 'auth',
])
const SECRET_CAMEL = new Set([
  'apikey', 'apitoken', 'accesstoken', 'authtoken', 'secretkey', 'clientsecret', 'privatekey', 'accesskey',
])
const COUNT_SEGMENTS = new Set(['tokens', 'max', 'limit', 'count', 'budget', 'size', 'port', 'timeout'])

const segmentsOf = (name: string) => name.toLowerCase().split(/[_.-]/)
const isSecretName = (name: string) =>
  segmentsOf(name).some((g) => SECRET_SEGMENTS.has(g)) || SECRET_CAMEL.has(name.toLowerCase())
const isCountName = (name: string) => segmentsOf(name).some((g) => COUNT_SEGMENTS.has(g))
const isEnvVarName = (v: string) => /^[A-Z][A-Z0-9_]{2,}$/.test(v)

/**
 * Remove secret-looking strings before anything is stored: provider API keys (sk-…,
 * sk-ant-…, Stripe, npm, Hugging Face), GitHub/Slack/AWS/Google tokens, JWTs, private key
 * blocks, passwords in connection strings, Bearer tokens and `key = value` lines for names
 * like api_key, STRIPE_SECRET_KEY, client_secret, password. Each match becomes [REDACTED];
 * `count` is how many. Linear time: safe on untrusted input.
 */
export function scrubSecrets(text: string): { text: string; count: number } {
  let count = 0
  let out = text.replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
  const hit = () => {
    count++
    return REDACTED
  }
  for (const re of WHOLE_PATTERNS) out = out.replace(re, hit)
  out = out.replace(URL_PASSWORD, (m, pre: string, pw: string, at: string) => {
    if (isPlaceholder(pw)) return m
    count++
    return pre + REDACTED + at
  })
  out = out.replace(/(Bearer\s+)([A-Za-z0-9._~+/=-]{12,})/g, (_m, pre: string) => {
    count++
    return pre + REDACTED
  })
  out = out.replace(/(Authorization["']?[ \t]{0,20}[:=][ \t]{0,20}["']?Basic[ \t]{1,20})([A-Za-z0-9+/=]{8,512})/gi, (_m, pre: string) => {
    count++
    return pre + REDACTED
  })
  out = out.replace(KEY_VALUE, (m, name: string, sep: string, dq?: string, sq?: string, bare?: string) => {
    const value = dq ?? sq ?? bare ?? ''
    if (!isSecretName(name) || isPlaceholder(value) || isEnvVarName(value)) return m
    if (/^\d+$/.test(value) && isCountName(name)) return m
    count++
    const q = dq !== undefined ? '"' : sq !== undefined ? "'" : ''
    return name + sep + q + REDACTED + q
  })
  return { text: out, count }
}

/** Drop // and block comments that sit outside JSON strings. */
function stripJsonComments(src: string): string {
  let out = ''
  let i = 0
  while (i < src.length) {
    const c = src[i]
    const next = src[i + 1]
    if (c === '"') {
      let j = i + 1
      while (j < src.length && src[j] !== '"') j += src[j] === '\\' ? 2 : 1
      out += src.slice(i, j + 1)
      i = j + 1
    } else if (c === '/' && next === '/') {
      while (i < src.length && src[i] !== '\n') i++
    } else if (c === '/' && next === '*') {
      const end = src.indexOf('*/', i + 2)
      i = end === -1 ? src.length : end + 2
    } else {
      out += c
      i++
    }
  }
  return out
}

/** Drop commas that sit outside strings and are followed only by whitespace and a closing } or ]. */
function stripTrailingCommas(src: string): string {
  let out = ''
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (c === '"') {
      let j = i + 1
      while (j < src.length && src[j] !== '"') j += src[j] === '\\' ? 2 : 1
      out += src.slice(i, j + 1)
      i = j + 1
    } else if (c === ',' && /^\s*[}\]]/.test(src.slice(i + 1))) {
      i++
    } else {
      out += c
      i++
    }
  }
  return out
}

/** True when the content parses as JSON after comments and trailing commas are removed. */
function isJsonc(content: string): boolean {
  try {
    JSON.parse(stripTrailingCommas(stripJsonComments(content.replace(/^﻿/, ''))))
    return true
  } catch {
    return false
  }
}

/** True when the content opens with a `---` block that has every key. */
function hasFrontmatter(content: string, keys: string[]): boolean {
  const lines = content.replace(/^﻿/, '').trimStart().split(/\r?\n/)
  if (lines[0]?.trim() !== '---') return false
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---')
  if (end === -1) return false
  const block = lines.slice(1, end).join('\n')
  return keys.every((k) => new RegExp(`^${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:`, 'm').test(block))
}

/** True when the trimmed content is a single https URL. */
function isHttpsUrl(content: string): boolean {
  const s = content.trim()
  if (!s || /\s/.test(s)) return false
  try {
    return new URL(s).protocol === 'https:'
  } catch {
    return false
  }
}

/** Collapse runs of 3+ blank lines to 2 and cut lines over 2,000 characters, so regex checks stay fast. */
function capLines(text: string): string {
  const out: string[] = []
  let blanks = 0
  for (const line of text.split('\n')) {
    blanks = line.trim() === '' ? blanks + 1 : 0
    if (blanks <= 2) out.push(line.length > 2000 ? line.slice(0, 2000) : line)
  }
  return out.join('\n')
}

/**
 * Run one check against one item's (already scrubbed) content. True when it passes.
 * Never throws: a bad regex pattern is a failed check.
 */
export function runCheck(check: Check, content: string): boolean {
  const text = typeof content === 'string' ? content : ''
  const lower = text.toLowerCase()
  try {
    switch (check.type) {
      case 'minChars':
        return text.trim().length >= check.n
      case 'minLines':
        return text.split(/\r?\n/).filter((l) => l.trim() !== '').length >= check.n
      case 'includesAny':
        return check.terms.some((t) => lower.includes(t.toLowerCase()))
      case 'includesAll':
        return check.terms.every((t) => lower.includes(t.toLowerCase()))
      case 'regex':
        return new RegExp(check.pattern, check.flags ?? 'i').test(capLines(text))
      case 'countAtLeast': {
        const flags = check.flags ?? 'gim'
        const re = new RegExp(check.pattern, flags.includes('g') ? flags : flags + 'g')
        return (capLines(text).match(re) ?? []).length >= check.n
      }
      case 'json':
        return isJsonc(text)
      case 'frontmatter':
        return hasFrontmatter(text, check.keys)
      case 'https':
        return isHttpsUrl(text)
      default:
        return false
    }
  } catch {
    return false
  }
}

/**
 * Check a submission against a task. Unknown item ids are ignored (not stored). Items over
 * EVIDENCE_LIMITS.itemChars are cut, then scrubbed; any item over EVIDENCE_LIMITS.itemChars fails with a "send the relevant
 * part" message. A submission over EVIDENCE_LIMITS.items or totalChars fails as a whole.
 * A missing required item fails with "Missing: <label>". Optional items count only when
 * sent. Never throws on learner input.
 */
export function verify(task: ProTask, items: EvidenceItem[]): Verdict {
  const sent = Array.isArray(items) ? items : []
  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  const total = sent.reduce((n, it) => n + str(it?.content).length, 0)
  if (sent.length > EVIDENCE_LIMITS.items || total > EVIDENCE_LIMITS.totalChars) {
    const message =
      sent.length > EVIDENCE_LIMITS.items
        ? `Too many items (${sent.length}). Send at most ${EVIDENCE_LIMITS.items} per submission.`
        : `Submission too large (${total} characters). Send at most ${EVIDENCE_LIMITS.totalChars.toLocaleString('en-US')} in total, and only the relevant parts.`
    return { passed: false, results: [{ evidenceId: '*', ok: false, message }], items: [], redactions: 0 }
  }

  const byId = new Map<string, EvidenceItem>()
  for (const it of sent) if (it && typeof it.id === 'string') byId.set(it.id, it)

  let redactions = 0
  const stored: EvidenceItem[] = []
  const results: CheckResult[] = []
  let requiredCount = 0
  let requiredOk = true

  for (const spec of task.evidence) {
    const item = byId.get(spec.id)
    const required = !spec.optional
    if (required) requiredCount++
    if (!item) {
      if (required) {
        requiredOk = false
        results.push({ evidenceId: spec.id, ok: false, message: `Missing: ${spec.label}` })
      }
      continue
    }
    // Truncate BEFORE scrubbing so the regexes never see more than itemChars; "too long" is judged on the original length.
    const rawContent = str(item.content)
    const body = scrubSecrets(rawContent.slice(0, EVIDENCE_LIMITS.itemChars))
    redactions += body.count
    const clean: EvidenceItem = { id: item.id, kind: item.kind, content: body.text }
    if (item.source !== undefined) {
      const src = scrubSecrets(str(item.source).slice(0, EVIDENCE_LIMITS.itemChars))
      redactions += src.count
      clean.source = src.text
    }
    if (rawContent.length > EVIDENCE_LIMITS.itemChars) {
      stored.push(clean)
      if (required) requiredOk = false
      results.push({
        evidenceId: spec.id,
        ok: false,
        message: `${spec.label}: too long (${rawContent.length.toLocaleString('en-US')} characters). Send only the relevant part (max ${EVIDENCE_LIMITS.itemChars.toLocaleString('en-US')}).`,
      })
      continue
    }
    stored.push(clean)
    if (item.kind !== spec.kind) {
      if (required) requiredOk = false
      results.push({ evidenceId: spec.id, ok: false, message: `${spec.label}: send this as kind '${spec.kind}'` })
    }
    for (const check of spec.checks) {
      const ok = runCheck(check, body.text)
      if (!ok && required) requiredOk = false
      results.push({ evidenceId: spec.id, ok, message: ok ? `${spec.label}: ok` : check.message })
    }
  }

  return { passed: requiredCount > 0 && requiredOk, results, items: stored, redactions }
}

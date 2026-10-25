import Link from 'next/link'

/**
 * The public MCP setup guide. No sign-in, no pro-level content: just the endpoint, the
 * manual bearer-token flow and the security rules. `origin` is passed in so the page and
 * its test can render the same markup.
 */
export default function McpDocs({ origin }: { origin: string }) {
  const endpoint = `${origin}/api/mcp`
  const metadata = `${origin}/.well-known/oauth-protected-resource`
  const snippet = `{
  "mcpServers": {
    "quest": {
      "type": "http",
      "url": "${endpoint}",
      "headers": { "Authorization": "Bearer YOUR_TOKEN" }
    }
  }
}`

  return (
    <main className="page" style={{ maxWidth: 820 }}>
      <span className="mono muted">Creative AI Agent Quest</span>
      <h1 style={{ fontSize: 'var(--text-3xl)', margin: '6px 0 var(--space-3)' }}>Connect your agent to Quest</h1>
      <p className="muted" style={{ marginBottom: 'var(--space-6)' }}>
        A signed-in learner can let their own AI coding agent read the pro track and send evidence over MCP. This page is the public setup guide: no sign-in is needed to read it.
      </p>

      <div className="stack" style={{ color: 'var(--color-ink-2)' }}>
        <section className="card stack-sm">
          <h2>The endpoint</h2>
          <p>
            Quest speaks MCP over HTTP at <code className="copybox__line">{endpoint}</code>. Authentication is a bearer token in the request header.
          </p>
          <p>
            Metadata for the resource: <a href={metadata}>{metadata}</a>
          </p>
        </section>

        <section className="card stack-sm">
          <h2>Manual setup</h2>
          <ol className="numlist">
            <li>
              Sign in to Quest, open the <Link href="/pro">pro track</Link>, and create a connection token. It is shown once, so copy it then.
            </li>
            <li>
              Put the token in your agent’s MCP settings as an <code>Authorization: Bearer …</code> header. Do not paste it into a chat, a screenshot or a file you commit.
            </li>
            <li>
              Start the agent and ask it to call <code>quest_whoami</code>. A working connection answers with the learner it belongs to.
            </li>
          </ol>
          <p>The shape of the config differs per tool; this is the common HTTP form:</p>
          <pre className="code">{snippet}</pre>
          <p className="muted">
            Replace <code>YOUR_TOKEN</code> with the token you copied. Keep the token in a user-level (global) config or an environment variable, never in a project file.
          </p>
        </section>

        <section className="card stack-sm">
          <h2>No OAuth sign-in</h2>
          <p>
            Quest does not run an OAuth authorization server. There is no consent screen, no client registration and no automatic token exchange.
          </p>
          <p>
            <b>If your client only supports OAuth, it cannot connect automatically.</b> Use the manual bearer-token flow above, or pick a client that lets you set a request header yourself.
          </p>
        </section>

        <section className="card stack-sm">
          <h2>Keep the token safe</h2>
          <ul className="numlist">
            <li>Treat the token like a password. Anyone who has it can act as you through the MCP tools.</li>
            <li>Quest keeps one connection token per learner. Creating a new one revokes the old token immediately, so update every agent or computer that uses it.</li>
            <li>If a token leaks, rotate it in Quest, then update every place that used the old one.</li>
            <li>Never commit it, paste it into a public issue, or include it in a screenshot.</li>
            <li>The agent should send only the evidence a level lists. Secrets are stripped before saving, but do not rely on that: never send keys, tokens or <code>.env</code> files.</li>
          </ul>
        </section>

        <p className="muted">
          <Link href="/">Back to the quest</Link> · <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms of use</Link>
        </p>
      </div>
    </main>
  )
}

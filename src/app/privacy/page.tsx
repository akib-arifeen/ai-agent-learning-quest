/** Plain-English privacy note — public (no sign-in), and the link Google's consent screen asks for. */
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy' }

export default function PrivacyPage() {
  return (
    <main className="page" style={{ maxWidth: 720 }}>
      <span className="mono muted">Creative AI Agent Quest</span>
      <h1 style={{ fontSize: 'var(--text-3xl)', margin: '6px 0 var(--space-5)' }}>Privacy</h1>
      <div className="stack" style={{ color: 'var(--color-ink-2)' }}>
        <p>
          Creative AI Agent Quest is a small, self-directed learning site. This note explains what it stores, why, who processes it, and how you can delete your
          account and data.
        </p>

        <div className="stack-sm">
          <p>
            <b>What is stored</b>
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'grid', gap: 'var(--space-2)' }}>
            <li>
              <b>Account identity:</b> your name, email and profile picture from Google, or what you typed. Password accounts store a scrypt password hash.
            </li>
            <li>
              <b>Sign-in and recovery records:</b> hashed one-time sign-in and recovery codes, hashed recovery tokens, expiry times and attempt counts.
            </li>
            <li>
              <b>Course profile:</b> the answers you give during onboarding — role, experience, goal, AI tool, computer, weekly time, and the times you finished
              or dismissed onboarding.
            </li>
            <li>
              <b>Quest record:</b> quest progress, ticked steps, notes, private reflections and check-ins, own twists, busy days, and activity timestamps used for
              streaks and the plan.
            </li>
            <li>
              <b>Uploads:</b> files you choose to upload. The bytes live in Vercel Blob; the filename, type, size, URL and owner id live in Postgres.
            </li>
            <li>
              <b>Spark chats:</b> messages you send, Spark’s replies, and the quest/profile context needed to answer you.
            </li>
            <li>
              <b>Pro track:</b> a hash of your MCP token and the evidence submissions your agent sends.
            </li>
            <li>
              <b>Security:</b> a security/session version on your account and our signed session cookie.
            </li>
          </ul>
        </div>

        <p>
          <b>Why we store it:</b> to run the course; save progress, streaks, badges and your plan; give optional Spark guidance when you ask; show your uploads and
          trophies; check pro-track evidence; and keep accounts and sessions secure.
        </p>

        <p>
          <b>Who processes it:</b> Vercel hosts the site and stores uploaded files in Vercel Blob; Neon hosts the Postgres database; Cloudflare Workers AI
          generates Spark’s replies, so your messages and the profile/quest context needed for a reply are sent to that model provider. Google receives sign-in
          data only when you choose Google sign-in. These providers process data on the site operator’s behalf. We do not sell your data, and there are no ads or
          trackers. The site operator can access the database for maintenance and security. There is no separate privileged learner-data dashboard or cheer inbox,
          and nothing is shared with another learner or another person by default. This service is not end-to-end encrypted.
        </p>

        <p>
          <b>Sign-in and password recovery:</b> Google sign-in sends Google the usual Google sign-in data. Passwords are stored only as scrypt hashes. One-time
          sign-in and recovery codes are stored hashed, expire after 10 minutes, are single-use, and are protected by attempt and rate limits. Password reset also
          signs out existing sessions for both the password identity and the verified-email identity for that address. Email delivery uses the SMTP provider
          configured by the site operator. If email delivery is not configured, self-service password recovery is unavailable and the UI says so.
        </p>

        <p>
          <b>Deleting your account and data:</b> self-service deletion is available on the{' '}
          <a href="/account">
            <b>Account &amp; data</b>
          </a>{' '}
          page. Password accounts confirm the current password; Google and emailed-code accounts type an explicit confirmation phrase. Deletion removes your
          profile, progress, notes and private reflections, uploads (Blob objects and their database index), Spark chats, evidence, MCP token, and password, OTP
          and recovery records. Existing sessions stop working. Copies you downloaded or shared, and copies other people kept, cannot be recalled. Provider
          backups may age out on the provider’s schedule, so deletion is not instantaneous everywhere.
        </p>

        <p>
          <b>If you cannot sign in:</b> open an issue at{' '}
          <a href="https://github.com/akib-arifeen/ai-agent-learning-quest/issues">github.com/akib-arifeen/ai-agent-learning-quest/issues</a> and describe the
          problem without including passwords, codes or other secrets.
        </p>
      </div>
    </main>
  )
}

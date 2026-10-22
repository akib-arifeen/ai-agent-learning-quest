/** Plain-English privacy note — public (no sign-in), and the link Google's consent screen asks for. */
export default function PrivacyPage() {
  return (
    <main className="page" style={{ maxWidth: 720 }}>
      <span className="mono muted">Creative AI Agent Quest</span>
      <h1 style={{ fontSize: 'var(--text-3xl)', margin: '6px 0 var(--space-5)' }}>Privacy</h1>
      <div className="stack" style={{ color: 'var(--color-ink-2)' }}>
        <p>This is a small learning site for a 10-quest course on building with AI agents. Here’s exactly what it keeps and why.</p>
        <p>
          <b>What we store:</b> your name, email and profile picture (from Google, or what you typed), your quest progress, notes, the files you
          upload, check-ins, and your chats with Spark, the AI coach.
        </p>
        <p>
          <b>Why:</b> to save your progress, show your streaks and badges, and let your mentor see how you’re doing so they can help. Your
          mentor can see your progress, uploads and chats with Spark.
        </p>
        <p>
          <b>Who else sees it:</b> no one else. We don’t sell or share your data, and there are no ads or trackers. Your messages to Spark are
          sent to an AI model to write its replies.
        </p>
        <p>
          <b>Sign-in:</b> if you use Google, we only receive your name, email and picture. Passwords are stored as one-way hashes, never as
          plain text.
        </p>
        <p>
          <b>Deleting your data:</b> ask your mentor, or email the address you signed up with, and everything is removed.
        </p>
      </div>
    </main>
  )
}

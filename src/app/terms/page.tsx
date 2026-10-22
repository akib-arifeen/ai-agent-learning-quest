/** Plain-English terms of use — public (no sign-in), and the link Google's consent screen asks for. */
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Terms of use' }

export default function TermsPage() {
  return (
    <main className="page" style={{ maxWidth: 720 }}>
      <span className="mono muted">Creative AI Agent Quest</span>
      <h1 style={{ fontSize: 'var(--text-3xl)', margin: '6px 0 var(--space-5)' }}>Terms of use</h1>
      <div className="stack" style={{ color: 'var(--color-ink-2)' }}>
        <p>Creative AI Agent Quest is a free learning site: 10 quests, an AI coach called Spark, and a way to track your progress. By using it you agree to these simple terms.</p>
        <p>
          <b>Be kind and honest.</b> Use the site for learning. Don’t upload anything illegal, hateful, or that isn’t yours to share, and don’t try to
          break, overload or misuse the site or the AI coach.
        </p>
        <p>
          <b>Your work stays yours.</b> Anything you make and upload remains your own. You let us store it so it can show up on your Trophies page and
          for your mentor.
        </p>
        <p>
          <b>Spark is an AI.</b> Its hints can be wrong — double-check anything important, especially commands that delete or change files. Always work
          on copies of your projects.
        </p>
        <p>
          <b>No guarantees.</b> The site is provided as-is, for free. It may change, go offline, or lose data, so keep your own copies of anything that
          matters.
        </p>
        <p>
          <b>Accounts.</b> You can stop using the site any time; ask your mentor to delete your account and data. Accounts that misuse the site may be
          removed.
        </p>
        <p>
          See also the <a href="/privacy">privacy note</a>.
        </p>
      </div>
    </main>
  )
}

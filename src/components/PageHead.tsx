/** The one header every top-level page uses: a title and a single line of context. */
export default function PageHead({ title, children }: { title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="pagehead">
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </header>
  )
}

/**
 * Plain text where `backtick` spans are commands: shown as code, and one click selects
 * the whole command so it's easy to copy. Tool data (src/lib/tools.ts) writes commands
 * this way.
 */
export default function Rich({ text }: { text: string }) {
  // One wrapping span: some parents (the mission list) are grids, and loose text + code
  // nodes would each become their own grid cell.
  return <span>{text.split('`').map((part, i) => (i % 2 ? <code key={i} className="cmd">{part}</code> : part))}</span>
}

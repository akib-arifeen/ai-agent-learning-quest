'use client'

import { motion, useInView, useReducedMotion } from 'motion/react'
import { useRef } from 'react'
import type { DiagramName } from '@/lib/quest'

/* The concept pictures. Each one is a small SVG that draws itself once when it scrolls into view. */

/** `on` flips true once in view (always true with reduced motion); `rm` skips the entrance so the final state shows at once. */
type T = { on: boolean; rm: boolean }
type Pt = [number, number]

const EASE = [0.22, 1, 0.36, 1] as const

/** A box that fades and slides in. */
function Pop({ t, delay, from = { opacity: 0, y: 8 }, children }: { t: T; delay: number; from?: { opacity: number; x?: number; y?: number }; children: React.ReactNode }) {
  return (
    <motion.g
      initial={t.rm ? false : from}
      animate={t.on ? { opacity: 1, x: 0, y: 0 } : from}
      transition={{ duration: t.rm ? 0 : 0.45, delay: t.rm ? 0 : delay, ease: EASE }}
    >
      {children}
    </motion.g>
  )
}

/** A rounded box with one or two lines of text (the second is muted). */
function Node({ x, y, w, h, a, b, tone }: { x: number; y: number; w: number; h: number; a: string; b?: string; tone?: boolean }) {
  const cx = x + w / 2
  return (
    <g>
      <rect className={`dg__node${tone ? ' dg__node--tone' : ''}`} x={x} y={y} width={w} height={h} rx={10} />
      <text className="dg__t dg__t--b" x={cx} y={b ? y + h / 2 - 2 : y + h / 2 + 4.5} textAnchor="middle">
        {a}
      </text>
      {b && (
        <text className="dg__t dg__t--m" x={cx} y={y + h / 2 + 13} textAnchor="middle">
          {b}
        </text>
      )}
    </g>
  )
}

/** A small pill tag. */
function Tag({ x, y, w, text }: { x: number; y: number; w: number; text: string }) {
  return (
    <g>
      <rect className="dg__tag" x={x} y={y} width={w} height={20} rx={10} />
      <text className="dg__t dg__t--tag" x={x + w / 2} y={y + 14} textAnchor="middle">
        {text}
      </text>
    </g>
  )
}

/** An arrow along a polyline that draws itself (pathLength 0 to 1), then pops its head. */
function Arrow({ t, pts, delay, alt }: { t: T; pts: Pt[]; delay: number; alt?: boolean }) {
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ')
  const [x1, y1] = pts[pts.length - 2]
  const [x2, y2] = pts[pts.length - 1]
  const deg = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI
  const dur = 0.5
  return (
    <g className={alt ? 'dg__arrow dg__arrow--alt' : 'dg__arrow'}>
      <motion.path
        d={d}
        initial={t.rm ? false : { pathLength: 0 }}
        animate={{ pathLength: t.on ? 1 : 0 }}
        transition={{ duration: t.rm ? 0 : dur, delay: t.rm ? 0 : delay, ease: EASE }}
      />
      <motion.path
        className="dg__head"
        d="M0 0 L-7 -4 L-7 4 Z"
        transform={`translate(${x2} ${y2}) rotate(${deg})`}
        initial={t.rm ? false : { opacity: 0 }}
        animate={{ opacity: t.on ? 1 : 0 }}
        transition={{ duration: t.rm ? 0 : 0.2, delay: t.rm ? 0 : delay + dur * 0.8 }}
      />
    </g>
  )
}

function Loop({ t }: { t: T }) {
  return (
    <>
      <Pop t={t} delay={0}>
        <Node x={20} y={28} w={100} h={40} a="You brief" tone />
      </Pop>
      <Pop t={t} delay={0.5}>
        <Node x={200} y={28} w={100} h={40} a="Agent plans" />
      </Pop>
      <Pop t={t} delay={1.0}>
        <Node x={200} y={112} w={100} h={40} a="Agent acts" />
      </Pop>
      <Pop t={t} delay={1.5}>
        <Node x={20} y={112} w={100} h={40} a="Agent checks" />
      </Pop>
      <Arrow t={t} pts={[[124, 48], [196, 48]]} delay={0.2} />
      <Arrow t={t} pts={[[250, 72], [250, 108]]} delay={0.7} />
      <Arrow t={t} pts={[[196, 132], [124, 132]]} delay={1.2} />
      <Arrow t={t} pts={[[40, 108], [40, 72]]} delay={1.7} alt />
      <Pop t={t} delay={2}>
        <text className="dg__t dg__t--b dg__t--alt" x={50} y={94}>
          You review
        </text>
      </Pop>
      {!t.rm && (
        <motion.circle
          className="dg__dot"
          r={5}
          initial={{ opacity: 0, cx: 124, cy: 48 }}
          animate={t.on ? { opacity: [0, 1, 1, 1, 1, 1, 0], cx: [124, 250, 250, 124, 40, 40, 40], cy: [48, 48, 132, 132, 132, 72, 72] } : undefined}
          transition={{ duration: 4, delay: 0.4, ease: 'linear', times: [0, 0.05, 0.33, 0.6, 0.72, 0.95, 1] }}
        />
      )}
    </>
  )
}

function Brief({ t }: { t: T }) {
  const cards = ['Goal', 'Context', 'Constraints', 'Done when']
  return (
    <>
      {cards.map((c, i) => (
        <Pop key={c} t={t} delay={i * 0.25} from={{ opacity: 0, x: -24 }}>
          <Node x={6} y={12 + i * 38} w={96} h={30} a={c} tone={i === 0} />
        </Pop>
      ))}
      <Pop t={t} delay={1.1} from={{ opacity: 0 }}>
        <path className="dg__funnel" d="M108 12 L184 74 L184 106 L108 158 Z" />
      </Pop>
      <Arrow t={t} pts={[[188, 90], [212, 90]]} delay={1.3} />
      <Pop t={t} delay={1.7}>
        <Node x={216} y={64} w={98} h={52} a="Your idea," b="built" tone />
      </Pop>
    </>
  )
}

function Context({ t }: { t: T }) {
  const items = ['The open folder', 'The files you add', 'This chat']
  return (
    <>
      <Pop t={t} delay={0} from={{ opacity: 0 }}>
        <rect className="dg__outer" x={4} y={4} width={312} height={172} rx={14} />
        <text className="dg__t dg__t--faint" x={160} y={24} textAnchor="middle">
          Everything else: guessed
        </text>
      </Pop>
      <Pop t={t} delay={0.4} from={{ opacity: 0, y: 0 }}>
        <rect className="dg__node dg__node--tone" x={40} y={36} width={240} height={130} rx={12} />
        <text className="dg__t dg__t--b" x={160} y={58} textAnchor="middle">
          What the agent sees
        </text>
      </Pop>
      {items.map((it, i) => (
        <Pop key={it} t={t} delay={0.8 + i * 0.3}>
          <rect className="dg__pill" x={64} y={70 + i * 30} width={192} height={24} rx={12} />
          <text className="dg__t" x={160} y={86 + i * 30} textAnchor="middle">
            {it}
          </text>
        </Pop>
      ))}
    </>
  )
}

function Mcp({ t }: { t: T }) {
  return (
    <>
      <Pop t={t} delay={0}>
        <Node x={100} y={4} w={120} h={30} a="Your agent" tone />
      </Pop>
      <Pop t={t} delay={0.3}>
        <Node x={90} y={112} w={140} h={32} a="Quest MCP server" />
      </Pop>
      <Arrow t={t} pts={[[110, 110], [110, 38]]} delay={0.5} alt />
      <Pop t={t} delay={0.9}>
        <text className="dg__t dg__t--mono" x={102} y={78} textAnchor="end">
          quest_get_task
        </text>
      </Pop>
      <Arrow t={t} pts={[[210, 38], [210, 108]]} delay={1.1} />
      <Pop t={t} delay={1.5}>
        <text className="dg__t dg__t--mono" x={220} y={54}>
          quest_submit_
        </text>
        <text className="dg__t dg__t--mono" x={220} y={68}>
          evidence
        </text>
        <Tag x={216} y={80} w={102} text="secrets removed" />
      </Pop>
      <Arrow t={t} pts={[[130, 148], [60, 186]]} delay={1.9} />
      <Arrow t={t} pts={[[160, 148], [160, 186]]} delay={2.1} />
      <Arrow t={t} pts={[[190, 148], [260, 186]]} delay={2.3} />
      <Pop t={t} delay={2.6}>
        <Node x={8} y={190} w={96} h={34} a="Checks" />
        <Node x={112} y={190} w={96} h={34} a="You + your" b="own notes" />
        <Node x={216} y={190} w={96} h={34} a="Spark" tone />
      </Pop>
    </>
  )
}

function Delegate({ t }: { t: T }) {
  return (
    <>
      <Pop t={t} delay={0}>
        <Node x={90} y={4} w={140} h={34} a="Lead session" tone />
      </Pop>
      <Arrow t={t} pts={[[120, 42], [78, 88]]} delay={0.4} />
      <Arrow t={t} pts={[[200, 42], [242, 88]]} delay={0.6} />
      <Pop t={t} delay={0.9}>
        <Node x={6} y={92} w={140} h={44} a="Scout" b="find files" />
        <Tag x={26} y={142} w={100} text="model: haiku" />
      </Pop>
      <Pop t={t} delay={1.1}>
        <Node x={174} y={92} w={140} h={44} a="Worker" b="small edit" />
        <Tag x={190} y={142} w={108} text="model: sonnet" />
      </Pop>
      <Arrow t={t} pts={[[28, 90], [28, 56], [86, 22]]} delay={1.6} alt />
      <Arrow t={t} pts={[[292, 90], [292, 56], [234, 22]]} delay={1.8} alt />
      <Pop t={t} delay={2.2}>
        <text className="dg__t dg__t--alt" x={160} y={72} textAnchor="middle">
          results
        </text>
      </Pop>
    </>
  )
}

function Team({ t }: { t: T }) {
  return (
    <>
      <Pop t={t} delay={0}>
        <Node x={80} y={4} w={160} h={42} a="Lead" b="plan, specs, final check" tone />
      </Pop>
      <Arrow t={t} pts={[[120, 50], [48, 76]]} delay={0.4} />
      <Arrow t={t} pts={[[160, 50], [160, 76]]} delay={0.5} />
      <Arrow t={t} pts={[[200, 50], [272, 76]]} delay={0.6} />
      <Pop t={t} delay={0.9}>
        <Node x={4} y={80} w={88} h={36} a="Worker 1" b="file A" />
        <Node x={116} y={80} w={88} h={36} a="Worker 2" b="file B" />
        <Node x={228} y={80} w={88} h={36} a="Worker 3" b="file C" />
      </Pop>
      <Arrow t={t} pts={[[48, 120], [110, 136]]} delay={1.4} />
      <Arrow t={t} pts={[[160, 120], [160, 136]]} delay={1.5} />
      <Arrow t={t} pts={[[272, 120], [210, 136]]} delay={1.6} />
      <Pop t={t} delay={1.9}>
        <Node x={80} y={140} w={160} h={38} a="Reviewer" b="plants bugs, runs tests" />
      </Pop>
      <Arrow t={t} pts={[[244, 159], [304, 159], [304, 25], [244, 25]]} delay={2.4} alt />
    </>
  )
}

const PIECES: Record<DiagramName, { C: (p: { t: T }) => React.JSX.Element; h: number; label: string; caption: string }> = {
  loop: {
    C: Loop,
    h: 180,
    label: 'A loop: you brief the agent, the agent plans, acts and checks, then you review and brief again.',
    caption: 'The loop you will repeat: brief, build, check, review.',
  },
  brief: {
    C: Brief,
    h: 170,
    label: 'Four parts of a brief, Goal, Context, Constraints and Done when, flow into a funnel that ends at your idea, built.',
    caption: 'A good brief has four parts. Together they point the agent at your idea.',
  },
  context: {
    C: Context,
    h: 180,
    label: 'The agent only sees the open folder, the files you add and this chat. Everything else it has to guess.',
    caption: 'The agent only knows what is in its window. Anything else is a guess.',
  },
  mcp: {
    C: Mcp,
    h: 232,
    label:
      'Your agent calls quest_get_task on the Quest MCP server and sends evidence with quest_submit_evidence, with secrets removed first. The server passes results to checks, you and your own notes, and Spark when you ask.',
    caption: 'Your agent asks for a task and sends evidence. The server checks it and shows the result to you; Spark sees it only when you ask.',
  },
  delegate: {
    C: Delegate,
    h: 180,
    label: 'A lead session hands small jobs to a scout on a cheap haiku model and a worker on a sonnet model, and they send results back.',
    caption: 'Helpers run on cheaper models and report back. Every helper session spends tokens too, so delegate work that stands alone.',
  },
  team: {
    C: Team,
    h: 184,
    label: 'A lead plans and writes specs, two or three workers each edit separate files, a reviewer plants bugs and runs tests, then it goes back to the lead.',
    caption: 'The lead plans, workers build on separate files, a reviewer tries to break it, and the lead signs off.',
  },
}

/** One animated concept diagram with an accessible name and a visible caption. */
export default function Diagram({ name, caption, compact }: { name: DiagramName; caption?: string; compact?: boolean }) {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.35 })
  const reduced = !!useReducedMotion()
  const t: T = { on: reduced || inView, rm: reduced }
  const { C, h, label, caption: cap } = PIECES[name]
  return (
    <figure ref={ref} className={`dg${compact ? ' dg--compact' : ''}`}>
      <svg className="dg__svg" viewBox={`0 0 320 ${h}`} role="img" aria-label={label}>
        <C t={t} />
      </svg>
      <figcaption>{caption ?? cap}</figcaption>
    </figure>
  )
}

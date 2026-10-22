'use client'

import { motion, useAnimate, useReducedMotion, useSpring } from 'motion/react'
import { useEffect, useState } from 'react'

export type Mood = 'idle' | 'happy' | 'think' | 'wow' | 'peek' | 'hype' | 'wave'

/**
 * Spark — the quest's one character. A pear-yellow blob with a sparkle. It blinks, bobs
 * and twinkles at rest; with `follow` its eyes track the cursor (or finger) and it leans
 * toward you, glancing around on its own when nobody's moving; with `playful` it wiggles
 * on hover and jumps for joy when tapped. `hype`/`wave` = sparkly eyes and a big open smile;
 * `peek` squeezes its eyes shut (password fields!).
 * Hand-built SVG, so it scales from the 28px app-bar mark to the full-screen takeover.
 */
export default function Spark({
  size = 64,
  mood = 'idle',
  bob = true,
  follow = false,
  playful = false,
  tilt = -10,
}: {
  size?: number
  mood?: Mood
  bob?: boolean
  follow?: boolean
  playful?: boolean
  /** Resting head tilt in degrees — a little cock of the head reads as curious and playful. */
  tilt?: number
}) {
  const reduce = useReducedMotion()
  const [scope, animate] = useAnimate()
  const [joy, setJoy] = useState(false)
  // Gaze (in SVG units) and lean (degrees), sprung so they glide rather than snap.
  const gx = useSpring(0, { stiffness: 260, damping: 22 })
  const gy = useSpring(0, { stiffness: 260, damping: 22 })
  const lean = useSpring(tilt, { stiffness: 160, damping: 16 })

  // Follow the pointer; when it's been still a while, glance around like it's curious.
  useEffect(() => {
    if (!follow || reduce) return
    let raf = 0
    let last = Date.now()
    const look = (x: number, y: number) => {
      const r = (scope.current as SVGSVGElement | null)?.getBoundingClientRect()
      if (!r) return
      const dx = x - (r.left + r.width / 2)
      const dy = y - (r.top + r.height * 0.48)
      const d = Math.hypot(dx, dy) || 1
      const reach = Math.min(1, d / 220)
      gx.set((dx / d) * 3.2 * reach)
      gy.set((dy / d) * 2.6 * reach)
      lean.set(tilt + Math.max(-9, Math.min(9, dx / 50)))
    }
    const onMove = (e: PointerEvent) => {
      last = Date.now()
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => look(e.clientX, e.clientY))
    }
    const glance = setInterval(() => {
      if (Date.now() - last < 2800) return
      gx.set((Math.random() - 0.5) * 5)
      gy.set((Math.random() - 0.5) * 3)
      lean.set(tilt + (Math.random() - 0.5) * 8)
    }, 2600)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerdown', onMove)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onMove)
      cancelAnimationFrame(raf)
      clearInterval(glance)
    }
  }, [follow, reduce, gx, gy, lean, scope, tilt])

  // Tap: a little jump-and-spin for joy, happy face for a moment.
  const cheer = () => {
    if (!playful) return
    setJoy(true)
    setTimeout(() => setJoy(false), 1300)
    if (!reduce) animate(scope.current, { y: [0, -size * 0.28, 0], rotate: [0, -12, 12, 0], scaleY: [1, 1.08, 0.9, 1] }, { duration: 0.65, ease: 'easeOut' })
  }
  const wiggle = () => {
    if (playful && !reduce) animate(scope.current, { rotate: [0, -7, 6, -3, 0] }, { duration: 0.5 })
  }

  const face: Mood = joy ? 'hype' : mood
  const eyeR = face === 'wow' ? 3.8 : 3.2
  const eyeRy = face === 'wow' ? 4.8 : 4.2
  const sparkly = face === 'hype' || face === 'wave'
  const fired = face === 'hype' || face === 'happy'

  return (
    <motion.span
      style={{ display: 'inline-block', lineHeight: 0, flex: 'none' }}
      // Bob with a little side-to-side sway, like it's humming to itself.
      animate={bob && !reduce ? { y: [0, -3, 0], rotate: [-3, 3, -3] } : undefined}
      transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <motion.svg
        ref={scope}
        width={size}
        height={size}
        viewBox="0 0 64 64"
        aria-hidden
        style={{ overflow: 'visible', cursor: playful ? 'pointer' : undefined, touchAction: 'manipulation' }}
        onPointerEnter={wiggle}
        onClick={cheer}
        whileHover={playful && !reduce ? { scale: 1.06 } : undefined}
        whileTap={playful && !reduce ? { scale: 0.92 } : undefined}
      >
        <motion.g style={{ rotate: lean, transformBox: 'fill-box', transformOrigin: '50% 92%' }}>
          {/* body */}
          <path d="M32 10c11 0 22 8.5 22 22.5S44 56 32 56 10 46.5 10 32.5 21 10 32 10Z" fill="var(--color-accent)" stroke="var(--color-accent-deep)" strokeWidth="2" />
          {/* sparkle */}
          <motion.path
            d="M51 4c.6 3.6 1.9 4.9 5.5 5.5-3.6.6-4.9 1.9-5.5 5.5-.6-3.6-1.9-4.9-5.5-5.5 3.6-.6 4.9-1.9 5.5-5.5Z"
            fill="var(--color-accent-3)"
            animate={reduce ? undefined : { rotate: [0, 18, 0], scale: fired || face === 'wow' || sparkly ? [1, 1.5, 1] : [1, 1.12, 1] }}
            transition={{ duration: fired || sparkly ? 0.8 : 2.4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          />
          {/* cheeks — rosier when happy */}
          <circle cx="19.5" cy="38" r="3.4" fill="var(--color-accent-3)" opacity={fired || sparkly ? 0.6 : 0.35} />
          <circle cx="44.5" cy="38" r="3.4" fill="var(--color-accent-3)" opacity={fired || sparkly ? 0.6 : 0.35} />

          {/* eyes — the whole face shifts toward where it's looking */}
          <motion.g style={{ x: gx, y: gy }}>
            {face === 'happy' ? (
              <g stroke="var(--color-ink)" strokeWidth="2.6" strokeLinecap="round" fill="none">
                <path d="M21.5 32.5q3.5-4.6 7 0" />
                <path d="M35.5 32.5q3.5-4.6 7 0" />
              </g>
            ) : face === 'peek' ? (
              // Eyes squeezed shut — "I'm not looking, promise!"
              <g stroke="var(--color-ink)" strokeWidth="2.6" strokeLinecap="round" fill="none">
                <path d="M21.5 30.5q3.5 3 7 0" />
                <path d="M35.5 30.5q3.5 3 7 0" />
              </g>
            ) : sparkly ? (
              // Big shiny eyes with two highlights — wide awake and ready to go.
              <g>
                <ellipse cx="25" cy="31" rx="4.4" ry="5.4" fill="var(--color-ink)" />
                <ellipse cx="39" cy="31" rx="4.4" ry="5.4" fill="var(--color-ink)" />
                <circle cx="26.6" cy="28.8" r="1.8" fill="var(--color-card)" />
                <circle cx="40.6" cy="28.8" r="1.8" fill="var(--color-card)" />
                <circle cx="23.6" cy="33.4" r="0.9" fill="var(--color-card)" />
                <circle cx="37.6" cy="33.4" r="0.9" fill="var(--color-card)" />
              </g>
            ) : (
              <motion.g
                animate={reduce ? undefined : { scaleY: [1, 1, 0.12, 1, 1] }}
                transition={{ duration: 4.6, repeat: Infinity, times: [0, 0.9, 0.93, 0.96, 1] }}
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              >
                <ellipse cx={face === 'think' ? 27 : 25} cy={face === 'think' ? 28.5 : 31} rx={eyeR} ry={eyeRy} fill="var(--color-ink)" />
                <ellipse cx={face === 'think' ? 41 : 39} cy={face === 'think' ? 28.5 : 31} rx={eyeR} ry={eyeRy} fill="var(--color-ink)" />
                <circle cx={face === 'think' ? 28.2 : 26.2} cy={face === 'think' ? 26.9 : 29.4} r="1.1" fill="var(--color-card)" />
                <circle cx={face === 'think' ? 42.2 : 40.2} cy={face === 'think' ? 26.9 : 29.4} r="1.1" fill="var(--color-card)" />
              </motion.g>
            )}
            {/* mouth */}
            {face === 'wow' ? (
              <ellipse cx="32" cy="42.5" rx="2.6" ry="3" fill="var(--color-ink)" />
            ) : face === 'hype' || face === 'wave' || face === 'happy' ? (
              // A round open smile with a tongue — excited, never smug.
              <g>
                {/* a small rounded bowl: gently curved top, round bottom, no sharp corners */}
                <path
                  d={face === 'hype' ? 'M27 40Q32 41.8 37 40Q36.4 46.6 32 46.6Q27.6 46.6 27 40Z' : 'M28 40.4Q32 41.8 36 40.4Q35.5 45.6 32 45.6Q28.5 45.6 28 40.4Z'}
                  fill="var(--color-ink)"
                  stroke="var(--color-ink)"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <ellipse cx="32" cy={face === 'hype' ? 45 : 44.2} rx={face === 'hype' ? 2.6 : 2.1} ry="1.2" fill="var(--color-accent-3)" />
              </g>
            ) : (
              <path
                d={face === 'think' ? 'M29.5 42.5h5' : face === 'peek' ? 'M29 42q3 2.4 6 0' : 'M28.5 41q3.5 3.4 7 0'}
                stroke="var(--color-ink)"
                strokeWidth="2.4"
                strokeLinecap="round"
                fill="none"
              />
            )}
          </motion.g>

        </motion.g>
      </motion.svg>
    </motion.span>
  )
}

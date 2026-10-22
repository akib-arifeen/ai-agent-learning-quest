'use client'

import { motion } from 'motion/react'

/**
 * Re-mounts on every navigation, so each page arrives with the same short fade-and-rise
 * — moving between Map, Plan, Trophies and Guide feels like one continuous app.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.div>
  )
}

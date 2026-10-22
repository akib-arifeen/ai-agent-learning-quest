'use client'

import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { useEffect } from 'react'

/**
 * Bottom sheet on phones, centred dialog on larger screens. Escape and the backdrop
 * close it; page scroll is locked while it's open.
 */
export default function Modal({
  open,
  onClose,
  title,
  sub,
  children,
}: {
  open: boolean
  onClose: () => void
  title: React.ReactNode
  sub?: React.ReactNode
  children: React.ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <div className="modal-wrap">
            <motion.div
              className="modal"
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, y: 40, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, transition: { duration: 0.18 } }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            >
              <div className="grabber" />
              <div className="modal__head">
                <div>
                  <h2>{title}</h2>
                  {sub && <p>{sub}</p>}
                </div>
                <button className="iconbtn modal__x" onClick={onClose} aria-label="Close">
                  <X size={20} />
                </button>
              </div>
              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

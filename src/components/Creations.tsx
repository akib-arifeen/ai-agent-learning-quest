'use client'

import { AnimatePresence, motion } from 'motion/react'
import { FileArchive, FileCode, FileText, Film, Music, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { type QuestFile, XP } from '@/lib/game'
import { confetti } from './Celebrate'
import { useQuest } from './QuestProvider'

const MAX_MB = 50

/** Human file size. */
export const fmtSize = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`)

/** A thumbnail for any file: the image/video itself, or an icon for everything else. */
export function FileThumb({ f }: { f: QuestFile }) {
  if (f.content_type.startsWith('image/')) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={f.url} alt={f.name} loading="lazy" />
  }
  if (f.content_type.startsWith('video/')) return <video src={`${f.url}#t=0.1`} muted playsInline preload="metadata" />
  const Icon = f.content_type.startsWith('audio/') ? Music : /zip/.test(f.content_type) ? FileArchive : /html|javascript|json|python|text\/x/.test(f.content_type) || /\.(py|js|html|gd|luau|lua|jsx|tsx|css)$/i.test(f.name) ? FileCode : f.content_type.startsWith('video') ? Film : FileText
  return (
    <span className="thumb__icon">
      <Icon size={30} />
    </span>
  )
}

/**
 * "Your creations" — drop in what you made for this quest (screenshots, recordings,
 * HTML, .blend, anything up to 50 MB). Files go straight to Blob storage, then get
 * recorded against the quest. The first upload on a quest earns the showcase XP.
 */
export default function Creations({ taskId, compact = false }: { taskId: string; compact?: boolean }) {
  const { state, error, refresh } = useQuest()
  const files = state.files.filter((f) => f.task_id === taskId)
  const [busy, setBusy] = useState<{ name: string; pct: number } | null>(null)
  const [over, setOver] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  async function add(list: FileList | null) {
    const picked = [...(list || [])]
    if (!picked.length) return
    const { upload } = await import('@vercel/blob/client')
    for (const file of picked) {
      if (file.size > MAX_MB * 1024 * 1024) {
        error(`${file.name} is over ${MAX_MB} MB — try a shorter recording or a zip.`)
        continue
      }
      setBusy({ name: file.name, pct: 0 })
      try {
        const safe = file.name.replace(/[^\w.-]+/g, '-').slice(-80) || 'file'
        const blob = await upload(`quests/${state.user.id}/${taskId}/${safe}`, file, {
          access: 'public',
          handleUploadUrl: '/api/files',
          clientPayload: JSON.stringify({ taskId }),
          contentType: file.type || 'application/octet-stream',
          multipart: file.size > 8 * 1024 * 1024,
          onUploadProgress: (p) => setBusy({ name: file.name, pct: p.percentage }),
        })
        const res = await fetch('/api/files', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-quest-user': state.user.id }, body: JSON.stringify({ taskId, url: blob.url, name: file.name }) })
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Couldn’t save that file.')
        confetti(false, { x: 0.5, y: 0.5 })
      } catch (e) {
        error((e as Error).message?.includes('content type') ? `${file.name}: that file type isn’t supported — try zipping it.` : (e as Error).message || 'Upload failed.')
      }
    }
    setBusy(null)
    await refresh()
  }

  async function remove(f: QuestFile) {
    if (!window.confirm(`Delete “${f.name}”?`)) return
    const res = await fetch(`/api/files?id=${f.id}`, { method: 'DELETE', headers: { 'x-quest-user': state.user.id } })
    if (!res.ok) error('Couldn’t delete that file.')
    await refresh()
  }

  return (
    <section className={compact ? 'stack-sm' : 'card stack-sm'}>
      {!compact && (
        <div className="row">
          <h2 style={{ fontSize: 'var(--text-lg)' }}>Your creations</h2>
          <span className="spacer" />
          {files.length === 0 && <span className="chip chip--pear">+{XP.upload} XP</span>}
        </div>
      )}
      <button
        type="button"
        className={`drop ${over ? 'is-over' : ''}`}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          add(e.dataTransfer.files)
        }}
        disabled={!!busy}
      >
        {busy ? (
          <span className="drop__busy">
            <span>
              Uploading {busy.name.length > 28 ? `${busy.name.slice(0, 26)}…` : busy.name} · {Math.round(busy.pct)}%
            </span>
            <span className="progressbar" style={{ width: '100%' }}>
              <span style={{ transform: `scaleX(${busy.pct / 100})`, background: 'var(--color-accent-deep)' }} />
            </span>
          </span>
        ) : (
          <>
            <Upload size={20} />
            <span className="drop__text">
              <span>{files.length ? 'Add another file' : 'Upload what you made'}</span>
              <small className="muted">Screenshots, recordings, .html, .blend, zips · up to {MAX_MB} MB</small>
            </span>
          </>
        )}
      </button>
      <input ref={input} type="file" multiple hidden onChange={(e) => add(e.target.files)} />
      {files.length > 0 && (
        <div className="thumbs-grid">
          <AnimatePresence>
            {files.map((f) => (
              <motion.div key={f.id} className="thumb" layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                <a href={f.url} target="_blank" rel="noreferrer" className="thumb__media" title={f.name}>
                  <FileThumb f={f} />
                </a>
                <span className="thumb__meta">
                  <span className="thumb__name">{f.name}</span>
                  <button className="iconbtn" style={{ width: 30, height: 30 }} onClick={() => remove(f)} aria-label={`Delete ${f.name}`}>
                    <Trash2 size={15} />
                  </button>
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  )
}

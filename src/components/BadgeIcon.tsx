import {
  Camera,
  Flame,
  FolderOpen,
  Lightbulb,
  Medal,
  MessageCircle,
  Mountain,
  NotebookPen,
  Rocket,
  RotateCcw,
  Shuffle,
  Sparkles,
  Sunrise,
  Tent,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'

// Badge ids in game.ts name their icon; this maps the name to the glyph.
const ICONS: Record<string, LucideIcon> = {
  tent: Tent,
  sparkles: Sparkles,
  message: MessageCircle,
  camera: Camera,
  flame: Flame,
  zap: Zap,
  shuffle: Shuffle,
  notebook: NotebookPen,
  lightbulb: Lightbulb,
  sunrise: Sunrise,
  rotate: RotateCcw,
  medal: Medal,
  folder: FolderOpen,
  wrench: Wrench,
  mountain: Mountain,
  rocket: Rocket,
}

/** The icon for a badge (falls back to a sparkle). */
export default function BadgeIcon({ name, size = 22 }: { name: string; size?: number }) {
  const I = ICONS[name] || Sparkles
  return <I size={size} strokeWidth={2.2} aria-hidden />
}

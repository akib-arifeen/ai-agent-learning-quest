import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Creative AI Agent Quest: learn to build anything with an AI agent'

const INK = '#1B1F24'
const chips = ['Free to start', 'Any background', 'Any AI tool']

/** The social card: headline on the left, Spark (built from divs) on the right. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#F7F4EA', color: INK, padding: 72 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
          <div style={{ display: 'flex', fontSize: 24, letterSpacing: 4, fontFamily: 'monospace', color: '#5A6068' }}>CREATIVE AI AGENT QUEST</div>
          <div style={{ display: 'flex', fontSize: 72, fontWeight: 800, lineHeight: 1.05, marginTop: 24, maxWidth: 700 }}>Learn to build anything with an AI agent.</div>
          <div style={{ display: 'flex', fontSize: 28, color: '#3A4048', marginTop: 28, maxWidth: 700 }}>10 quests · an AI coach · works with Kilo Code, OpenCode, Claude Code and more</div>
          <div style={{ display: 'flex', marginTop: 36 }}>
            {chips.map((c) => (
              <div key={c} style={{ display: 'flex', fontSize: 24, fontWeight: 700, padding: '10px 24px', borderRadius: 999, background: '#FFFFFF', border: '2px solid #D9D3BF', marginRight: 16 }}>
                {c}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', width: 300, alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', position: 'relative', width: 260, height: 260, borderRadius: 130, background: '#F5CC1A', border: '8px solid #D9A90F' }}>
            <div style={{ display: 'flex', position: 'absolute', left: 62, top: 82, width: 30, height: 40, borderRadius: 20, background: INK }}>
              <div style={{ display: 'flex', width: 10, height: 10, borderRadius: 5, background: '#FFFFFF', marginLeft: 6, marginTop: 6 }} />
            </div>
            <div style={{ display: 'flex', position: 'absolute', left: 148, top: 82, width: 30, height: 40, borderRadius: 20, background: INK }}>
              <div style={{ display: 'flex', width: 10, height: 10, borderRadius: 5, background: '#FFFFFF', marginLeft: 6, marginTop: 6 }} />
            </div>
            <div style={{ display: 'flex', position: 'absolute', left: 28, top: 130, width: 38, height: 24, borderRadius: 12, background: '#F29AA8' }} />
            <div style={{ display: 'flex', position: 'absolute', left: 174, top: 130, width: 38, height: 24, borderRadius: 12, background: '#F29AA8' }} />
            <div style={{ display: 'flex', position: 'absolute', left: 100, top: 138, width: 44, height: 22, borderBottomLeftRadius: 44, borderBottomRightRadius: 44, borderBottom: `6px solid ${INK}` }} />
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}

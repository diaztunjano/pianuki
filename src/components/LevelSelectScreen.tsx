import { useState } from 'react'
import { LEVEL_CONFIGS } from '../game/waveConfig'
import { useBoundStore } from '../stores'
import { SettingsPanel } from './SettingsPanel'
import { playWaveStart } from '../audio/sfxManager'

/**
 * Node positions in a zigzag/path-map layout — like Mario World.
 * x is CSS percentage string; y is px within the scrollable container.
 */
const NODE_POSITIONS = [
  { x: '25%', y: 80 },   // Level 0 — left
  { x: '50%', y: 180 },  // Level 1 — center
  { x: '75%', y: 280 },  // Level 2 — right
  { x: '50%', y: 380 },  // Level 3 — center
  { x: '25%', y: 480 },  // Level 4 — left
]

/** Width/height of each circular node in px */
const NODE_RADIUS = 40

/**
 * Determine if a level is unlocked.
 * Level 0 is always unlocked.
 * Level i requires progress.levels[i-1].stars >= 1.
 */
function isUnlocked(
  levelIndex: number,
  levels: Record<number, { stars: number }>,
): boolean {
  if (levelIndex === 0) return true
  const prev = levels[levelIndex - 1]
  return prev != null && prev.stars >= 1
}

/** Render filled/empty stars for a completed level. */
function StarRow({ stars }: { stars: number }) {
  return (
    <div className="flex gap-0.5 justify-center mt-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="text-xs leading-none"
          style={{ color: i < stars ? '#facc15' : 'rgba(255,255,255,0.2)' }}
        >
          ★
        </span>
      ))}
    </div>
  )
}

/**
 * LevelSelectScreen — path/map style level select.
 *
 * Replaces the inline stub in AppShell.tsx (Plan 02).
 */
export function LevelSelectScreen() {
  const progress = useBoundStore((s) => s.progress)
  const startLevel = useBoundStore((s) => s.startLevel)
  const navigateTo = useBoundStore((s) => s.navigateTo)
  const [showSettings, setShowSettings] = useState(false)

  const levels = progress.levels

  // Container height accommodates all nodes + padding
  const containerHeight = 580

  // Build SVG quadratic bezier path connecting all node centers.
  // We need to convert percentage x to an assumed width (we use 320px as reference
  // since SVG has a fixed viewBox). Percentages for SVG:
  //   25% → 80px, 50% → 160px, 75% → 240px  (at viewBox width 320)
  function xPctToPx(pct: string): number {
    const num = parseFloat(pct) / 100
    return Math.round(num * 320)
  }

  // Build a smooth polyline through all node centers using quadratic beziers
  let pathD = ''
  for (let i = 0; i < NODE_POSITIONS.length; i++) {
    const pos = NODE_POSITIONS[i]
    const px = xPctToPx(pos.x)
    const py = pos.y
    if (i === 0) {
      pathD += `M ${px} ${py}`
    } else {
      const prev = NODE_POSITIONS[i - 1]
      const prevPx = xPctToPx(prev.x)
      const prevPy = prev.y
      // Midpoint for control point
      const cpx = (prevPx + px) / 2
      const cpy = (prevPy + py) / 2
      pathD += ` Q ${cpx} ${cpy} ${px} ${py}`
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-950 text-white overflow-hidden">

      {/* Top bar: Settings | Title | Stats */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
        {/* Settings button */}
        <button
          className="px-3 py-1.5 text-sm text-white/50 hover:text-white/80 transition-colors rounded-lg hover:bg-white/5"
          onClick={() => setShowSettings(true)}
          aria-label="Settings"
        >
          ⚙
        </button>

        <h1 className="text-xl font-black tracking-widest">PIANUKI</h1>

        <button
          className="px-3 py-1.5 text-sm text-white/50 hover:text-white/80 transition-colors rounded-lg hover:bg-white/5"
          onClick={() => navigateTo('stats')}
        >
          Stats
        </button>
      </div>

      {/* Scrollable map area */}
      <div className="flex-1 overflow-y-auto">
        <div
          className="relative w-full mx-auto"
          style={{ height: containerHeight, maxWidth: 400 }}
        >
          {/* SVG connecting path */}
          <svg
            className="absolute inset-0 w-full"
            viewBox={`0 0 320 ${containerHeight}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ height: containerHeight, pointerEvents: 'none' }}
          >
            <path
              d={pathD}
              stroke="#ffffff15"
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
            />
          </svg>

          {/* Level nodes */}
          {LEVEL_CONFIGS.map((levelCfg, idx) => {
            const pos = NODE_POSITIONS[idx]
            const levelRecord = levels[idx]
            const unlocked = isUnlocked(idx, levels)
            const completed = levelRecord?.completed ?? false
            const stars = levelRecord?.stars ?? 0
            const bestAccuracy = levelRecord?.bestAccuracy ?? 0

            return (
              <div
                key={idx}
                className="absolute flex flex-col items-center"
                style={{
                  left: pos.x,
                  top: pos.y,
                  transform: 'translate(-50%, -50%)',
                  opacity: unlocked ? 1 : 0.5,
                }}
              >
                {/* Circular node button */}
                <button
                  disabled={!unlocked}
                  onClick={() => { if (unlocked) { playWaveStart(); startLevel(idx) } }}
                  className={[
                    'rounded-full border-2 flex items-center justify-center transition-all',
                    'active:scale-95',
                    unlocked
                      ? 'border-white/30 bg-gray-800 hover:bg-gray-700 hover:border-white/50 cursor-pointer'
                      : 'border-white/10 bg-gray-900 cursor-not-allowed',
                  ].join(' ')}
                  style={{ width: NODE_RADIUS * 2, height: NODE_RADIUS * 2 }}
                  aria-label={unlocked ? `Play ${levelCfg.name}` : `${levelCfg.name} (locked)`}
                >
                  {!unlocked ? (
                    <span className="text-lg">🔒</span>
                  ) : completed ? (
                    <span className="text-xl font-black text-green-400">
                      {idx + 1}
                    </span>
                  ) : (
                    <span className="text-xl font-black text-white/70">
                      {idx + 1}
                    </span>
                  )}
                </button>

                {/* Label below node */}
                <div className="mt-1 text-center" style={{ width: 90 }}>
                  <p className="text-xs font-semibold text-white/80 leading-tight">
                    {levelCfg.name}
                  </p>
                  {completed ? (
                    <>
                      <StarRow stars={stars} />
                      <p className="text-[10px] text-white/40 mt-0.5">
                        {bestAccuracy}%
                      </p>
                    </>
                  ) : (
                    <p className="text-[10px] text-white/40 mt-0.5">
                      {levelCfg.noteRangeLabel}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Settings panel modal — z-25 sits above game UI (z-20) */}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  )
}

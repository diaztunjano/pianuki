import { LEVEL_CONFIGS } from '../game/waveConfig'
import { useBoundStore } from '../stores'
import { playWaveStart } from '../audio/sfxManager'

/**
 * Format milliseconds into a human-readable duration string.
 * e.g. 75000 → "1m 15s", 45000 → "45s"
 */
function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

/**
 * Animated star display — 3 stars appear sequentially with 400ms stagger.
 * Earned stars are gold, unearned are dim.
 */
function AnimatedStars({ earned }: { earned: number }) {
  return (
    <div className="flex gap-3 justify-center my-2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="text-4xl"
          style={{
            color: i < earned ? '#facc15' : 'rgba(255,255,255,0.15)',
            display: 'inline-block',
            animationName: i < earned ? 'bounce' : 'none',
            animationDuration: '0.5s',
            animationDelay: `${i * 400}ms`,
            animationTimingFunction: 'ease-out',
            animationFillMode: 'both',
          }}
        >
          ★
        </span>
      ))}
    </div>
  )
}

/**
 * LevelSummaryOverlay — end-of-level results shown when gamePhase === 'level-complete'.
 *
 * Reads lastLevelResult from GameSlice and progress.levels from ProgressSlice
 * to compare against previous best. Rendered inside GameOverlay's wrapper.
 */
export function LevelSummaryOverlay() {
  const lastLevelResult = useBoundStore((s) => s.lastLevelResult)
  const progress = useBoundStore((s) => s.progress)
  const navigateTo = useBoundStore((s) => s.navigateTo)
  const startLevel = useBoundStore((s) => s.startLevel)

  // Guard: should not render without a result, but be safe
  if (!lastLevelResult) return null

  const { levelIndex, accuracy, avgReactionMs, durationMs } = lastLevelResult
  const levelCfg = LEVEL_CONFIGS[levelIndex]
  const levelName = levelCfg?.name ?? `Level ${levelIndex}`

  // Compute stars earned this run
  let starsEarned: 0 | 1 | 2 | 3 = 0
  if (accuracy >= 90) starsEarned = 3
  else if (accuracy >= 75) starsEarned = 2
  else if (accuracy >= 50) starsEarned = 1

  // Previous best from persisted progress
  const prevRecord = progress.levels[levelIndex]
  const hasPrev = prevRecord != null && prevRecord.playCount > 0
  const prevBestAccuracy = prevRecord?.bestAccuracy ?? 0
  const isNewBest = hasPrev && accuracy > prevBestAccuracy

  const cardClass =
    'flex flex-col items-center gap-4 rounded-2xl bg-gray-900/95 border border-white/10 px-10 py-8 text-white shadow-2xl backdrop-blur-sm w-full max-w-sm'

  const primaryBtnClass =
    'w-full rounded-xl bg-green-500/20 border border-green-400/30 px-6 py-3 text-base font-semibold text-green-300 hover:bg-green-500/30 active:scale-95 transition-all'

  const secondaryBtnClass =
    'w-full rounded-xl bg-white/5 border border-white/10 px-6 py-2.5 text-sm font-medium text-white/60 hover:bg-white/10 active:scale-95 transition-all'

  return (
    <div className={cardClass}>
      {/* Title */}
      <h1 className="text-3xl font-black tracking-widest text-green-400 text-center">
        LEVEL COMPLETE
      </h1>

      {/* Level name */}
      <p className="text-white/60 text-sm -mt-2">{levelName}</p>

      {/* Animated stars */}
      <AnimatedStars earned={starsEarned} />

      {/* Stats */}
      <div className="w-full space-y-2">
        {/* Accuracy — hero stat */}
        <div className="flex items-baseline justify-between border-b border-white/10 pb-2">
          <span className="text-sm text-white/50">Accuracy</span>
          <span className="text-2xl font-black">{accuracy}%</span>
        </div>

        {/* Previous best comparison */}
        {hasPrev && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/40">Previous best</span>
            <span className={isNewBest ? 'text-yellow-400 font-semibold' : 'text-white/40'}>
              {isNewBest ? `New best! (was ${prevBestAccuracy}%)` : `${prevBestAccuracy}%`}
            </span>
          </div>
        )}

        {/* Reaction time */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/40">Avg reaction time</span>
          <span className="text-white/70">
            {avgReactionMs > 0 ? `${avgReactionMs}ms` : '—'}
          </span>
        </div>

        {/* Duration */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/40">Duration</span>
          <span className="text-white/70">{formatDuration(durationMs)}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2 w-full mt-1">
        <button
          className={primaryBtnClass}
          onClick={() => navigateTo('levelSelect')}
        >
          Continue
        </button>
        <button
          className={secondaryBtnClass}
          onClick={() => {
            playWaveStart()
            startLevel(levelIndex)
          }}
        >
          Replay
        </button>
      </div>
    </div>
  )
}

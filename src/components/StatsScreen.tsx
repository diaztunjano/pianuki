import { useBoundStore } from '../stores'
import { LEVEL_CONFIGS } from '../game/waveConfig'

/**
 * Format milliseconds into a human-readable duration string.
 * Returns e.g. "5m", "1h 23m", "45s"
 */
function formatPlayTime(ms: number): string {
  if (ms <= 0) return '0m'
  const totalSec = Math.floor(ms / 1000)
  const hours = Math.floor(totalSec / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  const secs = totalSec % 60
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }
  if (mins > 0) return `${mins}m`
  return `${secs}s`
}

/**
 * Return a color for the accuracy bar based on value.
 */
function accuracyColor(accuracy: number): string {
  if (accuracy >= 75) return '#22c55e'  // green
  if (accuracy >= 50) return '#eab308'  // yellow
  return '#ef4444'                       // red
}

/**
 * StatsScreen — overall player stats page.
 *
 * Sections:
 *   1. Summary row: levels completed, total play time, overall accuracy
 *   2. Per-level accuracy bars (horizontal CSS bars)
 *   3. Most missed notes (top 5)
 *   4. Reset progress button
 *
 * Replaces the inline stub in AppShell.tsx (Plan 02).
 */
export function StatsScreen() {
  const progress = useBoundStore((s) => s.progress)
  const navigateTo = useBoundStore((s) => s.navigateTo)
  const resetProgress = useBoundStore((s) => s.resetProgress)

  // --- Summary calculations ---

  const completedLevels = Object.values(progress.levels).filter((r) => r.completed).length

  const completedRecords = Object.values(progress.levels).filter((r) => r.completed)
  const overallAccuracy =
    completedRecords.length > 0
      ? Math.round(
          completedRecords.reduce((sum, r) => sum + r.bestAccuracy, 0) / completedRecords.length,
        )
      : null

  // --- Most missed notes (top 5) ---

  const sortedMisses = Object.entries(progress.noteMissCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  // --- Reset handler ---

  function handleReset() {
    if (window.confirm('Reset all progress and stats? This cannot be undone.')) {
      resetProgress()
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/10 flex-shrink-0">
        <button
          className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/10 active:scale-95 transition-all"
          onClick={() => navigateTo('levelSelect')}
        >
          Back
        </button>
        <h1 className="text-2xl font-black tracking-widest">STATS</h1>
        {/* Spacer for centering title */}
        <div className="w-16" />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-8 max-w-lg mx-auto w-full">

        {/* 1. Summary row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col items-center gap-1 rounded-2xl bg-white/5 border border-white/10 p-4">
            <span className="text-2xl font-black text-white">{completedLevels}</span>
            <span className="text-xs text-white/50 text-center">Levels Completed</span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-2xl bg-white/5 border border-white/10 p-4">
            <span className="text-2xl font-black text-white">
              {formatPlayTime(progress.totalPlayTimeMs)}
            </span>
            <span className="text-xs text-white/50 text-center">Play Time</span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-2xl bg-white/5 border border-white/10 p-4">
            <span className="text-2xl font-black text-white">
              {overallAccuracy !== null ? `${overallAccuracy}%` : '—'}
            </span>
            <span className="text-xs text-white/50 text-center">Overall Accuracy</span>
          </div>
        </div>

        {/* 2. Per-level accuracy bars */}
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-white/70 tracking-wider uppercase mb-3">
            Level Accuracy
          </h2>
          {LEVEL_CONFIGS.map((levelCfg) => {
            const record = progress.levels[levelCfg.levelIndex]
            const played = record != null
            const accuracy = record?.bestAccuracy ?? 0
            const stars = record?.stars ?? 0
            const barColor = played ? accuracyColor(accuracy) : '#374151'

            return (
              <div key={levelCfg.levelIndex} className="flex flex-col gap-1 mb-3">
                {/* Label row */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/80 font-medium">{levelCfg.name}</span>
                  <div className="flex items-center gap-2">
                    {/* Stars */}
                    <span className="flex gap-0.5">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="text-sm"
                          style={{ color: i < stars ? '#facc15' : 'rgba(255,255,255,0.2)' }}
                        >
                          ★
                        </span>
                      ))}
                    </span>
                    <span className="text-white/50 w-10 text-right">
                      {played ? `${accuracy}%` : '—'}
                    </span>
                  </div>
                </div>
                {/* Bar */}
                <div className="h-6 rounded-lg bg-white/5 border border-white/10 overflow-hidden relative">
                  {played ? (
                    <div
                      className="h-full rounded-lg flex items-center justify-end pr-2 transition-all"
                      style={{
                        width: `${accuracy}%`,
                        backgroundColor: barColor,
                        minWidth: accuracy > 0 ? '2rem' : '0',
                      }}
                    >
                      <span className="text-[10px] font-semibold text-white/90 whitespace-nowrap">
                        {accuracy}%
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <span className="text-[10px] text-white/30">Not played</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* 3. Most missed notes */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-white/70 tracking-wider uppercase">
            Most Missed Notes
          </h2>
          {sortedMisses.length > 0 ? (
            <div className="flex flex-col gap-2">
              {sortedMisses.map(([noteName, count], idx) => (
                <div
                  key={noteName}
                  className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/40 w-4 text-right">{idx + 1}.</span>
                    <span className="font-semibold text-white">{noteName}</span>
                  </div>
                  <span className="text-sm text-white/60">
                    {count} {count === 1 ? 'miss' : 'misses'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/40 py-4 text-center">No data yet</p>
          )}
        </div>

        {/* 4. Reset progress */}
        <div className="flex justify-center pt-4 pb-8">
          <button
            className="rounded-xl bg-red-950/50 border border-red-700/40 px-6 py-2.5 text-sm font-medium text-red-400 hover:bg-red-900/50 hover:border-red-600/50 active:scale-95 transition-all"
            onClick={handleReset}
          >
            Reset Progress
          </button>
        </div>
      </div>
    </div>
  )
}

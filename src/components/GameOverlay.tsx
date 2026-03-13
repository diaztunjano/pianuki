import { useState, useEffect, useRef } from 'react'
import { useBoundStore } from '../stores'
import { SettingsPanel } from './SettingsPanel'
import { LevelSummaryOverlay } from './LevelSummaryOverlay'
import { playWaveStart, playWaveEnd, playGameOver } from '../audio/sfxManager'

/**
 * GameOverlay — renders the appropriate full-screen overlay based on gamePhase.
 *
 * Positioned absolute over the canvas (z-20). Returns null during active
 * gameplay so the canvas is fully visible.
 *
 * Screens:
 *   idle          → null (transient state; player navigates via LevelSelectScreen)
 *   paused        → Pause screen with HP/wave info and Resume / Quit buttons
 *   gameover      → Game Over screen with wave-reached info and Try Again / Main Menu
 *   wave-clear    → Wave Complete screen with wave number and Next Wave button
 *   level-complete → LevelSummaryOverlay with accuracy, stars, reaction time
 *   playing       → null (no overlay)
 */
export function GameOverlay() {
  const gamePhase = useBoundStore((s) => s.gamePhase)
  const resumeGame = useBoundStore((s) => s.resumeGame)
  const advanceWave = useBoundStore((s) => s.advanceWave)
  const currentWave = useBoundStore((s) => s.currentWave)
  const totalWaves = useBoundStore((s) => s.totalWaves)
  const playerHP = useBoundStore((s) => s.playerHP)
  const maxPlayerHP = useBoundStore((s) => s.maxPlayerHP)
  const currentLevel = useBoundStore((s) => s.currentLevel)
  const startLevel = useBoundStore((s) => s.startLevel)
  const navigateTo = useBoundStore((s) => s.navigateTo)
  const [showSettings, setShowSettings] = useState(false)

  // Track phase transitions to trigger audio cues
  const prevPhaseRef = useRef(gamePhase)
  useEffect(() => {
    const prevPhase = prevPhaseRef.current
    prevPhaseRef.current = gamePhase
    if (gamePhase === 'playing' && prevPhase !== 'playing') {
      playWaveStart()
    } else if (gamePhase === 'wave-clear') {
      playWaveEnd()
    } else if (gamePhase === 'gameover') {
      playGameOver()
    }
  }, [gamePhase])

  if (gamePhase === 'playing') return null

  // Transient state — LevelSelectScreen handles navigation
  if (gamePhase === 'idle') return null

  const wrapperClass =
    'absolute inset-0 flex items-center justify-center bg-black/70 z-20'

  const cardClass =
    'flex flex-col items-center gap-6 rounded-2xl bg-gray-900/90 border border-white/10 px-12 py-10 text-white shadow-2xl backdrop-blur-sm'

  const primaryBtnClass =
    'rounded-xl bg-white/10 border border-white/20 px-8 py-3 text-lg font-semibold hover:bg-white/20 active:scale-95 transition-all'

  const secondaryBtnClass =
    'rounded-xl bg-white/5 border border-white/10 px-8 py-3 text-base font-medium text-white/70 hover:bg-white/10 active:scale-95 transition-all'

  // --- Level complete screen ---
  if (gamePhase === 'level-complete') {
    return (
      <div className={wrapperClass}>
        <LevelSummaryOverlay />
      </div>
    )
  }

  // --- Paused screen ---
  if (gamePhase === 'paused') {
    return (
      <div className={wrapperClass}>
        <div className={cardClass}>
          <h1 className="text-4xl font-black tracking-widest">PAUSED</h1>
          <div className="flex gap-6 text-sm text-white/60">
            <span>HP: {playerHP}/{maxPlayerHP}</span>
            <span>Wave {currentWave + 1}/{totalWaves}</span>
          </div>
          <div className="flex flex-col gap-3 w-full">
            <button
              className={primaryBtnClass}
              onClick={() => resumeGame()}
            >
              Resume
            </button>
            <button
              className={secondaryBtnClass}
              onClick={() => setShowSettings(true)}
            >
              Settings
            </button>
            <button
              className={secondaryBtnClass}
              onClick={() => navigateTo('levelSelect')}
            >
              Quit to Menu
            </button>
          </div>
        </div>
        {/* Settings panel overlays on top of pause card (z-25 > z-20) */}
        {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      </div>
    )
  }

  // --- Game Over screen ---
  if (gamePhase === 'gameover') {
    return (
      <div className={wrapperClass}>
        <div className={cardClass}>
          <h1 className="text-4xl font-black tracking-widest text-red-400">
            GAME OVER
          </h1>
          <p className="text-white/60">
            Reached Wave {currentWave + 1} of {totalWaves}
          </p>
          <div className="flex flex-col gap-3 w-full">
            <button
              className={primaryBtnClass}
              onClick={() => startLevel(currentLevel)}
            >
              Try Again
            </button>
            <button
              className={secondaryBtnClass}
              onClick={() => navigateTo('levelSelect')}
            >
              Main Menu
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- Wave Clear screen ---
  if (gamePhase === 'wave-clear') {
    return (
      <div className={wrapperClass}>
        <div className={cardClass}>
          <h1 className="text-4xl font-black tracking-widest text-green-400">
            WAVE COMPLETE
          </h1>
          <p className="text-white/60">
            Wave {currentWave + 1} of {totalWaves} cleared!
          </p>
          <p className="text-xs text-white/30">Upgrades coming soon...</p>
          <button
            className={primaryBtnClass}
            onClick={() => advanceWave()}
          >
            Next Wave
          </button>
        </div>
      </div>
    )
  }

  return null
}

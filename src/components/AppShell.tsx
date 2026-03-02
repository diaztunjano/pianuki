import { useState, useEffect } from 'react'
import { GameCanvas } from './GameCanvas'
import { KeyboardStrip } from './KeyboardStrip'
import { DebugPanel } from './DebugPanel'
import { GameOverlay } from './GameOverlay'
import { useMidiInput } from '../hooks/useMidiInput'
import { useAudioInput } from '../hooks/useAudioInput'
import { useBoundStore } from '../stores'

// --- Temporary stub screens — replaced by Plans 03 and 04 ---

function LevelSelectScreen() {
  const startLevel = useBoundStore((s) => s.startLevel)
  const navigateTo = useBoundStore((s) => s.navigateTo)
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-white">
      <h1 className="text-4xl font-bold">Level Select</h1>
      <button
        className="px-6 py-3 bg-white/10 rounded-xl hover:bg-white/20 active:scale-95 transition-all"
        onClick={() => startLevel(0)}
      >
        Play Level 1
      </button>
      <button
        className="px-6 py-3 bg-white/10 rounded-xl hover:bg-white/20 active:scale-95 transition-all"
        onClick={() => navigateTo('stats')}
      >
        Stats
      </button>
    </div>
  )
}

function StatsScreen() {
  const navigateTo = useBoundStore((s) => s.navigateTo)
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-white">
      <h1 className="text-4xl font-bold">Stats</h1>
      <button
        className="px-6 py-3 bg-white/10 rounded-xl hover:bg-white/20 active:scale-95 transition-all"
        onClick={() => navigateTo('levelSelect')}
      >
        Back
      </button>
    </div>
  )
}

// --- AppShell ---

/**
 * Top-level layout shell.
 * Flexbox structure:
 *   - Outer: flex-col filling the entire viewport (h-screen w-screen)
 *   - Middle row: screen-specific content (levelSelect | game | stats)
 *   - Bottom: KeyboardStrip (fixed height, always visible)
 *
 * Audio input wiring (always active regardless of screen):
 *   - MIDI: activates immediately on mount (no user gesture required)
 *   - Mic: activates only after the user clicks "Enable Microphone"
 *     (satisfies browser requirement: AudioContext must be created inside a user gesture)
 *
 * Screen routing is driven by `currentScreen` from the Zustand store.
 * DebugPanel is conditionally rendered in DEV mode only (game screen only).
 * In production builds, tree-shaking eliminates it entirely.
 */
export function AppShell() {
  const [micEnabled, setMicEnabled] = useState(false)
  const currentScreen = useBoundStore((s) => s.currentScreen)

  // MIDI: no user gesture required — activates immediately on mount
  useMidiInput()

  // Mic: only activates when micEnabled = true (set by button click = user gesture)
  // Must run at AppShell level regardless of screen — audio needs to be active during play
  useAudioInput(micEnabled)

  // ESC key: toggle pause/resume during gameplay.
  // Uses getState() inside the handler — avoids stale closure over gamePhase
  // and keeps this effect outside the React render cycle.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.repeat) {
        const { gamePhase, pauseGame, resumeGame } = useBoundStore.getState()
        if (gamePhase === 'playing') pauseGame()
        else if (gamePhase === 'paused') resumeGame()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-950 overflow-hidden">
      {/* Level select screen */}
      {currentScreen === 'levelSelect' && <LevelSelectScreen />}

      {/* Game screen: canvas + overlays + mic enable */}
      {currentScreen === 'game' && (
        <div className="relative flex flex-1 overflow-hidden">
          <GameCanvas />

          {/* Game phase overlays: idle, paused, gameover, wave-clear (z-20) */}
          <GameOverlay />

          {/* Mic enable overlay — shown until user grants microphone access */}
          {/* z-30 so it sits above GameOverlay (z-20) — must stay on top */}
          {!micEnabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-30">
              <button
                onClick={() => setMicEnabled(true)}
                className="rounded-xl bg-white/10 border border-white/20 px-8 py-4 text-white text-lg font-semibold hover:bg-white/20 active:scale-95 transition-all backdrop-blur-sm"
              >
                Click to Enable Microphone
              </button>
            </div>
          )}

          {import.meta.env.DEV && <DebugPanel />}
        </div>
      )}

      {/* Stats screen */}
      {currentScreen === 'stats' && <StatsScreen />}

      {/* Bottom: 88-key keyboard strip (always visible) */}
      <KeyboardStrip />
    </div>
  )
}

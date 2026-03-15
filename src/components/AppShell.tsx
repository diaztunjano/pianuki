import { useState, useEffect } from 'react'
import { GameCanvas } from './GameCanvas'
import { KeyboardStrip } from './KeyboardStrip'
import { DebugPanel } from './DebugPanel'
import { GameOverlay } from './GameOverlay'
import { LevelSelectScreen } from './LevelSelectScreen'
import { StatsScreen } from './StatsScreen'
import { OnboardingScreen } from './OnboardingScreen'
import { MicExplainScreen } from './MicExplainScreen'
import { useMidiInput } from '../hooks/useMidiInput'
import { useAudioInput } from '../hooks/useAudioInput'
import { useBoundStore } from '../stores'
import { setSfxMuted, setSfxVolume } from '../audio/sfxManager'

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
  const hasSeenOnboarding = useBoundStore((s) => s.settings.hasSeenOnboarding)

  // Mic permission state — checked once on mount to determine whether to show
  // the mic explain screen (permission 'prompt') or skip directly to the enable button
  // (permission 'granted' from a previous session).
  const [micPermission, setMicPermission] = useState<'unknown' | 'granted' | 'prompt' | 'denied'>('unknown')

  // Tracks whether the user has acknowledged the mic explanation within this session.
  // Intentionally NOT persisted — explanation shows once per session when permission is 'prompt'.
  // After browser grants permission, subsequent page loads return 'granted' and skip it entirely.
  const [micExplained, setMicExplained] = useState(false)

  // MIDI: no user gesture required — activates immediately on mount
  useMidiInput()

  // Mic: only activates when micEnabled = true (set by button click = user gesture)
  // Must run at AppShell level regardless of screen — audio needs to be active during play
  useAudioInput(micEnabled)

  // Check mic permission state once on mount.
  // Safari doesn't support permissions.query for microphone — defaults to 'prompt'
  // so the explain screen is always shown there (conservative default).
  useEffect(() => {
    async function checkPermission() {
      try {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        setMicPermission(result.state as 'granted' | 'prompt' | 'denied')
      } catch {
        // Safari doesn't support permissions.query for microphone — default to 'prompt'
        setMicPermission('prompt')
      }
    }
    checkPermission()
  }, [])

  // Sync persisted SFX settings to the sfxManager module on mount and changes.
  const sfxEnabled = useBoundStore((s) => s.settings.sfxEnabled)
  const sfxVolume = useBoundStore((s) => s.settings.sfxVolume)

  useEffect(() => {
    setSfxMuted(!sfxEnabled)
  }, [sfxEnabled])

  useEffect(() => {
    setSfxVolume(sfxVolume)
  }, [sfxVolume])

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

  // Onboarding gate (AINP-04):
  // First-time users see the headphone requirement screen before anything else.
  // Uses persisted hasSeenOnboarding — survives page refresh without flash.
  // IMPORTANT: currentScreen is NOT persisted and is not used here to avoid flash.
  if (!hasSeenOnboarding) {
    return (
      <div className="flex flex-col h-screen w-screen bg-gray-950 overflow-hidden">
        <OnboardingScreen />
        <KeyboardStrip />
      </div>
    )
  }

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

          {/* Mic gate (AINP-05): explain screen -> enable button */}
          {/* z-30 so it sits above GameOverlay (z-20) — must stay on top */}
          {!micEnabled && (
            micPermission === 'prompt' && !micExplained ? (
              // Show explanation before browser permission prompt fires
              <MicExplainScreen onContinue={() => setMicExplained(true)} />
            ) : (
              // Permission already granted/denied, or user acknowledged explanation
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-30">
                <button
                  onClick={() => setMicEnabled(true)}
                  className="rounded-xl bg-white/10 border border-white/20 px-8 py-4 text-white text-lg font-semibold hover:bg-white/20 active:scale-95 transition-all backdrop-blur-sm"
                >
                  Click to Enable Microphone
                </button>
              </div>
            )
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

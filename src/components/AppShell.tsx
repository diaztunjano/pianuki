import { useState } from 'react'
import { GameCanvas } from './GameCanvas'
import { KeyboardStrip } from './KeyboardStrip'
import { DebugPanel } from './DebugPanel'
import { useMidiInput } from '../hooks/useMidiInput'
import { useAudioInput } from '../hooks/useAudioInput'

/**
 * Top-level layout shell.
 * Flexbox structure:
 *   - Outer: flex-col filling the entire viewport (h-screen w-screen)
 *   - Middle row: flex-row with GameCanvas (flex-1) + optional DebugPanel (fixed width)
 *   - Bottom: KeyboardStrip (fixed height)
 *
 * Audio input wiring:
 *   - MIDI: activates immediately on mount (no user gesture required)
 *   - Mic: activates only after the user clicks "Enable Microphone"
 *     (satisfies browser requirement: AudioContext must be created inside a user gesture)
 *
 * DebugPanel is conditionally rendered in DEV mode only.
 * In production builds, tree-shaking eliminates it entirely.
 */
export function AppShell() {
  const [micEnabled, setMicEnabled] = useState(false)

  // MIDI: no user gesture required — activates immediately on mount
  useMidiInput()

  // Mic: only activates when micEnabled = true (set by button click = user gesture)
  useAudioInput(micEnabled)

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-950 overflow-hidden">
      {/* Middle row: canvas + debug panel */}
      <div className="relative flex flex-1 overflow-hidden">
        <GameCanvas />

        {/* Mic enable overlay — shown until user grants microphone access */}
        {!micEnabled && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
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

      {/* Bottom: 88-key keyboard strip */}
      <KeyboardStrip />
    </div>
  )
}

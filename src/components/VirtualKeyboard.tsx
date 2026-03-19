import type { CSSProperties } from 'react'
import { useBoundStore } from '../stores'
import { midiNoteToName } from '../lib/noteUtils'

// 2-octave range: C3 (MIDI 48) to C5 (MIDI 72)
const VK_START = 48 // C3
const VK_END = 72   // C5

// Chromatic positions within an octave that are black keys
const BLACK_KEY_POSITIONS = new Set([1, 3, 6, 8, 10]) // C#, D#, F#, G#, A#

/**
 * Toggleable overlay rendering 2 octaves (C3-C5) of piano keys.
 * Highlights active notes (cyan) from mic/MIDI input in real-time.
 * Highlights enemy target notes (amber) during gameplay.
 * Positioned above the canvas but below settings/mic overlays.
 */
export function VirtualKeyboard() {
  const activeNotes = useBoundStore((s) => s.activeNotes)
  const enemies = useBoundStore((s) => s.enemies)
  const gamePhase = useBoundStore((s) => s.gamePhase)

  // Collect target notes from the frontmost alive enemy (highest pathT = closest to goal)
  const targetNotes = new Set<number>()
  if (gamePhase === 'playing') {
    let frontmost: typeof enemies[number] | null = null
    for (const enemy of enemies) {
      if (enemy.state === 'alive') {
        if (!frontmost || enemy.pathT > frontmost.pathT) {
          frontmost = enemy
        }
      }
    }
    if (frontmost) {
      if (frontmost.targetNotes) {
        for (const n of frontmost.targetNotes) targetNotes.add(n)
      } else {
        targetNotes.add(frontmost.targetNote)
      }
    }
  }

  // Build ordered lists of white and black keys
  const whiteKeys: number[] = []
  const blackKeys: number[] = []

  for (let midi = VK_START; midi <= VK_END; midi++) {
    const semitone = midi % 12
    if (BLACK_KEY_POSITIONS.has(semitone)) {
      blackKeys.push(midi)
    } else {
      whiteKeys.push(midi)
    }
  }

  const whiteKeyIndex = new Map<number, number>()
  whiteKeys.forEach((midi, idx) => whiteKeyIndex.set(midi, idx))

  const getBlackKeyPosition = (midi: number): number => {
    let prevMidi = midi - 1
    while (prevMidi >= VK_START && BLACK_KEY_POSITIONS.has(prevMidi % 12)) {
      prevMidi--
    }
    return whiteKeyIndex.get(prevMidi) ?? 0
  }

  const totalWhiteKeys = whiteKeys.length

  const hintStyle: CSSProperties = {
    animation: 'hint-pulse 1.2s ease-in-out infinite',
  }

  const getWhiteKeyStyle = (midi: number): { className: string; style?: CSSProperties } => {
    const isActive = activeNotes.has(midi)
    const isTarget = targetNotes.has(midi)
    if (isActive && isTarget) return { className: 'bg-emerald-400', style: hintStyle }
    if (isActive) return { className: 'bg-cyan-400' }
    if (isTarget) return { className: 'bg-amber-300', style: hintStyle }
    return { className: 'bg-white' }
  }

  const getBlackKeyStyle = (midi: number): { className: string; style?: CSSProperties } => {
    const isActive = activeNotes.has(midi)
    const isTarget = targetNotes.has(midi)
    if (isActive && isTarget) return { className: 'bg-emerald-500', style: hintStyle }
    if (isActive) return { className: 'bg-cyan-500' }
    if (isTarget) return { className: 'bg-amber-500', style: hintStyle }
    return { className: 'bg-gray-950' }
  }

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-15 pointer-events-none select-none">
      <div className="relative bg-gray-900/80 border border-white/20 rounded-xl p-2 backdrop-blur-sm">
        {/* Note labels for C keys */}
        <div className="relative" style={{ width: `${totalWhiteKeys * 36}px`, height: '120px' }}>
          {/* White keys */}
          <div className="flex h-full gap-px">
            {whiteKeys.map((midi) => {
              const semitone = midi % 12
              const showLabel = semitone === 0 // Label C notes
              const { className: keyClass, style: keyStyle } = getWhiteKeyStyle(midi)
              return (
                <div
                  key={midi}
                  className={`relative flex-1 rounded-b transition-colors duration-75 ${keyClass}`}
                  style={{ minWidth: '34px', ...keyStyle }}
                >
                  {showLabel && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-mono text-gray-500 select-none">
                      {midiNoteToName(midi)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Black keys */}
          {blackKeys.map((midi) => {
            const prevWhiteIdx = getBlackKeyPosition(midi)
            const leftPx = (prevWhiteIdx + 0.65) * 36
            const widthPx = 22
            const { className: keyClass, style: keyStyle } = getBlackKeyStyle(midi)

            return (
              <div
                key={midi}
                className={`absolute top-0 rounded-b transition-colors duration-75 ${keyClass}`}
                style={{
                  left: `${leftPx}px`,
                  width: `${widthPx}px`,
                  height: '65%',
                  ...keyStyle,
                }}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

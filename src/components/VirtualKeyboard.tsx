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

  // Collect target notes from living enemies during gameplay
  const targetNotes = new Set<number>()
  if (gamePhase === 'playing') {
    for (const enemy of enemies) {
      if (enemy.state === 'alive') {
        if (enemy.targetNotes) {
          for (const n of enemy.targetNotes) targetNotes.add(n)
        } else {
          targetNotes.add(enemy.targetNote)
        }
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

  const getWhiteKeyClass = (midi: number): string => {
    const isActive = activeNotes.has(midi)
    const isTarget = targetNotes.has(midi)
    if (isActive && isTarget) return 'bg-emerald-400'
    if (isActive) return 'bg-cyan-400'
    if (isTarget) return 'bg-amber-300'
    return 'bg-white'
  }

  const getBlackKeyClass = (midi: number): string => {
    const isActive = activeNotes.has(midi)
    const isTarget = targetNotes.has(midi)
    if (isActive && isTarget) return 'bg-emerald-500'
    if (isActive) return 'bg-cyan-500'
    if (isTarget) return 'bg-amber-500'
    return 'bg-gray-950'
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
              return (
                <div
                  key={midi}
                  className={`relative flex-1 rounded-b transition-colors duration-75 ${getWhiteKeyClass(midi)}`}
                  style={{ minWidth: '34px' }}
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

            return (
              <div
                key={midi}
                className={`absolute top-0 rounded-b transition-colors duration-75 ${getBlackKeyClass(midi)}`}
                style={{
                  left: `${leftPx}px`,
                  width: `${widthPx}px`,
                  height: '65%',
                }}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

import { useBoundStore } from '../stores'

// MIDI note numbers for the 88-key piano range
const PIANO_START = 21  // A0
const PIANO_END = 108   // C8

// Chromatic positions within an octave (0=C, 1=C#, 2=D, 3=D#, 4=E, 5=F, 6=F#, 7=G, 8=G#, 9=A, 10=A#, 11=B)
const BLACK_KEY_POSITIONS = new Set([1, 3, 6, 8, 10]) // C#, D#, F#, G#, A#


/**
 * 88-key piano keyboard strip.
 * Reads activeNotes from Zustand store and highlights active keys in cyan.
 * White keys are flex-1 in a row; black keys are absolutely positioned overlays.
 */
export function KeyboardStrip() {
  const activeNotes = useBoundStore((s) => s.activeNotes)

  // Build ordered lists of white and black keys across the full piano range
  const whiteKeys: number[] = []
  const blackKeys: number[] = []

  for (let midi = PIANO_START; midi <= PIANO_END; midi++) {
    const semitone = midi % 12
    if (BLACK_KEY_POSITIONS.has(semitone)) {
      blackKeys.push(midi)
    } else {
      whiteKeys.push(midi)
    }
  }

  // Count white keys to calculate black key positioning
  // We need the index of each white key to position black keys relative to them
  const whiteKeyIndex = new Map<number, number>()
  whiteKeys.forEach((midi, idx) => whiteKeyIndex.set(midi, idx))

  // For each black key, find the index of the previous white key
  // Black key sits between two white keys — positioned at (prevWhiteIdx + 0.6) * whiteKeyWidth
  const getBlackKeyPosition = (midi: number): number => {
    // Find the closest lower white key
    let prevMidi = midi - 1
    while (prevMidi >= PIANO_START && BLACK_KEY_POSITIONS.has(prevMidi % 12)) {
      prevMidi--
    }
    const idx = whiteKeyIndex.get(prevMidi) ?? 0
    return idx
  }

  const totalWhiteKeys = whiteKeys.length

  return (
    <div className="relative bg-gray-900 border-t border-gray-700 h-16 select-none overflow-hidden shrink-0">
      {/* White keys — flex row filling full width */}
      <div className="flex h-full">
        {whiteKeys.map((midi) => {
          const isActive = activeNotes.has(midi)
          return (
            <div
              key={midi}
              className={`flex-1 border-r border-gray-400 last:border-r-0 transition-none ${
                isActive
                  ? 'bg-cyan-400'
                  : 'bg-white'
              }`}
            />
          )
        })}
      </div>

      {/* Black keys — absolutely positioned overlays */}
      {blackKeys.map((midi) => {
        const isActive = activeNotes.has(midi)
        const prevWhiteIdx = getBlackKeyPosition(midi)

        // Position: left edge at (prevWhiteIdx + 0.65) / totalWhiteKeys * 100%
        // Width: 0.6 / totalWhiteKeys * 100%
        const leftPct = ((prevWhiteIdx + 0.65) / totalWhiteKeys) * 100
        const widthPct = (0.6 / totalWhiteKeys) * 100

        return (
          <div
            key={midi}
            className={`absolute top-0 z-10 rounded-b transition-none ${
              isActive ? 'bg-cyan-500' : 'bg-gray-950'
            }`}
            style={{
              left: `${leftPct}%`,
              width: `${widthPct}%`,
              height: '62%',
            }}
          />
        )
      })}
    </div>
  )
}

// Helper: check which semitones are white keys (exported for tests)
export function isWhiteKey(midi: number): boolean {
  return !BLACK_KEY_POSITIONS.has(midi % 12)
}

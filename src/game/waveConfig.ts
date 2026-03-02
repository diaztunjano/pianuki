import { midiNoteToName } from '../lib/noteUtils'
import type { EnemySpawnEntry } from './enemyTypes'

/**
 * Configuration for a single wave of enemies.
 */
export interface WaveConfig {
  enemies: EnemySpawnEntry[]
  spawnIntervalMs: number
}

/**
 * Configuration for an entire level (multiple waves).
 */
export interface LevelConfig {
  levelIndex: number
  name: string
  noteRangeLabel: string
  allowedNotes: number[]  // MIDI note numbers the player must play
  waves: WaveConfig[]
}

/** Repeating color palette assigned to enemies by note index. */
const COLOR_PALETTE = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#22c55e', // green
  '#eab308', // yellow
  '#a855f7', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
]

/**
 * Build a single-note spawn entry for a given MIDI note.
 * Color is cycled from the palette based on the note's index
 * within the level's allowedNotes array.
 */
export function buildNoteSpawn(midiNote: number, color: string): EnemySpawnEntry {
  return {
    enemyType: 'note',
    targetNote: midiNote,
    noteName: midiNoteToName(midiNote),
    color,
  }
}

/**
 * Build a wave of note enemies cycling through the allowed notes.
 */
function buildWave(
  allowedNotes: number[],
  count: number,
  spawnIntervalMs: number,
): WaveConfig {
  const enemies: EnemySpawnEntry[] = []
  for (let i = 0; i < count; i++) {
    const noteIndex = i % allowedNotes.length
    const midiNote = allowedNotes[noteIndex]
    const color = COLOR_PALETTE[noteIndex % COLOR_PALETTE.length]
    enemies.push(buildNoteSpawn(midiNote, color))
  }
  return { enemies, spawnIntervalMs }
}

/**
 * All level configurations. Each level expands the note vocabulary
 * and increases difficulty through more enemies and faster spawn rates.
 *
 * Level 0: Meadow — C major triad (C4, E4, G4)
 * Level 1: Forest — C major pentatonic (C4–G4, 5 notes)
 * Level 2: Mountain — Full C major octave (C4–C5, 8 white keys)
 * Level 3: Storm — C major octave + F#4 and Bb4 (black keys introduced)
 * Level 4: Summit — C4–E5 chromatic (all 17 semitones)
 */
export const LEVEL_CONFIGS: LevelConfig[] = [
  // Level 0 — C major triad: C4=60, E4=64, G4=67
  {
    levelIndex: 0,
    name: 'Meadow',
    noteRangeLabel: 'C4, E4, G4',
    allowedNotes: [60, 64, 67],
    waves: [
      buildWave([60, 64, 67], 3, 2500),
      buildWave([60, 64, 67], 4, 2200),
      buildWave([60, 64, 67], 5, 2000),
    ],
  },

  // Level 1 — C major pentatonic: C4=60, D4=62, E4=64, F4=65, G4=67
  {
    levelIndex: 1,
    name: 'Forest',
    noteRangeLabel: 'C4-G4',
    allowedNotes: [60, 62, 64, 65, 67],
    waves: [
      buildWave([60, 62, 64, 65, 67], 4, 2200),
      buildWave([60, 62, 64, 65, 67], 5, 2000),
      buildWave([60, 62, 64, 65, 67], 6, 1800),
      buildWave([60, 62, 64, 65, 67], 7, 1600),
    ],
  },

  // Level 2 — Full C major octave: C4=60 through C5=72
  {
    levelIndex: 2,
    name: 'Mountain',
    noteRangeLabel: 'C4-C5',
    allowedNotes: [60, 62, 64, 65, 67, 69, 71, 72],
    waves: [
      buildWave([60, 62, 64, 65, 67, 69, 71, 72], 5, 2000),
      buildWave([60, 62, 64, 65, 67, 69, 71, 72], 6, 1800),
      buildWave([60, 62, 64, 65, 67, 69, 71, 72], 7, 1600),
      buildWave([60, 62, 64, 65, 67, 69, 71, 72], 8, 1400),
      buildWave([60, 62, 64, 65, 67, 69, 71, 72], 10, 1200),
    ],
  },

  // Level 3 — C major octave + F#4=66 and Bb4=70 (black keys introduced)
  {
    levelIndex: 3,
    name: 'Storm',
    noteRangeLabel: 'C4-C5 + F#4 Bb4',
    allowedNotes: [60, 62, 64, 65, 66, 67, 69, 70, 71, 72],
    waves: [
      buildWave([60, 62, 64, 65, 66, 67, 69, 70, 71, 72], 6, 1800),
      buildWave([60, 62, 64, 65, 66, 67, 69, 70, 71, 72], 7, 1600),
      buildWave([60, 62, 64, 65, 66, 67, 69, 70, 71, 72], 8, 1400),
      buildWave([60, 62, 64, 65, 66, 67, 69, 70, 71, 72], 10, 1200),
    ],
  },

  // Level 4 — C4 to E5 chromatic: all 17 semitones (60–76)
  {
    levelIndex: 4,
    name: 'Summit',
    noteRangeLabel: 'C4-E5 chromatic',
    allowedNotes: [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76],
    waves: [
      buildWave([60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76], 7, 1600),
      buildWave([60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76], 8, 1400),
      buildWave([60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76], 10, 1200),
      buildWave([60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76], 12, 1000),
      buildWave([60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76], 14, 900),
    ],
  },
]

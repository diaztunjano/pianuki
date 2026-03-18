import { midiNoteToName } from '../lib/noteUtils'
import type { EnemySpawnEntry } from './enemyTypes'
import { INTERVAL_NAMES } from './noteMatch'

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
 * Build a chord spawn entry requiring multiple simultaneous notes.
 * The label shows all note names joined with "+", e.g. "C4+E4+G4".
 * targetNote is set to the first note in the array (root).
 */
export function buildChordSpawn(midiNotes: number[], color: string): EnemySpawnEntry {
  return {
    enemyType: 'chord',
    targetNote: midiNotes[0],
    targetNotes: midiNotes,
    noteName: midiNotes.map(midiNoteToName).join('+'),
    color,
  }
}

/**
 * Build an interval spawn entry requiring two simultaneous notes.
 * The label shows the interval name plus the root note, e.g. "Maj 3rd C4".
 */
export function buildIntervalSpawn(rootMidi: number, semitones: number, color: string): EnemySpawnEntry {
  const upperMidi = rootMidi + semitones
  const intervalName = INTERVAL_NAMES[semitones] ?? `${semitones}st`
  return {
    enemyType: 'interval',
    targetNote: rootMidi,
    targetNotes: [rootMidi, upperMidi],
    noteName: `${intervalName} ${midiNoteToName(rootMidi)}`,
    color,
  }
}

/**
 * Build a wave of interval enemies from a list of [rootMidi, semitones] pairs.
 */
function buildIntervalWave(
  intervals: [number, number][],
  spawnIntervalMs: number,
): WaveConfig {
  const enemies: EnemySpawnEntry[] = intervals.map(([root, semi], i) => {
    const color = COLOR_PALETTE[i % COLOR_PALETTE.length]
    return buildIntervalSpawn(root, semi, color)
  })
  return { enemies, spawnIntervalMs }
}

/**
 * Build a wave of chord enemies from a list of MIDI note arrays.
 */
function buildChordWave(
  chords: number[][],
  spawnIntervalMs: number,
): WaveConfig {
  const enemies: EnemySpawnEntry[] = chords.map((notes, i) => {
    const color = COLOR_PALETTE[i % COLOR_PALETTE.length]
    return buildChordSpawn(notes, color)
  })
  return { enemies, spawnIntervalMs }
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
 * Level 5: Echoes — Intervals: 2nds & 3rds (interval enemies)
 * Level 6: Canyon — Intervals: 4ths & 5ths (interval enemies)
 * Level 7: Cathedral — Major triads (chord enemies)
 * Level 8: Crypt — Minor triads (chord enemies)
 * Level 9: Tempest — Scale runs (fast sequential notes)
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

  // Level 5 — Intervals: 2nds & 3rds
  // Player must play two notes simultaneously to defeat each enemy.
  // Intervals: min 2nd (1), Maj 2nd (2), min 3rd (3), Maj 3rd (4)
  {
    levelIndex: 5,
    name: 'Echoes',
    noteRangeLabel: '2nds & 3rds',
    allowedNotes: [60, 61, 62, 64, 65, 67, 69],
    waves: [
      // Wave 1: gentle intro — major 2nds only
      buildIntervalWave([[60, 2], [62, 2], [64, 2]], 2800),
      // Wave 2: mix major 2nds and major 3rds
      buildIntervalWave([[60, 2], [60, 4], [62, 2], [62, 4]], 2500),
      // Wave 3: add minor 2nds and minor 3rds
      buildIntervalWave([[60, 1], [60, 3], [62, 2], [64, 4], [65, 2]], 2200),
      // Wave 4: all four interval types, faster
      buildIntervalWave([[60, 1], [62, 2], [60, 3], [60, 4], [64, 1], [62, 3]], 2000),
    ],
  },

  // Level 6 — Intervals: 4ths & 5ths
  // Wider intervals requiring larger hand stretches.
  {
    levelIndex: 6,
    name: 'Canyon',
    noteRangeLabel: '4ths & 5ths',
    allowedNotes: [60, 62, 64, 65, 67, 69, 71, 72, 74],
    waves: [
      // Wave 1: perfect 4ths only
      buildIntervalWave([[60, 5], [62, 5], [64, 5]], 2600),
      // Wave 2: perfect 5ths only
      buildIntervalWave([[60, 7], [62, 7], [64, 7]], 2400),
      // Wave 3: mix 4ths and 5ths
      buildIntervalWave([[60, 5], [60, 7], [62, 5], [62, 7], [64, 5]], 2200),
      // Wave 4: add some 3rds for variety, faster
      buildIntervalWave([[60, 5], [62, 7], [64, 4], [65, 7], [60, 7], [62, 5]], 1800),
      // Wave 5: full mix, fast
      buildIntervalWave([[60, 7], [62, 5], [64, 7], [65, 5], [60, 5], [62, 7], [67, 5]], 1500),
    ],
  },

  // Level 7 — Major Triads (chord enemies)
  // Player must play 3 notes simultaneously. C, F, and G major triads.
  {
    levelIndex: 7,
    name: 'Cathedral',
    noteRangeLabel: 'Major triads',
    allowedNotes: [60, 62, 64, 65, 67, 69, 71, 72, 74],
    waves: [
      // Wave 1: C major only — ease into chords
      buildChordWave([[60, 64, 67], [60, 64, 67]], 3200),
      // Wave 2: C and G major
      buildChordWave([[60, 64, 67], [67, 71, 74], [60, 64, 67]], 3000),
      // Wave 3: C, F, and G major
      buildChordWave([[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]], 2800),
      // Wave 4: all three, faster, more enemies
      buildChordWave([[65, 69, 72], [60, 64, 67], [67, 71, 74], [65, 69, 72], [60, 64, 67]], 2400),
    ],
  },

  // Level 8 — Minor Triads (chord enemies)
  // A minor, D minor, E minor triads — darker tonality.
  {
    levelIndex: 8,
    name: 'Crypt',
    noteRangeLabel: 'Minor triads',
    allowedNotes: [57, 60, 62, 64, 65, 67, 69, 71, 72],
    waves: [
      // Wave 1: A minor only
      buildChordWave([[57, 60, 64], [57, 60, 64]], 3200),
      // Wave 2: A minor and D minor
      buildChordWave([[57, 60, 64], [62, 65, 69], [57, 60, 64]], 2800),
      // Wave 3: all three minor triads
      buildChordWave([[57, 60, 64], [62, 65, 69], [64, 67, 71], [57, 60, 64]], 2500),
      // Wave 4: mixed major and minor for challenge
      buildChordWave([
        [57, 60, 64], [60, 64, 67], [62, 65, 69],
        [64, 67, 71], [65, 69, 72], [57, 60, 64],
      ], 2200),
      // Wave 5: fast minor triads
      buildChordWave([[62, 65, 69], [57, 60, 64], [64, 67, 71], [62, 65, 69], [57, 60, 64], [64, 67, 71]], 1800),
    ],
  },

  // Level 9 — Scale Runs (rapid sequential note enemies)
  // Fast single-note enemies in scalar patterns. Tests speed and note recognition.
  {
    levelIndex: 9,
    name: 'Tempest',
    noteRangeLabel: 'C major scale runs',
    allowedNotes: [60, 62, 64, 65, 67, 69, 71, 72],
    waves: [
      // Wave 1: ascending C major scale
      buildWave([60, 62, 64, 65, 67, 69, 71, 72], 8, 1200),
      // Wave 2: descending
      buildWave([72, 71, 69, 67, 65, 64, 62, 60], 8, 1000),
      // Wave 3: ascending + descending, faster
      buildWave([60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62], 14, 800),
      // Wave 4: rapid fire, random-feeling pattern
      buildWave([60, 64, 67, 72, 69, 65, 62, 71, 60, 67, 64, 69, 72, 65, 62, 71], 16, 700),
      // Wave 5: blitz — very fast spawns
      buildWave([60, 62, 64, 65, 67, 69, 71, 72, 60, 62, 64, 65, 67, 69, 71, 72], 16, 550),
    ],
  },
]

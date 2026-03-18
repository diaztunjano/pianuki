import type { Enemy } from './enemyTypes'

/**
 * Check whether an enemy's target note(s) are currently being played.
 *
 * - For 'note' enemies: the single targetNote must be in activeNotes.
 * - For 'interval' enemies: both notes of the chord must be active simultaneously.
 */
export function isNoteMatch(enemy: Enemy, activeNotes: Set<number>): boolean {
  if (enemy.enemyType === 'note') {
    return activeNotes.has(enemy.targetNote)
  }
  // interval and chord: require all notes held at the same time
  return (
    enemy.targetNotes !== undefined &&
    enemy.targetNotes.length > 0 &&
    enemy.targetNotes.every((note) => activeNotes.has(note))
  )
}

/**
 * Absolute semitone distance between two MIDI note numbers.
 */
export function semitoneDist(a: number, b: number): number {
  return Math.abs(a - b)
}

/**
 * Human-readable interval names keyed by semitone distance.
 * Used to label interval enemies on-screen.
 */
export const INTERVAL_NAMES: Record<number, string> = {
  3: 'min 3rd',
  4: 'Maj 3rd',
  5: '4th',
  7: '5th',
  8: 'min 6th',
  9: 'Maj 6th',
  12: '8ve',
}

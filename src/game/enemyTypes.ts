// Enemy data structures for the Pianuki tower defense game

/**
 * A single enemy on the path. Enemies are spawned from wave configs,
 * advance along the path (pathT 0→1), and must be defeated by playing
 * the correct note(s) before they reach the goal.
 */
export interface Enemy {
  id: string
  enemyType: 'note' | 'interval'
  targetNote: number           // MIDI note number (primary target)
  targetNotes?: [number, number] // MIDI pair for interval enemies
  noteName: string             // Display label e.g. "C4" or "Maj 3rd"
  pathT: number                // 0–1 progress along the path
  speed: number                // pathT units per ms
  hp: number
  maxHp: number
  state: 'alive' | 'dying' | 'dead'
  defeatedFrames: number       // countdown frames for death animation
  color: string                // hex color string
}

/**
 * A spawn entry from a wave config — the blueprint used to instantiate
 * an Enemy via buildEnemy().
 */
export interface EnemySpawnEntry {
  enemyType: 'note' | 'interval'
  targetNote: number
  targetNotes?: [number, number]
  noteName: string
  color: string
}

/**
 * Factory that creates a live Enemy from a spawn entry.
 * - Note enemies have hp 1.
 * - Interval enemies have hp 2 (harder to defeat, require a chord).
 */
export function buildEnemy(entry: EnemySpawnEntry): Enemy {
  const isInterval = entry.enemyType === 'interval'
  return {
    id: crypto.randomUUID(),
    enemyType: entry.enemyType,
    targetNote: entry.targetNote,
    targetNotes: entry.targetNotes,
    noteName: entry.noteName,
    pathT: 0,
    // 0.00003 pathT/ms → ~33 seconds to cross full path at 60fps
    speed: 0.00003,
    hp: isInterval ? 2 : 1,
    maxHp: isInterval ? 2 : 1,
    state: 'alive',
    defeatedFrames: 0,
    color: entry.color,
  }
}

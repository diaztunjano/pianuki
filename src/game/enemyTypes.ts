// Enemy data structures for the Pianuki tower defense game

/**
 * A single enemy on the path. Enemies are spawned from wave configs,
 * advance along the path (pathT 0→1), and must be defeated by playing
 * the correct note(s) before they reach the goal.
 */
export interface Enemy {
  id: string
  enemyType: 'note' | 'interval' | 'chord'
  targetNote: number           // MIDI note number (primary target)
  targetNotes?: number[]       // MIDI notes for interval (2) or chord (2+) enemies
  noteName: string             // Display label e.g. "C4", "Maj 3rd", or "C4+E4+G4"
  pathT: number                // 0–1 progress along the path
  speed: number                // pathT units per ms
  hp: number
  maxHp: number
  state: 'alive' | 'dying' | 'dead'
  defeatedFrames: number       // countdown frames for death animation
  color: string                // hex color string
  spawnedAtMs: number          // performance.now() at spawn time — used for reaction time calculation
  loopCount?: number           // hard mode: number of times this enemy has looped back to start
}

/**
 * A spawn entry from a wave config — the blueprint used to instantiate
 * an Enemy via buildEnemy().
 */
export interface EnemySpawnEntry {
  enemyType: 'note' | 'interval' | 'chord'
  targetNote: number
  targetNotes?: number[]       // MIDI notes for interval (2) or chord (2+) enemies
  noteName: string
  color: string
}

/** Default enemy speed: 0.00003 pathT/ms → ~33 seconds to cross the full path. */
export const DEFAULT_ENEMY_SPEED = 0.00003

/**
 * Factory that creates a live Enemy from a spawn entry.
 * - Note enemies have hp 1.
 * - Interval enemies have hp 2 (harder to defeat, require a chord).
 * - Chord enemies have hp 3.
 * @param speed - pathT units per ms. Defaults to DEFAULT_ENEMY_SPEED.
 */
export function buildEnemy(entry: EnemySpawnEntry, speed: number = DEFAULT_ENEMY_SPEED): Enemy {
  const hp = entry.enemyType === 'chord' ? 3 : entry.enemyType === 'interval' ? 2 : 1
  return {
    id: crypto.randomUUID(),
    enemyType: entry.enemyType,
    targetNote: entry.targetNote,
    targetNotes: entry.targetNotes,
    noteName: entry.noteName,
    pathT: 0,
    speed,
    hp,
    maxHp: hp,
    state: 'alive',
    defeatedFrames: 0,
    color: entry.color,
    spawnedAtMs: performance.now(),
  }
}

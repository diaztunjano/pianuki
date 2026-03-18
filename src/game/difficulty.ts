/**
 * Adaptive difficulty system.
 *
 * Tracks a rolling window of the last N enemy outcomes (hit vs miss/reached goal)
 * and exposes multipliers that the game loop uses to adjust spawn interval and
 * enemy speed in real time.
 *
 * - Accuracy < 60% → slow down spawns (multiplier > 1.0 on interval)
 * - Accuracy > 85% → speed up spawns (multiplier < 1.0 on interval)
 * - Between 60–85% → no adjustment (multiplier = 1.0)
 */

const WINDOW_SIZE = 10

// Rolling window of outcomes: true = correct hit, false = miss/reached goal
let outcomes: boolean[] = []

export function resetDifficulty(): void {
  outcomes = []
}

export function recordHit(): void {
  outcomes.push(true)
  if (outcomes.length > WINDOW_SIZE) {
    outcomes.shift()
  }
}

export function recordMissOutcome(): void {
  outcomes.push(false)
  if (outcomes.length > WINDOW_SIZE) {
    outcomes.shift()
  }
}

/**
 * Returns the rolling accuracy as a ratio 0–1.
 * Returns 1 when no outcomes have been recorded yet (benefit of the doubt).
 */
export function getRollingAccuracy(): number {
  if (outcomes.length === 0) return 1
  const hits = outcomes.filter(Boolean).length
  return hits / outcomes.length
}

/**
 * Returns a multiplier applied to the base spawn interval.
 * >1.0 = slower spawns (easier), <1.0 = faster spawns (harder).
 *
 * - accuracy < 60% → 1.5 (50% slower spawns)
 * - accuracy > 85% → 0.8 (20% faster spawns)
 * - otherwise → 1.0 (no change)
 */
export function getSpawnMultiplier(): number {
  const accuracy = getRollingAccuracy()
  if (accuracy < 0.6) return 1.5
  if (accuracy > 0.85) return 0.8
  return 1.0
}

/**
 * Returns a multiplier applied to enemy movement speed.
 * <1.0 = slower enemies (easier), >1.0 = faster enemies (harder).
 *
 * - accuracy < 60% → 0.75 (25% slower movement)
 * - accuracy > 85% → 1.1 (10% faster movement)
 * - otherwise → 1.0 (no change)
 */
export function getSpeedMultiplier(): number {
  const accuracy = getRollingAccuracy()
  if (accuracy < 0.6) return 0.75
  if (accuracy > 0.85) return 1.1
  return 1.0
}

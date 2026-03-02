import type { LevelResult } from '../stores/audioStore'

// Module-level accumulators — reset on level start, read on level complete.
// Kept outside React to avoid re-render overhead during 60fps game loop.

let correctHits = 0
let totalEnemiesSpawned = 0
let reactionTimes: number[] = []
let noteMissesByNote: Record<string, number> = {}
let levelStartTimeMs = 0

export function resetStats(): void {
  correctHits = 0
  totalEnemiesSpawned = 0
  reactionTimes = []
  noteMissesByNote = {}
  levelStartTimeMs = performance.now()
}

export function recordEnemySpawned(): void {
  totalEnemiesSpawned++
}

export function recordCorrectHit(reactionMs: number): void {
  correctHits++
  reactionTimes.push(reactionMs)
}

export function recordMiss(noteName: string): void {
  noteMissesByNote[noteName] = (noteMissesByNote[noteName] ?? 0) + 1
}

export function computeLevelResult(levelIndex: number): LevelResult {
  const accuracy = totalEnemiesSpawned === 0
    ? 0
    : Math.round((correctHits / totalEnemiesSpawned) * 100)
  const avgReactionMs = reactionTimes.length === 0
    ? 0
    : Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
  return {
    levelIndex,
    accuracy,
    avgReactionMs,
    durationMs: performance.now() - levelStartTimeMs,
    noteMisses: { ...noteMissesByNote },
  }
}

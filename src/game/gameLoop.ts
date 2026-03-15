import { useBoundStore } from '../stores'
import { isNoteMatch } from './noteMatch'
import { recordEnemySpawned, recordCorrectHit, recordMiss, computeLevelResult } from './statsTracker'
import {
  playCorrect,
  playWrong,
  playEnemyDeath,
  playWaveEnd,
  playGameOver,
  setSfxMuted,
  setSfxMasterVolume,
} from '../audio/sfxManager'
import type { Enemy } from './enemyTypes'

// Module-level state for wrong-note detection
// Tracks the timestamp of the last NoteOn event we already processed
let lastCheckedEventTs = 0

// Track previous gamePhase so we detect transitions (for one-shot SFX)
let prevGamePhase: string = 'idle'

/**
 * Fixed-timestep game update function.
 * Called with a constant dt (milliseconds) each tick by the rAF loop in GameCanvas.
 * Reads Zustand state fresh at each step — do NOT cache getState() at function top.
 */
export function update(dt: number): void {
  // -------------------------------------------------------------------
  // Step 0: Sync SFX mute / volume with store settings
  // -------------------------------------------------------------------
  const { sfxEnabled, sfxVolume } = useBoundStore.getState().settings
  setSfxMuted(!sfxEnabled)
  setSfxMasterVolume(sfxVolume)

  // -------------------------------------------------------------------
  // Step 1: Spawn enemies from the queue
  // -------------------------------------------------------------------
  const spawnState = useBoundStore.getState()
  if (spawnState.spawnQueue.length > 0) {
    const newAccumulator = spawnState.spawnAccumulator + dt
    if (newAccumulator >= spawnState.spawnIntervalMs) {
      // Pop the first entry and spawn it
      const entry = spawnState.spawnQueue[0]
      useBoundStore.getState().spawnEnemy(entry)
      recordEnemySpawned()
      // Remove the entry from the queue and reset accumulator
      useBoundStore.setState((s) => {
        s.spawnQueue = s.spawnQueue.slice(1)
        s.spawnAccumulator = 0
      })
    } else {
      useBoundStore.setState({ spawnAccumulator: newAccumulator })
    }
  }

  // -------------------------------------------------------------------
  // Step 2: Move enemies along the path
  // -------------------------------------------------------------------
  useBoundStore.setState((s) => {
    for (const e of s.enemies) {
      if (e.state === 'alive') {
        e.pathT += e.speed * dt
      }
    }
  })

  // -------------------------------------------------------------------
  // Step 3: Check if any enemy reached the goal (pathT >= 1.0)
  // Branches on penaltyMode: easy (no damage), normal (HP damage), hard (loop back)
  // -------------------------------------------------------------------
  const postMoveState = useBoundStore.getState()
  const { penaltyMode } = postMoveState.settings
  for (const enemy of postMoveState.enemies) {
    if (enemy.pathT >= 1.0 && enemy.state === 'alive') {
      if (penaltyMode === 'easy') {
        // No penalty — just kill the enemy silently
        useBoundStore.setState((s) => {
          const e = s.enemies.find((x: Enemy) => x.id === enemy.id)
          if (e) e.state = 'dead'
        })
      } else if (penaltyMode === 'hard') {
        // Hard — reset enemy to start of path (with loop protection)
        useBoundStore.setState((s) => {
          const e = s.enemies.find((x: Enemy) => x.id === enemy.id)
          if (e) {
            e.loopCount = (e.loopCount ?? 0) + 1
            if (e.loopCount >= 3) {
              // Failsafe: after 3 loops, convert to normal HP damage
              e.state = 'dead'
              s.playerHP -= 1
              if (s.playerHP <= 0) s.gamePhase = 'gameover'
            } else {
              e.pathT = 0
            }
          }
        })
      } else {
        // Normal (default) — existing HP damage behavior
        useBoundStore.getState().enemyReachedGoal(enemy.id)
      }
    }
  }

  // Play game-over sound if the phase just transitioned to gameover in Step 3
  const postGoalPhase = useBoundStore.getState().gamePhase
  if (postGoalPhase === 'gameover' && prevGamePhase !== 'gameover') {
    playGameOver()
    prevGamePhase = postGoalPhase
    return // Skip remaining steps — game is over
  }

  // -------------------------------------------------------------------
  // Step 4: Check note matches — damage enemies that match active notes
  // -------------------------------------------------------------------
  const matchState = useBoundStore.getState()
  const { activeNotes } = matchState
  for (const enemy of matchState.enemies) {
    if (enemy.state === 'alive' && isNoteMatch(enemy, activeNotes)) {
      const hitTimeMs = performance.now()
      const reactionMs = hitTimeMs - enemy.spawnedAtMs
      recordCorrectHit(reactionMs)
      playCorrect()
      // Check if this damage will kill the enemy (hp 1 → 0)
      if (enemy.hp <= 1) {
        playEnemyDeath()
      }
      useBoundStore.getState().damageEnemy(enemy.id, 1)
    }
  }

  // -------------------------------------------------------------------
  // Step 5: Wrong note detection — only triggers on new NoteOn events
  // -------------------------------------------------------------------
  const eventState = useBoundStore.getState()
  const { events } = eventState
  const aliveEnemies = eventState.enemies.filter((e) => e.state === 'alive')

  let latestEventTs = lastCheckedEventTs
  let wrongNoteDetected = false

  for (const event of events) {
    if (event.type === 'NoteOn' && event.timestamp > lastCheckedEventTs) {
      // This is a new NoteOn event
      if (event.timestamp > latestEventTs) {
        latestEventTs = event.timestamp
      }
      // Check if this note matches any alive enemy
      const matchesAnyEnemy = aliveEnemies.some(
        (enemy) =>
          enemy.targetNote === event.note ||
          (enemy.targetNotes !== undefined &&
            (enemy.targetNotes[0] === event.note ||
              enemy.targetNotes[1] === event.note)),
      )
      if (!matchesAnyEnemy && aliveEnemies.length > 0) {
        wrongNoteDetected = true
        recordMiss(event.noteName)
      }
    }
  }

  lastCheckedEventTs = latestEventTs

  if (wrongNoteDetected) {
    playWrong()
    useBoundStore.getState().triggerWrongNote()
  }

  // -------------------------------------------------------------------
  // Step 6: Tick dying enemies (count down their death animation)
  // -------------------------------------------------------------------
  useBoundStore.getState().tickDyingEnemies()

  // -------------------------------------------------------------------
  // Step 7: Remove dead enemies
  // -------------------------------------------------------------------
  useBoundStore.getState().removeDeadEnemies()

  // -------------------------------------------------------------------
  // Step 8: Tick wrong note flash
  // -------------------------------------------------------------------
  useBoundStore.getState().tickWrongNoteFlash()

  // -------------------------------------------------------------------
  // Step 9: Check wave complete
  // -------------------------------------------------------------------
  const waveCheckState = useBoundStore.getState()
  if (
    waveCheckState.spawnQueue.length === 0 &&
    waveCheckState.enemies.length === 0 &&
    waveCheckState.gamePhase === 'playing'
  ) {
    const nextWaveIndex = waveCheckState.currentWave + 1
    if (nextWaveIndex < waveCheckState.totalWaves) {
      // More waves remain — show wave-clear screen
      playWaveEnd()
      useBoundStore.setState({ gamePhase: 'wave-clear' })
    } else {
      // All waves complete — compute stats and transition to level-complete
      playWaveEnd()
      const result = computeLevelResult(waveCheckState.currentLevel)
      useBoundStore.getState().recordLevelComplete(waveCheckState.currentLevel, result)
      useBoundStore.setState({ gamePhase: 'level-complete', lastLevelResult: result })
    }
  }

  // Track phase for next tick's transition detection
  prevGamePhase = useBoundStore.getState().gamePhase
}

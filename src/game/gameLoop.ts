import { useBoundStore } from '../stores'
import { isNoteMatch } from './noteMatch'

// Module-level state for wrong-note detection
// Tracks the timestamp of the last NoteOn event we already processed
let lastCheckedEventTs = 0

/**
 * Fixed-timestep game update function.
 * Called with a constant dt (milliseconds) each tick by the rAF loop in GameCanvas.
 * Reads Zustand state fresh at each step — do NOT cache getState() at function top.
 */
export function update(dt: number): void {
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
  // -------------------------------------------------------------------
  const postMoveState = useBoundStore.getState()
  for (const enemy of postMoveState.enemies) {
    if (enemy.pathT >= 1.0 && enemy.state === 'alive') {
      useBoundStore.getState().enemyReachedGoal(enemy.id)
    }
  }

  // -------------------------------------------------------------------
  // Step 4: Check note matches — damage enemies that match active notes
  // -------------------------------------------------------------------
  const matchState = useBoundStore.getState()
  const { activeNotes } = matchState
  for (const enemy of matchState.enemies) {
    if (enemy.state === 'alive' && isNoteMatch(enemy, activeNotes)) {
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
      }
    }
  }

  lastCheckedEventTs = latestEventTs

  if (wrongNoteDetected) {
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
      useBoundStore.setState({ gamePhase: 'wave-clear' })
    } else {
      // All waves complete — level done
      useBoundStore.setState({ gamePhase: 'idle' })
    }
  }
}

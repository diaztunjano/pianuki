import { create, StateCreator } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { enableMapSet } from 'immer'
import { Enemy, EnemySpawnEntry, buildEnemy } from '../game/enemyTypes'
import { LEVEL_CONFIGS } from '../game/waveConfig'

// Enable immer support for Set/Map (needed for activeNotes: Set<number>)
enableMapSet()

// --- Shared Event Type ---

/**
 * Unified input event produced by both mic (pitch detection) and MIDI pipelines.
 * Both audio hooks write to this type via addEvent so the rest of the app
 * doesn't need to know which input source is active.
 */
export interface InputEvent {
  type: 'NoteOn' | 'NoteOff'
  note: number         // MIDI note number 21–108
  noteName: string     // e.g. "C4", "A#3"
  source: 'mic' | 'midi'
  frequency?: number   // Hz — mic input only
  confidence?: number  // 0–1 clarity — mic input only
  timestamp: number    // performance.now()
}

// --- Audio Slice ---

interface AudioSlice {
  activeNotes: Set<number>  // MIDI note numbers currently held
  events: InputEvent[]      // Rolling buffer, last 50 events
  addEvent: (event: InputEvent) => void
}

const createAudioSlice: StateCreator<
  BoundStore,
  [['zustand/devtools', never], ['zustand/immer', never]],
  [],
  AudioSlice
> = (set) => ({
  activeNotes: new Set<number>(),
  events: [],
  addEvent: (event) =>
    set(
      (state) => {
        // CRITICAL: Always create a new Set — Zustand uses reference equality.
        // Mutating the existing set does not trigger re-renders.
        const newNotes = new Set(state.activeNotes)
        if (event.type === 'NoteOn') {
          newNotes.add(event.note)
        } else {
          newNotes.delete(event.note)
        }
        return {
          activeNotes: newNotes,
          events: [...state.events, event].slice(-50), // Keep last 50
        }
      },
      false,
      'audio/addEvent',
    ),
})

// --- Game Slice ---

interface GameSlice {
  // FSM state
  gamePhase: 'idle' | 'playing' | 'paused' | 'wave-clear' | 'gameover'

  // Player state
  playerHP: number
  maxPlayerHP: number

  // Wave / level state
  currentWave: number
  totalWaves: number
  currentLevel: number

  // Enemy state
  enemies: Enemy[]
  spawnQueue: EnemySpawnEntry[]
  spawnAccumulator: number
  spawnIntervalMs: number

  // Visual feedback
  wrongNoteFlashFrames: number

  // Actions
  startGame: (levelIndex: number) => void
  pauseGame: () => void
  resumeGame: () => void
  advanceWave: () => void
  spawnEnemy: (entry: EnemySpawnEntry) => void
  damageEnemy: (id: string, damage: number) => void
  tickDyingEnemies: () => void
  removeDeadEnemies: () => void
  enemyReachedGoal: (id: string) => void
  triggerWrongNote: () => void
  tickWrongNoteFlash: () => void
  resetGame: () => void
}

const createGameSlice: StateCreator<
  BoundStore,
  [['zustand/devtools', never], ['zustand/immer', never]],
  [],
  GameSlice
> = (set) => ({
  // --- Default state ---
  gamePhase: 'idle',
  playerHP: 5,
  maxPlayerHP: 5,
  currentWave: 0,
  totalWaves: 0,
  currentLevel: 0,
  enemies: [],
  spawnQueue: [],
  spawnAccumulator: 0,
  spawnIntervalMs: 2000,
  wrongNoteFlashFrames: 0,

  // --- Actions ---

  startGame: (levelIndex) =>
    set(
      (draft) => {
        const level = LEVEL_CONFIGS[levelIndex]
        if (!level) return
        const wave = level.waves[0]
        draft.gamePhase = 'playing'
        draft.playerHP = draft.maxPlayerHP
        draft.currentLevel = levelIndex
        draft.currentWave = 0
        draft.totalWaves = level.waves.length
        draft.enemies = []
        draft.spawnQueue = [...wave.enemies]
        draft.spawnIntervalMs = wave.spawnIntervalMs
        draft.spawnAccumulator = 0
        draft.wrongNoteFlashFrames = 0
      },
      false,
      'game/startGame',
    ),

  pauseGame: () =>
    set(
      (draft) => {
        if (draft.gamePhase === 'playing') {
          draft.gamePhase = 'paused'
        }
      },
      false,
      'game/pauseGame',
    ),

  resumeGame: () =>
    set(
      (draft) => {
        if (draft.gamePhase === 'paused') {
          draft.gamePhase = 'playing'
        }
      },
      false,
      'game/resumeGame',
    ),

  advanceWave: () =>
    set(
      (draft) => {
        const level = LEVEL_CONFIGS[draft.currentLevel]
        if (!level) return
        const nextWaveIndex = draft.currentWave + 1
        if (nextWaveIndex < level.waves.length) {
          const nextWave = level.waves[nextWaveIndex]
          draft.currentWave = nextWaveIndex
          draft.spawnQueue = [...nextWave.enemies]
          draft.spawnIntervalMs = nextWave.spawnIntervalMs
          draft.spawnAccumulator = 0
          draft.gamePhase = 'playing'
        } else {
          // All waves complete — return to menu (level clear)
          draft.gamePhase = 'idle'
        }
      },
      false,
      'game/advanceWave',
    ),

  spawnEnemy: (entry) =>
    set(
      (draft) => {
        draft.enemies.push(buildEnemy(entry))
      },
      false,
      'game/spawnEnemy',
    ),

  damageEnemy: (id, damage) =>
    set(
      (draft) => {
        const enemy = draft.enemies.find((e: Enemy) => e.id === id)
        if (!enemy) return
        enemy.hp -= damage
        if (enemy.hp <= 0) {
          enemy.state = 'dying'
          enemy.defeatedFrames = 12
        }
      },
      false,
      'game/damageEnemy',
    ),

  tickDyingEnemies: () =>
    set(
      (draft) => {
        for (const enemy of draft.enemies) {
          if (enemy.state === 'dying') {
            enemy.defeatedFrames -= 1
            if (enemy.defeatedFrames <= 0) {
              enemy.state = 'dead'
            }
          }
        }
      },
      false,
      'game/tickDyingEnemies',
    ),

  removeDeadEnemies: () =>
    set(
      (draft) => {
        draft.enemies = draft.enemies.filter((e: Enemy) => e.state !== 'dead')
      },
      false,
      'game/removeDeadEnemies',
    ),

  enemyReachedGoal: (id) =>
    set(
      (draft) => {
        const enemy = draft.enemies.find((e: Enemy) => e.id === id)
        if (enemy) {
          enemy.state = 'dead'
        }
        draft.playerHP -= 1
        if (draft.playerHP <= 0) {
          draft.gamePhase = 'gameover'
        }
      },
      false,
      'game/enemyReachedGoal',
    ),

  triggerWrongNote: () =>
    set(
      (draft) => {
        draft.wrongNoteFlashFrames = 8
      },
      false,
      'game/triggerWrongNote',
    ),

  tickWrongNoteFlash: () =>
    set(
      (draft) => {
        if (draft.wrongNoteFlashFrames > 0) {
          draft.wrongNoteFlashFrames -= 1
        }
      },
      false,
      'game/tickWrongNoteFlash',
    ),

  resetGame: () =>
    set(
      (draft) => {
        draft.gamePhase = 'idle'
        draft.playerHP = 5
        draft.maxPlayerHP = 5
        draft.currentWave = 0
        draft.totalWaves = 0
        draft.currentLevel = 0
        draft.enemies = []
        draft.spawnQueue = []
        draft.spawnAccumulator = 0
        draft.spawnIntervalMs = 2000
        draft.wrongNoteFlashFrames = 0
      },
      false,
      'game/resetGame',
    ),
})

// --- Bound Store ---

type BoundStore = AudioSlice & GameSlice

export const useBoundStore = create<BoundStore>()(
  devtools(
    immer((...args) => ({
      ...createAudioSlice(...args),
      ...createGameSlice(...args),
    })),
    { name: 'pianuki-store' },
  ),
)

// Convenience selectors
export const useActiveNotes = () => useBoundStore((s) => s.activeNotes)
export const useEvents = () => useBoundStore((s) => s.events)
export const useAddEvent = () => useBoundStore((s) => s.addEvent)

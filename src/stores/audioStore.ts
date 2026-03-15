import { create, StateCreator } from 'zustand'
import { devtools, persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { enableMapSet } from 'immer'
import { Enemy, EnemySpawnEntry, buildEnemy } from '../game/enemyTypes'
import { LEVEL_CONFIGS } from '../game/waveConfig'
import { resetStats } from '../game/statsTracker'

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

// --- Progress Types ---

export interface LevelRecord {
  completed: boolean
  stars: number           // 0-3
  bestAccuracy: number    // 0-100
  bestReactionMs: number
  playCount: number
  totalPlayTimeMs: number
}

export interface LevelResult {
  levelIndex: number
  accuracy: number        // 0-100
  avgReactionMs: number
  durationMs: number
  noteMisses: Record<string, number>
}

export interface PersistedState {
  progress: {
    levels: Record<number, LevelRecord>
    totalPlayTimeMs: number
    noteMissCounts: Record<string, number>
  }
  settings: {
    penaltyMode: 'easy' | 'normal' | 'hard'
    inputSource: 'mic' | 'midi'
    latencyOffsetMs: number
    hasSeenOnboarding: boolean
    sfxEnabled: boolean
    sfxVolume: number              // 0..1, default 0.5
  }
}

function computeStars(accuracy: number): 0 | 1 | 2 | 3 {
  if (accuracy >= 90) return 3
  if (accuracy >= 75) return 2
  if (accuracy >= 50) return 1
  return 0
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
  gamePhase: 'idle' | 'playing' | 'paused' | 'wave-clear' | 'gameover' | 'level-complete'

  // Screen navigation
  currentScreen: 'levelSelect' | 'game' | 'stats'

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

  // Level result — populated on level completion, read by LevelSummaryScreen
  lastLevelResult: LevelResult | null

  // Actions
  navigateTo: (screen: 'levelSelect' | 'game' | 'stats') => void
  startLevel: (levelIndex: number) => void
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
  currentScreen: 'levelSelect',
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
  lastLevelResult: null,

  // --- Actions ---

  navigateTo: (screen) =>
    set(
      (draft) => {
        draft.currentScreen = screen
      },
      false,
      'game/navigateTo',
    ),

  startLevel: (levelIndex) => {
    resetStats()
    set(
      (draft) => {
        const level = LEVEL_CONFIGS[levelIndex]
        if (!level) return
        const wave = level.waves[0]
        draft.currentScreen = 'game'
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
        draft.lastLevelResult = null
      },
      false,
      'game/startLevel',
    )
  },

  startGame: (levelIndex) => {
    resetStats()
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
        draft.lastLevelResult = null
      },
      false,
      'game/startGame',
    )
  },

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
          // All waves complete — level complete
          draft.gamePhase = 'level-complete'
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
        draft.lastLevelResult = null
      },
      false,
      'game/resetGame',
    ),
})

// --- Progress Slice ---

interface ProgressSlice {
  progress: {
    levels: Record<number, LevelRecord>
    totalPlayTimeMs: number
    noteMissCounts: Record<string, number>
  }
  recordLevelComplete: (levelIndex: number, result: LevelResult) => void
  resetProgress: () => void
}

const defaultProgress: ProgressSlice['progress'] = {
  levels: {},
  totalPlayTimeMs: 0,
  noteMissCounts: {},
}

const createProgressSlice: StateCreator<
  BoundStore,
  [['zustand/devtools', never], ['zustand/immer', never]],
  [],
  ProgressSlice
> = (set) => ({
  progress: defaultProgress,

  recordLevelComplete: (levelIndex, result) =>
    set(
      (draft) => {
        const stars = computeStars(result.accuracy)
        const existing = draft.progress.levels[levelIndex]

        if (existing) {
          // Keep best stats
          existing.completed = true
          existing.stars = Math.max(existing.stars, stars)
          existing.bestAccuracy = Math.max(existing.bestAccuracy, result.accuracy)
          // Lower reaction time is better; only update if we have a valid time
          if (result.avgReactionMs > 0) {
            existing.bestReactionMs =
              existing.bestReactionMs === 0
                ? result.avgReactionMs
                : Math.min(existing.bestReactionMs, result.avgReactionMs)
          }
          existing.playCount += 1
          existing.totalPlayTimeMs += result.durationMs
        } else {
          draft.progress.levels[levelIndex] = {
            completed: true,
            stars,
            bestAccuracy: result.accuracy,
            bestReactionMs: result.avgReactionMs,
            playCount: 1,
            totalPlayTimeMs: result.durationMs,
          }
        }

        // Accumulate global play time
        draft.progress.totalPlayTimeMs += result.durationMs

        // Accumulate global note miss counts
        for (const [noteName, count] of Object.entries(result.noteMisses)) {
          draft.progress.noteMissCounts[noteName] =
            (draft.progress.noteMissCounts[noteName] ?? 0) + count
        }
      },
      false,
      'progress/recordLevelComplete',
    ),

  resetProgress: () =>
    set(
      (draft) => {
        draft.progress = { ...defaultProgress, levels: {}, noteMissCounts: {} }
      },
      false,
      'progress/resetProgress',
    ),
})

// --- Settings Slice ---

interface SettingsSlice {
  settings: {
    penaltyMode: 'easy' | 'normal' | 'hard'
    inputSource: 'mic' | 'midi'
    latencyOffsetMs: number        // range -200..200, default 0
    hasSeenOnboarding: boolean     // first-run gate, default false
    sfxEnabled: boolean            // toggle SFX independently from mic, default true
    sfxVolume: number              // 0..1, default 0.5
  }
  setPenaltyMode: (mode: 'easy' | 'normal' | 'hard') => void
  setInputSource: (source: 'mic' | 'midi') => void
  setLatencyOffset: (ms: number) => void
  markOnboardingSeen: () => void
  setSfxEnabled: (enabled: boolean) => void
  setSfxVolume: (volume: number) => void
}

const createSettingsSlice: StateCreator<
  BoundStore,
  [['zustand/devtools', never], ['zustand/immer', never]],
  [],
  SettingsSlice
> = (set) => ({
  settings: {
    penaltyMode: 'normal',
    inputSource: 'mic',
    latencyOffsetMs: 0,
    hasSeenOnboarding: false,
    sfxEnabled: true,
    sfxVolume: 0.5,
  },

  setPenaltyMode: (mode) =>
    set(
      (draft) => {
        draft.settings.penaltyMode = mode
      },
      false,
      'settings/setPenaltyMode',
    ),

  setInputSource: (source) =>
    set(
      (draft) => {
        draft.settings.inputSource = source
      },
      false,
      'settings/setInputSource',
    ),

  setLatencyOffset: (ms) =>
    set(
      (draft) => {
        draft.settings.latencyOffsetMs = ms
      },
      false,
      'settings/setLatencyOffset',
    ),

  markOnboardingSeen: () =>
    set(
      (draft) => {
        draft.settings.hasSeenOnboarding = true
      },
      false,
      'settings/markOnboardingSeen',
    ),

  setSfxEnabled: (enabled) =>
    set(
      (draft) => {
        draft.settings.sfxEnabled = enabled
      },
      false,
      'settings/setSfxEnabled',
    ),

  setSfxVolume: (volume) =>
    set(
      (draft) => {
        draft.settings.sfxVolume = Math.max(0, Math.min(1, volume))
      },
      false,
      'settings/setSfxVolume',
    ),
})

// --- Bound Store ---

type BoundStore = AudioSlice & GameSlice & ProgressSlice & SettingsSlice

export const useBoundStore = create<BoundStore>()(
  devtools(
    persist(
      immer((...args) => ({
        ...createAudioSlice(...args),
        ...createGameSlice(...args),
        ...createProgressSlice(...args),
        ...createSettingsSlice(...args),
      })),
      {
        name: 'pianuki-progress',
        storage: createJSONStorage(() => localStorage),
        version: 3,
        partialize: (state): PersistedState => ({
          progress: state.progress,
          settings: state.settings,
        }),
        migrate: (persistedState, version) => {
          const state = persistedState as PersistedState
          if (version < 2) {
            state.settings.latencyOffsetMs = state.settings.latencyOffsetMs ?? 0
            state.settings.hasSeenOnboarding = state.settings.hasSeenOnboarding ?? false
          }
          if (version < 3) {
            state.settings.sfxEnabled = state.settings.sfxEnabled ?? true
            state.settings.sfxVolume = state.settings.sfxVolume ?? 0.5
          }
          return state
        },
      },
    ),
    { name: 'pianuki-store' },
  ),
)

// Convenience selectors
export const useActiveNotes = () => useBoundStore((s) => s.activeNotes)
export const useEvents = () => useBoundStore((s) => s.events)
export const useAddEvent = () => useBoundStore((s) => s.addEvent)

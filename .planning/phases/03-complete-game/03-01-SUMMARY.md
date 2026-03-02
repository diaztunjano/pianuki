---
phase: 03-complete-game
plan: 01
subsystem: state
tags: [zustand, persist, localStorage, typescript, game-logic]

# Dependency graph
requires:
  - phase: 02-core-loop
    provides: AudioSlice and GameSlice as base store, enemy types and wave configs

provides:
  - ProgressSlice with LevelRecord, LevelResult, computeStars, recordLevelComplete, resetProgress
  - SettingsSlice with penaltyMode, inputSource settings and setters
  - Zustand persist middleware writing 'pianuki-progress' to localStorage
  - currentScreen navigation field and navigateTo, startLevel actions on GameSlice
  - 'level-complete' as new gamePhase value
  - 5 LevelConfig entries (Meadow, Forest, Mountain, Storm, Summit) with names and noteRangeLabel
  - Enemy.spawnedAtMs for reaction time calculation
  - statsTracker module with 5 accumulator functions for 60fps game loop

affects:
  - 03-02 (screen components depend on currentScreen, ProgressSlice)
  - 03-03 (game loop uses spawnedAtMs, statsTracker, recordLevelComplete)
  - 03-04 (settings UI depends on SettingsSlice)
  - 03-05 (level select screen depends on LEVEL_CONFIGS names/labels)

# Tech tracking
tech-stack:
  added: [zustand/middleware persist, createJSONStorage]
  patterns:
    - devtools(persist(immer())) middleware ordering — devtools outermost, persist middle, immer innermost
    - partialize restricts persistence to only progress + settings slices, excludes all runtime state
    - Module-level accumulators in statsTracker for zero-overhead 60fps stats collection
    - computeStars pure function (>= 90 = 3 stars, >= 75 = 2, >= 50 = 1, else 0)

key-files:
  created:
    - src/game/statsTracker.ts
  modified:
    - src/stores/audioStore.ts
    - src/game/waveConfig.ts
    - src/game/enemyTypes.ts

key-decisions:
  - "devtools(persist(immer())) ordering chosen per Zustand docs — individual slices keep only devtools+immer mutator tuples"
  - "statsTracker uses module-level variables (not React state) to avoid re-render overhead during 60fps game loop"
  - "advanceWave now sets 'level-complete' instead of 'idle' so game can show stats screen before returning to menu"
  - "startLevel is new entry point (sets currentScreen to 'game' then starts wave); startGame preserved for backward compat"
  - "partialize: only persist progress + settings; exclude enemies, events, activeNotes, gamePhase, currentScreen"

patterns-established:
  - "Level config pattern: each level has levelIndex, name, noteRangeLabel, allowedNotes, waves"
  - "Stats accumulator pattern: module-level vars + reset/record/compute functions = zero React overhead"
  - "bestReactionMs tracks lowest non-zero time (lower is better); bestAccuracy tracks highest (higher is better)"

requirements-completed: [PROG-01, PROG-04, SETT-03]

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 3 Plan 01: Data/Logic Backbone Summary

**Zustand store expanded with persist middleware + 4 slices (Audio, Game, Progress, Settings), 5-level wave config with names and black keys, Enemy spawn timestamps, and a module-level stats accumulator for the 60fps game loop**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-02T18:58:41Z
- **Completed:** 2026-03-02T19:01:05Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Zustand store restructured with `devtools(persist(immer()))` middleware stack writing `pianuki-progress` to localStorage
- ProgressSlice tracks per-level stars/accuracy/reaction time and global play time/note miss counts
- SettingsSlice holds penaltyMode and inputSource with setters
- GameSlice extended with `currentScreen`, `navigateTo`, `startLevel`, and `'level-complete'` phase
- 5 levels (Meadow, Forest, Mountain, Storm, Summit) with names, note range labels, and escalating difficulty including black keys in levels 3-4
- `buildEnemy()` sets `spawnedAtMs: performance.now()` for reaction time calculation
- `statsTracker.ts` provides zero-overhead accumulator functions outside React reconciler

## Task Commits

Each task was committed atomically:

1. **Task 1: Expand Zustand store with persist, ProgressSlice, SettingsSlice, currentScreen** - `96f8faf` (feat)
2. **Task 2: Expand level configs to 5 levels, add spawnedAtMs, create statsTracker** - `c76ae89` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/stores/audioStore.ts` - Added ProgressSlice, SettingsSlice, persist middleware, currentScreen, navigateTo, startLevel, 'level-complete' phase; exports LevelRecord, LevelResult, PersistedState
- `src/game/waveConfig.ts` - Added name + noteRangeLabel to LevelConfig; expanded to 5 levels (Meadow, Forest, Mountain, Storm, Summit)
- `src/game/enemyTypes.ts` - Added spawnedAtMs field to Enemy interface; buildEnemy sets it via performance.now()
- `src/game/statsTracker.ts` - New module: resetStats, recordEnemySpawned, recordCorrectHit, recordMiss, computeLevelResult

## Decisions Made

- `devtools(persist(immer()))` ordering per Zustand docs; individual slices retain only `[['zustand/devtools', never], ['zustand/immer', never]]` mutator tuples — persist is only at create() level
- `statsTracker` uses module-level variables rather than React state to avoid triggering re-renders at 60fps; reset/compute functions are called explicitly at level start/end
- `advanceWave` now sets `'level-complete'` instead of `'idle'` so future stats screen can render before returning to menu
- `startLevel` is the new primary entry point from level select; it sets `currentScreen: 'game'` then sets up wave state; `startGame` remains unchanged for backward compatibility
- `partialize` explicitly excludes runtime state (enemies, events, activeNotes, gamePhase, currentScreen, spawnQueue, etc.) from localStorage

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. tsc passed cleanly on both tasks.

## Next Phase Readiness

- All data/type infrastructure for Phase 3 is ready
- 03-02 can build screen components using `currentScreen` and `ProgressSlice`
- 03-03 game loop can integrate `spawnedAtMs`, `statsTracker`, and `recordLevelComplete`
- 03-04 can wire settings UI to `SettingsSlice`
- 03-05 level select can render from `LEVEL_CONFIGS` names and noteRangeLabel

---
*Phase: 03-complete-game*
*Completed: 2026-03-02*

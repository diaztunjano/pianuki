---
phase: 03-complete-game
plan: 02
subsystem: game-logic
tags: [zustand, typescript, game-loop, penalty-mode, stats-tracking, screen-navigation]

# Dependency graph
requires:
  - phase: 03-01
    provides: statsTracker module, penaltyMode setting, currentScreen navigation, LevelResult type, spawnedAtMs on Enemy

provides:
  - gameLoop with penalty mode branching (easy/normal/hard) and 3-loop failsafe for hard mode
  - Stats tracking integration (recordEnemySpawned, recordCorrectHit, recordMiss per game loop step)
  - Level completion transition to 'level-complete' with LevelResult stored in lastLevelResult
  - resetStats() called on every startLevel/startGame invocation
  - AppShell multi-screen navigation (levelSelect, game, stats) driven by currentScreen
  - Stub LevelSelectScreen and StatsScreen components (replaced by Plans 03-03 and 03-05)

affects:
  - 03-03 (LevelSummaryScreen reads lastLevelResult from GameSlice)
  - 03-04 (SettingsScreen reads penaltyMode; behavior now wired into game loop)
  - 03-05 (LevelSelectScreen stub to be replaced with full implementation)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - penaltyMode branching in game loop — easy (silent kill), normal (HP damage), hard (loop back with 3x failsafe → HP damage)
    - Stats recorded at exact step boundaries — spawn at Step 1, hits at Step 4, misses at Step 5
    - reactionMs computed as performance.now() - enemy.spawnedAtMs at hit moment (not at event processing)
    - lastLevelResult stored in GameSlice for screen-to-screen result passing without prop drilling
    - Screen switching via currentScreen selector — no router, purely Zustand-driven

key-files:
  created: []
  modified:
    - src/game/gameLoop.ts
    - src/components/AppShell.tsx
    - src/stores/audioStore.ts
    - src/game/enemyTypes.ts

key-decisions:
  - "penaltyMode branching placed in Step 3 (enemy-reached-goal) — single point of divergence, clean isolation from other steps"
  - "hard mode 3-loop failsafe converts to normal HP damage after 3 loops — prevents infinite loop soft-lock"
  - "lastLevelResult stored in GameSlice (not ProgressSlice) — runtime result, not persisted, screen reads it then navigates away"
  - "Stub LevelSelectScreen/StatsScreen inline in AppShell — temporary, clearly commented, replaced by Plans 03-03/03-05"
  - "resetStats() called outside immer set() callback to avoid side effects inside draft mutations"

patterns-established:
  - "Side-effect calls (resetStats) before set() callback — pure state mutations inside immer draft, side effects outside"
  - "loopCount initialized via nullish coalescing: (e.loopCount ?? 0) + 1 — no default needed in Enemy type"

requirements-completed: [SETT-01, SETT-02]

# Metrics
duration: 6min
completed: 2026-03-02
---

# Phase 3 Plan 02: Game Loop Integration and AppShell Navigation Summary

**Game loop wired with penalty mode branching (easy/normal/hard + 3-loop failsafe), per-step stats tracking via statsTracker, and level-complete transition storing LevelResult; AppShell restructured for three-screen navigation driven by currentScreen**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-03-02T19:04:29Z
- **Completed:** 2026-03-02T19:10:17Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Game loop branches on `penaltyMode` at Step 3: easy (silent kill), normal (existing HP damage), hard (reset pathT to 0 with 3-loop failsafe converting to HP damage)
- Stats tracked at each game loop step: `recordEnemySpawned()` at spawn, `recordCorrectHit(reactionMs)` at hit, `recordMiss(noteName)` at wrong note
- Level completion now computes `LevelResult`, calls `recordLevelComplete()` to persist, and stores `lastLevelResult` in GameSlice for the summary screen
- `resetStats()` called at the start of `startLevel()` and `startGame()` (outside immer draft to avoid side effects)
- AppShell renders `LevelSelectScreen`, `game` view, or `StatsScreen` based on `currentScreen` from store
- Audio input hooks (`useMidiInput`, `useAudioInput`) remain at AppShell level — always active across all screens

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire penalty mode and stats tracking into gameLoop** - `d08f96a` (feat)
2. **Task 2: Restructure AppShell for multi-screen navigation** - `c6e4ff4` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/game/gameLoop.ts` - Added statsTracker imports, penalty mode branching in Step 3, reactionMs tracking in Step 4, recordMiss in Step 5, level-complete transition in Step 9
- `src/components/AppShell.tsx` - Added currentScreen selector, stub LevelSelectScreen + StatsScreen, conditional rendering per screen
- `src/stores/audioStore.ts` - Added `lastLevelResult: LevelResult | null` to GameSlice interface/defaults; `resetStats()` called in startLevel/startGame; `lastLevelResult: null` in resetGame
- `src/game/enemyTypes.ts` - Added `loopCount?: number` to Enemy interface for hard-mode loop protection

## Decisions Made

- `penaltyMode` branching placed entirely in Step 3 (enemy-reached-goal check) — single divergence point, no changes to Steps 4-8
- Hard mode 3-loop failsafe: after 3 loops, enemy dies and player takes HP damage (same as normal) — prevents infinite soft-lock
- `lastLevelResult` lives in GameSlice (runtime state, not persisted) — summary screen reads it after `level-complete` transition then user navigates away
- Stub screens defined inline in AppShell with clear comments ("replaced by Plans 03-03/03-05") — avoids circular dependencies before those plans run
- `resetStats()` called before the `set()` callback in `startLevel`/`startGame` — keeps immer drafts pure, no side effects inside draft mutation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. tsc passed cleanly on both tasks.

## Next Phase Readiness

- Game loop is fully wired: spawn tracking, hit tracking, miss tracking, penalty branching, level completion
- `lastLevelResult` is available for 03-03 (LevelSummaryScreen) to read and display
- `currentScreen` navigation is operational: `levelSelect` on load, switches to `game` via `startLevel()`, can go to `stats`
- Stub screens in AppShell give a working navigation skeleton until 03-03/03-05 replace them

## Self-Check: PASSED

- 03-02-SUMMARY.md: FOUND
- gameLoop.ts: FOUND
- AppShell.tsx: FOUND
- audioStore.ts: FOUND
- enemyTypes.ts: FOUND
- Commit d08f96a: FOUND
- Commit c6e4ff4: FOUND

---
*Phase: 03-complete-game*
*Completed: 2026-03-02*

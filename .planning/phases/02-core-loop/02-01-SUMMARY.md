---
phase: 02-core-loop
plan: 01
subsystem: game-state
tags: [zustand, immer, game-state, enemy-types, wave-config, note-matching]
dependency_graph:
  requires: [01-01-SUMMARY.md]
  provides: [enemy-types, wave-config, note-matching, game-slice]
  affects: [02-02-PLAN.md, 02-03-PLAN.md, 02-04-PLAN.md]
tech_stack:
  added: [immer@10.x]
  patterns: [zustand-immer-middleware, fsm-game-state, data-model-first]
key_files:
  created:
    - src/game/enemyTypes.ts
    - src/game/waveConfig.ts
    - src/game/noteMatch.ts
  modified:
    - src/stores/audioStore.ts
    - package.json
    - package-lock.json
decisions:
  - immer installed as explicit dependency (zustand v5 treats it as optional peer dep — vite build fails without it)
  - Explicit Enemy type annotations in immer draft callbacks required for strict tsc + tsc-b build
  - GameSlice actions use immer draft mutation pattern (no spread/return needed)
  - AudioSlice addEvent kept as spread/return pattern — still works correctly with immer wrapper
metrics:
  duration_seconds: 142
  duration_human: "2 min 22 sec"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 3
  completed_date: "2026-03-01"
---

# Phase 2 Plan 1: Game State Engine Summary

Full game state machine with enemy data structures, wave configurations, note-matching logic, and expanded Zustand GameSlice — built without touching any rendering or UI.

## What Was Built

### src/game/enemyTypes.ts
- `Enemy` interface: id, enemyType (note | interval), targetNote (MIDI), targetNotes (pair for chords), noteName, pathT (0-1), speed (0.00003 pathT/ms = ~33s crossing), hp, maxHp, state (alive | dying | dead), defeatedFrames, color
- `EnemySpawnEntry` blueprint interface used by wave configs
- `buildEnemy(entry)` factory: assigns UUID, initializes pathT=0, hp=1 (note) or hp=2 (interval), defeatedFrames=0

### src/game/waveConfig.ts
- `WaveConfig` interface: enemies array + spawnIntervalMs
- `LevelConfig` interface: levelIndex, allowedNotes, waves array
- `buildNoteSpawn(midiNote, color)` helper using midiNoteToName from noteUtils
- `LEVEL_CONFIGS` with 3 levels:
  - Level 0: C major triad (C4, E4, G4) — 3 waves, 3-5 enemies, 2500-2000ms intervals
  - Level 1: C major pentatonic (5 notes) — 4 waves, 4-7 enemies, 2200-1600ms
  - Level 2: Full C major octave (8 notes) — 5 waves, 5-10 enemies, 2000-1200ms
- 8-color repeating palette: red, blue, green, yellow, purple, pink, teal, orange

### src/game/noteMatch.ts
- `isNoteMatch(enemy, activeNotes)`: single-note check via Set.has(); interval check requires both targetNotes[0] and targetNotes[1] active simultaneously
- `semitoneDist(a, b)`: Math.abs(a - b)
- `INTERVAL_NAMES`: semitone → human label (min 3rd, Maj 3rd, 4th, 5th, min 6th, Maj 6th, 8ve)

### src/stores/audioStore.ts (expanded)
- `gamePhase` FSM: idle | playing | paused | wave-clear | gameover
- `playerHP` / `maxPlayerHP` (default 5)
- `currentWave`, `totalWaves`, `currentLevel`
- `enemies: Enemy[]`, `spawnQueue: EnemySpawnEntry[]`, `spawnAccumulator`, `spawnIntervalMs`
- `wrongNoteFlashFrames` for visual feedback
- Actions: startGame, pauseGame, resumeGame, advanceWave, spawnEnemy, damageEnemy, tickDyingEnemies, removeDeadEnemies, enemyReachedGoal, triggerWrongNote, tickWrongNoteFlash, resetGame
- Immer middleware wraps both slices — AudioSlice unchanged

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Explicit Enemy type annotations in immer draft callbacks**
- **Found during:** Task 2 (npm run build)
- **Issue:** `npx tsc --noEmit` passed but `tsc -b` (used by vite build) failed with TS7006 "Parameter 'e' implicitly has an 'any' type" on `.find()` and `.filter()` callbacks over immer Draft arrays
- **Fix:** Added `(e: Enemy)` explicit type annotations in `damageEnemy`, `removeDeadEnemies`, and `enemyReachedGoal` callbacks
- **Files modified:** src/stores/audioStore.ts
- **Commit:** 48584b0

**2. [Rule 3 - Blocking] Installed immer peer dependency**
- **Found during:** Task 2 (npm run build)
- **Issue:** zustand v5 treats `immer` as an optional peer dependency — vite/rollup build failed with "produce is not exported by __vite-optional-peer-dep:immer:zustand"
- **Fix:** `npm install immer`
- **Files modified:** package.json, package-lock.json
- **Commit:** 48584b0

## Verification Results

- `npx tsc --noEmit`: PASS (zero errors)
- `npm run build`: PASS (227KB bundle, 73KB gzip)
- `src/game/enemyTypes.ts` exports Enemy, EnemySpawnEntry, buildEnemy: PASS
- `src/game/waveConfig.ts` exports LEVEL_CONFIGS with 3 levels: PASS
- `src/game/noteMatch.ts` exports isNoteMatch, semitoneDist, INTERVAL_NAMES: PASS
- `src/stores/audioStore.ts` has full GameSlice FSM + all actions: PASS
- AudioSlice (activeNotes, events, addEvent) unchanged and functional: PASS

## Commits

| Hash | Description |
|------|-------------|
| 54bdfc9 | feat(02-01): add enemy types, wave config, and note matching modules |
| 48584b0 | feat(02-01): expand GameSlice with full game state machine and immer middleware |

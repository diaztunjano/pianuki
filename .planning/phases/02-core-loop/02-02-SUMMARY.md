---
phase: 02-core-loop
plan: 02
subsystem: ui
tags: [canvas, game-loop, zustand, react, typescript, animation]

# Dependency graph
requires:
  - phase: 02-01
    provides: Zustand game state engine with Enemy, spawnQueue, wave config, damage/death actions
  - phase: 01-01
    provides: useBoundStore with AudioSlice (activeNotes, events) and GameSlice foundation
provides:
  - Fixed-timestep game loop update() function in gameLoop.ts
  - Real enemy rendering on canvas (alive + dying animations)
  - Wrong-note red flash overlay (UIVS-04)
  - Canvas HUD: HP bar, wave counter, detected-note pill (AINP-07)
  - Wave completion detection with phase transitions
affects: [02-03, 02-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fixed-timestep accumulator loop in rAF: accumulate deltaTime, tick update() while >= TIMESTEP"
    - "Spiral-of-death clamp: Math.min(raw, 100) on delta before accumulation"
    - "Game logic gated by gamePhase === 'playing' — canvas renders in all states"
    - "Wrong-note detection on NoteOn events only (module-level lastCheckedEventTs) — not per-frame"
    - "State read fresh at each update step — no cached getState() across steps"

key-files:
  created:
    - src/game/gameLoop.ts
  modified:
    - src/components/GameCanvas.tsx

key-decisions:
  - "gameLoop.ts reads fresh getState() at each step — avoids stale state bugs from cached reference"
  - "Wrong-note only fires on new NoteOn events (tracked by lastCheckedEventTs) — prevents continuous wrong-note spam from held notes"
  - "Enemy rendering kept in drawFrame (GameCanvas) not gameLoop — separation of logic vs render"
  - "Dying animation: shrinking circle radius (defeatedFrames/12) + expanding white ring — matches UIVS-03 spec exactly"

patterns-established:
  - "Fixed-timestep: const TIMESTEP = 1000/60; accumulate; while(acc >= TIMESTEP) update(TIMESTEP)"
  - "Render-always, update-gated: drawFrame() called every rAF tick regardless of gamePhase; update() only when 'playing'"

requirements-completed: [GAME-01, GAME-02, GAME-03, GAME-05, GAME-08, MUSC-02, MUSC-05, UIVS-02, UIVS-03, UIVS-04, AINP-07]

# Metrics
duration: 2min
completed: 2026-03-01
---

# Phase 2 Plan 02: Game Loop Summary

**Fixed-timestep game loop with enemy path movement, note matching, defeat/wrong-note animations, and canvas HUD (HP bar, wave counter, detected note)**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-01T23:23:38Z
- **Completed:** 2026-03-01T23:25:34Z
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 rewritten)

## Accomplishments
- Implemented `update(dt)` in `gameLoop.ts` with all 9 update steps: spawn, move, goal-check, note-match, wrong-note-detect, dying-tick, dead-removal, wrong-note-flash-tick, wave-complete
- Rewrote `GameCanvas.tsx` with fixed-timestep rAF loop (TIMESTEP=16.67ms), real enemy rendering from Zustand, defeat animations (shrink + ring), red wrong-note flash overlay, and full HUD
- Zero type errors, build succeeds — game loop is production-ready

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement game loop update logic** - `2e019f3` (feat)
2. **Task 2: Rewrite GameCanvas with real enemies, HUD, visual feedback, and fixed-timestep loop** - `d68513f` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `src/game/gameLoop.ts` - Pure update(dt) module: spawn accumulator, enemy movement, goal detection, note matching, wrong-note detection, dying animation tick, wave completion
- `src/components/GameCanvas.tsx` - Rewritten: fixed-timestep rAF loop, real enemy rendering (alive+dying), wrong-note flash, HP bar, wave counter, detected-note pill

## Decisions Made
- **Fresh getState() per step:** State mutates between steps (e.g., spawnEnemy changes enemies), so each step reads fresh state rather than one cached snapshot at function start.
- **Wrong-note detection on NoteOn only:** Using `lastCheckedEventTs` module variable avoids firing triggerWrongNote() on every frame while a wrong note is held — fires once per key press.
- **Render-always, update-gated pattern:** drawFrame() runs every rAF tick so the canvas shows the current state even during idle/gameover; update() is gated by gamePhase === 'playing'.
- **Dying animation shape:** shrinkRadius = enemyRadius * (defeatedFrames/12) for the circle; ringRadius = enemyRadius * (1 + (1 - progress) * 0.8) for the expanding ring — matches the UIVS-03 spec exactly.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Game loop is fully functional. Enemies move, respond to note input, animate on defeat, and the HUD shows all required information.
- The canvas renders correctly in idle state (empty path with HUD) — ready for the game-start overlay in plan 02-03.
- No blockers. Plan 02-03 (game start overlay / wave-clear screen) can begin immediately.

---
*Phase: 02-core-loop*
*Completed: 2026-03-01*

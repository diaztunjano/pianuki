---
phase: 02-core-loop
plan: 03
subsystem: ui
tags: [react, zustand, tailwind, game-ui, overlay]

# Dependency graph
requires:
  - phase: 02-core-loop/02-01
    provides: Zustand game slice with gamePhase FSM, HP, wave state, startGame/pauseGame/resumeGame/advanceWave/resetGame actions
  - phase: 02-core-loop/02-02
    provides: GameCanvas and game loop rendering — the canvas layer that GameOverlay sits on top of
provides:
  - GameOverlay React component with idle, paused, gameover, wave-clear, and playing screens
  - ESC key pause/resume handler in AppShell (getState pattern, avoids stale closure)
  - Layered z-index strategy: canvas (base), GameOverlay (z-20), mic overlay (z-30)
affects: [02-04, 03-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Narrow Zustand selectors per field — one useBoundStore call per value prevents unnecessary re-renders"
    - "getState() in event handlers — avoids stale closure from subscribing inside useEffect"
    - "absolute inset-0 z-N layering pattern for canvas overlays"

key-files:
  created:
    - src/components/GameOverlay.tsx
  modified:
    - src/components/AppShell.tsx

key-decisions:
  - "Narrow selectors (one useBoundStore per field) in GameOverlay to avoid re-renders when unrelated state changes"
  - "ESC handler uses getState() not hook subscription — keeps event handler outside React reconciler, eliminates stale closure risk"
  - "Mic overlay bumped to z-30 so it always sits above GameOverlay (z-20) — mic enable must never be blocked by game UI"

patterns-established:
  - "GameOverlay pattern: absolute inset-0 z-20 overlay layer for game phase screens — appended after canvas, before higher z-index system overlays"
  - "ESC toggle: window keydown + getState() in cleanup-ready useEffect — canonical pattern for keyboard shortcuts in AppShell"

requirements-completed: [GAME-06, GAME-07, GAME-09]

# Metrics
duration: 1min
completed: 2026-03-01
---

# Phase 2 Plan 3: Game UI Overlays Summary

**React overlay layer with idle/pause/gameover/wave-clear screens and ESC key pause toggle, layered above the game canvas via z-index strategy**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-01T23:28:00Z
- **Completed:** 2026-03-01T23:29:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created GameOverlay.tsx with all five game-phase screens — idle, paused, gameover, wave-clear, and playing (null)
- Added ESC keydown handler in AppShell using getState() pattern to avoid stale closure
- Established z-index layering: canvas (base) → GameOverlay (z-20) → mic overlay (z-30)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create GameOverlay component with all game phase screens** - `b21a661` (feat)
2. **Task 2: Wire GameOverlay into AppShell and add ESC pause handler** - `b1db269` (feat)

**Plan metadata:** _(pending docs commit)_

## Files Created/Modified

- `src/components/GameOverlay.tsx` — Renders phase-appropriate overlay screen; returns null during playing phase
- `src/components/AppShell.tsx` — Added GameOverlay render, ESC handler useEffect, z-30 mic overlay, useBoundStore import

## Decisions Made

- Narrow Zustand selectors: one `useBoundStore((s) => s.fieldName)` call per value — prevents re-renders when unrelated state changes
- ESC handler uses `useBoundStore.getState()` inside the window event listener, not a hook subscription — canonical pattern for non-React contexts, avoids stale closure
- Mic overlay z-index bumped from z-10 to z-30 so it always sits above GameOverlay — the mic prompt must never be obscured by game UI

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Full game flow is now wired: idle start screen → click Start Game → gameplay → ESC to pause/resume → wave clear → next wave → game over → main menu
- Plan 02-04 (the final core-loop plan) can proceed with audio-game integration
- No blockers

## Self-Check: PASSED

- `src/components/GameOverlay.tsx` — FOUND
- `src/components/AppShell.tsx` — FOUND
- `.planning/phases/02-core-loop/02-03-SUMMARY.md` — FOUND
- Commit `b21a661` (Task 1) — FOUND
- Commit `b1db269` (Task 2) — FOUND

---
*Phase: 02-core-loop*
*Completed: 2026-03-01*

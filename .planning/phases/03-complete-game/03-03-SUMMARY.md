---
phase: 03-complete-game
plan: 03
subsystem: ui
tags: [react, typescript, zustand, tailwind, level-select, game-ui, path-map]

# Dependency graph
requires:
  - phase: 03-01
    provides: LEVEL_CONFIGS names/noteRangeLabel, ProgressSlice LevelRecord/stars, LevelResult type, lastLevelResult in GameSlice
  - phase: 03-02
    provides: stub LevelSelectScreen in AppShell to replace, currentScreen navigation, lastLevelResult populated on level completion

provides:
  - LevelSelectScreen with zigzag path/map layout — 5 nodes with lock status, star ratings, note range labels
  - isUnlocked logic: level 0 always unlocked; level i requires progress.levels[i-1].stars >= 1
  - LevelSummaryOverlay: end-of-level screen with accuracy, avgReactionMs, durationMs, animated 3-star rating, previous best comparison
  - GameOverlay: level-complete case rendering LevelSummaryOverlay; idle returns null; gameover uses startLevel(currentLevel) and navigateTo
  - Full navigation flow: level select -> play -> level-complete -> level select

affects:
  - 03-04 (settings gear button in LevelSelectScreen reserved, Plan 04 wires the panel)
  - 03-05 (StatsScreen stub remains in AppShell, Plan 05 replaces it)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SVG bezier path connecting node positions in level select map
    - Node positions as percentage x + absolute y — responsive layout without JS measurement
    - isUnlocked pure function reading progress.levels Record for lock check
    - AnimatedStars with staggered animationDelay inline style (400ms per star)
    - formatDuration helper for ms -> 'Xm Ys' human-readable

key-files:
  created:
    - src/components/LevelSelectScreen.tsx
    - src/components/LevelSummaryOverlay.tsx
  modified:
    - src/components/AppShell.tsx
    - src/components/GameOverlay.tsx

key-decisions:
  - "NODE_POSITIONS use percentage x + pixel y — percentages work naturally in absolute-positioned children with transform translate(-50%,-50%)"
  - "SVG path uses quadratic bezier through midpoints — smooth but simple, no cubic complexity needed for 5 nodes"
  - "LevelSummaryOverlay reads lastLevelResult directly from store — no prop drilling from GameOverlay"
  - "idle gamePhase returns null in GameOverlay — LevelSelectScreen is now the home screen, idle is just transient state"
  - "gameover Try Again uses startLevel(currentLevel) not startGame(0) — replays the level the player failed, not hardcoded level 0"

patterns-established:
  - "Path/map layout pattern: absolute-positioned nodes on relative container with SVG overlay for connecting lines"
  - "Stars display pattern: filled gold / dim white based on earned count, reused in both LevelSelect nodes and LevelSummary"

requirements-completed: [PROG-02, PROG-03]

# Metrics
duration: 5min
completed: 2026-03-02
---

# Phase 3 Plan 03: Level Select Screen and Level Summary Overlay Summary

**Path/map zigzag level select with 5 lockable nodes and end-of-level summary overlay with animated stars, accuracy stats, and previous best comparison**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-02T19:13:58Z
- **Completed:** 2026-03-02T19:19:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- LevelSelectScreen renders 5 nodes in zigzag layout (25/50/75/50/25%) with SVG bezier path connecting them
- Lock logic: level 0 always playable; higher levels unlock when previous level earned >= 1 star
- Level nodes show name, star rating (gold/dim), best accuracy%, or note range label if not completed
- LevelSummaryOverlay shows accuracy as hero stat, animated 3-star rating with 400ms stagger, avgReactionMs, formatted duration, and previous best comparison ("New best!" highlight)
- GameOverlay extended: `level-complete` renders LevelSummaryOverlay, `idle` returns null (LevelSelectScreen is now home), gameover buttons navigate correctly

## Task Commits

Each task was committed atomically:

1. **Task 1: Build LevelSelectScreen with path/map layout** - `136303d` (feat)
2. **Task 2: Build LevelSummaryOverlay and wire into GameOverlay** - `fc55dd5` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/components/LevelSelectScreen.tsx` - New: zigzag path-map level select, 5 nodes, lock/star/accuracy display, SVG connecting path, Settings+Stats top bar
- `src/components/LevelSummaryOverlay.tsx` - New: end-of-level results with animated stars, accuracy, reaction time, duration, previous best comparison, Continue/Replay buttons
- `src/components/AppShell.tsx` - Removed inline LevelSelectScreen stub; added import from LevelSelectScreen.tsx; StatsScreen stub retained for Plan 05
- `src/components/GameOverlay.tsx` - Added LevelSummaryOverlay import and level-complete case; idle returns null; gameover uses startLevel(currentLevel) and navigateTo; paused Quit uses navigateTo

## Decisions Made

- NODE_POSITIONS use percentage x + pixel y — percentages resolve naturally in absolute-positioned children without needing ResizeObserver or JS measurements
- SVG quadratic bezier path uses midpoints as control points — smooth curve through all 5 nodes with minimal math, adequate for the path-map aesthetic
- `LevelSummaryOverlay` reads `lastLevelResult` directly from the store rather than receiving it as a prop from `GameOverlay` — avoids prop drilling, consistent with established narrow selector pattern
- `idle` gamePhase now returns `null` in `GameOverlay` — with LevelSelectScreen as the home screen, `idle` is purely transient (before `startLevel` is called); the old idle overlay (PIANUKI title + Start Game) is no longer needed
- Gameover "Try Again" uses `startLevel(currentLevel)` not `startGame(0)` — replays the level the player actually failed, not hardcoded to level 0

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] SettingsPanel already integrated in GameOverlay**
- **Found during:** Task 2 (updating GameOverlay)
- **Issue:** GameOverlay had already been modified by another context to add SettingsPanel import and showSettings state — the version I had read at execution start was stale
- **Fix:** Read the current file, preserved SettingsPanel integration, applied targeted edits only to: add LevelSummaryOverlay import, add level-complete case, convert idle to null return, update gameover buttons, update paused Quit button to use navigateTo
- **Files modified:** src/components/GameOverlay.tsx
- **Verification:** tsc passes cleanly; all existing SettingsPanel functionality preserved
- **Committed in:** fc55dd5 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (file had evolved since plan was written)
**Impact on plan:** No scope change — all plan requirements met. SettingsPanel work preserved and extended correctly.

## Issues Encountered

None beyond the SettingsPanel deviation above. tsc passed cleanly on both tasks.

## Next Phase Readiness

- Level select UI is operational: 5 nodes, lock logic, star/accuracy display
- Level summary overlay is wired: appears on level completion with full stats
- Navigation flow complete: levelSelect → game → level-complete → levelSelect
- Plan 03-04 can wire the settings gear button in LevelSelectScreen (stub already in place)
- Plan 03-05 replaces the StatsScreen stub in AppShell

## Self-Check: PASSED

- LevelSelectScreen.tsx: FOUND
- LevelSummaryOverlay.tsx: FOUND
- 03-03-SUMMARY.md: FOUND
- Commit 136303d (Task 1): FOUND
- Commit fc55dd5 (Task 2): FOUND
- tsc: PASSED (zero errors)

---
*Phase: 03-complete-game*
*Completed: 2026-03-02*

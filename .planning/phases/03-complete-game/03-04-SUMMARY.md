---
phase: 03-complete-game
plan: 04
subsystem: ui
tags: [react, zustand, settings, stats, tailwind, css-animation]

# Dependency graph
requires:
  - phase: 03-01
    provides: SettingsSlice with penaltyMode/inputSource setters, ProgressSlice with per-level records and noteMissCounts
  - phase: 03-02
    provides: LevelSelectScreen stub (now replaced), AppShell multi-screen navigation, GameOverlay with pause screen

provides:
  - SettingsPanel modal overlay (z-25) with penalty mode segmented control (Easy/Normal/Hard) and input source toggle (Mic/MIDI)
  - SettingsPanel accessible from LevelSelectScreen header and GameOverlay pause menu
  - StatsScreen full stats page with per-level accuracy bars, most-missed notes top-5, and reset progress
  - star-pop @keyframes and anim-delay-* @utility CSS for sequential star animations in LevelSummaryOverlay
  - AppShell now imports real StatsScreen (stub removed)

affects:
  - 03-05 (LevelSelectScreen is now the full path/map layout from 03-03, settings wired in)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Settings modal at z-25 sits above GameOverlay (z-20) but below mic overlay (z-30) — z-index layer ordering
    - Segmented control pattern — active/inactive button styling based on current store value
    - @utility anim-delay-* Tailwind v4 utility for staggered CSS animations

key-files:
  created:
    - src/components/SettingsPanel.tsx
    - src/components/StatsScreen.tsx
  modified:
    - src/components/LevelSelectScreen.tsx
    - src/components/GameOverlay.tsx
    - src/components/AppShell.tsx
    - src/index.css

key-decisions:
  - "z-25 for SettingsPanel sits between GameOverlay (z-20) and mic overlay (z-30) — consistent layer ordering"
  - "SettingsPanel is stateless (no local state) — reads/writes Zustand SettingsSlice directly; parent manages open/close via showSettings state"
  - "StatsScreen formatPlayTime covers hours/minutes/seconds — handles zero, seconds-only, minutes-only, and hours+minutes cases"
  - "accuracyColor thresholds match computeStars: green>=75, yellow>=50, red<50 — visual consistency with star ratings"

patterns-established:
  - "Modal overlay pattern: parent holds showSettings state, passes onClose callback to child; child is pure display"
  - "Star pop animation: @keyframes star-pop + anim-delay-{N} utility enables sequential star reveals without JS timers"

requirements-completed: [SETT-01, SETT-02, SETT-03]

# Metrics
duration: 6min
completed: 2026-03-02
---

# Phase 3 Plan 04: Settings Panel and Stats Screen Summary

**SettingsPanel modal overlay (penalty mode + input source) accessible from level select and pause menu, plus full StatsScreen with per-level accuracy bars, most-missed notes, and star-pop animation CSS**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-03-02T19:14:21Z
- **Completed:** 2026-03-02T19:20:03Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- SettingsPanel.tsx renders as a fixed modal overlay at z-25 with a 3-option penalty mode segmented control (Easy/Normal/Hard) and 2-option input source toggle (Mic/MIDI); reads/writes SettingsSlice via Zustand
- Settings panel wired into LevelSelectScreen header (gear button) and GameOverlay pause screen (Settings button alongside Resume and Quit)
- StatsScreen.tsx replaces AppShell stub with a full stats page: summary row (levels completed count, formatted play time, overall accuracy), per-level horizontal accuracy bars with green/yellow/red color coding, top-5 most missed notes list, reset progress button with confirmation dialog
- index.css adds `@keyframes star-pop` (scale+rotate animation) and `@utility anim-delay-*` for staggered star reveal timing
- AppShell.tsx imports StatsScreen from ./StatsScreen (stub removed)

## Task Commits

Each task was committed atomically:

1. **Task 1: Build SettingsPanel modal and wire into level select and pause menu** - `63030ee` (feat)
2. **Task 2: Build StatsScreen, add star animation CSS, complete StatsScreen integration** - `b53a5d9` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/components/SettingsPanel.tsx` - Modal overlay with penalty mode (Easy/Normal/Hard) and input source (Mic/MIDI) segmented controls; reads/writes SettingsSlice; onClose prop pattern
- `src/components/StatsScreen.tsx` - Full stats page: summary row, per-level accuracy bars, most missed notes (top 5), reset progress with window.confirm guard
- `src/components/LevelSelectScreen.tsx` - Added useState showSettings, SettingsPanel import, gear button wired to setShowSettings(true), modal rendered inside component
- `src/components/GameOverlay.tsx` - Added useState showSettings, SettingsPanel import, Settings button in pause screen, modal rendered inside pause container; also includes 03-03 task 2 work (level-complete case, LevelSummaryOverlay, gameover uses startLevel/navigateTo)
- `src/components/AppShell.tsx` - Removed inline StatsScreen stub, imports StatsScreen from ./StatsScreen
- `src/index.css` - Added @utility anim-delay-* and @keyframes star-pop

## Decisions Made

- z-25 for SettingsPanel — sits above GameOverlay (z-20) but below mic enable overlay (z-30); maintains the established z-index layer ordering
- SettingsPanel is stateless (no internal open/close state) — parent holds `showSettings` boolean and passes `onClose` callback; clean separation of concerns
- `formatPlayTime` handles the full range: 0ms → "0m", seconds-only → "45s", minutes-only → "5m", hours+minutes → "1h 23m"
- Accuracy bar colors match computeStars thresholds (>=75 green, >=50 yellow, <50 red) — visual and logical consistency

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed unused import in SettingsPanel.tsx**
- **Found during:** Task 1 (tsc verification)
- **Issue:** `useState` imported but not used in SettingsPanel — tsc TS6133 error
- **Fix:** Removed the unused import
- **Files modified:** src/components/SettingsPanel.tsx
- **Verification:** tsc passed after removal
- **Committed in:** `63030ee` (Task 1 commit)

**2. [Rule 1 - Bug] Fixed stale selector references in GameOverlay.tsx**
- **Found during:** Task 2 (examining uncommitted 03-03 work)
- **Issue:** Working tree had `startGame(0)` and `resetGame()` calls in gameover/pause handlers but those selectors were removed; `currentLevel`, `startLevel`, `navigateTo` declared instead
- **Fix:** Verified the file was already corrected (03-03 uncommitted work had applied the fix but not committed); included in task 2 commit with LevelSummaryOverlay
- **Files modified:** src/components/GameOverlay.tsx
- **Verification:** tsc passed
- **Committed in:** `b53a5d9` (Task 2 commit — also includes LevelSummaryOverlay.tsx from 03-03 task 2 which was uncommitted)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes essential for correctness. No scope creep. Additionally committed LevelSummaryOverlay.tsx and related GameOverlay changes from 03-03 task 2 which were done but uncommitted.

## Issues Encountered

- 03-03 task 2 (LevelSummaryOverlay + GameOverlay wiring) was already implemented but not committed. These were committed as part of this plan's task 2 to bring the repo state in sync with the actual codebase.
- 03-03-SUMMARY.md was never created. Created separately as part of this execution.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Settings panel fully wired and persisted via Zustand persist middleware
- Stats screen shows all required data: levels completed, play time, accuracy per level, most missed notes
- Star animation CSS ready for LevelSummaryOverlay to use via `animate-[star-pop_0.5s_ease-out_both] anim-delay-{N}` classes
- 03-05 (full LevelSelectScreen with path/map layout) can proceed — settings integration is complete

## Self-Check: PASSED

- src/components/SettingsPanel.tsx: FOUND
- src/components/StatsScreen.tsx: FOUND
- src/components/LevelSelectScreen.tsx: FOUND (has showSettings state + SettingsPanel wiring)
- src/components/GameOverlay.tsx: FOUND (has Settings in pause, level-complete case)
- src/components/AppShell.tsx: FOUND (imports StatsScreen from ./StatsScreen)
- src/index.css: FOUND (has star-pop keyframes and anim-delay utility)
- Commit 63030ee: FOUND
- Commit b53a5d9: FOUND

---
*Phase: 03-complete-game*
*Completed: 2026-03-02*

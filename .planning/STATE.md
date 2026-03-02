# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-27)

**Core value:** A piano learner can sit at their real piano, start the game in a browser, and progressively learn music theory by playing through increasingly challenging tower defense waves that feel like a game, not a lesson.
**Current focus:** Phase 3 in progress — level select screen and level summary overlay complete

## Current Position

Phase: 3 of 4 (Complete Game) — IN PROGRESS
Plan: 3 of 5 complete (03-03 done)
Status: Executing Phase 3
Last activity: 2026-03-02 — 03-03 complete: LevelSelectScreen path/map layout, LevelSummaryOverlay with animated stars

Progress: [█████████████] ~60%

## Performance Metrics

**Velocity:**
- Total plans completed: 10
- Average duration: 2.8 min
- Total execution time: 28 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3 | 8 min | 2.7 min |
| 02-core-loop | 4 | 7 min | 1.8 min |
| 03-complete-game | 3 | 13 min | 4.3 min |

**Recent Trend:**
- Last 5 plans: 2 min, 2 min, 5 min, 2 min, 6 min, 5 min
- Trend: consistent

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Research]: MIDI-first input path recommended; acoustic microphone support is secondary (v1 ships both per requirements, but MIDI is lower-risk)
- [Research]: AudioWorklet + SharedArrayBuffer ring buffer requires COOP/COEP HTTP headers — verify deployment environment before committing to this architecture in Phase 1
- [Research]: pitchy MPM algorithm recommended for pitch detection over naive autocorrelation; accuracy must be validated empirically across 88 keys before game integration
- [01-01]: Zustand slices pattern (single store with AudioSlice + GameSlice) for unified devtools view under name 'pianuki-store'
- [01-01]: Canvas rAF loop reads Zustand via .getState() not hooks — keeps audio/render path outside React reconciler
- [01-01]: COOP/COEP headers pre-configured in vite.config.ts for future AudioWorklet support — avoids later deployment refactor
- [01-01]: Tailwind v4 via @tailwindcss/vite plugin + @config CSS directive (no PostCSS) — proven piso18 pattern
- [01-01]: import.meta.env.DEV gate on DebugPanel — tree-shaken in production, zero cost to ship
- [01-02]: useAudioInput(enabled) boolean prop — AudioContext only created after user clicks enable button (browser user-gesture requirement for AudioContext)
- [01-02]: Silence gate (RMS < 0.01) before pitchy call — avoids spurious NoteOn from background noise, reduces unnecessary CPU
- [01-02]: Clarity threshold 0.9 — high bar avoids false positives on piano overtones
- [01-02]: MIDI hook gracefully degrades on access denied (console.warn, no throw) — MIDI unavailable must not break the app
- [01-03]: MIDI verification deferred — user has no MIDI keyboard; mic path fully verified
- [01-03]: pitchy MPM accuracy confirmed on real acoustic piano — blocker resolved
- [02-01]: immer installed as explicit dependency (zustand v5 treats it as optional peer dep — vite build fails without it)
- [02-01]: Explicit Enemy type annotations in immer draft callbacks required for strict tsc -b build compatibility
- [02-01]: AudioSlice addEvent kept as spread/return pattern — still works correctly with immer wrapper
- [02-02]: gameLoop.ts reads fresh getState() at each step — avoids stale state bugs from cached reference
- [02-02]: Wrong-note detection fires on NoteOn events only (lastCheckedEventTs) — prevents continuous flash from held wrong notes
- [02-02]: Render-always, update-gated pattern — drawFrame() runs every rAF tick; update() gated by gamePhase === 'playing'
- [02-03]: Narrow selectors (one useBoundStore per field) in GameOverlay to avoid re-renders when unrelated state changes
- [02-03]: ESC handler uses getState() not hook subscription — canonical pattern for keyboard shortcuts in event listeners
- [02-03]: Mic overlay bumped to z-30 so it always sits above GameOverlay (z-20) — mic enable must never be blocked by game UI
- [02-04]: enableMapSet() required when using immer with Set/Map in Zustand — immer does not support these natively
- [02-04]: Clarity threshold tuned from 0.9 to 0.75 for real piano mic detection; silence threshold from 0.01 to 0.005
- [03-01]: devtools(persist(immer())) middleware ordering — devtools outermost, persist middle, immer innermost; individual slices retain only devtools+immer mutator tuples
- [03-01]: statsTracker uses module-level variables (not React state) to avoid re-render overhead during 60fps game loop
- [03-01]: advanceWave now sets 'level-complete' instead of 'idle' so future stats screen renders before returning to menu
- [03-01]: startLevel is new primary entry point from level select (sets currentScreen + starts wave); startGame preserved for backward compat
- [03-01]: partialize excludes all runtime state (enemies, events, activeNotes, gamePhase, currentScreen) from localStorage
- [03-02]: penaltyMode branching in Step 3 (enemy-reached-goal) — single divergence point; easy=silent kill, normal=HP damage, hard=loop back with 3x failsafe
- [03-02]: lastLevelResult stored in GameSlice (runtime, not persisted) — summary screen reads then navigates away
- [03-02]: resetStats() called outside immer set() callback — keeps draft mutations pure, no side effects inside immer
- [03-02]: Stub LevelSelectScreen/StatsScreen inline in AppShell — clearly commented, replaced by Plans 03-03/03-05
- [03-03]: NODE_POSITIONS use percentage x + pixel y for zigzag layout — no JS measurements needed, CSS resolves percentages in absolute-positioned children
- [03-03]: LevelSummaryOverlay reads lastLevelResult directly from store — avoids prop drilling through GameOverlay, consistent with narrow selector pattern
- [03-03]: idle gamePhase returns null in GameOverlay — LevelSelectScreen is now home screen; idle is purely transient before startLevel is called
- [03-03]: gameover Try Again uses startLevel(currentLevel) not startGame(0) — replays the level the player failed, not hardcoded to level 0

### Pending Todos

None.

### Blockers/Concerns

- [Phase 1]: COOP/COEP header support must be confirmed for chosen deployment host (GitHub Pages, Netlify, Vercel) before AudioWorklet ring buffer architecture is locked in

## Session Continuity

Last session: 2026-03-02
Stopped at: Completed 03-03-PLAN.md (LevelSelectScreen, LevelSummaryOverlay, GameOverlay wiring)
Resume file: .planning/phases/03-complete-game/03-04-PLAN.md

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-27)

**Core value:** A piano learner can sit at their real piano, start the game in a browser, and progressively learn music theory by playing through increasingly challenging tower defense waves that feel like a game, not a lesson.
**Current focus:** Phase 3 complete — all 7 verification tests passed; ready for Phase 4 UX Polish

## Current Position

Phase: 4 of 4 (UX Polish) — IN PROGRESS
Plan: 1 of 4 complete (04-01 done)
Status: Phase 4 in progress — latency offset and onboarding fields complete
Last activity: 2026-03-02 — 04-01 complete: SettingsSlice v2, latency slider, audio timestamp offset

Progress: [█████████████████████] ~85%

## Performance Metrics

**Velocity:**
- Total plans completed: 11
- Average duration: 2.9 min
- Total execution time: 34 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3 | 8 min | 2.7 min |
| 02-core-loop | 4 | 7 min | 1.8 min |
| 03-complete-game | 5 | ~21 min | 4.2 min |

**Recent Trend:**
- Last 5 plans: 5 min, 2 min, 6 min, 5 min, 6 min
- Trend: consistent

*Updated after each plan completion*
| Phase 03-complete-game P05 | 2 | 1 tasks | 0 files |
| Phase 04-ux-polish P01 | 2 | 2 tasks | 3 files |

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
- [03-04]: z-25 for SettingsPanel sits between GameOverlay (z-20) and mic overlay (z-30) — consistent layer ordering
- [03-04]: SettingsPanel is stateless; parent holds showSettings boolean and passes onClose callback — clean separation of concerns
- [03-04]: StatsScreen accuracyColor thresholds match computeStars: green>=75, yellow>=50, red<50 — visual and logical consistency
- [03-04]: @utility anim-delay-* Tailwind v4 syntax enables staggered CSS star animations without JS timers
- [Phase 03-complete-game]: All 7 Phase 3 verification tests passed: progression saves and persists, level select shows stars and locks, settings work and persist, stats page shows data, penalty modes work, all 5 levels available
- [Phase 04-ux-polish]: Apply latencyOffsetMs to ALL event timestamps (NoteOn and NoteOff) to keep entire event timeline consistently shifted
- [Phase 04-ux-polish]: Read latencyOffsetMs once at top of poll() frame — ensures consistent offset value across all events within one tick
- [Phase 04-ux-polish]: Persist version 2 migration uses ?? coalescing — handles both missing fields and null values from corrupted state

### Pending Todos

None.

### Blockers/Concerns

- [Phase 1]: COOP/COEP header support must be confirmed for chosen deployment host (GitHub Pages, Netlify, Vercel) before AudioWorklet ring buffer architecture is locked in

## Session Continuity

Last session: 2026-03-02
Stopped at: Completed 04-01-PLAN.md (SettingsSlice v2, latency slider, audio timestamp offset)
Resume file: .planning/phases/04-ux-polish/04-02-PLAN.md (onboarding screen)

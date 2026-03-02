# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-27)

**Core value:** A piano learner can sit at their real piano, start the game in a browser, and progressively learn music theory by playing through increasingly challenging tower defense waves that feel like a game, not a lesson.
**Current focus:** Phase 2 complete — ready for Phase 3

## Current Position

Phase: 2 of 4 (Core Loop) — COMPLETE
Plan: 4 of 4 in current phase (all done)
Status: Phase complete
Last activity: 2026-03-02 — 02-04 human verification passed, immer MapSet fix applied

Progress: [██████████] 50%

## Performance Metrics

**Velocity:**
- Total plans completed: 7
- Average duration: 2.1 min
- Total execution time: 15 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3 | 8 min | 2.7 min |
| 02-core-loop | 4 | 7 min | 1.8 min |

**Recent Trend:**
- Last 5 plans: 2 min, 1 min, 2 min, 2 min, 5 min
- Trend: consistent (02-04 longer due to bugfix)

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

### Pending Todos

None.

### Blockers/Concerns

- [Phase 1]: COOP/COEP header support must be confirmed for chosen deployment host (GitHub Pages, Netlify, Vercel) before AudioWorklet ring buffer architecture is locked in

## Session Continuity

Last session: 2026-03-02
Stopped at: Phase 3 context gathered
Resume file: .planning/phases/03-complete-game/03-CONTEXT.md

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-27)

**Core value:** A piano learner can sit at their real piano, start the game in a browser, and progressively learn music theory by playing through increasingly challenging tower defense waves that feel like a game, not a lesson.
**Current focus:** Phase 2 — Core Loop

## Current Position

Phase: 2 of 4 (Core Loop)
Plan: 2 of 4 in current phase
Status: In progress
Last activity: 2026-03-01 — 02-02 complete (game loop + canvas rendering)

Progress: [█████░░░░░] 37%

## Performance Metrics

**Velocity:**
- Total plans completed: 5
- Average duration: 2.4 min
- Total execution time: 12 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3 | 8 min | 2.7 min |
| 02-core-loop | 2 | 4 min | 2 min |

**Recent Trend:**
- Last 5 plans: 2 min, 1 min, 2 min, 2 min
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

### Pending Todos

None.

### Blockers/Concerns

- [Phase 1]: COOP/COEP header support must be confirmed for chosen deployment host (GitHub Pages, Netlify, Vercel) before AudioWorklet ring buffer architecture is locked in

## Session Continuity

Last session: 2026-03-01
Stopped at: 02-02 complete — game loop + canvas rendering done; ready for 02-03 (game-start overlay + wave-clear screen)
Resume file: .planning/phases/02-core-loop/02-03-PLAN.md

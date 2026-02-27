# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-27)

**Core value:** A piano learner can sit at their real piano, start the game in a browser, and progressively learn music theory by playing through increasingly challenging tower defense waves that feel like a game, not a lesson.
**Current focus:** Phase 1 — Foundation

## Current Position

Phase: 1 of 4 (Foundation)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-02-27 — Roadmap created

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Research]: MIDI-first input path recommended; acoustic microphone support is secondary (v1 ships both per requirements, but MIDI is lower-risk)
- [Research]: AudioWorklet + SharedArrayBuffer ring buffer requires COOP/COEP HTTP headers — verify deployment environment before committing to this architecture in Phase 1
- [Research]: pitchy MPM algorithm recommended for pitch detection over naive autocorrelation; accuracy must be validated empirically across 88 keys before game integration

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1]: COOP/COEP header support must be confirmed for chosen deployment host (GitHub Pages, Netlify, Vercel) before AudioWorklet ring buffer architecture is locked in
- [Phase 1]: pitchy MPM accuracy on a real acoustic piano in ambient noise conditions is unverified — empirical prototype required before game integration

## Session Continuity

Last session: 2026-02-27
Stopped at: Phase 1 context gathered
Resume file: .planning/phases/01-foundation/01-CONTEXT.md

---
phase: 04-ux-polish
plan: 01
subsystem: ui
tags: [zustand, settings, latency, onboarding, react, tailwind]

# Dependency graph
requires:
  - phase: 03-complete-game
    provides: SettingsSlice with penaltyMode/inputSource, SettingsPanel component, persist v1 store

provides:
  - hasSeenOnboarding boolean field in SettingsSlice (default false, persisted)
  - latencyOffsetMs number field in SettingsSlice (range -200..200, default 0, persisted)
  - setLatencyOffset and markOnboardingSeen store actions
  - PersistedState v2 with migration from v1 (fills new field defaults for existing users)
  - Latency offset range slider in SettingsPanel with live value display
  - useAudioInput applies latencyOffsetMs to all 4 event timestamp locations in poll()

affects: [04-02, 04-03, onboarding-screen, mic-explain-screen, audio-input-timing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "persist version bump with migrate function for backward-compatible schema evolution"
    - "native <input type=range> with accent-white Tailwind class for styled sliders"
    - "getState() read at top of poll() frame to capture single consistent offset value per tick"

key-files:
  created: []
  modified:
    - src/stores/audioStore.ts
    - src/components/SettingsPanel.tsx
    - src/hooks/useAudioInput.ts

key-decisions:
  - "Apply latencyOffsetMs to ALL event timestamps (NoteOn and NoteOff), not just NoteOn — keeps entire event timeline consistently shifted"
  - "Read latencyOffsetMs once at top of poll() (not inside each branch) — ensures single consistent offset value across all events within one frame"
  - "Native <input type=range> with accent-white — no external library needed for this simple slider"
  - "Persist version 2 migration uses ?? 0 and ?? false coalescing — handles both missing fields and explicitly null values from corrupted state"

patterns-established:
  - "Persist version migration: bump version number + add migrate function that fills defaults for new fields using ?? coalescing"
  - "Store field reads in rAF loops: call getState() once at top of loop function, reuse captured value within iteration"

requirements-completed: [AINP-04, AINP-06]

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 04 Plan 01: Latency Offset and Onboarding Fields Summary

**SettingsSlice v2 with latencyOffsetMs and hasSeenOnboarding persisted fields, latency slider in SettingsPanel, and offset applied to all audio timestamps in useAudioInput poll loop**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-02T22:20:38Z
- **Completed:** 2026-03-02T22:22:10Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- SettingsSlice expanded with latencyOffsetMs (0 default) and hasSeenOnboarding (false default), both persisted to localStorage
- Persist version bumped from 1 to 2 with migration function that fills defaults for existing v1 users using ?? coalescing
- Latency offset range slider (-200 to +200ms, step 10) added to SettingsPanel with live value display (+Xms / -Xms) and help text
- useAudioInput reads latencyOffsetMs from store once per poll() frame and subtracts it from all 4 timestamp locations (silence NoteOff, transition NoteOff, NoteOn, clarity-threshold NoteOff)

## Task Commits

Each task was committed atomically:

1. **Task 1: Expand SettingsSlice with hasSeenOnboarding and latencyOffsetMs, bump persist to v2** - `9e6ab3f` (feat)
2. **Task 2: Add latency slider to SettingsPanel and apply offset in useAudioInput** - `15dd14b` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/stores/audioStore.ts` - Expanded SettingsSlice interface, added latencyOffsetMs/hasSeenOnboarding fields and defaults, added setLatencyOffset/markOnboardingSeen actions, updated PersistedState type, bumped persist version to 2 with migration
- `src/components/SettingsPanel.tsx` - Added latencyOffsetMs selector, setLatencyOffset action wiring, and latency offset range slider section between Input Source and Done button
- `src/hooks/useAudioInput.ts` - Reads latencyOffsetMs from getState() at top of poll(), applies offset to all 4 performance.now() timestamp calls

## Decisions Made
- Apply offset to ALL event timestamps (NoteOn and NoteOff) to keep the entire event timeline consistently shifted — a positive latencyOffsetMs means the audio system adds delay, so timestamps are shifted back in time
- Read latencyOffsetMs once at top of poll() rather than inside each branch — ensures consistent offset value within a single frame
- Native `<input type="range">` with `accent-white` Tailwind class — no external slider library needed
- Persist migration uses `?? 0` and `?? false` coalescing — handles both missing fields and explicitly null values

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- hasSeenOnboarding field is ready for use by 04-02 (onboarding screen) — markOnboardingSeen action available
- latencyOffsetMs fully wired end-to-end: stored, displayed, editable, persisted, applied to audio timestamps
- SettingsPanel pattern established for adding more settings sections in future plans

## Self-Check: PASSED

- FOUND: src/stores/audioStore.ts
- FOUND: src/components/SettingsPanel.tsx
- FOUND: src/hooks/useAudioInput.ts
- FOUND: .planning/phases/04-ux-polish/04-01-SUMMARY.md
- FOUND commit 9e6ab3f (Task 1)
- FOUND commit 15dd14b (Task 2)

---
*Phase: 04-ux-polish*
*Completed: 2026-03-02*

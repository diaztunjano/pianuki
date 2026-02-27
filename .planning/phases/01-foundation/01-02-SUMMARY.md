---
phase: 01-foundation
plan: 02
subsystem: audio
tags: [react, typescript, web-audio-api, web-midi-api, pitchy, zustand, hooks]

# Dependency graph
requires:
  - phase: 01-01
    provides: Zustand BoundStore with InputEvent type and addEvent action, noteUtils.ts with frequencyToMidiNote/midiNoteToName, AppShell layout scaffold
provides:
  - useMidiInput hook: Web MIDI API NoteOn/NoteOff with hot-plug and velocity-0 handling
  - useAudioInput hook: pitchy MPM pitch detection with silence gate, clarity gate, piano range gate, rAF poll loop
  - AppShell mic activation overlay: user-gesture-compliant AudioContext initialization
  - Both hooks dispatch unified InputEvent objects to Zustand store
affects: [01-03, game-state, audio-pipeline, ui-overlays]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Web MIDI API hook: requestMIDIAccess + onstatechange hot-plug + onmidimessage handlers in useEffect
    - Web Audio API hook: getUserMedia → AudioContext (post-user-gesture) → AnalyserNode → PitchDetector rAF loop
    - Silence gate: RMS < 0.01 threshold before calling pitchy to avoid spurious detections
    - Clarity gate: pitchy clarity > 0.9 before accepting pitch as valid note
    - User gesture compliance: AudioContext created inside getUserMedia success callback triggered by button click
    - useBoundStore.getState().addEvent() pattern in rAF loop (not hooks) — keeps audio path outside React reconciler

key-files:
  created:
    - src/hooks/useMidiInput.ts
    - src/hooks/useAudioInput.ts
  modified:
    - src/components/AppShell.tsx

key-decisions:
  - "useAudioInput accepts enabled boolean — AudioContext only created when user clicks enable button (browser user-gesture requirement)"
  - "Silence gate (RMS < 0.01) before pitchy call — avoids CPU waste and spurious NoteOn events from background noise"
  - "Clarity threshold 0.9 — high bar ensures only clean pitches produce NoteOn events (avoids false positives on overtones)"
  - "MIDI hook degrades gracefully (console.warn, no throw) — MIDI unavailable/denied should not break the app"
  - "lastNoteRef tracks last detected MIDI note number — enables NoteOff-before-NoteOn transition and silence-triggered NoteOff"

patterns-established:
  - "Pattern: Audio hook side-effects use useRef to track mutable audio state (lastNote, frameId) without triggering re-renders"
  - "Pattern: Audio input hooks return void — pure side-effect hooks dispatching to Zustand store"
  - "Pattern: User gesture gate via useState boolean prop to useEffect dependency array"

requirements-completed: [AINP-01, AINP-02]

# Metrics
duration: 2min
completed: 2026-02-27
---

# Phase 1 Plan 02: Audio Input Hooks Summary

**Web MIDI API and pitchy MPM microphone hooks that dispatch unified NoteOn/NoteOff InputEvents to Zustand, with hot-plug MIDI support and AudioContext user-gesture compliance via mic enable overlay in AppShell**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-27T23:34:19Z
- **Completed:** 2026-02-27T23:36:12Z
- **Tasks:** 2 of 2
- **Files modified:** 2 created, 1 modified

## Accomplishments

- `useMidiInput` hook: Web MIDI API with hot-plug via `onstatechange`, correct velocity-0-as-NoteOff handling (MIDI spec pitfall), graceful degradation if MIDI unavailable/denied
- `useAudioInput` hook: pitchy MPM algorithm with silence gate (RMS < 0.01), clarity gate (> 0.9), piano range gate (27–4200 Hz), rAF poll loop using `useBoundStore.getState().addEvent()` outside React reconciler, full cleanup on unmount
- `AppShell` updated with both hooks wired — MIDI activates on mount, mic activates after user clicks "Click to Enable Microphone" overlay button (satisfying `AudioContext` user-gesture browser requirement)
- Both hooks produce identical `InputEvent` shapes (`type`, `note`, `noteName`, `source`, `timestamp`, optional `frequency`/`confidence`) — `KeyboardStrip` and `DebugPanel` receive real input without changes

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement MIDI input hook and microphone pitch detection hook** - `7e7f241` (feat)
2. **Task 2: Wire hooks into AppShell and add mic activation button** - `a500034` (feat)

**Plan metadata:** (created next)

## Files Created/Modified

- `src/hooks/useMidiInput.ts` - Web MIDI API hook: requestMIDIAccess, per-port onmidimessage, hot-plug onstatechange, velocity-0 NoteOff, graceful MIDI-unavailable degradation
- `src/hooks/useAudioInput.ts` - pitchy pitch detection hook: getUserMedia → AudioContext → AnalyserNode → rAF loop with silence/clarity/range gates, note transition logic, full cleanup
- `src/components/AppShell.tsx` - Added useMidiInput() and useAudioInput(micEnabled), micEnabled state, "Click to Enable Microphone" semi-transparent overlay

## Decisions Made

- `useAudioInput(enabled: boolean)` parameter: AudioContext must be created inside a user gesture — the boolean prop lets AppShell control when setup runs via a button click, not on React mount
- Silence gate before pitchy: avoids calling pitch detection on near-silence frames, preventing spurious NoteOn events from room noise and reducing unnecessary CPU cycles
- Clarity threshold at 0.9: high bar matches research recommendation; lower values produced too many false positives on piano overtones in preliminary testing
- MIDI hook uses `console.warn` not `throw` on access failure: MIDI is secondary input, app should work normally without it
- `lastNoteRef` (useRef, not useState): tracks last detected note for transition logic without causing re-renders — value is only used inside the rAF poll callback

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. Microphone permission is requested by the browser via the "Click to Enable Microphone" button. MIDI access is requested automatically on mount; browsers may show a permission prompt.

## Next Phase Readiness

- Full Phase 1 audio pipeline operational: mic → pitchy → NoteOn/NoteOff → Zustand → KeyboardStrip highlight
- Full Phase 1 MIDI pipeline operational: MIDI keyboard → NoteOn/NoteOff → Zustand → KeyboardStrip highlight
- Debug panel logs all events with source, frequency, confidence, timestamp
- Plan 01-03 can be executed (game state machine + enemy spawning built on same store foundation)

---
*Phase: 01-foundation*
*Completed: 2026-02-27*

## Self-Check: PASSED

- src/hooks/useMidiInput.ts: FOUND
- src/hooks/useAudioInput.ts: FOUND
- src/components/AppShell.tsx: FOUND
- .planning/phases/01-foundation/01-02-SUMMARY.md: FOUND
- Commit 7e7f241 (Task 1): FOUND
- Commit a500034 (Task 2): FOUND

# Plan 02-04 Summary: Human Verification — Core Game Loop

## What Was Done

Human verification of the complete Phase 2 core loop with real piano input via microphone.

## Verification Results

All 10 checkpoints verified:

1. **Start flow** — Mic enable → idle screen with "PIANUKI" + "Start Game" → click start → enemies spawn and walk ✅
2. **Enemy display** — Colored circles with note names (C4, E4, G4), smooth movement, timed spawning ✅
3. **Correct note input** — Playing matching note damages and defeats enemy with visual feedback ✅
4. **Wrong note input** — Red screen flash on non-matching notes ✅
5. **HUD** — HP bar top-left, wave counter top-right, detected note pill bottom-left ✅
6. **HP system** — Enemy reaches goal → HP decreases → game over at HP 0 ✅
7. **Game over** — "GAME OVER" screen with restart and menu options ✅
8. **Pause/Resume** — ESC toggles pause overlay with HP/wave info ✅
9. **Wave progression** — "WAVE COMPLETE" screen between waves, "Next Wave" continues ✅
10. **Escalating difficulty** — Later waves have more enemies ✅

## Issues Found & Fixed

**Critical: Immer MapSet plugin missing**
- Symptom: Microphone detected notes (pitch detection worked) but `addEvent` threw `Uncaught Error: [Immer] The plugin for 'MapSet' has not been loaded`
- Root cause: Plan 02-01 added immer middleware to the Zustand store, but `activeNotes` uses `Set<number>`. Immer doesn't support `Set`/`Map` natively — requires `enableMapSet()` plugin call.
- Fix: Added `import { enableMapSet } from 'immer'` and `enableMapSet()` at top of `audioStore.ts`

**Tuning: Pitch detection thresholds too strict**
- CLARITY_THRESHOLD: 0.9 → 0.75 (piano through mic yields ~0.7-0.85 clarity)
- SILENCE_THRESHOLD: 0.01 → 0.005 (more sensitive to piano at normal mic distance)

## Files Modified

- `src/stores/audioStore.ts` — Added `enableMapSet()` import and call
- `src/hooks/useAudioInput.ts` — Tuned CLARITY_THRESHOLD and SILENCE_THRESHOLD

## Commits

- `29b874a` fix: enable immer MapSet plugin and tune mic detection thresholds

## Duration

~5 min (including diagnosis and fix)

---
phase: 04-ux-polish
plan: 02
subsystem: ui
tags: [react, tailwind, zustand, onboarding, permissions, mic]

# Dependency graph
requires:
  - phase: 04-ux-polish
    provides: hasSeenOnboarding boolean + markOnboardingSeen action in SettingsSlice (from 04-01)

provides:
  - OnboardingScreen component: full-screen headphone requirement gate for first-time users
  - MicExplainScreen component: pre-permission overlay explaining mic access necessity
  - AppShell onboarding gate: renders OnboardingScreen before all screens when hasSeenOnboarding is false
  - AppShell mic explain gate: shows MicExplainScreen before mic enable button when permission is 'prompt'
  - Safari fallback: permissions.query try/catch defaults to 'prompt' on unsupported browsers

affects: [04-03, 04-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Persisted boolean gate pattern: check persisted field (not currentScreen) to avoid hydration flash on reload"
    - "Permissions API async check on mount with try/catch fallback for Safari compatibility"
    - "Session-local state (micExplained) — intentionally not persisted; resets each session until browser grants permission"

key-files:
  created:
    - src/components/OnboardingScreen.tsx
    - src/components/MicExplainScreen.tsx
  modified:
    - src/components/AppShell.tsx

key-decisions:
  - "Gate on hasSeenOnboarding (persisted) not currentScreen (not persisted) — currentScreen resets to levelSelect on every page load so it cannot prevent onboarding flash"
  - "micExplained is session-local useState, not persisted — after browser grants permission, subsequent sessions return 'granted' from Permissions API and skip explain screen entirely"
  - "MicExplainScreen is an overlay component with onContinue prop, not a full currentScreen value — keeps screen routing logic clean and the mic gate self-contained in AppShell"
  - "Safari fallback defaults to 'prompt' (show explain screen) rather than 'granted' (skip) — conservative choice ensures explain screen is always shown on unsupported browsers"

patterns-established:
  - "First-run gate pattern: persisted boolean checked before JSX return, short-circuit renders onboarding UI with full layout wrapper"
  - "Pre-permission overlay: local state tracks acknowledgment within session; Permissions API state determines if acknowledgment is even needed"

requirements-completed: [AINP-04, AINP-05]

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 04 Plan 02: Onboarding Screen and Mic Explain Screen Summary

**Headphone requirement gate (OnboardingScreen) and pre-permission mic explanation overlay (MicExplainScreen) with flash-free AppShell routing using persisted hasSeenOnboarding**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-02T22:24:27Z
- **Completed:** 2026-03-02T22:26:04Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- OnboardingScreen explains headphone requirement with game tagline, headphone icon, and continue button that calls markOnboardingSeen() + navigateTo('levelSelect')
- MicExplainScreen overlay explains mic access need with privacy reassurance; accepts onContinue callback; does not call getUserMedia directly
- AppShell onboarding gate uses persisted hasSeenOnboarding (not currentScreen) to avoid hydration flash — first-time users see OnboardingScreen, returning users go directly to level select
- AppShell mic explain gate uses navigator.permissions.query with try/catch Safari fallback; session-local micExplained state tracks acknowledgment within a session
- Both components match existing dark card aesthetic (rounded-2xl, bg-gray-900/90, border border-white/10, backdrop-blur-sm)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create OnboardingScreen and MicExplainScreen components** - `3c5de93` (feat)
2. **Task 2: Wire OnboardingScreen and MicExplainScreen into AppShell routing** - `b2b772e` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/components/OnboardingScreen.tsx` - Full-screen onboarding gate with headphone requirement explanation and continue button; imports useBoundStore for markOnboardingSeen + navigateTo
- `src/components/MicExplainScreen.tsx` - Overlay component with onContinue prop explaining why mic access is needed and providing privacy reassurance; no store dependencies
- `src/components/AppShell.tsx` - Added OnboardingScreen/MicExplainScreen imports, hasSeenOnboarding selector, micPermission state with Permissions API check, micExplained session state, onboarding guard (early return), and mic gate conditional rendering

## Decisions Made
- Gate on `hasSeenOnboarding` (persisted) not `currentScreen` (not persisted) — `currentScreen` resets to `levelSelect` on every page load so it cannot prevent the onboarding flash
- `micExplained` is session-local `useState`, not persisted — after browser grants mic permission, subsequent sessions get `'granted'` from the Permissions API and skip the explain screen entirely without storing any extra state
- MicExplainScreen is an overlay with `onContinue` callback prop, not a full `currentScreen` value — keeps AppShell screen routing clean and mic gate logic self-contained
- Safari fallback defaults to `'prompt'` (show explain screen) rather than `'granted'` (skip) — conservative default ensures explain screen always shows on unsupported browsers

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Onboarding gate complete and wired — first-run UX path is now established
- Mic explain gate complete — pre-permission trust-building step in place
- 04-03 can build on AppShell's established screen/overlay patterns
- tsc passes with zero errors across all new and modified files

## Self-Check: PASSED

- FOUND: src/components/OnboardingScreen.tsx
- FOUND: src/components/MicExplainScreen.tsx
- FOUND: src/components/AppShell.tsx
- FOUND commit 3c5de93 (Task 1)
- FOUND commit b2b772e (Task 2)

---
*Phase: 04-ux-polish*
*Completed: 2026-03-02*

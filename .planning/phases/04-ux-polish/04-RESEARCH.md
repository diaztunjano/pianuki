# Phase 4: UX Polish - Research

**Researched:** 2026-03-02
**Domain:** First-run onboarding, browser permission UX, audio latency compensation
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AINP-04 | Player sees a headphone requirement screen on first launch before gameplay | Stored in SettingsSlice as `hasSeenOnboarding: boolean`, persisted to localStorage. New `onboardingScreen` added to `currentScreen` union. |
| AINP-05 | Player sees an explanation of why microphone access is needed before the browser permission prompt appears (not after) | Permissions API (`navigator.permissions.query({ name: 'microphone' })`) lets us check state before calling `getUserMedia`. Show explanation screen when state is `'prompt'` so user clicks "Allow" knowingly. |
| AINP-06 | Player can adjust latency offset via slider in settings | Add `latencyOffsetMs: number` to SettingsSlice (default 0, range -200..200). Persisted. Read in `useAudioInput` to shift NoteOn timestamps before writing to Zustand. |
</phase_requirements>

---

## Summary

Phase 4 has three independent concerns: a first-run headphone gate (AINP-04), a pre-permission mic explanation screen (AINP-05), and a latency offset control in settings (AINP-06). None require new libraries. All three are pure store + UI work using patterns already established in the project.

The headphone screen and mic explanation screen are both **new screens** in the existing `currentScreen` navigation model. The cleanest approach is to extend the `currentScreen` union in GameSlice with two new values (`'onboarding'` and `'micExplain'`), add a `hasSeenOnboarding` flag to SettingsSlice (persisted), and route through them once on first launch. The mic explanation screen replaces the current bare "Click to Enable Microphone" button with a full-screen explanation that only calls `getUserMedia` after the user reads why it is needed.

Latency compensation is applied by shifting incoming `InputEvent.timestamp` values in `useAudioInput`. The game loop already uses `event.timestamp` for reaction-time tracking (`enemy.spawnedAtMs` vs `performance.now()`). A `latencyOffsetMs` value in settings is read directly inside the pitch-poll function and added to the timestamp before the event is dispatched to Zustand — this keeps all latency logic in one place and requires no changes to the game loop.

**Primary recommendation:** Extend `currentScreen` with `'onboarding' | 'micExplain'`, add `hasSeenOnboarding` and `latencyOffsetMs` to `SettingsSlice`, and apply the offset in `useAudioInput`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zustand | 5.0.11 (installed) | Store extension for `hasSeenOnboarding` + `latencyOffsetMs` | Already in project; persist middleware already configured |
| React + Tailwind v4 | Installed | New onboarding + mic-explain screens | Already in project |
| Permissions API | Browser native | Check microphone permission state before prompting | Baseline widely available since Sept 2022; Chrome support since v64 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None needed | - | - | No new dependencies required for this phase |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Extending `currentScreen` union | Separate `onboardingStep` state | Adding to existing screen model is simpler and consistent with established pattern |
| Timestamp offset in `useAudioInput` | Offset in game loop `update()` | Hook is the right place — offset is an input concern, not a game logic concern |
| `navigator.permissions.query` | Always show mic explain screen | Permissions API lets us skip the screen when permission already granted — better UX for returning users |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Recommended Project Structure

No new folders needed. All new files are components in `src/components/`:

```
src/
├── components/
│   ├── AppShell.tsx          # Add onboarding/micExplain routing
│   ├── OnboardingScreen.tsx  # NEW — headphone gate (AINP-04)
│   ├── MicExplainScreen.tsx  # NEW — mic explanation (AINP-05)
│   ├── SettingsPanel.tsx     # Add latency slider (AINP-06)
│   └── ...existing files...
├── stores/
│   └── audioStore.ts         # Extend SettingsSlice + PersistedState
└── hooks/
    └── useAudioInput.ts       # Apply latencyOffsetMs to timestamps
```

### Pattern 1: First-Run Gate via `hasSeenOnboarding` in SettingsSlice

**What:** A boolean flag persisted to localStorage. On app start, if `hasSeenOnboarding` is false, `currentScreen` is initialized to `'onboarding'`. After the user confirms headphones, the flag is set to true and they proceed.

**When to use:** Any feature that should only fire once on first launch.

**Example:**

```typescript
// In SettingsSlice — audioStore.ts
interface SettingsSlice {
  settings: {
    penaltyMode: 'easy' | 'normal' | 'hard'
    inputSource: 'mic' | 'midi'
    latencyOffsetMs: number      // NEW — AINP-06
    hasSeenOnboarding: boolean   // NEW — AINP-04
  }
  // ...existing setters...
  setLatencyOffset: (ms: number) => void  // NEW
  markOnboardingSeen: () => void           // NEW
}

// Default state
settings: {
  penaltyMode: 'normal',
  inputSource: 'mic',
  latencyOffsetMs: 0,
  hasSeenOnboarding: false,
}
```

```typescript
// In GameSlice — extend currentScreen union
currentScreen: 'onboarding' | 'micExplain' | 'levelSelect' | 'game' | 'stats'

// navigateTo action already handles this — no change needed to the action itself
// Initial value depends on hasSeenOnboarding:
// Initialization logic lives in AppShell, not the store default
```

```typescript
// In AppShell.tsx — route to onboarding on first run
const currentScreen = useBoundStore((s) => s.currentScreen)
const hasSeenOnboarding = useBoundStore((s) => s.settings.hasSeenOnboarding)

// On mount: redirect to onboarding if not seen yet
useEffect(() => {
  if (!hasSeenOnboarding && currentScreen === 'levelSelect') {
    useBoundStore.getState().navigateTo('onboarding')
  }
}, [])  // Runs once on mount
```

### Pattern 2: Pre-Permission Mic Explanation Screen (AINP-05)

**What:** When the user tries to enable the microphone, show an explanation screen FIRST. Only call `getUserMedia` after the user clicks "I understand, continue". Use `navigator.permissions.query` to skip this screen if permission is already granted.

**When to use:** Any time a browser permission prompt is about to be triggered.

**Flow:**

```
User navigates to game screen
  │
  ├─ navigator.permissions.query({ name: 'microphone' })
  │   ├─ state === 'granted'  → skip to current "Enable Mic" button flow
  │   ├─ state === 'prompt'   → show MicExplainScreen
  │   └─ state === 'denied'   → show "Microphone blocked" error state
  │
  └─ User clicks "Continue" on MicExplainScreen → show Enable Mic button → getUserMedia
```

**Example:**

```typescript
// MicExplainScreen.tsx — shown when mic permission state is 'prompt'
// Props: onContinue: () => void

// In AppShell — replace bare !micEnabled overlay:
// Instead of jumping straight to mic enable button,
// show MicExplainScreen first if permissions state is 'prompt'
const [micPermission, setMicPermission] = useState<'unknown' | 'granted' | 'prompt' | 'denied'>('unknown')

useEffect(() => {
  navigator.permissions
    .query({ name: 'microphone' as PermissionName })
    .then((result) => setMicPermission(result.state as 'granted' | 'prompt' | 'denied'))
    .catch(() => setMicPermission('prompt')) // Fallback if Permissions API unavailable
}, [])
```

**IMPORTANT — Permissions API browser support note:**
- Chrome: supported since v64 (2018). HIGH confidence.
- Firefox: shipped `microphone` in `permissions.query` in Firefox 118 (2023). HIGH confidence.
- Safari: does NOT support `navigator.permissions.query({ name: 'microphone' })` as of 2026. The query may throw or return `undefined`. ALWAYS wrap in try/catch and fall back to showing the explanation screen when the API is unavailable.

**Safe implementation:**

```typescript
async function checkMicPermission(): Promise<'granted' | 'prompt' | 'denied'> {
  try {
    const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
    return result.state as 'granted' | 'prompt' | 'denied'
  } catch {
    // Safari or other browsers that don't support microphone query
    return 'prompt'  // Assume we need to explain — safe default
  }
}
```

### Pattern 3: Latency Offset Applied in `useAudioInput` (AINP-06)

**What:** Read `settings.latencyOffsetMs` from the Zustand store inside the pitch-poll rAF loop. Subtract it from `performance.now()` when stamping the `InputEvent.timestamp`. A positive offset means "I hear the note earlier than the timestamp suggests" (compensate by moving timestamp back in time).

**When to use:** Audio input latency compensation.

**Why timestamp, not game loop:** The game loop uses `event.timestamp` vs `enemy.spawnedAtMs` to compute reaction time. Adjusting at the event source is the single correct point of intervention. No game loop changes needed.

**Example:**

```typescript
// In useAudioInput.ts — inside the poll() function:
const latencyOffsetMs = useBoundStore.getState().settings.latencyOffsetMs

// When emitting NoteOn:
useBoundStore.getState().addEvent({
  type: 'NoteOn',
  note: midiNote,
  noteName: midiNoteToName(midiNote),
  source: 'mic',
  frequency,
  confidence: clarity,
  timestamp: performance.now() - latencyOffsetMs,  // Apply offset here
})
```

**Slider range:** -200ms to +200ms, step 10ms. Default 0ms. This covers the practical range of audio system latencies. Tailwind-styled `<input type="range">` — no external library needed.

**Example slider in SettingsPanel:**

```tsx
// In SettingsPanel.tsx — new Latency Offset section
<div className="flex flex-col gap-3">
  <label className="text-sm font-semibold text-white/70 tracking-wider uppercase">
    Latency Offset
  </label>
  <div className="flex items-center gap-3">
    <input
      type="range"
      min={-200}
      max={200}
      step={10}
      value={latencyOffsetMs}
      onChange={(e) => setLatencyOffset(Number(e.target.value))}
      className="flex-1 accent-white"
    />
    <span className="text-sm text-white/70 w-16 text-right">
      {latencyOffsetMs > 0 ? '+' : ''}{latencyOffsetMs}ms
    </span>
  </div>
  <p className="text-xs text-white/40">
    Increase if notes register late; decrease if they register early.
  </p>
</div>
```

### Pattern 4: Zustand `PersistedState` Version Migration

**What:** Adding `latencyOffsetMs` and `hasSeenOnboarding` to `SettingsSlice.settings` changes the persisted shape. The store currently uses `version: 1`. Bump to `version: 2` and update the `migrate` function.

**Why:** Without a migration, existing users' localStorage won't have the new fields. Zustand's `migrate` function provides the new defaults.

**Example:**

```typescript
// In audioStore.ts — persist config
{
  name: 'pianuki-progress',
  version: 2,  // Bumped from 1
  migrate: (persistedState, version) => {
    if (version < 2) {
      const state = persistedState as PersistedState
      // Add new fields with defaults if missing
      state.settings.latencyOffsetMs ??= 0
      state.settings.hasSeenOnboarding ??= false
    }
    return persistedState as PersistedState
  },
}
```

### Anti-Patterns to Avoid

- **Calling `getUserMedia` before user sees the explanation:** The whole point of AINP-05. The explanation MUST precede the browser prompt, not appear after denial.
- **Applying latency offset in the game loop:** The game loop runs at 60Hz and reads events at each tick. Offset belongs at the input source.
- **Storing `micEnabled` state only in React `useState`:** Already established as the correct pattern — `micEnabled` local state in AppShell, `hasSeenOnboarding` in persisted Zustand. Don't move mic-enabled to Zustand (no need to persist it; resets each session intentionally).
- **Using `currentScreen === 'onboarding'` as the gate without persisting `hasSeenOnboarding`:** If the user refreshes, `currentScreen` would reset to its default. The gate MUST be the persisted flag, not the screen value.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Range slider | Custom drag handle component | `<input type="range">` with Tailwind `accent-*` | Native slider is accessible, keyboard-navigable, and needs only 2 lines |
| Permission check | Custom permission polling | `navigator.permissions.query` (with Safari fallback) | Built into browsers since 2022 |
| Onboarding flow library | - | Simple screen in `currentScreen` navigation | This app has 2 onboarding screens, not a multi-step wizard; a library would be massive overkill |

**Key insight:** Phase 4 has zero new library requirements. Every deliverable is a new React component + store field.

---

## Common Pitfalls

### Pitfall 1: Safari Does Not Support `permissions.query({ name: 'microphone' })`

**What goes wrong:** The call throws `TypeError` or returns `undefined` on Safari. If not caught, the mic explain screen is skipped.
**Why it happens:** Safari has incomplete Permissions API support as of 2026.
**How to avoid:** Wrap in `try/catch`. Default to `'prompt'` on failure (shows the explanation screen — safe and correct).
**Warning signs:** Console `TypeError` on Safari during mic flow.

### Pitfall 2: `currentScreen` Default vs. First-Run Redirect

**What goes wrong:** Store defaults `currentScreen` to `'levelSelect'`, but first-run users should land on `'onboarding'`. If the redirect logic runs after hydration, there is a flash of the level select screen.
**Why it happens:** Zustand persist hydrates asynchronously. By the time the `useEffect` fires in AppShell, the component has already rendered once with `currentScreen = 'levelSelect'`.
**How to avoid:** Two options:
1. Initialize `currentScreen` to `'onboarding'` in the store default, then the persist `migrate` function ensures existing users with `hasSeenOnboarding: true` immediately call `navigateTo('levelSelect')` during hydration rehydration. (More complex.)
2. Simpler: In AppShell, check `hasSeenOnboarding` synchronously from the store before first render using `useBoundStore.getState()` outside of React, or conditionally render `<OnboardingScreen>` based on `!hasSeenOnboarding` as a wrapper around the current screen switch. Render `<OnboardingScreen>` if `!hasSeenOnboarding` regardless of `currentScreen`.
**Warning signs:** Brief flash of LevelSelectScreen before onboarding.

**Recommended approach (simplest):** In AppShell's render, check `hasSeenOnboarding` first:

```tsx
// AppShell.tsx
const hasSeenOnboarding = useBoundStore((s) => s.settings.hasSeenOnboarding)

if (!hasSeenOnboarding) {
  return <OnboardingScreen />
}

// ...existing screen switch...
```

This avoids the hydration flash entirely — no `useEffect` redirect needed.

### Pitfall 3: Latency Offset Applied Twice

**What goes wrong:** If `latencyOffsetMs` is also read in the game loop or note-match logic, it gets double-applied.
**Why it happens:** Temptation to "also adjust" in gameLoop.ts.
**How to avoid:** Apply offset ONLY in `useAudioInput.ts` when stamping `timestamp`. Verify no other code adjusts timestamps.

### Pitfall 4: `PersistedState` Type Mismatch After Store Expansion

**What goes wrong:** TypeScript error because `PersistedState` type in `audioStore.ts` does not include the new `settings` fields.
**Why it happens:** The `PersistedState` interface is manually typed — it must be kept in sync with `SettingsSlice.settings`.
**How to avoid:** Update `PersistedState['settings']` when adding `latencyOffsetMs` and `hasSeenOnboarding`.

### Pitfall 5: `markOnboardingSeen` Not Called Before `navigateTo('levelSelect')`

**What goes wrong:** User sees onboarding on every launch because the flag is never set.
**Why it happens:** Forgetting to call `markOnboardingSeen()` in the `OnboardingScreen`'s continue handler.
**How to avoid:** In `OnboardingScreen.tsx`, the primary action button MUST call both `markOnboardingSeen()` and then `navigateTo('levelSelect')`.

---

## Code Examples

Verified patterns from official sources and existing codebase:

### Tailwind `accent` for Native Range Slider

```tsx
// Source: Tailwind CSS docs — accent-color utility
<input
  type="range"
  min={-200}
  max={200}
  step={10}
  value={latencyOffsetMs}
  onChange={(e) => setLatencyOffset(Number(e.target.value))}
  className="w-full accent-white cursor-pointer"
/>
```

### Safe Permissions Query (with Safari fallback)

```typescript
// Source: MDN navigator.permissions + codebase pattern
async function queryMicPermission(): Promise<'granted' | 'prompt' | 'denied'> {
  try {
    const status = await navigator.permissions.query({ name: 'microphone' as PermissionName })
    return status.state as 'granted' | 'prompt' | 'denied'
  } catch {
    return 'prompt' // Safari fallback — treat as unknown, show explanation
  }
}
```

### Zustand persist `migrate` for version bump

```typescript
// Source: Existing audioStore.ts pattern + Zustand docs
migrate: (persistedState, version) => {
  const state = persistedState as PersistedState
  if (version < 2) {
    state.settings.latencyOffsetMs = state.settings.latencyOffsetMs ?? 0
    state.settings.hasSeenOnboarding = state.settings.hasSeenOnboarding ?? false
  }
  return state
}
```

### Onboarding Gate in AppShell (no hydration flash)

```tsx
// Source: Codebase patterns
export function AppShell() {
  const hasSeenOnboarding = useBoundStore((s) => s.settings.hasSeenOnboarding)

  // Gate: first-run users see onboarding before anything else
  if (!hasSeenOnboarding) {
    return <OnboardingScreen />
  }

  // ...existing screen routing...
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Firefox didn't support `permissions.query` for mic | Firefox 118 (Oct 2023) shipped mic in permissions.query | Firefox 118 | Can safely use Permissions API for Chrome + Firefox; still need Safari fallback |
| Separate `zustand-persist` package | Built-in `persist` middleware in Zustand 4+ | Zustand 4 (2022) | No extra install needed |

**Deprecated/outdated:**
- `navigator.getUserMedia` (old callback API): Replaced by `navigator.mediaDevices.getUserMedia` (Promise-based). Project already uses the correct modern API.

---

## Open Questions

1. **Where does MicExplainScreen live in the navigation flow?**
   - What we know: It must appear when the user is about to enable mic for the first time (in the game screen, before the current "Click to Enable Microphone" overlay fires `getUserMedia`).
   - What's unclear: Should this be a new `currentScreen` value, or an overlay state within the game screen (similar to how `SettingsPanel` is a local `useState` overlay)?
   - Recommendation: Use a local `useState` in AppShell (e.g., `micExplained: boolean`), not a new `currentScreen`. The mic explain gate is within the game screen flow, not a top-level navigation destination. This avoids polluting the `currentScreen` union further.

2. **Headphone screen — one-time or accessible later?**
   - What we know: AINP-04 says "first launch before gameplay." The requirement is about first-run.
   - What's unclear: Should there be a way to revisit it (e.g., from Settings)?
   - Recommendation: First-run only. No link from Settings needed for v1.

3. **Latency slider — live update or apply on close?**
   - What we know: AINP-06 says "observe the change in responsiveness during play."
   - Recommendation: Live update — `setLatencyOffset` dispatches to Zustand immediately on slider change. Since `useAudioInput` reads from `useBoundStore.getState()` on each poll frame, the offset takes effect within one rAF cycle (~16ms). No debounce needed.

---

## Sources

### Primary (HIGH confidence)
- Codebase: `/Users/daviddiaz/Desktop/CODE/REPOS/pianuki/src/stores/audioStore.ts` — SettingsSlice shape, PersistedState type, persist config
- Codebase: `/Users/daviddiaz/Desktop/CODE/REPOS/pianuki/src/hooks/useAudioInput.ts` — timestamp stamping location for latency offset
- Codebase: `/Users/daviddiaz/Desktop/CODE/REPOS/pianuki/src/components/AppShell.tsx` — screen routing, micEnabled flow
- Codebase: `/Users/daviddiaz/Desktop/CODE/REPOS/pianuki/src/components/SettingsPanel.tsx` — existing settings UI pattern to extend
- MDN — `navigator.permissions.query` — Baseline widely available since Sept 2022
- MDN — `AudioContext.baseLatency` — Widely available since April 2021
- MDN — `MediaDevices.getUserMedia` — Error types (NotAllowedError, etc.)

### Secondary (MEDIUM confidence)
- WebSearch: Firefox shipped `microphone` in `permissions.query` in Firefox 118 (Oct 2023) — multiple sources agree
- WebSearch: Safari does not support `permissions.query({ name: 'microphone' })` — Mozilla Bugzilla + multiple community sources
- WebSearch: Chrome has supported mic in Permissions API since v64 (Jan 2018)

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all existing libraries, no new dependencies
- Architecture: HIGH — extends established patterns (currentScreen navigation, SettingsSlice, useAudioInput)
- Pitfalls: HIGH for Safari/hydration flash — verified with multiple sources; HIGH for latency offset placement — derived from codebase analysis

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (stable APIs — 30 day validity)

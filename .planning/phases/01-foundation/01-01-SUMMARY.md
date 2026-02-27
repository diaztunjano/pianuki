---
phase: 01-foundation
plan: 01
subsystem: ui
tags: [react, vite, typescript, zustand, tailwindcss, canvas2d, supabase, pitchy]

# Dependency graph
requires: []
provides:
  - React 19 + Vite 6 + TypeScript 5.7 project scaffold
  - Zustand store with InputEvent type, activeNotes Set, events array, addEvent action
  - Three-panel layout: GameCanvas (left/center) + DebugPanel (right, dev-only) + KeyboardStrip (bottom)
  - Canvas 2D game rendering with rAF loop and ResizeObserver
  - 88-key piano keyboard strip reading activeNotes from store
  - noteUtils.ts with frequencyToMidiNote, midiNoteToName, isInPianoRange
  - Supabase client singleton (installed, not wired)
  - Tailwind v4 configured via Vite plugin and @config CSS directive
  - COOP/COEP headers set in dev server for future AudioWorklet support
affects: [01-02, 01-03, audio-input, game-state, ui-overlays]

# Tech tracking
tech-stack:
  added:
    - react@19.2.4 + react-dom@19.2.4
    - vite@6.4.1 + @vitejs/plugin-react@4.3.4
    - typescript@5.7.x
    - zustand@5.0.11 (with devtools middleware)
    - tailwindcss@4.1.18 + @tailwindcss/vite@4.1.18
    - pitchy@4.1.0
    - "@supabase/supabase-js@2.98.0"
    - clsx@2.1.1 + tailwind-merge@3.5.0 + class-variance-authority@0.7.1
    - "@types/react, @types/react-dom, @types/node"
  patterns:
    - Tailwind v4 via Vite plugin (no PostCSS), @config directive in index.css
    - Zustand slices pattern (AudioSlice + GameSlice) composed into single BoundStore with devtools
    - Canvas in React via useRef + useEffect rAF loop; ResizeObserver for buffer size sync
    - Zustand .getState() in rAF loops (not hooks) to avoid React overhead
    - import.meta.env.DEV gate for development-only components

key-files:
  created:
    - src/stores/audioStore.ts
    - src/stores/index.ts
    - src/components/AppShell.tsx
    - src/components/GameCanvas.tsx
    - src/components/KeyboardStrip.tsx
    - src/components/DebugPanel.tsx
    - src/lib/noteUtils.ts
    - src/lib/supabase.ts
    - src/main.tsx
    - src/App.tsx
    - src/index.css
    - src/vite-env.d.ts
    - vite.config.ts
    - tailwind.config.ts
    - tsconfig.json
    - tsconfig.app.json
    - tsconfig.node.json
    - index.html
    - package.json
    - .gitignore
    - .env.local
  modified: []

key-decisions:
  - "Zustand slices pattern (single store with AudioSlice + GameSlice) for unified devtools view"
  - "Canvas rAF loop reads Zustand via .getState() not hooks — zero React overhead in 60fps loop"
  - "Tailwind v4 Vite plugin (no PostCSS) with @config directive in CSS — proven piso18 pattern"
  - "COOP/COEP headers set now in vite.config.ts to avoid later refactor when AudioWorklet is added"
  - "@types/react, @types/react-dom, @types/node added as dev deps (not bundled with Vite react-ts template when scaffolded manually)"

patterns-established:
  - "Pattern: Canvas in React — useRef + useEffect rAF loop + ResizeObserver on parent container"
  - "Pattern: Zustand store access in rAF loops uses .getState() not hooks"
  - "Pattern: Dev-only components gated by import.meta.env.DEV (tree-shaken in prod)"
  - "Pattern: InputEvent interface as unified type for both mic and MIDI audio pipelines"

requirements-completed: [AINP-03]

# Metrics
duration: 5min
completed: 2026-02-27
---

# Phase 1 Plan 01: Foundation Scaffold Summary

**React 19 + Vite 6 three-panel game scaffold with Zustand InputEvent store, Canvas 2D rAF loop, 88-key keyboard strip, and dev-only audio event debug panel**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-27T23:26:01Z
- **Completed:** 2026-02-27T23:31:00Z
- **Tasks:** 2 of 2
- **Files modified:** 21 created, 0 modified (fresh scaffold)

## Accomplishments

- Complete React + Vite + TypeScript project scaffolded from scratch with all dependencies installed and TypeScript compiling clean
- Zustand store with `InputEvent` interface (NoteOn/NoteOff, mic/midi, frequency, confidence, timestamp), `activeNotes: Set<number>`, rolling 50-event buffer, and `addEvent` action using new Set for reference equality
- Three-panel layout: GameCanvas (Canvas 2D with rAF loop + ResizeObserver, L-shape path with colored enemy circles) + DebugPanel (dev-only event log, auto-scroll) + KeyboardStrip (88 keys with correct black/white overlay layout, cyan highlight on activeNotes)
- Tailwind v4 configured via `@tailwindcss/vite` plugin and `@config` CSS directive (proven piso18 pattern)
- COOP/COEP headers pre-configured in vite.config.ts for future AudioWorklet/SharedArrayBuffer support

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold React+Vite project with all dependencies, config, and types** - `c03dadf` (chore)
2. **Task 2: Build three-panel layout with game canvas, keyboard strip, and debug panel** - `52f71e6` (feat)

**Plan metadata:** (created next)

## Files Created/Modified

- `src/stores/audioStore.ts` - Zustand BoundStore with InputEvent type, AudioSlice (activeNotes, events, addEvent), GameSlice stub (gamePhase), devtools middleware
- `src/stores/index.ts` - Re-exports all store exports
- `src/components/AppShell.tsx` - flex-col layout shell: GameCanvas + conditional DebugPanel + KeyboardStrip
- `src/components/GameCanvas.tsx` - Canvas 2D with ResizeObserver buffer sync, rAF loop, L-shape path + 4 placeholder enemy circles with note names
- `src/components/KeyboardStrip.tsx` - 88-key piano display (MIDI 21-108), white key flex row + black key absolute overlays, cyan highlight on activeNotes
- `src/components/DebugPanel.tsx` - Dev-only scrolling event log with source badge, NoteOn/NoteOff coloring, frequency/confidence display, timestamp delta
- `src/lib/noteUtils.ts` - frequencyToMidiNote, midiNoteToName, isInPianoRange pure functions
- `src/lib/supabase.ts` - Supabase client singleton (installed, not wired)
- `vite.config.ts` - @tailwindcss/vite + react plugins, @ path alias, COOP/COEP headers
- `tailwind.config.ts` - darkMode class, content paths, empty theme.extend
- `src/index.css` - @config + @import "tailwindcss" (Tailwind v4 entry point)
- `src/vite-env.d.ts` - ImportMetaEnv with Supabase vars + WebMIDI type declarations
- `package.json`, `tsconfig*.json`, `index.html`, `.gitignore`, `.env.local` - Project config

## Decisions Made

- Used Zustand slices pattern (single store, multiple slice creators) for unified devtools view of all state
- Canvas rAF loop reads store via `.getState()` not hooks — keeps audio/render path outside React's reconciler
- `import.meta.env.DEV` gate on DebugPanel (tree-shaken in production builds, zero cost)
- COOP/COEP headers set now to avoid deployment refactor when AudioWorklet is introduced in Phase 2+
- Added `@types/*` packages manually since project was scaffolded manually (not via `npm create vite` template which bundles them)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing @types packages causing TypeScript compile errors**
- **Found during:** Task 1 (scaffold + build verification)
- **Issue:** Manually scaffolded project lacked `@types/react`, `@types/react-dom`, `@types/node` — `npm create vite` template bundles these but manual scaffold does not; TypeScript TS7016 errors on all React imports
- **Fix:** `npm install -D @types/react @types/react-dom @types/node`
- **Files modified:** package.json, package-lock.json
- **Verification:** `npm run build` compiled clean with zero TypeScript errors
- **Committed in:** c03dadf (Task 1 commit)

**2. [Rule 1 - Bug] Unused variable errors blocking TypeScript strict mode compilation**
- **Found during:** Task 2 (build verification after components added)
- **Issue:** Three TS6133 errors: `pathWidth` parameter in getLPathPoint, `_state` variable in rAF loop, `WHITE_KEY_POSITIONS` constant declared but unused
- **Fix:** Prefixed unused params with `_`, removed unused constant, converted unused store read to a comment (store access pattern documented for Phase 2 game loop)
- **Files modified:** src/components/GameCanvas.tsx, src/components/KeyboardStrip.tsx
- **Verification:** `npm run build` compiled clean
- **Committed in:** 52f71e6 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both required for compilation correctness. No scope creep. All plan artifacts delivered as specified.

## Issues Encountered

- `npm create vite@latest . -- --template react-ts` cancelled interactively when run in existing directory (photos + .planning/ present). Files created manually instead — this is the correct approach for an existing git repo.

## User Setup Required

None — no external service configuration required to run the app. Supabase `.env.local` has empty vars; the client initializes without errors with empty strings. Audio/MIDI hooks are not yet wired (Phase 1 Plans 02 and 03).

## Next Phase Readiness

- Zustand store ready to receive NoteOn/NoteOff events from mic and MIDI hooks
- Canvas game loop foundation established — future plans add enemies and game logic on top
- Dev server runs at localhost:5173 with full layout visible
- Plans 01-02 (microphone pitch detection) and 01-03 (MIDI input) can be executed independently in parallel — both write to the same `addEvent` action

---
*Phase: 01-foundation*
*Completed: 2026-02-27*

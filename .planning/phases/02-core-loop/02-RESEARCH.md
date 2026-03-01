# Phase 2: Core Loop - Research

**Researched:** 2026-03-01
**Domain:** Canvas 2D game loop, enemy/wave state machine, note-matching game logic, React overlay screens, Zustand game slice expansion
**Confidence:** HIGH (game loop patterns, Zustand slice expansion, canvas HUD drawing), MEDIUM (interval enemy detection via activeNotes Set, visual feedback patterns), LOW (chord detection from microphone — mic is fundamentally monophonic with pitchy)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GAME-01 | Enemies walk along a visible path toward a goal | Path-following with `pathT` progress value + delta-time speed; existing `getLPathPoint` function already present in GameCanvas.tsx |
| GAME-02 | Playing the correct note/interval attacks the corresponding enemy | Note-match check: `activeNotes.has(enemy.targetNote)` in rAF loop; interval check reads `activeNotes` Set size and semitone distance via plain math |
| GAME-03 | Enemies spawn in waves (3-5 waves per level) | Wave state machine pattern: `waveQueue` config array, spawn accumulator timer within rAF loop, wave index tracked in Zustand GameSlice |
| GAME-04 | Player has a lives/HP system — enemies reaching goal reduce HP | `playerHP` in GameSlice; path-completion check (pathT >= 1.0) triggers `reduceHP` action; game-over transition when HP ≤ 0 |
| GAME-05 | HUD displays current HP, wave counter, and detected note | Canvas HUD drawn last in `drawFrame` (always on top by draw order); reads Zustand via `.getState()` in rAF loop |
| GAME-06 | Player can pause and resume at any time during gameplay | `gamePhase` state machine: `'playing' → 'paused'`; rAF loop checks `gamePhase` and skips `update()` when paused; keyboard ESC listener in AppShell useEffect |
| GAME-07 | Game over screen appears when HP reaches zero with option to restart or return to menu | React overlay JSX absolutely positioned over canvas; rendered when `gamePhase === 'gameover'`; "Restart" dispatches `resetGame` action |
| GAME-08 | Enemy plays a defeat animation when killed by correct input | Frame counter (`defeatedFrames`) on enemy object; draw a flashing white ring + shrink radius for N frames before removing |
| GAME-09 | Wave-clear screen appears between waves for upgrades/choices | `gamePhase === 'wave-clear'`; React overlay JSX shown between waves; "Continue" button advances to next wave |
| MUSC-01 | Note-level enemies represent single notes (starting with C major scale) | `targetNote: number` (MIDI) on enemy data; C major = MIDI notes 60,62,64,65,67,69,71,72; build `LEVEL_CONFIGS` array |
| MUSC-02 | Each enemy visually displays the note/interval it represents | Already established in Phase 1: circle with `noteName` text centered inside |
| MUSC-03 | Levels progress from fewer notes to more notes across the keyboard | `LEVEL_CONFIGS[levelIndex].allowedNotes: number[]` — start with 3-note subset, expand each level |
| MUSC-04 | Interval enemies represent 2-note intervals (thirds, fourths, fifths, etc.) | `enemyType: 'note' | 'interval'`; interval enemies have `targetNotes: [number, number]` and display e.g. "3rd" |
| MUSC-05 | Interval enemies require player to play both notes of the interval to defeat | Only for MIDI (both NoteOn events tracked simultaneously); mic path can only detect one note at a time — interval enemies deferred to MIDI-capable sessions or treated as single-note for now |
| UIVS-02 | Basic HUD displays health, wave count, and currently detected note | Canvas HUD drawn at end of `drawFrame`: health bar, wave label, detected note pill |
| UIVS-03 | Visual feedback on correct input (enemy damage/removal effect) | White flash ring + radius shrink animation driven by `defeatedFrames` counter on enemy |
| UIVS-04 | Visual feedback on incorrect input (distinct from correct feedback) | Red screen edge flash: draw semi-transparent red `fillRect` over full canvas for ~6 frames on wrong note event |
| AINP-07 | Detected note always visible on screen during gameplay | HUD "note pill" in canvas corner showing current `activeNotes` content; reads store via `.getState()` |
</phase_requirements>

---

## Summary

Phase 2 builds the playable game on top of the Phase 1 scaffold. The core architectural challenge is expanding the Zustand store from a thin audio event log into a full game state machine, then connecting that state to both the canvas rAF render loop and React UI overlays. No new libraries are strictly required — the existing stack (React, Zustand, Canvas 2D, Tailwind) handles all requirements. The one external library worth adding is `@tonaljs/tonal` for interval math, though the same result is achievable with plain MIDI arithmetic.

The game loop architecture follows the well-established fixed-timestep accumulator pattern: `update(dt)` advances enemy positions and checks note matches; `render()` draws the current state to the canvas. The two are separated so physics stays deterministic regardless of frame rate. Pause is implemented by gating `update()` calls in the rAF loop based on `gamePhase`, while `render()` continues to run (so the pause overlay can be drawn). Screen overlays (game over, wave clear, pause) are React JSX components absolutely positioned over the canvas — this avoids rebuilding a modal system in Canvas 2D and leverages Tailwind for styling.

The key musical mechanic — detecting whether the player played the correct note — is a direct Set membership check: `activeNotes.has(enemy.targetNote)`. This is checked in the `update()` pass every frame. For interval enemies (MUSC-04, MUSC-05), the check requires `activeNotes` to contain both target MIDI notes simultaneously. This works naturally with MIDI (both NoteOn events are in the store at once) but is fundamentally impossible with the microphone path because pitchy is a monophonic pitch detector. Interval enemies will work only for MIDI users; mic users will need interval enemies to either accept a sequential press pattern or be skipped in early levels.

**Primary recommendation:** Expand GameSlice with enemy array + wave state machine, gate the rAF `update()` on `gamePhase`, and render all non-canvas UI (pause, gameover, wave-clear) as React overlays. Keep canvas drawing pure Canvas 2D. Use `immer` middleware for cleaner enemy array mutations in Zustand.

---

## Standard Stack

### Core (already installed — no new installs required for minimum viable Phase 2)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | 5.0.11 | Game state: enemies, waves, HP, gamePhase | Already in project; slices pattern confirmed working |
| Canvas 2D API | native | Render enemies, path, HUD | Established in Phase 1 rAF loop |
| React 19 | 19.2.4 | UI overlays: gameover, wave-clear, pause screens | Already in project; absolute positioning over canvas |
| Tailwind v4 | 4.1.18 | Styling for overlay screens | Already in project |

### Supporting (recommended additions)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zustand/middleware/immer` | bundled with zustand 5.x | Mutable syntax for enemy array updates in Zustand | Use when GameSlice has enemy array mutations (splice, push, property update by id) |
| `@tonaljs/tonal` | ~6.x (latest) | Interval distance calculation between two MIDI notes | Use for interval enemy type (MUSC-04); can skip if computing semitone distance manually |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plain spread for enemy updates | Immer middleware | Immer is cleaner for nested mutations; spread is fine for simple arrays and avoids a new dependency |
| `@tonaljs/tonal` for intervals | Manual semitone math: `Math.abs(noteA - noteB)` | Manual math covers all use cases here (semitone count only); tonal adds zero benefit for this specific need |
| React overlays for gameover/pause | Canvas-drawn overlays | React JSX is faster to build and already handles layout; Canvas text layout for menus is painful |
| Separate game loop outside React | rAF loop inside useEffect | Separate module would complicate lifecycle; current pattern (useEffect rAF) is already established and working |

**Installation (if adding immer and tonal):**
```bash
npm install @tonaljs/tonal
# immer is bundled with zustand — import from 'zustand/middleware/immer', no separate install
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── stores/
│   ├── audioStore.ts        # Existing: AudioSlice + GameSlice (expand GameSlice here)
│   └── index.ts             # Re-exports
├── components/
│   ├── AppShell.tsx         # Add keyboard listener (ESC = pause), render overlay conditions
│   ├── GameCanvas.tsx       # Wire update(dt) + render(state) to rAF loop
│   ├── GameOverlay.tsx      # NEW: Pause / GameOver / WaveClear overlay switcher
│   ├── KeyboardStrip.tsx    # Existing — unchanged
│   └── DebugPanel.tsx       # Existing — unchanged
├── game/
│   ├── gameLoop.ts          # NEW: update(dt, state, dispatch) — pure function, no React
│   ├── waveConfig.ts        # NEW: LEVEL_CONFIGS, WAVE_CONFIGS — enemy spawn data
│   ├── enemyTypes.ts        # NEW: Enemy interface, EnemyType union, spawn factory
│   └── noteMatch.ts         # NEW: isNoteMatch(enemy, activeNotes) + isIntervalMatch()
├── hooks/
│   ├── useAudioInput.ts     # Existing
│   └── useMidiInput.ts      # Existing
└── lib/
    ├── noteUtils.ts         # Existing: extend with semitone distance helper
    └── supabase.ts          # Existing — unchanged
```

### Pattern 1: Fixed-Timestep rAF Loop with Pause Gate

**What:** Accumulate elapsed time; call `update(dt)` in fixed 16.67ms increments; always call `render()`. Pause by setting `gamePhase = 'paused'` — the loop continues but `update()` is skipped.

**When to use:** All canvas game loops. Ensures physics is frame-rate independent.

```typescript
// Source: established pattern from isaacsukin.com + gameprogrammingpatterns.com
const TIMESTEP = 1000 / 60  // 16.667ms

let previousTimeMs = 0
let accumulator = 0

const loop = (currentTimeMs: number) => {
  const raw = currentTimeMs - previousTimeMs
  const deltaTimeMs = Math.min(raw, 100) // clamp: prevents spiral of death after tab sleep
  previousTimeMs = currentTimeMs

  const { gamePhase } = useBoundStore.getState()

  if (gamePhase === 'playing') {
    accumulator += deltaTimeMs
    while (accumulator >= TIMESTEP) {
      update(TIMESTEP)
      accumulator -= TIMESTEP
    }
  }

  render()  // always render (shows pause overlay, etc.)
  frameId = requestAnimationFrame(loop)
}
```

### Pattern 2: GameSlice Expansion — Enemy Array + Wave State

**What:** Expand the existing `GameSlice` stub in `audioStore.ts` with full game state. Enemy objects are plain data; mutations go through Zustand actions.

**When to use:** This is the central state pattern for Phase 2.

```typescript
// Source: Zustand slices pattern (confirmed via Context7 /pmndrs/zustand)
// Extend the existing GameSlice in src/stores/audioStore.ts

export interface Enemy {
  id: string                        // crypto.randomUUID() or incrementing counter
  enemyType: 'note' | 'interval'
  targetNote: number                // MIDI note for 'note' type
  targetNotes?: [number, number]    // MIDI pair for 'interval' type
  noteName: string                  // Display string: "C4" or "3rd"
  pathT: number                     // 0.0–1.0 progress along path
  speed: number                     // path units per ms
  hp: number                        // starts at 1 for basic enemies
  maxHp: number
  state: 'alive' | 'dying' | 'dead'
  defeatedFrames: number            // counts down from ~12 when 'dying'
  color: string
}

interface GameSlice {
  gamePhase: 'idle' | 'playing' | 'paused' | 'wave-clear' | 'gameover'
  playerHP: number
  maxPlayerHP: number
  currentWave: number
  totalWaves: number
  enemies: Enemy[]
  spawnQueue: EnemySpawnEntry[]     // enemies queued for this wave
  spawnAccumulator: number          // ms since last spawn
  // Actions
  startGame: () => void
  pauseGame: () => void
  resumeGame: () => void
  advanceWave: () => void
  spawnEnemy: (entry: EnemySpawnEntry) => void
  damageEnemy: (id: string, damage: number) => void
  removeDeadEnemies: () => void
  enemyReachedGoal: (id: string) => void
  resetGame: () => void
}
```

### Pattern 3: Note-Match Check in update()

**What:** Every `update()` call, for each living enemy, check if `activeNotes` satisfies the enemy's target. Fire the defeat action if matched.

**When to use:** Core game logic in `gameLoop.ts`.

```typescript
// Source: derived from activeNotes Set design established in Phase 1
// File: src/game/noteMatch.ts

export function isNoteMatch(enemy: Enemy, activeNotes: Set<number>): boolean {
  if (enemy.enemyType === 'note') {
    return activeNotes.has(enemy.targetNote)
  }
  if (enemy.enemyType === 'interval') {
    // Both notes must be simultaneously active
    const [noteA, noteB] = enemy.targetNotes!
    return activeNotes.has(noteA) && activeNotes.has(noteB)
  }
  return false
}

// Interval distance: semitones between two MIDI notes (no tonal.js needed)
export function semitoneDist(a: number, b: number): number {
  return Math.abs(a - b)
}
```

### Pattern 4: Wave Spawn Accumulator

**What:** In `update(dt)`, tick `spawnAccumulator += dt`. When it exceeds the configured spawn interval and `spawnQueue` has entries, pop an entry and create an enemy.

**When to use:** All wave-based spawning. Avoids setTimeout (which fires outside the game loop and can't be paused).

```typescript
// Source: research synthesis — accumulator pattern avoids setTimeout off-thread timing
// File: src/game/gameLoop.ts

function updateSpawner(dt: number): void {
  const state = useBoundStore.getState()
  if (state.spawnQueue.length === 0) return

  state.spawnAccumulator += dt
  const spawnInterval = 2000 // ms between enemies in this wave

  if (state.spawnAccumulator >= spawnInterval) {
    const entry = state.spawnQueue[0]
    useBoundStore.setState((s) => ({
      spawnQueue: s.spawnQueue.slice(1),
      spawnAccumulator: 0,
      enemies: [...s.enemies, buildEnemy(entry)],
    }))
  }
}
```

### Pattern 5: React Overlays for Non-Canvas UI

**What:** Gameover, pause, and wave-clear screens are React components, absolutely positioned over the canvas div. They read `gamePhase` from Zustand via hooks.

**When to use:** All full-screen interstitial states. Much simpler than recreating layout in Canvas 2D.

```typescript
// Source: established pattern from research — "React for UI, Canvas for game"
// File: src/components/GameOverlay.tsx

import { useBoundStore } from '../stores'

export function GameOverlay() {
  const gamePhase = useBoundStore((s) => s.gamePhase)
  const startGame = useBoundStore((s) => s.startGame)
  const resumeGame = useBoundStore((s) => s.resumeGame)
  const advanceWave = useBoundStore((s) => s.advanceWave)
  const resetGame = useBoundStore((s) => s.resetGame)

  if (gamePhase === 'idle') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-20">
        <button onClick={startGame} className="...">Start Game</button>
      </div>
    )
  }
  if (gamePhase === 'paused') { /* ... */ }
  if (gamePhase === 'wave-clear') { /* ... */ }
  if (gamePhase === 'gameover') { /* ... */ }
  return null
}
```

### Pattern 6: Canvas HUD (Always Last in drawFrame)

**What:** After drawing enemies and path, draw HUD elements with Canvas 2D. Drawing order ensures HUD is always on top.

**When to use:** HP bar, wave counter, detected note pill — all drawn in the `render()` function after game objects.

```typescript
// Source: standard Canvas 2D draw order principle (confirmed MDN)
// Called at the END of drawFrame(), after enemies

function drawHUD(ctx: CanvasRenderingContext2D, w: number, h: number, state: GameState): void {
  const { playerHP, maxPlayerHP, currentWave, totalWaves } = state

  // HP bar
  const barW = 160, barH = 14, barX = 12, barY = 12
  ctx.fillStyle = '#333'
  ctx.fillRect(barX, barY, barW, barH)
  ctx.fillStyle = playerHP / maxPlayerHP > 0.5 ? '#22c55e' : '#ef4444'
  ctx.fillRect(barX, barY, barW * (playerHP / maxPlayerHP), barH)
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 1
  ctx.strokeRect(barX, barY, barW, barH)

  // Wave counter
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 14px monospace'
  ctx.textAlign = 'right'
  ctx.fillText(`Wave ${currentWave}/${totalWaves}`, w - 12, 26)

  // Active note pill (AINP-07)
  const activeNotes = useBoundStore.getState().activeNotes
  const noteLabel = activeNotes.size > 0
    ? [...activeNotes].map(midiNoteToName).join('+')
    : '—'
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.fillRect(12, h - 44, 80, 24)
  ctx.fillStyle = '#fff'
  ctx.font = '13px monospace'
  ctx.textAlign = 'left'
  ctx.fillText(noteLabel, 20, h - 28)
}
```

### Pattern 7: Defeat + Wrong-Note Visual Feedback

**What:** Two distinct effects driven by frame counters in the rAF loop:
- **Correct hit (UIVS-03):** Enemy enters `'dying'` state. Each frame: draw white ring expanding outward, shrink enemy radius, decrement `defeatedFrames`. When 0, remove from array.
- **Wrong note (UIVS-04):** Global `wrongNoteFlashFrames` counter in GameSlice. When > 0, draw semi-transparent red rectangle over full canvas at start of `render()`.

```typescript
// Wrong-note flash (UIVS-04) — drawn at start of render before enemies
if (wrongNoteFlashFrames > 0) {
  ctx.fillStyle = `rgba(220, 38, 38, ${wrongNoteFlashFrames / 8 * 0.35})`
  ctx.fillRect(0, 0, canvas.width, canvas.height)
}

// Enemy dying animation (UIVS-03) — per-enemy in render pass
if (enemy.state === 'dying') {
  const progress = 1 - (enemy.defeatedFrames / 12)
  const ringRadius = enemyRadius * (1 + progress * 0.8)
  ctx.beginPath()
  ctx.arc(pos.x, pos.y, ringRadius, 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(255,255,255,${1 - progress})`
  ctx.lineWidth = 3
  ctx.stroke()
}
```

### Anti-Patterns to Avoid

- **Using setTimeout/setInterval for enemy spawning:** These fire outside the game loop and cannot be paused with `gamePhase`. Use the accumulator pattern instead.
- **Storing enemy visual state in React state:** Enemy positions and states change 60x/sec. React re-renders on every change would destroy performance. Store all enemy data in Zustand and read via `.getState()` in the rAF loop.
- **Calling useXxx hooks inside rAF loop callbacks:** Hooks are React-only. The rAF callback is not a React component. Always use `useBoundStore.getState()` (or subscribe) in the loop.
- **Re-creating the enemy array on every frame:** Map over the existing array for updates; only create a new array reference when content actually changes. Unnecessary array churn causes garbage collection pauses.
- **Detecting intervals from microphone:** pitchy is a monophonic pitch detector. It will never reliably detect two simultaneous notes from mic input. Interval enemies (MUSC-04/05) are MIDI-only.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Enemy array mutations with nested state | Manual `[...state.enemies.map(...)]` chains | `immer` middleware from `zustand/middleware/immer` | Nested spread chains are error-prone; immer produces correct immutable updates with mutable syntax |
| Interval name from two MIDI notes | Custom interval lookup table | `Math.abs(noteA - noteB)` + a small lookup `{3:'3rd',4:'3rd',5:'4th',7:'5th'}` | Sufficient for this game; no library needed |
| Pause/resume timing | Custom timestamp tracking | Delta-time clamp + accumulator reset on resume | Standard pattern handles tab-sleep and focus loss; just clamp delta to ≤100ms |
| Spawn timing | setTimeout per enemy | Accumulator in `update(dt)` | Accumulator is pausable; setTimeout is not |

**Key insight:** The entire Phase 2 mechanic is fundamentally a Set-membership check (`activeNotes.has(target)`) inside a 60fps loop. Don't overcomplicate it.

---

## Common Pitfalls

### Pitfall 1: Interval Enemies with Microphone

**What goes wrong:** MUSC-04/05 require detecting two simultaneous notes. The mic hook uses pitchy which is fundamentally monophonic — it returns one frequency per frame.

**Why it happens:** pitchy uses the McLeod Pitch Method, which finds a single fundamental frequency in the time-domain signal. Two simultaneous piano notes produce a complex waveform that confuses MPM.

**How to avoid:** For the initial Phase 2 implementation, restrict interval enemies to MIDI input only. In `noteMatch.ts`, check `source` or check whether `activeNotes.size >= 2` before attempting interval matching. Document this limitation clearly.

**Warning signs:** Player can never defeat interval enemies with mic; they always pass through to goal. Test with both mic and MIDI sessions.

### Pitfall 2: Spiral of Death in Fixed Timestep

**What goes wrong:** If the browser tab is backgrounded or a frame takes too long, `deltaTimeMs` spikes to seconds. The `while (accumulator >= TIMESTEP)` loop runs hundreds of iterations to catch up, freezing the tab.

**Why it happens:** Unclamped delta time passed directly to accumulator.

**How to avoid:** Clamp delta: `const deltaTimeMs = Math.min(raw, 100)`. This caps maximum simulation to ~6 physics steps per frame.

**Warning signs:** Game freezes for a second after switching back to the tab, then enemies teleport far down the path.

### Pitfall 3: Wrong-Note Trigger Flooding

**What goes wrong:** The `activeNotes` set changes every mic poll cycle (pitchy emits NoteOn/NoteOff frequently). If wrong-note feedback triggers every frame where `activeNotes` doesn't match any enemy, the screen flashes constantly.

**Why it happens:** The wrong-note check fires too broadly — any NoteOn that doesn't match triggers it.

**How to avoid:** Only fire wrong-note feedback on a fresh `NoteOn` event (type === 'NoteOn'), not on every frame. Track `lastCheckedEvent: number` (timestamp) in GameSlice to debounce. Alternatively: only trigger wrong-note flash when the player actively plays a note, not on NoteOff or silence.

**Warning signs:** Red edge flash is constantly on during gameplay.

### Pitfall 4: Enemy Array Mutations Causing Stale Closures

**What goes wrong:** The rAF loop captures `enemies` in a closure. Mutations via Zustand dispatch update the store, but the loop reads stale `enemies` from the closed-over reference.

**Why it happens:** `const { enemies } = useBoundStore.getState()` called once at loop setup instead of every frame.

**How to avoid:** Always read `.getState()` at the top of each `update()` call (not once on mount). The rAF loop pattern from Phase 1 already does this correctly via `useBoundStore.getState()` inside the loop body.

**Warning signs:** Enemies that should be removed are still visible; new enemies don't appear.

### Pitfall 5: React Overlay Re-render Thrash

**What goes wrong:** `GameOverlay` subscribes to `gamePhase` which changes rapidly during gameplay. If the selector is too broad (selecting the whole store), any game state change causes a React re-render.

**Why it happens:** `useBoundStore()` without a selector returns the entire store, re-rendering on every `enemy.pathT` update.

**How to avoid:** Always use narrow selectors: `useBoundStore((s) => s.gamePhase)` — this only re-renders when `gamePhase` itself changes, which is infrequent.

**Warning signs:** React DevTools shows the overlay component re-rendering 60 times per second.

### Pitfall 6: Canvas.width/height vs CSS width/height

**What goes wrong:** The canvas element CSS size and its drawing buffer size are independent. Drawing at coordinates based on CSS pixel dimensions produces blurry output at non-1:1 devicePixelRatio, or wrong positions if buffer size is set to CSS values only.

**Why it happens:** `canvas.width` must be set to the actual pixel buffer size. The Phase 1 `ResizeObserver` already handles this correctly for window resize.

**How to avoid:** Already solved in Phase 1 — the `ResizeObserver` sets `canvas.width = entry.contentRect.width`. Don't change this pattern. If adding devicePixelRatio support: multiply `canvas.width` by `window.devicePixelRatio` and scale the context.

**Warning signs:** Enemy circles appear at wrong positions or are blurry on retina displays.

---

## Code Examples

Verified patterns from official/confirmed sources:

### Fixed Timestep with Pause Gate

```typescript
// Source: isaacsukin.com + gameprogrammingpatterns.com — confirmed patterns
const TIMESTEP = 1000 / 60

let previousTimeMs = 0
let accumulator = 0

const loop = (currentTimeMs: number): void => {
  const rawDelta = currentTimeMs - previousTimeMs
  const deltaTimeMs = Math.min(rawDelta, 100) // clamp: no spiral of death
  previousTimeMs = currentTimeMs

  const { gamePhase } = useBoundStore.getState()

  if (gamePhase === 'playing') {
    accumulator += deltaTimeMs
    while (accumulator >= TIMESTEP) {
      update(TIMESTEP)
      accumulator -= TIMESTEP
    }
  }

  render()
  frameId = requestAnimationFrame(loop)
}
```

### Zustand Immer for Enemy Updates

```typescript
// Source: Context7 /pmndrs/zustand — confirmed with immer middleware docs
import { immer } from 'zustand/middleware/immer'

// In GameSlice creator, with immer middleware applied at BoundStore level:
damageEnemy: (id, damage) =>
  set((state) => {
    const enemy = state.enemies.find((e) => e.id === id)
    if (enemy) {
      enemy.hp -= damage
      if (enemy.hp <= 0) {
        enemy.state = 'dying'
        enemy.defeatedFrames = 12
      }
    }
  }),

removeDeadEnemies: () =>
  set((state) => {
    state.enemies = state.enemies.filter((e) => e.state !== 'dead')
  }),
```

### ESC Key Pause in AppShell

```typescript
// Source: React useEffect keyboard pattern — confirmed standard approach
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !e.repeat) {
      const { gamePhase, pauseGame, resumeGame } = useBoundStore.getState()
      if (gamePhase === 'playing') pauseGame()
      else if (gamePhase === 'paused') resumeGame()
    }
  }
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [])
```

### Note Match in update()

```typescript
// Source: derived from Phase 1 activeNotes Set design
function checkNoteMatches(): void {
  const { enemies, activeNotes } = useBoundStore.getState()

  for (const enemy of enemies) {
    if (enemy.state !== 'alive') continue
    if (isNoteMatch(enemy, activeNotes)) {
      useBoundStore.getState().damageEnemy(enemy.id, 1)
    }
  }
}
```

### Wave Spawn Accumulator (no setTimeout)

```typescript
// Source: research synthesis — established game dev pattern
function updateSpawner(dt: number): void {
  const { spawnQueue, spawnAccumulator, spawnInterval } = useBoundStore.getState()
  if (spawnQueue.length === 0) return

  const newAccumulator = spawnAccumulator + dt

  if (newAccumulator >= spawnInterval) {
    const [next, ...rest] = spawnQueue
    useBoundStore.setState((s) => ({
      spawnQueue: rest,
      spawnAccumulator: 0,
      enemies: [...s.enemies, buildEnemy(next)],
    }))
  } else {
    useBoundStore.setState({ spawnAccumulator: newAccumulator })
  }

  // When queue empty and all enemies dead: transition to wave-clear
  const { enemies } = useBoundStore.getState()
  if (rest.length === 0 && enemies.every((e) => e.state === 'dead')) {
    useBoundStore.getState().advanceWave()
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `setInterval` for game loops | `requestAnimationFrame` with delta-time accumulator | Smooth animation, pausable, tab-hidden aware |
| `setTimeout` for spawn timers | In-loop accumulator pattern | Correctly respects game pause state |
| OOP Enemy class hierarchy | Plain data objects + pure update functions | Simpler TypeScript, easier to serialize, works naturally with Zustand |
| Canvas for all UI (menus, overlays) | Canvas for game world + React JSX for UI overlays | Faster development, better accessibility, Tailwind styling |
| ECS architecture | Simple arrays of typed objects | ECS is overkill for a game with <50 enemies; plain arrays are correct here |

**Deprecated/outdated:**
- `requestAnimationFrame` polyfills: All target browsers support it natively. Do not add.
- `Date.now()` for frame deltas: Use the `timestamp` argument provided by `requestAnimationFrame` instead.

---

## Open Questions

1. **Interval enemies with microphone (MUSC-04/05)**
   - What we know: pitchy is monophonic; `activeNotes` will only ever have 1 entry for mic users
   - What's unclear: Should interval enemies be skipped entirely until MIDI is verified? Or should the first N waves use only single-note enemies?
   - Recommendation: Restrict first 3 waves to single-note enemies only (C major scale subset). Introduce interval enemies in wave 4+ with a note in the level config indicating MIDI-recommended.

2. **Wrong-note feedback trigger criteria (UIVS-04)**
   - What we know: `activeNotes` changes every mic poll frame; triggering on every frame would flood the display
   - What's unclear: Should wrong-note flash trigger on NoteOn events that don't match any living enemy, or only when a NoteOn explicitly conflicts?
   - Recommendation: Subscribe to the `events` array in Zustand; scan only new events since last frame. Fire wrong-note flash when a `NoteOn` event's note does not match any living enemy's `targetNote`.

3. **Wave-clear screen content (GAME-09)**
   - What we know: requirement says "upgrades/choices" but no upgrade system is defined yet
   - What's unclear: Is a placeholder "Continue" button sufficient for Phase 2, or does the wave-clear screen need real upgrade options?
   - Recommendation: Implement a minimal wave-clear screen with a "Next Wave" button only. Upgrade system is a Phase 3+ concern.

4. **Path T value clamping and goal detection**
   - What we know: enemies at `pathT >= 1.0` have reached the goal
   - What's unclear: Should goal detection fire per-frame in `update()` or once on the exact frame pathT crosses 1.0?
   - Recommendation: Check `if (enemy.pathT >= 1.0 && enemy.state === 'alive')` in update(); fire `enemyReachedGoal` action and transition enemy state to `'dead'` immediately to avoid double-counting.

---

## Sources

### Primary (HIGH confidence)

- `/pmndrs/zustand` via Context7 — slices pattern, immer middleware, `.getState()` outside React, subscribe for transient updates
- `gameprogrammingpatterns.com/state.html` — FSM state machine patterns, enter/exit actions, hierarchical states
- `isaacsukin.com` — fixed timestep accumulator, spiral-of-death protection, pause/resume pattern
- `developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Advanced_animations` — alpha fade, globalAlpha, animation loop patterns

### Secondary (MEDIUM confidence)

- `github.com/tonaljs/tonal` — `Note.fromMidi()`, `Interval.distance()`, `Interval.semitones()` API (cross-verified via npm README)
- `aleksandrhovhannisyan.com/blog/javascript-game-loop/` — fixed timestep with modular drift prevention
- `blog.sklambert.com/html5-canvas-game-the-enemy-ships/` — object pool + wave spawn patterns
- WebSearch: canvas HUD draw order (MDN Canvas 2D draw order principle — later calls render on top)
- WebSearch: React absolute overlay pattern on canvas (multiple community sources agree)

### Tertiary (LOW confidence)

- WebSearch: tonal.js MIDI interval detection — partially verified via GitHub README; not queried via Context7 (Tone.js resolved instead, which is a different library). Manual semitone math is the recommended approach regardless.
- WebSearch: wrong-note flash debounce pattern — no canonical source found; recommendation is synthesis from observed pitfalls

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Zustand, Canvas 2D, React overlays all confirmed working in Phase 1; immer is bundled with zustand v5
- Architecture: HIGH — fixed timestep, update/render separation, FSM patterns are canonical game dev patterns verified from multiple authoritative sources
- Pitfalls: MEDIUM — interval-enemy monophonic limitation is technically certain; others are inference from patterns + experience
- Interval enemy mechanics (MUSC-04/05): LOW for mic path, HIGH for MIDI path

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (all dependencies are stable; no fast-moving libraries)

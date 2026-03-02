# Phase 3: Complete Game - Research

**Researched:** 2026-03-02
**Domain:** Zustand persist middleware, localStorage schema design, screen routing via state machine, level select UI, star rating animation, stats tracking, penalty mode system
**Confidence:** HIGH (Zustand persist API, middleware stacking, partialize, version/migrate), MEDIUM (star animation approach, screen routing pattern, stats data model), LOW (map path visual implementation — no canonical approach found)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Level design & difficulty
- Difficulty increases through both more note variety AND faster enemies
- Level 1 starts with a full octave of white keys (C4-C5)
- Later levels (3+) gradually introduce sharps/flats (black keys)
- Wave count increases with difficulty: early levels have 3 waves, later levels have 4-5
- 3-5 levels available at launch, unlocking sequentially

#### Level select screen
- Path/map style layout (like Mario World or Candy Crush) — visual sense of journey
- Each level node shows: star rating (1-3 stars), best score, level name/theme, note range preview
- Locked levels are visible but grayed out with a lock icon — player sees the full journey ahead
- Unlocking requires minimum 1 star (e.g. 50%+ accuracy) — ensures basic competency before advancing

#### Settings & penalty modes
- Settings accessible from both the pause menu during gameplay AND the level select map screen
- Three penalty modes framed as difficulty labels: Easy (no penalty) / Normal (HP damage) / Hard (enemy advances)
- No reset on mode switch — stars and scores persist regardless of which mode was used
- Input source toggle included (switch between mic and MIDI) alongside penalty mode

#### Stats presentation
- Stats shown as end-of-level summary only — no live HUD stats during gameplay
- End-of-level summary includes: accuracy percentage, average reaction time, stars earned (animated fill), comparison to previous best
- Separate overall stats page accessible from the map screen
- Overall stats page shows: total levels completed, overall accuracy trend, total play time, most missed notes

### Claude's Discretion
- Exact star rating thresholds (what accuracy % earns 2 vs 3 stars)
- Level names and theming
- Map visual style and animation
- Stats page chart/visualization approach
- Persistence data model (localStorage structure)
- End-of-level summary animation timing

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PROG-01 | Player progress (completed levels, scores) persists via localStorage | Zustand `persist` middleware with `partialize` + versioned schema; a dedicated `ProgressSlice` holds per-level records and writes to localStorage key `pianuki-progress` |
| PROG-02 | Player can select any unlocked level from a level select screen | `currentScreen` field in Zustand drives screen switching (idle → levelSelect → playing); `LevelSelectScreen` React component reads unlock status from ProgressSlice |
| PROG-03 | Levels unlock sequentially as previous levels are completed | Unlock check: level N is unlocked if `progress.levels[N-1].stars >= 1`; computed on read, not stored separately |
| PROG-04 | 3-5 levels of increasing difficulty available at launch | Expand `LEVEL_CONFIGS` in `waveConfig.ts` from 3 to 5 entries; follow the established `LevelConfig` interface; levels 3-4 add black keys |
| SETT-01 | Player can configure mistake penalty mode (damage to HP / enemy advances / no penalty) | `penaltyMode` setting in SettingsSlice; `gameLoop.ts` branches on `penaltyMode` when `enemyReachedGoal` fires; persist alongside input source setting |
| SETT-02 | Player can see their accuracy and reaction time stats during/after gameplay | Stats tracked in-session as running accumulators (correctHits, totalNoteEvents, reactionTimes[]); summary computed on level complete; overall stats aggregated from persisted per-level records |
| SETT-03 | Settings persist across sessions via localStorage | `persist` middleware `partialize` includes `penaltyMode` and `inputSource`; separate localStorage key `pianuki-settings` |
</phase_requirements>

---

## Summary

Phase 3 adds three distinct systems on top of the working Phase 2 game loop: **persistence** (localStorage via Zustand persist middleware), **screen navigation** (level select map as a new screen state), and **stats tracking** (in-session accumulators + end-of-level summary). No new gameplay libraries are required. The entire phase is buildable with the existing stack — Zustand, React, Tailwind, and the Canvas 2D setup.

The critical architectural choice is how to add `persist` middleware to a store that already uses `devtools` and `immer`. The correct Zustand v5 pattern is `devtools(persist(immer(...)))` — devtools outermost, immer innermost. Crucially, only persisted data shapes go into `partialize`; all runtime state (enemies, spawnQueue, currentWave, etc.) is explicitly excluded. The store is split into two separate persisted keys: `pianuki-progress` and `pianuki-settings`. This allows clearing one without affecting the other and keeps schema versioning independent.

Screen navigation is handled by adding a `currentScreen` field to the GameSlice FSM — values: `'levelSelect' | 'game' | 'stats'`. The existing `gamePhase` FSM manages in-game states (`playing | paused | wave-clear | gameover`); `currentScreen` wraps above it. The `AppShell.tsx` switches between `<LevelSelectScreen>`, `<GameCanvas>+<GameOverlay>`, and `<StatsScreen>` based on `currentScreen`. No router library is needed.

**Primary recommendation:** Add `persist` middleware wrapping `immer` inside the existing `devtools` wrapper; use `partialize` aggressively to exclude all runtime game state; add `ProgressSlice` and `SettingsSlice` as new Zustand slices; add `currentScreen` to drive screen switching; track stats as in-session accumulators that get committed to ProgressSlice on level complete.

---

## Standard Stack

### Core (no new installs required)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | 5.0.11 | `persist` middleware for localStorage; new ProgressSlice + SettingsSlice | Already installed; `persist` ships with zustand |
| React 19 | 19.2.4 | LevelSelectScreen, LevelSummaryScreen, StatsScreen, SettingsPanel | Already installed |
| Tailwind v4 | 4.2.1 | Styling for all new screens; custom `@utility anim-delay-*` for star animation | Already installed |
| Canvas 2D | native | Unchanged game render loop | Already working from Phase 2 |

### Supporting (no new installs recommended)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None needed | — | All requirements achievable with existing stack | — |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zustand `persist` for localStorage | Manual `localStorage.setItem/getItem` | `persist` handles hydration, versioning, migrations, SSR — don't hand-roll |
| `currentScreen` field in Zustand | react-router or TanStack Router | No URL-based navigation needed; adding a router is over-engineering for 3 screens |
| CSS animation-delay for star sequence | Framer Motion / GSAP | Tailwind v4 `@utility anim-delay-*` covers the stagger need; no animation library justified |
| Inline stats computation on summary screen | Pre-computing and storing all stats | Computing from raw per-level records is simpler and avoids denormalization bugs |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Recommended Project Structure (additions to Phase 2)

```
src/
├── stores/
│   ├── audioStore.ts        # MODIFY: add persist middleware; add ProgressSlice, SettingsSlice
│   └── index.ts             # Unchanged
├── components/
│   ├── AppShell.tsx         # MODIFY: switch on currentScreen
│   ├── LevelSelectScreen.tsx # NEW: map path + level nodes
│   ├── LevelSummaryScreen.tsx # NEW: end-of-level overlay (accuracy, stars, reaction time)
│   ├── StatsScreen.tsx      # NEW: overall stats page
│   ├── SettingsPanel.tsx    # NEW: penalty mode + input source, shown in pause + map
│   ├── GameCanvas.tsx       # Unchanged
│   ├── GameOverlay.tsx      # MODIFY: show LevelSummary instead of idle on level complete; add settings button
│   ├── KeyboardStrip.tsx    # Unchanged
│   └── DebugPanel.tsx       # Unchanged
└── game/
    ├── gameLoop.ts          # MODIFY: branch on penaltyMode; collect stats accumulators
    ├── waveConfig.ts        # MODIFY: expand to 5 levels; add level metadata (name, noteRange preview)
    ├── enemyTypes.ts        # Unchanged
    └── noteMatch.ts         # Unchanged
```

### Pattern 1: Adding persist Middleware to the Existing Store

**What:** Wrap the existing `devtools(immer(...))` stack with `persist` between devtools and immer. Use `partialize` to exclude all runtime/transient state from storage.

**When to use:** This is the single correct way to add persistence in the existing architecture.

**Critical ordering:** `devtools` outermost, then `persist`, then `immer` innermost. This is verified from Context7 official Zustand docs.

```typescript
// Source: Context7 /pmndrs/zustand — confirmed middleware stacking pattern
// File: src/stores/audioStore.ts

import { create, StateCreator } from 'zustand'
import { devtools, persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// StateCreator for each slice must declare ALL middleware mutators in its mutators tuple:
// [['zustand/devtools', never], ['zustand/persist', PersistedShape], ['zustand/immer', never]]
// In practice for slices: use the BoundStore type + declare mutators at the create() call level,
// not in individual StateCreators (avoids TypeScript propagation issues)

export const useBoundStore = create<BoundStore>()(
  devtools(
    persist(
      immer((...args) => ({
        ...createAudioSlice(...args),
        ...createGameSlice(...args),
        ...createProgressSlice(...args),
        ...createSettingsSlice(...args),
      })),
      {
        name: 'pianuki-progress',           // localStorage key
        storage: createJSONStorage(() => localStorage),
        version: 1,                          // bump + migrate() when schema changes
        partialize: (state) => ({
          // ONLY include data that must survive page refresh
          progress: state.progress,          // from ProgressSlice
          settings: state.settings,          // from SettingsSlice
          // Exclude ALL runtime state: enemies, spawnQueue, gamePhase, activeNotes, etc.
        }),
      }
    ),
    { name: 'pianuki-store' }               // keep existing DevTools name
  ),
)
```

**Alternative: two stores.** If the single-store approach causes TypeScript mutator-tuple complexity, split into:
- `useGameStore` (devtools + immer, no persist) — runtime game state
- `usePersistStore` (devtools + persist + immer) — progress + settings

This trades one complex type for two simpler stores. The existing `useBoundStore` pattern strongly favors single store; only split if TS errors become unmanageable.

### Pattern 2: ProgressSlice and SettingsSlice

**What:** Two new slices added to the existing BoundStore. `ProgressSlice` holds per-level records. `SettingsSlice` holds user preferences. Both are included in `partialize`.

```typescript
// Source: derived from existing slices pattern in audioStore.ts

// --- Per-level record (stored in ProgressSlice) ---
export interface LevelRecord {
  completed: boolean
  stars: number          // 0 = not completed, 1-3 = star rating
  bestAccuracy: number   // 0–100 percentage
  bestReactionMs: number // avg reaction time in ms for best run (lower = better)
  playCount: number
  totalPlayTimeMs: number
}

// --- ProgressSlice ---
interface ProgressSlice {
  progress: {
    levels: Record<number, LevelRecord>  // keyed by levelIndex
    totalPlayTimeMs: number
    noteMissCounts: Record<string, number> // noteName → miss count (e.g. "C#4": 3)
  }
  recordLevelComplete: (levelIndex: number, result: LevelResult) => void
  resetProgress: () => void
}

// --- SettingsSlice ---
interface SettingsSlice {
  settings: {
    penaltyMode: 'easy' | 'normal' | 'hard'
    inputSource: 'mic' | 'midi'
  }
  setPenaltyMode: (mode: 'easy' | 'normal' | 'hard') => void
  setInputSource: (source: 'mic' | 'midi') => void
}

// --- LevelResult (computed at end of each level run) ---
export interface LevelResult {
  levelIndex: number
  accuracy: number        // 0–100
  avgReactionMs: number   // average ms from enemy spawn to correct note
  durationMs: number      // total time to complete the level
  noteMisses: Record<string, number>  // noteName → miss count this run
}
```

### Pattern 3: Screen Navigation via currentScreen

**What:** Add `currentScreen` to GameSlice. AppShell switches rendered component based on this field. No router needed.

```typescript
// Source: synthesis — standard pattern for small game apps with no URL routing needs

// In GameSlice:
interface GameSlice {
  currentScreen: 'levelSelect' | 'game' | 'stats'
  gamePhase: 'idle' | 'playing' | 'paused' | 'wave-clear' | 'gameover' | 'level-complete'
  // ... existing fields unchanged
  navigateTo: (screen: 'levelSelect' | 'game' | 'stats') => void
  startLevel: (levelIndex: number) => void  // sets currentScreen='game', starts game
}

// In AppShell.tsx:
export function AppShell() {
  const currentScreen = useBoundStore((s) => s.currentScreen)

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-950 overflow-hidden">
      {currentScreen === 'levelSelect' && <LevelSelectScreen />}
      {currentScreen === 'game' && (
        <div className="relative flex flex-1 overflow-hidden">
          <GameCanvas />
          <GameOverlay />
        </div>
      )}
      {currentScreen === 'stats' && <StatsScreen />}
      <KeyboardStrip />
    </div>
  )
}
```

**Note on gamePhase:** Add `'level-complete'` as a new gamePhase value. When all waves finish successfully (currently transitions to `'idle'`), transition to `'level-complete'` instead. `GameOverlay` renders `<LevelSummaryScreen>` when `gamePhase === 'level-complete'`. After the player dismisses summary, navigate to `'levelSelect'`.

### Pattern 4: In-Session Stats Accumulation

**What:** Track stats as module-level accumulators in `gameLoop.ts` (or a companion `statsTracker.ts`). Reset on level start. Commit to ProgressSlice on `level-complete`.

**When to use:** Stats must be tracked at the game loop level, not in React components, because accuracy requires counting every note event. React components cannot reliably intercept game loop timing.

```typescript
// Source: synthesis from game loop patterns established in Phase 2
// File: src/game/statsTracker.ts

let correctHits = 0
let totalEnemiesSpawned = 0
let reactionTimes: number[] = []       // ms from enemy spawn to hit
let noteMissesByNote: Record<string, number> = {}
let levelStartTimeMs = 0

export function resetStats(levelStartTime: number): void {
  correctHits = 0
  totalEnemiesSpawned = 0
  reactionTimes = []
  noteMissesByNote = {}
  levelStartTimeMs = levelStartTime
}

export function recordEnemySpawned(): void {
  totalEnemiesSpawned++
}

export function recordCorrectHit(enemySpawnTimeMs: number, hitTimeMs: number): void {
  correctHits++
  reactionTimes.push(hitTimeMs - enemySpawnTimeMs)
}

export function recordMiss(noteName: string): void {
  noteMissesByNote[noteName] = (noteMissesByNote[noteName] ?? 0) + 1
}

export function computeLevelResult(levelIndex: number): LevelResult {
  const accuracy = totalEnemiesSpawned === 0 ? 0
    : Math.round((correctHits / totalEnemiesSpawned) * 100)
  const avgReactionMs = reactionTimes.length === 0 ? 0
    : Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
  return {
    levelIndex,
    accuracy,
    avgReactionMs,
    durationMs: performance.now() - levelStartTimeMs,
    noteMisses: { ...noteMissesByNote },
  }
}
```

### Pattern 5: Star Rating Thresholds (Claude's Discretion)

**Recommendation:** Calibrated for a game teaching music theory — generous thresholds encourage progression.

| Stars | Accuracy Threshold | Reasoning |
|-------|-------------------|-----------|
| 1 star | >= 50% | Minimum to unlock next level; ensures basic recognition |
| 2 stars | >= 75% | Competent — player knows most of the notes |
| 3 stars | >= 90% | Excellent — near-perfect note recognition |

```typescript
// Source: recommendation based on game design principles
export function computeStars(accuracy: number): number {
  if (accuracy >= 90) return 3
  if (accuracy >= 75) return 2
  if (accuracy >= 50) return 1
  return 0
}
```

### Pattern 6: Star Animation (Tailwind v4, no library)

**What:** Sequential star fill using CSS animation-delay via Tailwind v4 `@utility`. Three star elements each get a progressive delay so they fill in one by one.

```css
/* src/index.css — add to existing Tailwind directives */
@utility anim-delay-* {
  animation-delay: calc(--value(integer) * 1ms);
}

@keyframes star-fill {
  from { opacity: 0; transform: scale(0.5); }
  to   { opacity: 1; transform: scale(1); }
}
```

```tsx
// Source: Tailwind v4 @utility pattern (blurp.dev/blog/tailwind-animation-delay-property, confirmed)
// LevelSummaryScreen.tsx — star fill animation
const STAR_DELAY_MS = [0, 400, 800]  // stagger: 400ms between each star

{[0, 1, 2].map((i) => (
  <span
    key={i}
    className={[
      'text-4xl',
      i < stars
        ? `animate-[star-fill_0.4s_ease-out_forwards] anim-delay-${STAR_DELAY_MS[i]}`
        : 'opacity-20',
    ].join(' ')}
  >
    ★
  </span>
))}
```

### Pattern 7: Penalty Mode Implementation

**What:** `penaltyMode` in SettingsSlice determines what happens when an enemy reaches the goal. The existing `enemyReachedGoal` action in GameSlice always reduces HP — this must be refactored to branch on `penaltyMode`.

```typescript
// File: src/game/gameLoop.ts — Step 3: Check if any enemy reached the goal
// MODIFY the existing goal-check logic:

const { penaltyMode } = useBoundStore.getState().settings

for (const enemy of postMoveState.enemies) {
  if (enemy.pathT >= 1.0 && enemy.state === 'alive') {
    if (penaltyMode === 'easy') {
      // No penalty: just remove the enemy
      useBoundStore.setState((s) => {
        const e = s.enemies.find((x) => x.id === enemy.id)
        if (e) e.state = 'dead'
      })
    } else if (penaltyMode === 'normal') {
      // HP damage: existing enemyReachedGoal behavior
      useBoundStore.getState().enemyReachedGoal(enemy.id)
    } else if (penaltyMode === 'hard') {
      // Enemy advances: reset enemy to pathT=0 instead of removing it
      useBoundStore.setState((s) => {
        const e = s.enemies.find((x) => x.id === enemy.id)
        if (e) { e.pathT = 0 }
      })
    }
  }
}
```

### Pattern 8: Level Select Map Layout

**What:** A React component rendering level nodes connected by a path line. CSS `position: absolute` nodes along a curved or zigzag SVG path. Each node is a circle with star rating, level name, and lock state.

**Design recommendation (Claude's discretion):** Simple zigzag layout — nodes alternate left-center-right across vertical space. An SVG `<path>` element in the background connects nodes with a bezier curve. Locked nodes are gray with a padlock icon (Unicode: 🔒). No canvas needed.

```tsx
// Source: synthesis — standard web pattern for node-based maps
// LevelSelectScreen.tsx — simplified layout

// Level node positions (x as % of container width, y as absolute px from top)
const NODE_POSITIONS = [
  { x: '20%', y: 60 },
  { x: '50%', y: 160 },
  { x: '80%', y: 260 },
  { x: '50%', y: 360 },
  { x: '20%', y: 460 },
]

export function LevelSelectScreen() {
  const progress = useBoundStore((s) => s.progress)
  const navigateTo = useBoundStore((s) => s.navigateTo)
  const startLevel = useBoundStore((s) => s.startLevel)

  const isUnlocked = (levelIndex: number): boolean => {
    if (levelIndex === 0) return true
    const prev = progress.levels[levelIndex - 1]
    return prev?.stars >= 1
  }

  return (
    <div className="relative flex-1 overflow-y-auto">
      {/* SVG connecting path */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <path d="M..." stroke="#ffffff20" strokeWidth="4" fill="none" />
      </svg>

      {/* Level nodes */}
      {LEVEL_CONFIGS.map((level, i) => {
        const record = progress.levels[i]
        const unlocked = isUnlocked(i)
        return (
          <button
            key={i}
            style={{ left: NODE_POSITIONS[i].x, top: NODE_POSITIONS[i].y }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-4 flex flex-col items-center justify-center ${unlocked ? 'border-white bg-gray-800 hover:bg-gray-700' : 'border-gray-600 bg-gray-900 opacity-50 cursor-not-allowed'}`}
            onClick={() => unlocked && startLevel(i)}
            disabled={!unlocked}
          >
            <span className="text-xs font-bold">{level.name}</span>
            <span className="text-sm">{unlocked ? '★'.repeat(record?.stars ?? 0) : '🔒'}</span>
          </button>
        )
      })}
    </div>
  )
}
```

### Pattern 9: localStorage Schema

**What:** Zustand persist serializes state to JSON automatically. The `partialize` shape becomes the persisted schema. Use `version` + `migrate()` for future schema changes.

**Recommended schema (Claude's discretion):**

```typescript
// Persisted shape — what gets written to localStorage under key 'pianuki-progress'
interface PersistedState {
  progress: {
    levels: {
      [levelIndex: number]: {
        completed: boolean
        stars: number           // 0-3
        bestAccuracy: number    // 0-100
        bestReactionMs: number  // avg ms, lower = better; 0 = not set
        playCount: number
        totalPlayTimeMs: number
      }
    }
    totalPlayTimeMs: number
    noteMissCounts: { [noteName: string]: number }  // across all sessions
  }
  settings: {
    penaltyMode: 'easy' | 'normal' | 'hard'
    inputSource: 'mic' | 'midi'
  }
}
```

**Storage size estimate:** 5 levels × ~100 bytes per record + settings ~50 bytes = well under 1KB. No storage pressure.

### Pattern 10: LevelConfig Expansion to 5 Levels

**What:** Add 2 more levels to `LEVEL_CONFIGS` in `waveConfig.ts`. Add `name` and `noteRangeLabel` fields to `LevelConfig` for display in level select.

```typescript
// Source: waveConfig.ts — extend existing LevelConfig interface
export interface LevelConfig {
  levelIndex: number
  name: string              // NEW: display name e.g. "Forest Clearing"
  noteRangeLabel: string    // NEW: display e.g. "C4–C5" or "C4–E5"
  allowedNotes: number[]
  waves: WaveConfig[]
}

// Levels 3 and 4 add black keys (sharps/flats):
// Level 3 — C4 to C5 + F#4, Bb4 (introducing 2 black keys)
// Level 4 — C4 to E5 full chromatic (all 12 notes in range)
// Name recommendations: "Meadow", "Forest", "Mountain", "Storm", "Summit"
```

### Anti-Patterns to Avoid

- **Persisting all Zustand state:** Actions (functions) cannot be serialized to JSON. Persisting the entire store will throw. Always use `partialize` to extract only serializable data.
- **Storing unlock status separately:** Computing unlock status from `progress.levels[i-1].stars >= 1` on every render is cheap and eliminates a class of sync bugs. Never store `unlocked: boolean` separately.
- **Tracking stats in React state:** Stats must flow through the game loop (60fps). React state causes re-renders; use module-level accumulators and commit to Zustand only on level complete.
- **Using router for 3 screens:** React Router or TanStack Router adds build weight, URL concerns, and history management for no benefit in a game context. `currentScreen` in Zustand is the right tool.
- **Resetting progress on mode switch:** Confirmed locked decision — do not add any code that resets stars/scores when `penaltyMode` changes.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| localStorage read/write/hydration | Custom `localStorage.setItem` wrapper | Zustand `persist` middleware | Handles hydration timing, SSR edge cases, migrations, versioning |
| Schema migration | Manual version-check code | `persist` `version` + `migrate()` option | Built into the middleware; handles old schema gracefully |
| Star animation timing | Framer Motion, GSAP | Tailwind v4 `@utility anim-delay-*` + CSS keyframes | No new library needed; pattern confirmed in Tailwind v4 docs |
| URL-based screen navigation | react-router, TanStack Router | `currentScreen` field in Zustand | Overkill for 3 screens; no URL sharing or history needed |

**Key insight:** The entire persistence requirement is solved by a single `partialize` option on the existing store's `persist` middleware. The temptation to build a custom save/load system is a trap — `persist` handles all edge cases.

---

## Common Pitfalls

### Pitfall 1: Persisting Actions (Functions)

**What goes wrong:** TypeScript or runtime error when `persist` tries to `JSON.stringify` the full state, which includes action functions.

**Why it happens:** Zustand state includes both data and actions. `JSON.stringify(fn)` returns `undefined` — functions are silently dropped, causing undefined action errors after rehydration.

**How to avoid:** `partialize` MUST filter to only data-shape objects. Never include any `() => void` fields.

**Warning signs:** After page refresh, calling store actions throws "is not a function" or the rehydrated state has missing action keys.

### Pitfall 2: Missing persist Version on Schema Change

**What goes wrong:** A schema change (renaming a field, changing a type) causes old localStorage data to silently hydrate into the wrong shape. No error is thrown; the app just behaves incorrectly.

**Why it happens:** Zustand persist does not automatically detect mismatches — it will try to hydrate whatever it finds.

**How to avoid:** Increment `version: N` whenever the `partialize` shape changes. Add a `migrate` function to transform old shape to new shape. Start at `version: 1` now.

**Warning signs:** Bugs that only appear on existing sessions (not fresh installs).

### Pitfall 3: Stale Stats Accumulator on Restart

**What goes wrong:** Player restarts a level from game over. Stats accumulator still has counts from the failed run, inflating accuracy.

**Why it happens:** Module-level accumulators are not automatically reset when `startGame` is called.

**How to avoid:** Call `resetStats(performance.now())` inside the `startLevel` action (in Zustand) OR at the start of the rAF loop when `gamePhase` transitions to `'playing'` from a non-playing state.

**Warning signs:** Accuracy in summary is impossibly high (previous correct hits carried over), or reaction time is wrong.

### Pitfall 4: Reaction Time Measurement Needs Enemy Spawn Timestamps

**What goes wrong:** You try to compute reaction time but have no record of when each enemy spawned.

**Why it happens:** Enemy objects in the current codebase have no `spawnedAtMs` field. Reaction time = `hitTimeMs - spawnedAtMs`.

**How to avoid:** Add `spawnedAtMs: number` to the `Enemy` interface in `enemyTypes.ts`. Set it to `performance.now()` in `buildEnemy()`. When `damageEnemy` fires, read the enemy's `spawnedAtMs` to compute reaction time before removing it.

**Warning signs:** `avgReactionMs` is always 0 or NaN in the level summary.

### Pitfall 5: Hard Penalty Mode Infinite Loop

**What goes wrong:** In Hard mode, an enemy that reaches the goal is reset to `pathT = 0`. If the player never plays the note, the enemy loops indefinitely and the level can never complete.

**Why it happens:** The level-complete check (`spawnQueue.length === 0 && enemies.length === 0`) never fires while the looping enemy is alive.

**How to avoid:** Track a `loopCount` on the enemy. After N loops (e.g. 3), convert the Hard behavior to Normal behavior (deal HP damage and remove) as a failsafe. Or: Hard mode advances speed by 20% each loop. This is a design decision; just don't leave it as a true infinite loop.

**Warning signs:** Game hangs indefinitely in Hard mode when player fails a note.

### Pitfall 6: middleware TypeScript Mutators in Slices

**What goes wrong:** Individual `StateCreator` type signatures have the middleware mutators tuple in the second generic position. Adding `persist` to the combined store requires updating that tuple in all slice creators, which is verbose.

**Why it happens:** Zustand's TypeScript type system threads mutator tuples through each `StateCreator` call.

**How to avoid:** Keep individual slice `StateCreator` types with only `[['zustand/devtools', never], ['zustand/immer', never]]` in the mutators position (as they are now in Phase 2). The `persist` mutator only needs to be present at the top-level `create<BoundStore>()()` call. This is the pattern confirmed in official Zustand docs — middleware is applied at the combined store level, not inside individual slices.

**Warning signs:** TypeScript errors like "Argument of type 'StateCreator...' is not assignable to parameter of type '...'" when combining slices.

---

## Code Examples

Verified patterns from official and confirmed sources:

### Adding persist to Existing Store (Official Pattern)

```typescript
// Source: Context7 /pmndrs/zustand — advanced-typescript.md
// Full store with devtools + persist + immer in correct order

export const useBoundStore = create<BoundStore>()(
  devtools(
    persist(
      immer((...args) => ({
        ...createAudioSlice(...args),
        ...createGameSlice(...args),
        ...createProgressSlice(...args),
        ...createSettingsSlice(...args),
      })),
      {
        name: 'pianuki-progress',
        version: 1,
        partialize: (state): PersistedState => ({
          progress: state.progress,
          settings: state.settings,
        }),
        migrate: (persistedState: unknown, version: number) => {
          // Handle future schema migrations here
          return persistedState as PersistedState
        },
      }
    ),
    { name: 'pianuki-store' }
  ),
)
```

### ProgressSlice recordLevelComplete Action

```typescript
// Source: synthesis from Zustand immer pattern (established in Phase 2)

recordLevelComplete: (levelIndex, result) =>
  set(
    (draft) => {
      const existing = draft.progress.levels[levelIndex]
      const stars = computeStars(result.accuracy)

      draft.progress.levels[levelIndex] = {
        completed: true,
        stars: Math.max(existing?.stars ?? 0, stars),       // keep best
        bestAccuracy: Math.max(existing?.bestAccuracy ?? 0, result.accuracy),
        bestReactionMs: existing?.bestReactionMs > 0
          ? Math.min(existing.bestReactionMs, result.avgReactionMs)  // lower is better
          : result.avgReactionMs,
        playCount: (existing?.playCount ?? 0) + 1,
        totalPlayTimeMs: (existing?.totalPlayTimeMs ?? 0) + result.durationMs,
      }

      // Accumulate miss counts globally
      for (const [note, count] of Object.entries(result.noteMisses)) {
        draft.progress.noteMissCounts[note] =
          (draft.progress.noteMissCounts[note] ?? 0) + count
      }

      draft.progress.totalPlayTimeMs += result.durationMs
    },
    false,
    'progress/recordLevelComplete',
  ),
```

### computeStars

```typescript
// Source: recommendation (Claude's discretion — no canonical source)
export function computeStars(accuracy: number): 0 | 1 | 2 | 3 {
  if (accuracy >= 90) return 3
  if (accuracy >= 75) return 2
  if (accuracy >= 50) return 1
  return 0
}
```

### Tailwind v4 Star Animation CSS

```css
/* Source: blurp.dev/blog/tailwind-animation-delay-property — confirmed Tailwind v4 pattern */
/* Add to src/index.css */

@utility anim-delay-* {
  animation-delay: calc(--value(integer) * 1ms);
}

@keyframes star-pop {
  0%   { opacity: 0; transform: scale(0.3) rotate(-20deg); }
  70%  { transform: scale(1.2) rotate(5deg); }
  100% { opacity: 1; transform: scale(1) rotate(0deg); }
}
```

```tsx
// Usage: stars appear sequentially with 400ms between each
{[0, 1, 2].map((i) => (
  <span
    key={i}
    className={i < stars
      ? `inline-block animate-[star-pop_0.5s_ease-out_both] anim-delay-${i * 400}`
      : 'inline-block opacity-20'}
    style={{ color: i < stars ? '#facc15' : '#4b5563' }}
  >
    ★
  </span>
))}
```

### Enemy spawnedAtMs for Reaction Time

```typescript
// Source: extension to existing enemyTypes.ts
// Add to Enemy interface:
export interface Enemy {
  // ... existing fields ...
  spawnedAtMs: number   // performance.now() at spawn time — for reaction time calculation
}

// In buildEnemy():
export function buildEnemy(entry: EnemySpawnEntry): Enemy {
  return {
    // ... existing fields ...
    spawnedAtMs: performance.now(),
  }
}

// In gameLoop.ts damageEnemy call (note match step):
// Before dispatching damageEnemy, compute reaction time:
const hitTimeMs = performance.now()
const reactionMs = hitTimeMs - enemy.spawnedAtMs
statsTracker.recordCorrectHit(reactionMs)
useBoundStore.getState().damageEnemy(enemy.id, 1)
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Manual `localStorage.setItem/getItem` | Zustand `persist` middleware | Automatic hydration on mount, versioning, migration hooks |
| URL-based routing (React Router) for game screens | `currentScreen` field in Zustand | No URL complexity; simpler for game UI with no deep linking |
| CSS library (Framer Motion) for UI animations | Tailwind v4 `@utility` + CSS keyframes | Zero bundle cost; sufficient for star animations |
| Separate stats tracking service | Module-level accumulators in game loop | No React re-renders; accurate 60fps tracking |

**Deprecated/outdated:**
- `localStorage` direct JSON: Still valid for simple cases, but Zustand persist is strictly better for stores already using Zustand.
- `persist` `blacklist`/`whitelist` options (Zustand v3/v4): Replaced by `partialize` in v4+. Always use `partialize`.

---

## Open Questions

1. **Hard penalty mode infinite-loop risk**
   - What we know: Enemy reset to `pathT = 0` on goal-reach could loop forever
   - What's unclear: Should there be a max-loop failsafe? Or speed escalation?
   - Recommendation: Add `loopCount` to enemy; after 3 loops convert to Normal (HP damage). This is a design decision for the planner to capture as a task.

2. **Settings panel placement and z-index**
   - What we know: Settings must be accessible from pause menu AND level select map; mic overlay sits at z-30 (above GameOverlay at z-20)
   - What's unclear: Should SettingsPanel be a modal overlay or a slide-in drawer?
   - Recommendation: Modal overlay at z-25 (above GameOverlay at z-20, below mic overlay at z-30). Reuse existing card design.

3. **inputSource setting vs. existing mic-enable flow**
   - What we know: Currently, mic is enabled by clicking "Click to Enable Microphone" in AppShell; MIDI activates on mount. The settings input source toggle needs to work with this existing pattern.
   - What's unclear: Does the settings toggle bypass the mic user-gesture requirement? Or does it show the mic-enable prompt again?
   - Recommendation: `inputSource: 'mic'` in settings means "attempt mic if not yet enabled" — still shows the enable prompt if `micEnabled` local state is false. The settings toggle changes preference; the gesture requirement is a browser constraint that cannot be bypassed.

4. **Stats page visualization approach (Claude's discretion)**
   - What we know: User wants accuracy trend, most missed notes, total play time, levels completed
   - What's unclear: How to render "accuracy trend" without a chart library
   - Recommendation: Simple text + progress bars (Tailwind div widths) for accuracy per level. A bar chart is achievable with pure CSS `div`s — no `<canvas>` or Chart.js needed. Most missed notes: top 5 list by `noteMissCounts` descending.

---

## Sources

### Primary (HIGH confidence)

- `/pmndrs/zustand` via Context7 — `persist` middleware API, `partialize`, `version`, `migrate`, middleware stacking order (`devtools(persist(immer(...)))`), slices pattern with middleware at combined store level
- Context7 `/pmndrs/zustand` advanced-typescript.md — TypeScript patterns for combined devtools + persist + immer
- Context7 `/pmndrs/zustand` persisting-store-data.md — `skipHydration`, `onRehydrateStorage`, `createJSONStorage` API

### Secondary (MEDIUM confidence)

- blurp.dev/blog/tailwind-animation-delay-property — Tailwind v4 `@utility anim-delay-*` pattern (single source but matches official Tailwind v4 `@utility` feature description)
- github.com/pmndrs/zustand/discussions/2577 — TypeScript mutator tuple pattern for combining persist + immer + devtools; confirms middleware applied at combined store level, not individual slices
- WebSearch cross-reference: Zustand v5.0.10 fixed a persist race condition (January 2026); current project uses v5.0.11 which includes this fix

### Tertiary (LOW confidence)

- gamedevjs.com/articles/using-local-storage-for-high-scores-and-game-progress — general localStorage schema guidance (limited; no concrete versioning examples)
- Synthesis: Hard penalty mode loop risk — identified from first principles, no canonical source; needs validation in implementation

---

## Metadata

**Confidence breakdown:**
- Standard stack (persist middleware): HIGH — Context7 official docs, confirmed API
- Architecture (screen routing, slices, partialize): HIGH — matches existing patterns, confirmed from official Zustand docs
- Stats tracking design: MEDIUM — first principles synthesis; no canonical "how to track game stats in Zustand" source found
- Level select map visual: MEDIUM — standard web pattern (absolute-positioned nodes), no canonical reference; implementation details are straightforward but CSS path drawing is somewhat open-ended
- Star animation (Tailwind v4 @utility): MEDIUM — single verified source, pattern is plausible but not multi-source confirmed
- Hard penalty mode edge case: LOW — identified from first principles; needs empirical validation

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (Zustand persist API is stable; Tailwind v4 is stable; localStorage behavior unchanged)

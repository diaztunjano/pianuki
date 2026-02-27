# Architecture Research

**Domain:** Browser-based tower defense game with real-time acoustic piano input
**Researched:** 2026-02-27
**Confidence:** HIGH (Web Audio API pipeline), MEDIUM (game loop/ECS tradeoffs), HIGH (Canvas 2D rendering patterns)

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INPUT LAYER                                  │
│  ┌──────────────────┐              ┌──────────────────┐              │
│  │  Microphone /    │              │  Web MIDI API    │              │
│  │  getUserMedia    │              │  (MIDI keyboard) │              │
│  └────────┬─────────┘              └────────┬─────────┘              │
│           │                                 │                        │
│           ▼                                 ▼                        │
│  ┌────────────────────────────────────────────────────────────┐      │
│  │               AudioContext + AnalyserNode                   │      │
│  │        (FFT size 2048, sampleRate 44100/48000 Hz)           │      │
│  └────────────────────────┬───────────────────────────────────┘      │
│                           │ Float32Array (time-domain)                │
│                           ▼                                           │
│  ┌────────────────────────────────────────────────────────────┐      │
│  │                    AudioWorkletProcessor                    │      │
│  │  YIN autocorrelation → Hz → MIDI note number               │      │
│  │  Runs on dedicated audio thread (3ms budget @ 44.1kHz)     │      │
│  └────────────────────────┬───────────────────────────────────┘      │
│                           │ SharedArrayBuffer (lock-free ring buf)    │
└───────────────────────────┼─────────────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────────────┐
│                    GAME CORE LAYER                                    │
│                           ▼                                           │
│  ┌────────────────────────────────────────────────────────────┐      │
│  │                    InputBroker                              │      │
│  │  Reads SharedArrayBuffer each frame → normalizes note      │      │
│  │  events → dispatches to GameEventBus                       │      │
│  └────────────────────────┬───────────────────────────────────┘      │
│                           │                                           │
│                           ▼                                           │
│  ┌─────────────┐  ┌───────────────┐  ┌────────────────────────┐     │
│  │  GameLoop   │  │  GameEventBus │  │  GameStateManager      │     │
│  │  (rAF +     │◄─►  (pub/sub,   │◄─►  (FSM: MENU, PLAYING,  │     │
│  │  fixed step)│  │  event queue) │  │  PAUSED, WAVE_CLEAR,   │     │
│  └──────┬──────┘  └───────────────┘  │  GAME_OVER, UPGRADE)   │     │
│         │                            └────────────────────────┘     │
│         │ update(dt) each tick                                        │
│         ▼                                                             │
│  ┌────────────────────────────────────────────────────────────┐      │
│  │                    GameWorld (Scene Graph)                   │      │
│  │  ┌──────────────┐ ┌───────────────┐ ┌───────────────────┐  │      │
│  │  │ WaveManager  │ │ TowerRegistry │ │ EnemyPool         │  │      │
│  │  │ (spawn, wave │ │ (towers on    │ │ (object pool,     │  │      │
│  │  │  timing)     │ │  grid cells)  │ │  enemy instances) │  │      │
│  │  └──────────────┘ └───────────────┘ └───────────────────┘  │      │
│  │  ┌──────────────┐ ┌───────────────┐ ┌───────────────────┐  │      │
│  │  │ ProjectilePool│ │ FlowField     │ │ DifficultyEngine  │  │      │
│  │  │ (bullets,    │ │ (BFS-computed │ │ (sliding window   │  │      │
│  │  │  pooled)     │ │  enemy paths) │ │  perf tracking)   │  │      │
│  │  └──────────────┘ └───────────────┘ └───────────────────┘  │      │
│  └────────────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────┼──────────────────────────────────────────┐
│                    RENDERING LAYER                                     │
│                           ▼                                           │
│  ┌────────────────────────────────────────────────────────────┐      │
│  │                    Renderer (Canvas 2D)                     │      │
│  │  ┌──────────────────────────────────────────────────────┐  │      │
│  │  │  OffscreenCanvas (tilemap, pre-baked background)     │  │      │
│  │  └──────────────────────────────────────────────────────┘  │      │
│  │  ┌──────────────────────────────────────────────────────┐  │      │
│  │  │  Main Canvas (game entities, HUD, effects)           │  │      │
│  │  └──────────────────────────────────────────────────────┘  │      │
│  │  ┌──────────────────────────────────────────────────────┐  │      │
│  │  │  SpriteAtlas (single spritesheet, drawImage slices)  │  │      │
│  │  └──────────────────────────────────────────────────────┘  │      │
│  └────────────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────┼──────────────────────────────────────────┐
│                    PERSISTENCE LAYER                                   │
│                           ▼                                           │
│  ┌──────────────────────────┐  ┌────────────────────────────────┐    │
│  │  ProgressionStore        │  │  SessionStore                  │    │
│  │  (localStorage JSON,     │  │  (in-memory, current run only) │    │
│  │  skill tree, unlocks,    │  │                                │    │
│  │  high scores)            │  └────────────────────────────────┘    │
│  └──────────────────────────┘                                         │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| AudioWorkletProcessor | Real-time pitch detection at audio thread rate; YIN autocorrelation on 2048-sample buffer | AudioWorklet running on dedicated audio thread |
| SharedArrayBuffer / RingBuffer | Lock-free data handoff between audio thread and main thread | `padenot/ringbuf.js` pattern; Int32Array + Float32Array |
| InputBroker | Reads ring buffer each game frame; debounces/smooths pitch; maps Hz to MIDI note; emits NoteOn/NoteOff events | Plain class polled by GameLoop |
| GameEventBus | Decoupled pub/sub so systems don't call each other directly; holds queued events per frame | Simple event emitter; flush queue once per tick |
| GameLoop | Drives fixed-timestep update + variable-rate render; calls update(dt) then render() | `requestAnimationFrame` + accumulator pattern |
| GameStateManager | FSM controlling which systems are active (menu, wave, upgrade screen, game over) | Explicit state enum + transition table |
| WaveManager | Schedules enemy spawns per wave; reads note performance data from DifficultyEngine to scale wave parameters | Interval-driven; consumes GameEventBus |
| FlowField | Pre-computes BFS pathfinding once per map change (not per enemy); all enemies read same flow field | 2D array of direction vectors, recomputed when towers placed |
| EnemyPool / ProjectilePool | Object pooling to avoid GC pressure; reuse dead instances | Fixed-size typed arrays or plain object pools |
| TowerRegistry | Tracks towers per grid cell; handles tower placement validation; triggers FlowField recompute | Map<gridIndex, Tower> |
| DifficultyEngine | Sliding window of player note accuracy + tempo; adjusts wave density, enemy HP, and spawn timing | Configurable smoothing window (last N seconds) |
| Renderer | Frame render: clear → blit background OffscreenCanvas → draw enemies → draw towers → draw projectiles → draw HUD | Canvas 2D; dirty-rect skipped (full clear each frame for pixel art) |
| ProgressionStore | Serialize/deserialize skill tree state and unlocks to localStorage | JSON.stringify on a versioned data model |
| SkillTreeUI | Displayed only on UPGRADE state; read-only view of ProgressionStore; triggers unlock events | DOM overlay or Canvas-drawn panel |

---

## Recommended Project Structure

```
src/
├── audio/                  # Everything that touches Web Audio API
│   ├── worklet/
│   │   └── pitch-detector.worklet.ts   # AudioWorkletProcessor (loaded as module)
│   ├── AudioPipeline.ts    # Sets up AudioContext, AnalyserNode, WorkletNode
│   ├── RingBuffer.ts       # SharedArrayBuffer ring buffer (producer side)
│   └── InputBroker.ts      # Consumer: reads ring buffer, emits note events
│
├── core/                   # Platform-agnostic game logic
│   ├── GameLoop.ts         # requestAnimationFrame + fixed timestep
│   ├── GameEventBus.ts     # Event pub/sub (typed events)
│   ├── GameStateManager.ts # FSM: MENU | PLAYING | PAUSED | UPGRADE | GAME_OVER
│   └── Time.ts             # performance.now() wrapper, delta calculation
│
├── game/                   # Domain-specific game systems
│   ├── world/
│   │   ├── GameWorld.ts    # Root container for all active game systems
│   │   ├── Grid.ts         # Tile grid, coordinate helpers
│   │   └── FlowField.ts    # BFS pathfinding, direction vectors
│   ├── entities/
│   │   ├── Enemy.ts
│   │   ├── Tower.ts
│   │   ├── Projectile.ts
│   │   └── pools/
│   │       ├── EnemyPool.ts
│   │       └── ProjectilePool.ts
│   ├── systems/
│   │   ├── WaveManager.ts  # Wave definitions, spawn scheduling
│   │   ├── TowerRegistry.ts
│   │   ├── CombatSystem.ts # Hit detection, damage application
│   │   └── DifficultyEngine.ts # Adaptive difficulty, sliding window
│   └── progression/
│       ├── SkillTree.ts    # Tree structure, unlock logic
│       └── ProgressionStore.ts # localStorage persistence
│
├── render/                 # Rendering only — no game logic
│   ├── Renderer.ts         # Main Canvas 2D render orchestrator
│   ├── SpriteAtlas.ts      # Spritesheet loader, drawImage helper
│   ├── TilemapRenderer.ts  # OffscreenCanvas pre-bake + blit
│   └── HUDRenderer.ts      # Score, wave counter, note indicator
│
├── ui/                     # DOM-based overlays (menus, skill tree)
│   ├── MenuScreen.ts
│   ├── UpgradeScreen.ts
│   └── PauseScreen.ts
│
├── assets/                 # Static assets (loaded at startup)
│   ├── sprites.png         # Single spritesheet
│   └── maps/               # Tilemap JSON files
│
└── main.ts                 # Bootstrap: AudioPipeline → GameLoop → Renderer
```

### Structure Rationale

- **audio/:** Isolated because AudioWorklet runs in a separate thread context. This boundary is enforced by the browser — the worklet file is a separate module. Keeping audio code here prevents accidental coupling to game state.
- **core/:** Framework-agnostic. No Canvas, no Web Audio, no game domain objects. GameLoop and GameEventBus are testable in isolation.
- **game/:** Domain logic. Systems here consume events from GameEventBus and update entity state. They know nothing about how to draw.
- **render/:** Reads entity state and paints pixels. Never mutates game state. This separation allows render to be swapped (e.g., to WebGL) without touching game logic.
- **ui/:** DOM overlays for non-game screens. Simpler than Canvas-drawn UI and allows HTML/CSS for menus.

---

## Architectural Patterns

### Pattern 1: Fixed-Timestep Game Loop with Variable Render

**What:** Game state is updated at a fixed interval (e.g., 20ms = 50 Hz). Rendering happens every `requestAnimationFrame` call (60+ Hz) and interpolates between states.

**When to use:** Always, for this project. Tower defense has physics-like enemy movement and projectiles — a fixed update rate prevents movement inconsistency across machines.

**Trade-offs:** Slightly more complex than naive `update + render` per frame. Worth it because enemy positions and collision are deterministic.

```typescript
class GameLoop {
  private readonly TICK_MS = 20; // 50Hz update rate
  private lastTick = performance.now();
  private accumulator = 0;

  start() {
    requestAnimationFrame(this.frame.bind(this));
  }

  private frame(now: number) {
    requestAnimationFrame(this.frame.bind(this)); // schedule first

    const elapsed = now - this.lastTick;
    this.lastTick = now;
    this.accumulator += Math.min(elapsed, 200); // clamp: skip spiral-of-death

    while (this.accumulator >= this.TICK_MS) {
      this.update(this.TICK_MS / 1000); // update in seconds
      this.accumulator -= this.TICK_MS;
    }

    const alpha = this.accumulator / this.TICK_MS; // interpolation factor
    this.render(alpha);
  }
}
```

### Pattern 2: AudioWorklet + SharedArrayBuffer Ring Buffer

**What:** Pitch detection runs on the audio thread (AudioWorkletProcessor). It writes detected note data to a SharedArrayBuffer ring buffer. The main thread (InputBroker) reads from the ring buffer each game frame without blocking.

**When to use:** Required. Direct `postMessage` between AudioWorklet and main thread introduces unpredictable latency (GC, task queuing). Ring buffer over SharedArrayBuffer is the lock-free standard approach.

**Trade-offs:** Requires COOP/COEP headers for SharedArrayBuffer. Adds deployment complexity. The alternative (AnalyserNode polling from main thread) is simpler but adds at minimum one frame of latency and can block during heavy game computation.

```typescript
// pitch-detector.worklet.ts (runs on audio thread)
class PitchDetectorProcessor extends AudioWorkletProcessor {
  private ringBuffer: RingBuffer; // wraps SharedArrayBuffer

  process(inputs: Float32Array[][]) {
    const input = inputs[0][0];
    if (input) {
      const hz = yin(input, sampleRate); // YIN autocorrelation
      if (hz > 0) {
        const midiNote = hzToMidi(hz);
        this.ringBuffer.write(midiNote); // non-blocking write
      }
    }
    return true;
  }
}

// InputBroker.ts (runs on main thread, polled each game frame)
class InputBroker {
  read(): number | null {
    return this.ringBuffer.read(); // non-blocking read
  }
}
```

### Pattern 3: Flow Field Pathfinding (BFS, computed once per layout change)

**What:** Compute BFS from the goal (enemy target cell) outward across the entire grid, producing a direction vector for each tile. Every enemy reads its current tile's direction vector to determine movement. No per-enemy A*.

**When to use:** Always, for tower defense. Enemies share the same destination. Per-enemy A* is O(n × path_length) per frame — flow field is O(grid_size) computed once, then O(1) per enemy per frame.

**Trade-offs:** Must recompute the entire flow field when a tower is placed. For a reasonable grid (e.g., 20×20 = 400 cells), this is negligible. Implementation is simpler than A* once you understand BFS.

```typescript
class FlowField {
  private directions: Map<number, {dx: number, dy: number}> = new Map();

  compute(grid: Grid, goalCell: number) {
    const queue = [goalCell];
    const visited = new Set([goalCell]);
    const distance = new Map([[goalCell, 0]]);

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const neighbor of grid.neighbors(current)) {
        if (!visited.has(neighbor) && !grid.isBlocked(neighbor)) {
          visited.add(neighbor);
          distance.set(neighbor, distance.get(current)! + 1);
          queue.push(neighbor);
        }
      }
    }
    // Convert distance map to direction vectors
    this.buildDirections(grid, distance);
  }

  directionAt(cellIndex: number): {dx: number, dy: number} {
    return this.directions.get(cellIndex) ?? {dx: 0, dy: 0};
  }
}
```

### Pattern 4: Object Pool for Enemies and Projectiles

**What:** Pre-allocate a fixed array of Enemy/Projectile objects. Mark as active/inactive rather than creating/destroying. The GameLoop only updates active objects.

**When to use:** Always. GC pauses at 60 FPS break audio smoothness and cause perceptible hitches. This is especially critical because the audio thread has a 3ms budget — main-thread GC spilling into audio scheduling causes stutters.

**Trade-offs:** Slightly more complex lifecycle management. The pool size must be sized for the maximum expected concurrent entities. For tower defense: 50 enemies, 200 projectiles is a safe upper bound.

### Pattern 5: Event Queue (flush once per tick)

**What:** Systems publish events to GameEventBus within a tick. Events are queued, not immediately dispatched. At the end of the update phase (before render), the bus flushes all queued events to subscribers.

**When to use:** For decoupling systems that would otherwise call each other directly (e.g., CombatSystem calling WaveManager when an enemy dies to check wave clear). Prevents mid-tick re-entrant updates.

**Trade-offs:** Events are delayed by up to one tick (20ms at 50Hz). Acceptable for game logic; do not use for audio-critical paths.

---

## Data Flow

### Audio Input to Game Action

```
Microphone hardware
    │
    ▼ (Web Audio API)
AudioContext (48kHz, system latency ~10-20ms)
    │
    ▼
AnalyserNode (FFT size 2048 → ~11ms window at 48kHz)
    │ getFloatTimeDomainData() per 128-frame block
    ▼
AudioWorkletProcessor (audio thread, 3ms budget)
    │ YIN autocorrelation → Hz → MIDI note number
    │ write to SharedArrayBuffer ring buffer
    ▼ (lock-free, ~0ms overhead)
InputBroker.read() ← polled each game frame (every 20ms)
    │ smoothing: reject if < confidence threshold
    │ emit NoteOn / NoteOff events
    ▼
GameEventBus
    │
    ├─► WaveManager: note played → check if correct note → spawn faster / slower
    ├─► TowerRegistry: hold correct note → charge tower ability
    └─► DifficultyEngine: update accuracy window
```

### Game Update Flow (each 20ms tick)

```
GameLoop.update(dt)
    │
    ├─► InputBroker.poll()         → emit note events to GameEventBus
    ├─► WaveManager.update(dt)     → spawn enemies per schedule
    ├─► EnemyPool.update(dt)       → move enemies along flow field
    ├─► TowerRegistry.update(dt)   → towers aim, fire (emit ProjectileSpawn events)
    ├─► ProjectilePool.update(dt)  → move projectiles, detect hits (emit EnemyHit events)
    ├─► CombatSystem.update()      → apply damage, mark dead enemies
    ├─► DifficultyEngine.update(dt)→ recalc difficulty params
    └─► GameEventBus.flush()       → dispatch queued events to subscribers
```

### Render Flow (each rAF, ~16ms)

```
Renderer.render(alpha)
    │
    ├─► context.clearRect(entire canvas)
    ├─► context.drawImage(tilemapOffscreen)  ← single blit, no tile iteration
    ├─► TowerRegistry.draw(ctx)
    ├─► EnemyPool.draw(ctx, alpha)           ← interpolate position with alpha
    ├─► ProjectilePool.draw(ctx, alpha)
    ├─► HUDRenderer.draw(ctx)                ← score, wave, HP, note indicator
    └─► (if state == UPGRADE) SkillTreeUI.draw()
```

### State Transitions

```
MENU
  │ [Start Game]
  ▼
PLAYING ◄────────────────────────────────────────┐
  │ [All enemies dead, wave timer done]           │
  ▼                                              │
WAVE_CLEAR                                       │
  │ [Auto after 3s or player ready]              │
  ▼                                              │
UPGRADE                                          │
  │ [Confirm upgrades / start next wave]         │
  └─────────────────────────────────────────────┘
  │ [Player base HP = 0]
  ▼
GAME_OVER
  │ [Restart] ──► PLAYING (reset world, keep progression)
  │ [Menu]    ──► MENU
```

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Prototype (1 dev, 0-100 users) | Single canvas, no OffscreenCanvas worker, synchronous localStorage, AnalyserNode polling from main thread. Simplest path to playable. |
| Beta (100-1k users, content complete) | Add AudioWorklet + SharedArrayBuffer for latency. Add OffscreenCanvas background blit. Migrate AnalyserNode polling to ring buffer pattern. |
| Production (1k+ users) | Profile and optimize hot paths. Consider transferring render to OffscreenCanvas Worker if main thread is saturated. Add error recovery for mic permission denial. |

### Scaling Priorities

1. **First bottleneck:** Audio input latency. On slow machines, AnalyserNode polling on the main thread stalls during heavy wave computation. Fix: move pitch detection to AudioWorklet.
2. **Second bottleneck:** Renderer draw calls. Iterating all tiles every frame. Fix: pre-bake tilemap to OffscreenCanvas, blit as single image.
3. **Third bottleneck:** Enemy/projectile GC. Fix: object pooling (should be done from the start).

---

## Anti-Patterns

### Anti-Pattern 1: Polling AnalyserNode from Inside the Game Loop

**What people do:** Call `analyser.getFloatTimeDomainData(buffer)` inside `requestAnimationFrame`, then run YIN autocorrelation synchronously before updating game state.

**Why it's wrong:** YIN on a 2048-sample buffer is O(n²). At 60 FPS this adds ~1-3ms of CPU work to a 16ms frame budget. Worse, if the game loop is slow (heavy wave), this runs less frequently → pitch detection degrades. No cross-browser latency guarantee.

**Do this instead:** AudioWorkletProcessor runs pitch detection on a dedicated audio thread at the audio rate. Main thread only reads detected note from SharedArrayBuffer ring buffer — O(1) per frame.

### Anti-Pattern 2: Recomputing Flow Field Every Frame

**What people do:** Run BFS pathfinding from scratch every game tick to keep paths current.

**Why it's wrong:** Even for a 20×20 grid (400 cells), running BFS 50× per second is 20,000 BFS operations per second — wasted work. The map topology only changes when a tower is placed.

**Do this instead:** Compute flow field once when a tower is placed (triggered by GameEventBus `TowerPlaced` event). Cache the result. Enemies read direction from the cached field O(1).

### Anti-Pattern 3: Creating/Destroying Enemy Objects Per Wave

**What people do:** `new Enemy()` when spawning, `delete enemy` (or letting it GC) when it reaches the goal or dies.

**Why it's wrong:** Frequent allocation triggers JavaScript garbage collection. GC pauses are unpredictable (1-50ms). A GC pause during the audio scheduling window causes audible stutters — the audio thread and main thread compete for memory management.

**Do this instead:** Pre-allocate an `EnemyPool` of N inactive Enemy objects. On spawn, activate one and set its position. On death, deactivate it and return to pool. Zero allocation per wave.

### Anti-Pattern 4: Storing Full Game State in a JS Framework Reactive Store (Svelte/Vue/React)

**What people do:** Put enemy positions, tower states, and projectile arrays into a reactive state store. This seems natural if the rest of the UI uses a framework.

**Why it's wrong:** Reactive systems trigger re-renders on state mutation. Game state mutates 50× per second. This causes 50 diffing cycles per second through potentially hundreds of reactive dependencies — massive overhead with no visual benefit (the Canvas renders directly, not through the DOM).

**Do this instead:** Keep all game state in plain TypeScript objects managed by the game systems. Use a reactive store only for UI-layer concerns (current screen, player HP for the HUD, score). The Renderer reads game objects directly.

### Anti-Pattern 5: Using Note Frequency Threshold Too Aggressively Without Smoothing

**What people do:** Threshold raw Hz values directly: "if hz > 440, note is A4." Any noise spike triggers a note event.

**Why it's wrong:** Acoustic piano has attack transients, harmonics, and room noise. The YIN algorithm also occasionally outputs "wildly incorrect" values (per pitchfinder docs). Raw thresholding causes phantom notes that trigger unintended game actions — deeply frustrating for players.

**Do this instead:** Apply a confidence filter (YIN outputs a confidence metric; reject if < 0.85). Apply a stability window: require the same note for 3 consecutive audio frames (~6-9ms) before emitting NoteOn. Apply debounce: suppress NoteOff until silence persists for 50ms.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Web Audio API | `new AudioContext()` on first user gesture | Autoplay policy requires user gesture to resume suspended context |
| getUserMedia (mic) | `navigator.mediaDevices.getUserMedia({audio: true})` | Must request in response to user action; handle `NotAllowedError` gracefully |
| Web MIDI API | `navigator.requestMIDIAccess()` | Optional secondary input; Chrome/Edge/Brave only; Firefox does not support as of 2026. Fallback to mic-only when unavailable. |
| localStorage | `JSON.stringify` / `JSON.parse` on versioned schema | Max ~5MB; sufficient for skill tree + scores. Add schema version field to handle future migrations. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| AudioWorklet thread ↔ Main thread | SharedArrayBuffer ring buffer (lock-free) | No `postMessage` for per-frame data; use message only for setup/teardown |
| InputBroker ↔ Game systems | GameEventBus (NoteOn, NoteOff events) | InputBroker should not know about game rules |
| Game systems ↔ Renderer | Direct read of entity state (no events) | Renderer is read-only observer; never mutates game state |
| Game systems ↔ ProgressionStore | Direct call on state transitions only | Progression reads/writes only on WAVE_CLEAR and GAME_OVER, not per tick |
| GameStateManager ↔ All systems | GameEventBus (StateChanged event) | Systems subscribe to state changes to enable/disable themselves |

---

## Build Order (Phase Dependencies)

The architecture has hard dependencies between components. Building out of order causes rework.

```
Phase 1: Audio Pipeline (foundation — nothing else works without input)
  AudioContext → AnalyserNode → AudioWorkletProcessor (YIN) → RingBuffer → InputBroker
  Milestone: can detect and log piano notes in browser console

Phase 2: Game Loop + Event Bus (core skeleton)
  GameLoop (rAF + fixed timestep) → GameEventBus → GameStateManager (FSM)
  Milestone: can switch between MENU / PLAYING / GAME_OVER states

Phase 3: Grid + Flow Field + Rendering Foundation
  Grid → FlowField (BFS) → TilemapRenderer (OffscreenCanvas) → Renderer
  Milestone: static map renders; can see direction vectors visualized

Phase 4: Entity Systems (game is playable)
  EnemyPool → WaveManager → TowerRegistry → CombatSystem → ProjectilePool
  Note input wired: correct note → tower fires / special action
  Milestone: enemies walk the path, tower defends, waves progress

Phase 5: Adaptive Difficulty + Note-to-Action Mapping
  DifficultyEngine → tuned note/chord mapping per tower type
  Milestone: game gets harder/easier based on accuracy; each tower has unique note trigger

Phase 6: Progression System
  SkillTree → ProgressionStore → UpgradeScreen
  Milestone: unlocks persist across sessions

Phase 7: Polish
  Pixel art sprites → SpriteAtlas → animation → HUD → sound effects
  Milestone: shippable product
```

---

## Sources

- [MDN — Anatomy of a video game (game loop patterns)](https://developer.mozilla.org/en-US/docs/Games/Anatomy) — HIGH confidence
- [MDN — Tiles and tilemaps overview](https://developer.mozilla.org/en-US/docs/Games/Techniques/Tilemaps) — HIGH confidence
- [MDN — AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet) — HIGH confidence
- [Chrome Developers — Audio Worklet Design Pattern](https://developer.chrome.com/blog/audio-worklet-design-pattern/) — HIGH confidence
- [Red Blob Games — Flow Field Pathfinding for Tower Defense](https://www.redblobgames.com/pathfinding/tower-defense/) — HIGH confidence
- [GitHub — cwilso/PitchDetect (autocorrelation reference impl)](https://github.com/cwilso/PitchDetect) — HIGH confidence
- [GitHub — peterkhayes/pitchfinder (YIN, McLeod, AMDF, DWT algorithms)](https://github.com/peterkhayes/pitchfinder) — HIGH confidence
- [GitHub — padenot/ringbuf.js (wait-free ring buffer for AudioWorklet)](https://github.com/padenot/ringbuf.js/) — HIGH confidence
- [Alexanderell.is — Detecting pitch with the Web Audio API and autocorrelation](https://alexanderell.is/posts/tuner/) — MEDIUM confidence (personal blog, but technically sound)
- [MDN — Web MIDI API](https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API) — HIGH confidence (browser support table)
- [Web Audio API performance and debugging notes — padenot](https://padenot.github.io/web-audio-perf/) — MEDIUM confidence (engineering reference, not official docs)

---

*Architecture research for: Pianuki — Browser tower defense with real acoustic piano input*
*Researched: 2026-02-27*

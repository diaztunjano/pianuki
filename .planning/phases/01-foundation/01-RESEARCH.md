# Phase 1: Foundation - Research

**Researched:** 2026-02-27
**Domain:** Web Audio API pitch detection, Web MIDI API, Canvas 2D layout, game scaffold
**Confidence:** HIGH (MIDI input, Canvas layout, Vite setup), MEDIUM (acoustic pitch detection — requires empirical validation on real piano)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Note detection feedback**
- Simple piano keyboard strip at the bottom edge of the screen
- Shows all 88 keys — full piano range always visible
- Detected key lights up with instant on/off behavior — mirrors real-time input exactly, no linger
- No separate text label — the keyboard strip IS the primary note display

**Debug / event display**
- Always-visible panel on the right side of the screen during development
- Development-only — must be removable/hidden before shipping to end users
- Each event shows full diagnostic info: note name, On/Off, source (mic/MIDI), frequency, confidence, timestamp
- Rolling buffer of last 50 events — old events scroll off

**Game canvas layout**
- Top-down perspective (bird's eye view) — classic tower defense
- Path shape: L-shape or U-shape with 1-2 turns
- Enemy flow: top-to-bottom — enemies enter from top, goal at the bottom (coming "toward" the player at the piano)
- Enemies represented as colored circles with note name text inside (e.g., "C4")

**Screen and resolution**
- Target: laptop screens (1366x768 minimum)
- Canvas fills the browser window — no fixed size, uses all available space
- Aspect ratio: 16:9
- Browser tab only — no fullscreen API needed
- Overall layout: game canvas (left/center) + debug panel (right) + keyboard strip (bottom)

### Claude's Discretion

- Exact colors for enemy circles, path, and background
- Keyboard strip visual implementation details (key proportions, highlight color)
- Debug panel styling and scroll behavior
- Path routing within the L/U-shape constraint
- Canvas scaling strategy for different window sizes within the fill-window approach

### Deferred Ideas (OUT OF SCOPE)

- Pixel art / retro visual style — deferred to v2 milestone
- Art direction, color palette, theme — deferred to v2 milestone
- All visual polish (sprites, animations, themed environments) — v2
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AINP-01 | Player can use acoustic piano via microphone for single note detection (Web Audio API pitch detection) | Pitchy v4.1.0 MPM algorithm via AnalyserNode polling; fftSize=2048 at 44.1kHz gives ~46ms window — sufficient for piano note recognition; clarity threshold 0.9 rejects transients and noise |
| AINP-02 | Player can use MIDI keyboard as secondary input method (Web MIDI API) | `navigator.requestMIDIAccess()` → listen `MIDIMessageEvent`; status byte `0x90` (note-on), `0x80` (note-off); detect velocity=0 as implicit note-off; Chrome/Edge native, no library needed |
| AINP-03 | Both input methods produce unified NoteOn/NoteOff events to the game | InputBroker class abstracts both paths into `{ type: 'NoteOn'|'NoteOff', midiNote: number, source: 'mic'|'midi', frequency?: number, clarity?: number, timestamp: number }` events dispatched to GameEventBus |
</phase_requirements>

---

## Summary

Phase 1 establishes the audio input pipeline and game scaffold. The three requirements (AINP-01, AINP-02, AINP-03) correspond to two independent input paths that converge on a unified event interface. The MIDI path (AINP-02) is lower-risk, lower-latency, and simpler — it should be implemented and tested first. The microphone path (AINP-01) requires empirical accuracy validation before being considered done: the prior research decision states pitchy MPM is preferred, but actual accuracy across the full 88-key range on a real acoustic piano must be measured before integrating into the game.

The game scaffold — canvas layout, debug panel, keyboard strip — is straightforward Canvas 2D work. The layout is a CSS Grid or flexbox structure: game canvas occupies the left/center zone, a fixed-width debug panel occupies the right, and the keyboard strip sits at the bottom spanning the full width. Canvas fill-window scaling uses ResizeObserver to detect container size changes and redraws at the new dimensions. No aspect ratio letterboxing is needed since the game canvas simply fills available space.

The primary technical decision from prior research — whether to use AudioWorklet + SharedArrayBuffer or simpler AnalyserNode polling from the main thread — is settled for Phase 1: **use AnalyserNode polling via `requestAnimationFrame`**. The AudioWorklet ring buffer requires COOP/COEP HTTP headers for SharedArrayBuffer, which adds deployment complexity. Vite dev server supports these headers natively via `server.headers`, but production deployment on GitHub Pages requires either a service worker workaround (coi-serviceworker) or hosting on Netlify/Vercel where headers can be set directly. For Phase 1, avoid this complexity: AnalyserNode polling on the main thread at ~30fps is sufficient for piano note recognition (notes sustain hundreds of milliseconds). If profiling reveals frame drops, migrating to AudioWorklet is isolated to the audio layer and does not require game system changes.

**Primary recommendation:** Implement MIDI path first, validate end-to-end event flow with the debug panel, then add microphone path. Measure pitch detection accuracy empirically before calling AINP-01 done.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.8 | Primary language | Strict mode eliminates runtime errors in game state; prior project research decision |
| Vite | 7.x (7.3.1) | Build tool + dev server | Instant HMR for Canvas iteration; native ES module support for pitchy; prior project decision |
| pitchy | 4.1.0 | MPM pitch detection | McLeod Pitch Method reduces octave errors on piano harmonics vs naive autocorrelation; returns `[frequency, clarity]`; pure ES module, Vite-compatible |
| Web Audio API | Native | Microphone capture + analysis | `AnalyserNode` + `getFloatTimeDomainData()` feeds pitchy; no library wrapper needed |
| Web MIDI API | Native | MIDI keyboard input | `navigator.requestMIDIAccess()` returns MIDI note numbers directly; ~5ms latency; Chrome/Edge native |
| Canvas 2D API | Native | Game rendering | Placeholder visuals (colored shapes, text) don't need WebGL; prior project decision |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zustand/vanilla | 5.x | UI-layer game state | Use for debug panel event buffer and keyboard strip highlight state — needs reactive updates without React |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| AnalyserNode polling (main thread) | AudioWorklet + SharedArrayBuffer | AudioWorklet is lower latency but requires COOP/COEP headers; AnalyserNode is simpler and sufficient for Phase 1 |
| pitchy (MPM) | Custom YIN / autocorrelation | pitchy is tested library code with fewer octave errors; custom YIN owns the bug surface |
| Web MIDI API native | WebMidi.js library | Raw API is ~20 lines; WebMidi.js adds 50KB for convenience wrappers not needed here |
| Canvas 2D CSS layout | Phaser 3 | Phaser adds ~200KB and fights with custom audio pipeline; Canvas 2D is the right level of abstraction |

**Installation:**
```bash
npm create vite@latest pianuki -- --template vanilla-ts
cd pianuki
npm install pitchy
npm install zustand
```

---

## Architecture Patterns

### Recommended Project Structure (Phase 1 scope)

```
src/
├── audio/
│   ├── AudioPipeline.ts      # AudioContext setup, mic capture, AnalyserNode
│   ├── MidiInput.ts          # Web MIDI API access and event normalization
│   └── InputBroker.ts        # Unified NoteOn/NoteOff event emitter
├── core/
│   ├── GameLoop.ts           # requestAnimationFrame + fixed timestep
│   └── GameEventBus.ts       # Typed pub/sub event bus
├── render/
│   ├── Renderer.ts           # Canvas 2D orchestrator
│   ├── LayoutManager.ts      # Window resize, canvas dimensions, zone calculations
│   ├── GameCanvas.ts         # Path placeholder, background
│   ├── KeyboardStrip.ts      # 88-key piano strip at bottom
│   └── DebugPanel.ts         # Dev-only rolling event log
└── main.ts                   # Bootstrap: layout → audio → game loop → renderer
```

### Pattern 1: Unified NoteOn/NoteOff Event Interface

**What:** Both mic and MIDI paths produce the same typed event. Consumers never need to know the source.

**When to use:** Always — required by AINP-03.

```typescript
// Source: architecture from prior project research + AINP-03 requirement
export interface NoteEvent {
  type: 'NoteOn' | 'NoteOff';
  midiNote: number;        // 0-127 MIDI note number
  noteName: string;        // e.g., "C4", "A#3"
  source: 'mic' | 'midi';
  frequency?: number;      // Hz — only present for mic source
  clarity?: number;        // 0-1 — only present for mic source
  timestamp: number;       // performance.now()
}

// Hz to MIDI note number: midiNote = Math.round(69 + 12 * Math.log2(hz / 440))
// MIDI note to name: noteNames[midiNote % 12] + Math.floor(midiNote / 12 - 1)
export function hzToMidi(hz: number): number {
  return Math.round(69 + 12 * Math.log2(hz / 440));
}

export function midiToNoteName(midi: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  return `${names[midi % 12]}${octave}`;
}
```

### Pattern 2: Microphone Pitch Detection via AnalyserNode + pitchy

**What:** `getUserMedia` → `AudioContext` → `AnalyserNode` → `getFloatTimeDomainData()` → `pitchy.findPitch()`. Polled from the game loop (or a `setInterval` at ~30fps).

**When to use:** For AINP-01 acoustic piano detection.

```typescript
// Source: pitchy GitHub v4.1.0 API + Web Audio API MDN
import { PitchDetector } from 'pitchy';

export class AudioPipeline {
  private ctx!: AudioContext;
  private analyser!: AnalyserNode;
  private detector!: PitchDetector<Float32Array>;
  private buffer!: Float32Array;
  private lastMidi: number | null = null;

  async init(): Promise<void> {
    // MUST be called inside a user gesture handler
    this.ctx = new AudioContext({ latencyHint: 'interactive' });
    await this.ctx.resume(); // defensive: resume if suspended

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const source = this.ctx.createMediaStreamSource(stream);

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048; // ~46ms window at 44.1kHz; good piano resolution
    source.connect(this.analyser);

    this.detector = PitchDetector.forFloat32Array(this.analyser.fftSize);
    this.buffer = new Float32Array(this.analyser.fftSize);
  }

  // Call this from the game loop or a 30fps interval
  poll(): { midiNote: number; frequency: number; clarity: number } | null {
    this.analyser.getFloatTimeDomainData(this.buffer);
    const [frequency, clarity] = this.detector.findPitch(this.buffer, this.ctx.sampleRate);

    if (clarity < 0.9) return null; // reject noise / attack transients

    const midiNote = hzToMidi(frequency);
    // Piano range: A0 = MIDI 21, C8 = MIDI 108
    if (midiNote < 21 || midiNote > 108) return null; // reject out-of-range

    return { midiNote, frequency, clarity };
  }
}
```

**Critical tuning parameters:**
- `fftSize`: 2048 is the standard; smaller = lower latency but less frequency resolution (worse for low bass notes); larger = better resolution but higher latency
- Clarity threshold `0.9`: primary accuracy lever — raise to reduce false positives (risk: miss soft notes); lower to increase sensitivity (risk: phantom notes from room noise)
- Piano range gate (21-108): rejects sub-bass noise and ultrasonic artifacts

### Pattern 3: Web MIDI API Input

**What:** `requestMIDIAccess()` → attach `onmidimessage` to all inputs → decode status byte.

**When to use:** For AINP-02 MIDI keyboard detection.

```typescript
// Source: MDN Web MIDI API + verified from official W3C spec
export class MidiInput {
  private onNote: (event: NoteEvent) => void;

  constructor(onNote: (event: NoteEvent) => void) {
    this.onNote = onNote;
  }

  async init(): Promise<boolean> {
    if (!navigator.requestMIDIAccess) return false; // Safari, old browsers

    try {
      const access = await navigator.requestMIDIAccess({ sysex: false });
      access.inputs.forEach(input => {
        input.onmidimessage = this.handleMessage.bind(this);
      });
      // Handle hot-plug: new devices connected after init
      access.onstatechange = () => {
        access.inputs.forEach(input => {
          input.onmidimessage = this.handleMessage.bind(this);
        });
      };
      return true;
    } catch {
      return false; // permission denied or API unavailable
    }
  }

  private handleMessage(event: MIDIMessageEvent): void {
    const [status, note, velocity] = event.data;
    const channel = status & 0x0F;
    const type = status & 0xF0;

    if (type === 0x90 && velocity > 0) {
      // Note On (velocity=0 on 0x90 is also a NoteOff per MIDI spec)
      this.onNote({
        type: 'NoteOn',
        midiNote: note,
        noteName: midiToNoteName(note),
        source: 'midi',
        timestamp: performance.now(),
      });
    } else if (type === 0x80 || (type === 0x90 && velocity === 0)) {
      // Note Off
      this.onNote({
        type: 'NoteOff',
        midiNote: note,
        noteName: midiToNoteName(note),
        source: 'midi',
        timestamp: performance.now(),
      });
    }
  }
}
```

**Key MIDI decoding detail:** `status & 0xF0` extracts the message type; `0x90` with `velocity === 0` is a valid NoteOff — this is required by the MIDI spec and many keyboards use it. Missing this causes "stuck notes" that never clear.

### Pattern 4: Canvas Layout — Fill Window + Zones

**What:** CSS Grid layout divides the browser window into three zones: game canvas (left/center), debug panel (fixed-width right), keyboard strip (fixed-height bottom). Each zone contains a Canvas element. ResizeObserver drives canvas dimension recalculation.

**When to use:** Phase 1 layout — the locked decision from CONTEXT.md.

```typescript
// Source: MDN ResizeObserver + Canvas 2D documentation
export class LayoutManager {
  readonly KEYBOARD_HEIGHT = 100; // px — keyboard strip height
  readonly DEBUG_WIDTH = 320;     // px — debug panel width

  private container: HTMLElement;
  private gameCanvas: HTMLCanvasElement;
  private keyboardCanvas: HTMLCanvasElement;
  private debugPanel: HTMLElement;

  getGameZone(): { width: number; height: number } {
    const totalWidth = this.container.clientWidth - this.DEBUG_WIDTH;
    const totalHeight = this.container.clientHeight - this.KEYBOARD_HEIGHT;
    return { width: totalWidth, height: totalHeight };
  }
}
```

**CSS structure:**
```css
body {
  margin: 0;
  overflow: hidden;
  display: grid;
  grid-template-areas:
    "game debug"
    "keys debug";
  grid-template-columns: 1fr 320px;
  grid-template-rows: 1fr 100px;
  width: 100vw;
  height: 100vh;
}

#game-canvas  { grid-area: game; display: block; width: 100%; height: 100%; }
#keyboard     { grid-area: keys; display: block; width: 100%; height: 100%; }
#debug-panel  { grid-area: debug; overflow-y: auto; }
```

**Canvas resize pattern:**
```typescript
// Source: MDN ResizeObserver documentation
const resizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const { width, height } = entry.contentRect;
    gameCanvas.width = Math.floor(width);
    gameCanvas.height = Math.floor(height);
    // Redraw immediately to prevent blank flash
    renderer.draw();
  }
});
resizeObserver.observe(gameCanvas.parentElement!);
```

### Pattern 5: 88-Key Keyboard Strip

**What:** Canvas-rendered keyboard strip showing all 88 keys (52 white, 36 black). A MIDI note highlights the corresponding key with immediate on/off.

**Key proportions (standard, verified from multiple sources):**
- 88-key piano = 52 white keys + 36 black keys
- White key width = `canvasWidth / 52`
- White key height = full strip height (e.g., 100px)
- Black key width = `whiteKeyWidth * 0.6` (typical: 60% of white key width)
- Black key height = `stripHeight * 0.63` (typical: 63% of white key height)

**Black key positions within an octave:** The pattern within each 12-note octave is: C, C#, D, D#, E, F, F#, G, G#, A, A#, B. Black keys appear after C, D, F, G, A (skipping E and B). The offset of each black key center: C# is at `0.5 * whiteWidth`, D# at `1.5 * whiteWidth`, F# at `3.5 * whiteWidth`, G# at `4.5 * whiteWidth`, A# at `5.5 * whiteWidth`.

```typescript
// Source: standard piano key geometry + BenjaminPritchard js-PianoKeyboard reference
export class KeyboardStrip {
  draw(ctx: CanvasRenderingContext2D, width: number, height: number, highlightedMidi: Set<number>): void {
    const WHITE_KEY_COUNT = 52;
    const wKeyWidth = width / WHITE_KEY_COUNT;
    const bKeyWidth = wKeyWidth * 0.6;
    const bKeyHeight = height * 0.63;

    // Draw white keys first (so black keys render on top)
    // Piano starts at A0 (MIDI 21), ends at C8 (MIDI 108)
    // White key indices: track which MIDI notes are white
    let wIndex = 0;
    for (let midi = 21; midi <= 108; midi++) {
      if (isWhiteKey(midi)) {
        const x = wIndex * wKeyWidth;
        ctx.fillStyle = highlightedMidi.has(midi) ? '#FFD700' : '#FFFFFF';
        ctx.strokeStyle = '#333';
        ctx.fillRect(x, 0, wKeyWidth - 1, height);
        ctx.strokeRect(x, 0, wKeyWidth - 1, height);
        wIndex++;
      }
    }

    // Draw black keys on top
    wIndex = 0;
    for (let midi = 21; midi <= 108; midi++) {
      if (isWhiteKey(midi)) {
        wIndex++;
      } else {
        const x = (wIndex - 0.7) * wKeyWidth; // offset from previous white key
        ctx.fillStyle = highlightedMidi.has(midi) ? '#FFD700' : '#1A1A1A';
        ctx.fillRect(x, 0, bKeyWidth, bKeyHeight);
      }
    }
  }
}

function isWhiteKey(midi: number): boolean {
  const note = midi % 12;
  return [0, 2, 4, 5, 7, 9, 11].includes(note); // C D E F G A B
}
```

**Claude's Discretion — recommended colors:**
- Inactive white key: `#FFFFFF` with `#333` border
- Inactive black key: `#1A1A1A`
- Active highlight (any key): `#FFD700` (gold) — visible on both white and black keys
- Strip background: `#2A2A2A`

### Pattern 6: Debug Panel — Rolling Event Log

**What:** A DOM element (not Canvas) showing the last 50 events in a fixed-height scrolling container. Each event shows: note name, On/Off, source, frequency (mic only), clarity (mic only), timestamp delta.

**Implementation approach:** DOM `<div>` with `overflow-y: scroll` and CSS `scroll-behavior: auto`. Prepend new events at top (most recent first) OR append and auto-scroll to bottom. Prepend is simpler (no scroll manipulation needed).

**Dev flag pattern:** The debug panel must be removable before shipping. Recommended approach: environment variable flag.

```typescript
// Source: pattern from CONTEXT.md decisions + standard dev-flag approach
const IS_DEV = import.meta.env.DEV; // Vite sets this automatically

if (IS_DEV) {
  const debugPanel = document.getElementById('debug-panel')!;
  const events: NoteEvent[] = [];
  const MAX_EVENTS = 50;

  gameEventBus.on('NoteEvent', (event: NoteEvent) => {
    events.unshift(event); // prepend — most recent at top
    if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
    renderDebugPanel(debugPanel, events);
  });
}

function renderDebugPanel(panel: HTMLElement, events: NoteEvent[]): void {
  panel.innerHTML = events.map(e => {
    const freqStr = e.frequency ? `${e.frequency.toFixed(1)}Hz` : '—';
    const clarityStr = e.clarity ? `${(e.clarity * 100).toFixed(0)}%` : '—';
    const tsStr = `+${e.timestamp.toFixed(0)}ms`;
    return `<div class="event ${e.type.toLowerCase()}">
      <span class="note">${e.noteName}</span>
      <span class="type">${e.type}</span>
      <span class="source">${e.source}</span>
      <span class="freq">${freqStr}</span>
      <span class="clarity">${clarityStr}</span>
      <span class="ts">${tsStr}</span>
    </div>`;
  }).join('');
}
```

**Shipping removal:** `import.meta.env.DEV` is `false` in production builds. Wrapping all debug panel code in `if (IS_DEV)` means it is tree-shaken out of production bundles automatically. No manual cleanup needed.

### Pattern 7: Game Canvas — Placeholder Path

**What:** Draw the L-shape or U-shape path as colored rectangles. Enemies are colored circles with note name text. No sprites.

**Claude's Discretion — recommended visual defaults:**
- Background: `#1B2838` (dark blue-gray — readable, game-like without being white)
- Path tiles: `#8B7355` (tan/dirt color — contrasts with background)
- Path border: `#6B5335`
- Enemy circles: `#E74C3C` (red) with `#FFFFFF` text (note name, e.g., "C4")
- Enemy circle radius: 20px at 1366px width — readable for note names
- Goal zone: `#27AE60` (green) at bottom
- Spawn zone: `#2980B9` (blue) at top

**L-shape path layout (top-to-bottom, from top-left):**
```
[Spawn]
  |
  | (vertical segment — column 1/4 from left)
  |
  +----------> (horizontal segment — crossing to right)
               |
             [Goal]
```

**U-shape path layout:**
```
[Spawn]
  |
  | (down left column)
  |
  +----------> (bottom horizontal)
               |
               | (up right column)
               |
             [Goal] (top right)
```

For Phase 1, a hard-coded L-shape with fixed tile positions (computed as fractions of canvas width/height) is sufficient. Path reuse across sessions is a Phase 2 concern.

### Anti-Patterns to Avoid

- **Creating `AudioContext` before user gesture:** `AudioContext` enters `suspended` state on Chrome/Firefox/Safari before any user interaction. Always create and resume inside a click/touch handler. Call `getUserMedia` in the same handler.
- **Polling `getFloatTimeDomainData` faster than 30fps on main thread:** Pitch detection at 30fps (33ms) is sufficient; polling at 60fps uses double the CPU for no accuracy gain.
- **Missing velocity=0 note-off on MIDI:** Many keyboards send `0x90` with velocity=0 for note-off instead of `0x80`. Not handling this causes stuck notes.
- **Not gating detected MIDI note to piano range:** pitchy can output frequencies below 27Hz or above 4186Hz from noise. Always clamp to MIDI 21-108.
- **Mutating canvas width/height inside ResizeObserver without batching:** Setting `canvas.width` clears the canvas; set it only when dimensions actually change.
- **Debug panel innerHTML on every game tick:** Rebuild DOM only when a new NoteEvent arrives, not on every animation frame.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MPM pitch detection | Custom YIN/autocorrelation | pitchy 4.1.0 | MPM tested, handles piano harmonics; custom YIN owns the octave error bug surface |
| Hz ↔ MIDI note conversion | Ad-hoc formula | `Math.round(69 + 12 * Math.log2(hz / 440))` | Standard formula; include in a shared utils file, don't re-derive |
| Note name lookup | Custom mapping | `['C','C#','D'...][midi % 12]` + octave | Trivial but should be in one place; wrong octave numbering is a common mistake |
| MIDI library wrapper | WebMidi.js | Raw Web MIDI API | Raw API is 20 lines; the library adds 50KB |
| Pixel art rendering | WebGL renderer | Canvas 2D | Placeholder visuals don't need WebGL; don't add PixiJS for Phase 1 |

**Key insight:** The Web Audio and Web MIDI APIs provide the raw data directly. The only non-trivial algorithm is pitch detection (MPM), which pitchy handles. Everything else in Phase 1 is straightforward math and DOM/Canvas manipulation.

---

## Common Pitfalls

### Pitfall 1: AudioContext Suspended on Page Load

**What goes wrong:** `AudioContext` silently enters `suspended` state on page load on all modern browsers. `getUserMedia` may succeed, but `AnalyserNode` produces all-zero buffers — pitchy returns silence. The game appears to load but detects nothing.

**Why it happens:** Chrome/Firefox/Safari autoplay policy blocks audio context creation before user interaction. Developers test on desktop Chrome which sometimes auto-resumes and miss the failure.

**How to avoid:** Create `AudioContext` and call `.resume()` inside the same event handler that triggers `getUserMedia`. The "Start" or "Allow Microphone" button must do both atomically.

**Warning signs:** `audioCtx.state === 'suspended'` after `getUserMedia` resolves; `getFloatTimeDomainData` buffer is all zeros.

---

### Pitfall 2: Velocity-0 NoteOff Not Handled in MIDI

**What goes wrong:** Many MIDI keyboards (including many Roland, Yamaha, Casio devices) send `0x90` status with velocity `0` for note-off instead of `0x80`. Code that only checks `status === 0x80` misses all note-offs from these keyboards. Notes become "stuck" in the active state permanently.

**Why it happens:** The MIDI spec allows both forms; the `status=0x80` form is "Running Status" NoteOff but many devices prefer the simpler `0x90 velocity=0` convention.

**How to avoid:** Always handle both: `if ((status & 0xF0) === 0x80 || ((status & 0xF0) === 0x90 && velocity === 0))` triggers NoteOff.

**Warning signs:** Keys appear to stay "on" in the keyboard strip after releasing; debug panel shows NoteOn events without corresponding NoteOff.

---

### Pitfall 3: Octave Confusion in Piano Pitch Detection

**What goes wrong:** The MPM algorithm occasionally detects notes an octave above or below the played note, especially on bass notes (A0–C3) where the fundamental (27–130 Hz) is weaker than the 2nd harmonic. The game registers "C5" when the player played "C4".

**Why it happens:** Piano harmonics at 2×f0 can score higher than the fundamental in the MPM algorithm's NSDF function when the fundamental is attenuated.

**How to avoid:**
1. Use pitchy's MPM (already does better than naive autocorrelation)
2. Constrain output to piano range (MIDI 21-108)
3. Add octave stability: if detected note is the same pitch class as the previous note but a different octave, prefer the previous octave (hysteresis)
4. Validate empirically across all 88 keys before calling AINP-01 done — octave error rate must be below 5%

**Warning signs:** Bass note detection (A0–E3) consistently reports an octave too high; note "flickers" between two octaves of the same pitch class.

---

### Pitfall 4: COOP/COEP Header Complexity for SharedArrayBuffer

**What goes wrong:** The AudioWorklet + SharedArrayBuffer architecture (the "better" pitch detection path) requires `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` response headers. Without these, `SharedArrayBuffer` throws a security error in Chrome 92+.

**Why it happens:** Chrome disabled SharedArrayBuffer without cross-origin isolation as a Spectre mitigation. GitHub Pages does not allow custom response headers.

**How to avoid — Phase 1 decision:** Do NOT use AudioWorklet + SharedArrayBuffer in Phase 1. Use AnalyserNode polling from the main thread instead. This avoids the deployment complexity entirely. If migrating to AudioWorklet is needed later:
- **Vite dev server:** Add `server.headers` in `vite.config.ts` (confirmed supported)
- **Netlify production:** Add `netlify.toml` with `[[headers]]` block
- **Vercel production:** Add `vercel.json` with `"headers"` array
- **GitHub Pages:** Use `coi-serviceworker` (service worker workaround; adds one script tag and a reload on first visit)

**Vite config for development (if AudioWorklet needed later):**
```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
});
```

**Warning signs:** `SharedArrayBuffer is not defined` or `Cannot read properties of undefined` in console; `crossOriginIsolated` returns `false`.

---

### Pitfall 5: Note Name Octave Numbering Off by One

**What goes wrong:** Different systems use different conventions for middle C. Middle C is MIDI 60. In scientific pitch notation (SPN) it is C4. In some MIDI implementations it is displayed as C3 or C5. If the keyboard strip shows "C3" for what the player expects to see as "C4" for the middle keys, players are confused.

**Why it happens:** The formula `octave = Math.floor(midi / 12) - 1` gives C4 for MIDI 60 (the SPN standard). Some libraries subtract 2 or use no offset, causing discrepancy.

**How to avoid:** Use `Math.floor(midiNote / 12) - 1` consistently. Verify: MIDI 60 → "C4", MIDI 21 → "A0", MIDI 108 → "C8". Write a unit test for this mapping immediately.

**Warning signs:** Debug panel shows "C3" when player plays middle C; player reports the keyboard strip labels don't match their physical piano.

---

### Pitfall 6: Canvas Dimensions Mismatch Between CSS Size and Pixel Buffer

**What goes wrong:** Setting canvas element width/height in CSS (which scales the display) without setting the `canvas.width` and `canvas.height` attributes (which sets the pixel buffer size) causes blurry rendering. On HiDPI/Retina displays this is especially visible.

**Why it happens:** CSS size and canvas buffer size are independent. CSS sets how large the element appears; `canvas.width/height` sets how many pixels are in the drawing buffer.

**How to avoid:**
```typescript
// Correct: set both display size and buffer size
function resizeCanvas(canvas: HTMLCanvasElement, width: number, height: number): void {
  const dpr = window.devicePixelRatio ?? 1;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.getContext('2d')!.scale(dpr, dpr);
}
```
For Phase 1 placeholder visuals, `devicePixelRatio` scaling is optional but prevents blurriness on Retina displays.

---

## Code Examples

### Full Pitch Detection Setup (AnalyserNode + pitchy)

```typescript
// Source: pitchy v4.1.0 API + Web Audio API MDN
import { PitchDetector } from 'pitchy';

async function startMicDetection(onNote: (event: NoteEvent) => void): Promise<void> {
  // MUST be called inside user gesture
  const ctx = new AudioContext({ latencyHint: 'interactive' });
  await ctx.resume();

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);

  const detector = PitchDetector.forFloat32Array(analyser.fftSize);
  const buffer = new Float32Array(analyser.fftSize);
  let lastMidi: number | null = null;

  // Poll at 30fps — sufficient for piano note recognition
  setInterval(() => {
    analyser.getFloatTimeDomainData(buffer);
    const [frequency, clarity] = detector.findPitch(buffer, ctx.sampleRate);

    if (clarity < 0.9) {
      if (lastMidi !== null) {
        onNote({ type: 'NoteOff', midiNote: lastMidi, noteName: midiToNoteName(lastMidi), source: 'mic', timestamp: performance.now() });
        lastMidi = null;
      }
      return;
    }

    const midi = hzToMidi(frequency);
    if (midi < 21 || midi > 108) return; // piano range gate

    if (midi !== lastMidi) {
      if (lastMidi !== null) {
        onNote({ type: 'NoteOff', midiNote: lastMidi, noteName: midiToNoteName(lastMidi), source: 'mic', timestamp: performance.now() });
      }
      onNote({ type: 'NoteOn', midiNote: midi, noteName: midiToNoteName(midi), source: 'mic', frequency, clarity, timestamp: performance.now() });
      lastMidi = midi;
    }
  }, 33); // ~30fps
}
```

### MIDI Input Setup

```typescript
// Source: MDN Web MIDI API documentation
async function startMidiInput(onNote: (event: NoteEvent) => void): Promise<boolean> {
  if (!navigator.requestMIDIAccess) return false;

  const access = await navigator.requestMIDIAccess({ sysex: false });

  function attachListeners(): void {
    access.inputs.forEach(input => {
      input.onmidimessage = (event: MIDIMessageEvent) => {
        const [status, note, velocity] = event.data;
        const type = status & 0xF0;
        if (type === 0x90 && velocity > 0) {
          onNote({ type: 'NoteOn', midiNote: note, noteName: midiToNoteName(note), source: 'midi', timestamp: performance.now() });
        } else if (type === 0x80 || (type === 0x90 && velocity === 0)) {
          onNote({ type: 'NoteOff', midiNote: note, noteName: midiToNoteName(note), source: 'midi', timestamp: performance.now() });
        }
      };
    });
  }

  attachListeners();
  access.onstatechange = attachListeners; // handle hot-plug
  return true;
}
```

### Canvas Layout (CSS Grid)

```html
<!-- index.html -->
<body>
  <div id="game-container">
    <canvas id="game-canvas"></canvas>
    <div id="debug-panel"></div>
    <canvas id="keyboard-canvas"></canvas>
  </div>
</body>
```

```css
/* main.css */
* { margin: 0; padding: 0; box-sizing: border-box; }

body, #game-container {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

#game-container {
  display: grid;
  grid-template-areas:
    "game debug"
    "keys debug";
  grid-template-columns: 1fr 320px;
  grid-template-rows: 1fr 100px;
}

#game-canvas   { grid-area: game; display: block; width: 100%; height: 100%; }
#keyboard-canvas { grid-area: keys; display: block; width: 100%; height: 100%; }
#debug-panel   { grid-area: debug; background: #1A1A2E; color: #E0E0E0;
                 font-family: monospace; font-size: 11px;
                 overflow-y: auto; padding: 8px; }
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `ScriptProcessorNode` | `AudioWorklet` | Chrome 66, 2018 (widely available Chrome 64+) | ScriptProcessorNode is deprecated; runs on main thread causing jank; always use AudioWorklet for audio-thread processing |
| `autoplay` attribute | User-gesture required for `AudioContext.resume()` | Chrome 71 (2018) | AudioContext must be resumed inside user gesture; design "Start" flow accordingly |
| `navigator.webkitGetUserMedia` | `navigator.mediaDevices.getUserMedia()` | Chrome 47 (2015), now universal | Old webkit prefix form is removed; use standard form only |
| Polling `AnalyserNode` in `ScriptProcessorNode` | Polling `AnalyserNode` in main thread via `setInterval/rAF` (for simple use cases) or `AudioWorklet` (for production) | — | For Phase 1, main thread polling is acceptable; AudioWorklet is the production path |

**Deprecated/outdated:**
- `ScriptProcessorNode`: do not use — deprecated, main-thread blocking
- `navigator.webkitGetUserMedia`: removed from browsers
- Web MIDI API Firefox support: Firefox does NOT support Web MIDI API natively as of 2026 — Chrome/Edge/Brave only

---

## Open Questions

1. **Pitch detection accuracy on real acoustic piano (octave error rate)**
   - What we know: pitchy MPM is better than autocorrelation; clarity threshold 0.9 rejects noise
   - What's unclear: actual error rate on an acoustic piano in a real room with ambient noise; low bass (A0–C3) is the known problematic range
   - Recommendation: Build the mic pipeline first; run an empirical accuracy sweep across all 88 keys before declaring AINP-01 done. This is a go/no-go gate.

2. **Clarity threshold tuning (0.9 default)**
   - What we know: 0.9 is the commonly cited starting value; too high misses soft notes; too low causes phantom notes from noise
   - What's unclear: optimal threshold for acoustic piano in a living room at 1-3 meter microphone distance
   - Recommendation: Make the threshold a constant at the top of `AudioPipeline.ts`; tune empirically during Phase 1 testing

3. **NoteOff detection from microphone**
   - What we know: NoteOff from mic requires detecting when clarity drops below threshold (note release); piano notes decay over 1-8 seconds depending on register
   - What's unclear: how to distinguish between note decay (NoteOff approaching) and clarity fluctuation during sustained note (false NoteOff mid-note)
   - Recommendation: Use a "NoteOff debounce" — only emit NoteOff after clarity stays below threshold for 50ms. This matches the approach in the STACK research.

4. **Deployment target for production**
   - What we know: Netlify and Vercel support custom headers (COOP/COEP) natively; GitHub Pages does not without coi-serviceworker workaround
   - What's unclear: which hosting platform will be used for the production game
   - Recommendation: Phase 1 uses AnalyserNode (avoids the question entirely); confirm deployment target before Phase 2 to decide whether AudioWorklet migration is needed

---

## Sources

### Primary (HIGH confidence)

- pitchy GitHub v4.1.0 (https://github.com/ianprime0509/pitchy) — API: `PitchDetector.forFloat32Array(inputLength)`, `findPitch(buffer, sampleRate)`, MPM algorithm, clarity score
- MDN Web MIDI API (https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API) — `requestMIDIAccess`, `MIDIMessageEvent`, data byte format, browser support
- MDN AnalyserNode (https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode) — `getFloatTimeDomainData`, `fftSize`, confirmed API
- Chrome Developers Audio Worklet Design Pattern (https://developer.chrome.com/blog/audio-worklet-design-pattern/) — SharedArrayBuffer ring buffer pattern, 3ms audio thread budget
- web.dev COOP/COEP article (https://web.dev/articles/coop-coep) — header requirements for SharedArrayBuffer
- Vite server options documentation (https://vite.dev/config/server-options) — `server.headers` configuration type `OutgoingHttpHeaders`

### Secondary (MEDIUM confidence)

- tomayac.com COOP/COEP on GitHub Pages (https://blog.tomayac.com/2025/03/08/setting-coop-coep-headers-on-static-hosting-like-github-pages/) — coi-serviceworker as GitHub Pages workaround; Netlify/Vercel header config examples (March 2025)
- gzuidhof/coi-serviceworker (https://github.com/gzuidhof/coi-serviceworker) — service worker COOP/COEP workaround for static hosts
- BenjaminPritchard js-PianoKeyboard (https://github.com/BenjaminPritchard/js-PianoKeyboard) — 88-key proportions: white key width = canvas/52; black key width = 75% white; black key height = 66% white
- alexanderell.is pitch detection blog (https://alexanderell.is/posts/tuner/) — practical analysis of autocorrelation limitations; clarity threshold tuning

### Tertiary (LOW confidence — needs validation)

- Pitch detection accuracy percentages on real acoustic piano: empirically unverified; claimed from multiple sources but no piano-specific benchmark with real room noise found

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — pitchy API verified from official repo; Web MIDI API verified from MDN; Vite config verified from official docs
- Architecture: HIGH — AnalyserNode polling pattern is MDN-documented and well-established; MIDI message format is W3C spec; CSS Grid layout is standard
- Pitfalls: HIGH (AudioContext suspension, velocity-0 MIDI, COOP/COEP headers) — verified from official browser docs; MEDIUM (octave errors) — requires empirical validation on real piano

**Research date:** 2026-02-27
**Valid until:** 2026-06-01 (stable Web APIs; pitchy has not been updated since Jan 2024 — API stable)

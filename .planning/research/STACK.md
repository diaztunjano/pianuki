# Stack Research

**Domain:** Browser-based piano-controlled tower defense game
**Researched:** 2026-02-27
**Confidence:** MEDIUM-HIGH (core Web APIs are HIGH; pitch detection library choice is MEDIUM due to limited comparative benchmarks for piano specifically)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| TypeScript | 5.8 | Primary language | Strict mode eliminates runtime errors in complex game state (entity positions, note mappings, wave data). Game code grows fast; type safety is not optional. |
| Vite | 7.x (current: 7.3.1) | Build tool + dev server | Instant HMR for Canvas game iteration. No framework overhead. `npm create vite@latest -- --template vanilla-ts` gives you a clean TypeScript Canvas starting point in 30 seconds. |
| HTML5 Canvas 2D API | Native (no lib) | Rendering | Pixel art at game resolutions (640x360 or similar) does NOT need WebGL. Canvas 2D performs well up to ~3k-5k simultaneous elements. This game will have far fewer. WebGL adds complexity for zero pixel art benefit — Phaser's own forums note 1px sometimes renders as 2px in WebGL but not in Canvas 2D. |
| Web Audio API | Native (no lib) | Microphone input + pitch analysis pipeline | The foundation for ALL audio work. AudioWorklet (not the deprecated ScriptProcessorNode) runs audio processing in a dedicated thread off the main thread, giving sub-3ms latency budget. This is non-negotiable for responsive piano detection. |
| Web MIDI API | Native (no lib) | MIDI keyboard secondary input | Native in Chrome/Edge/Firefox (82% global coverage). No library needed — `navigator.requestMIDIAccess()` returns MIDI note numbers directly. Safari still has zero support; since this is desktop-only, Chrome is the target browser. |

### Audio / Pitch Detection

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pitchy | 4.1.0 (Jan 2024) | Monophonic real-time pitch detection | **Primary pitch detector.** Uses the McLeod Pitch Method (MPM) — outperforms YIN on piano fundamentals because MPM uses normalized square difference function, which reduces false octave errors common with autocorrelation on piano harmonic-rich signals. Returns `[frequencyHz, clarity]` — the clarity score (0–1) is essential for rejecting detection noise between notes. Pure ES module, works with Vite natively. |
| pitchfinder | 2.3.4 | Fallback / multi-algorithm testing | Use only during development to A/B test YIN vs AMDF if pitchy's MPM struggles on specific note ranges (low bass, high treble). Original repo has minimal maintenance (created 2013, ~79 commits total). Do not ship it — use pitchy. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Howler.js | 2.2.4 | Game sound effects (SFX + BGM) | Enemy defeat sounds, tower placement clicks, wave start fanfares. Howler manages audio sprites, caching, and cross-browser quirks so you can focus on game logic. Last published ~2 years ago but stable — audio APIs haven't changed. 7KB gzipped. Do NOT use it for the pitch detection pipeline — that stays on raw Web Audio API. |
| Zustand (vanilla) | 5.x | Game state management | Use `zustand/vanilla` (React-free) for top-level game state: current wave, score, active towers, lives remaining, difficulty parameters. Provides fine-grained subscriptions so UI overlay updates only re-render when relevant slices change. 1KB, zero deps. Alternative is plain module-level objects — acceptable, but Zustand gives you devtools and time-travel debugging for free. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vitest | Unit testing | Comes from the Vite ecosystem — zero config. Test pitch detection logic, note-frequency mapping, wave scheduling, and tower damage math without a browser. |
| ESLint + `@typescript-eslint` | Linting | Enforce `no-explicit-any`, `strict-boolean-expressions`. Game loops accumulate technical debt fast; linting keeps code honest. |
| Prettier | Formatting | Single opinionated formatter — no bike-shedding. |
| `vite-plugin-inspect` | Build debugging | Visualize Vite transform pipeline if module resolution breaks (AudioWorklet files need special handling). |

---

## Installation

```bash
# Scaffold project
npm create vite@latest pianuki -- --template vanilla-ts
cd pianuki

# Pitch detection (primary)
npm install pitchy

# Game sound effects
npm install howler

# State management
npm install zustand

# Dev dependencies
npm install -D vitest @vitest/ui eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser prettier
```

**AudioWorklet note:** AudioWorklet processor files must be loaded via `new URL('./processor.js', import.meta.url)` in Vite — do NOT import them as regular ES modules. Vite handles this correctly when using the URL constructor pattern.

---

## Alternatives Considered

| Recommended | Alternative | When Alternative Makes Sense |
|-------------|-------------|------------------------------|
| Vanilla Canvas 2D | Phaser 3 (v3.90, Canvas mode) | If you need a Tiled map editor, built-in physics, or a scene graph — Phaser's pixel art mode and Canvas renderer work well. NOT recommended here because Phaser's scene lifecycle adds ~200KB and fights with our custom audio pipeline. Custom Audio + Phaser requires fighting the engine's audio abstraction. |
| Vanilla Canvas 2D | Excalibur.js (v0.32.0) | TypeScript-native and has pixel art mode. Still pre-1.0 (all 0.x versions). API breaks between releases. Not suitable for a production game without accepting migration risk. |
| pitchy (MPM) | ml5.js CREPE pitch detection | CREPE is a deep CNN — accurate for vocals, high latency (~50ms+), requires loading a TensorFlow.js model. Piano note detection does not need neural networks. Use CREPE only if MPM fails badly on your specific use case. |
| pitchy (MPM) | Custom YIN autocorrelation | Custom YIN from scratch is what cwilso/PitchDetect implements. Works, but you own the bug surface. pitchy's MPM is more accurate for piano (fewer octave errors) and is tested library code. |
| Howler.js | Tone.js | Tone.js is excellent for music synthesis and sequencing but adds ~300KB and a scheduling abstraction not needed for simple SFX. Overkill unless you want to synthesize tones in-browser. |
| Web MIDI API (native) | WebMidi.js library | WebMidi.js wraps the raw API with convenience methods, but the raw API is simple enough that a 20-line wrapper is cleaner than a 50KB dependency. |
| Zustand (vanilla) | Plain module state | Acceptable for small state surfaces. Use Zustand when game state exceeds 5+ interrelated variables that UI components need to observe reactively. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| ScriptProcessorNode | Deprecated. Runs on main thread, blocking rendering. Causes audio/visual jank. The Web Audio API spec marks it deprecated since 2019. | AudioWorklet (runs in dedicated audio thread) |
| React / Vue / Svelte | Framework reconciliation overhead per frame is incompatible with a 60fps game loop. The DOM is not the game — Canvas IS the display. | Vanilla TypeScript + Canvas |
| Three.js / PixiJS (WebGL) | WebGL adds complexity that gives no pixel art benefit. 1px pixel art renders better in Canvas 2D. WebGL pipeline initialization is heavier. | Canvas 2D API directly |
| Web Audio API for SFX | Raw Web Audio API for sound effects requires manual buffer management, gain nodes, and source creation per play — tedious. | Howler.js (wraps Web Audio API with sane defaults) |
| pathfinding npm package | Last published 9 years ago (v0.4.18). API is fine for tower defense paths but you'd be copying dead code into your project. | Implement A* yourself (~80 lines for grid-based pathfinding) or use `@cetfox24/pathfinding-js` if you need a package |
| Webpack | Obsolete for new projects. Vite is 10-20x faster for dev server startup. | Vite |
| `<audio>` HTML element | No access to PCM samples, can't feed into AnalyserNode for pitch detection. | Web Audio API MediaStream source |

---

## Stack Patterns by Variant

**If user has only microphone (no MIDI):**
- Use `navigator.mediaDevices.getUserMedia({ audio: true })` → `AudioContext.createMediaStreamSource()` → `AnalyserNode` → pitchy
- Detection loop runs every 30-50ms (no faster — piano attack transients need settling time)
- Add 80ms "note lock" delay after detecting a pitch to prevent re-triggering on the same note

**If user has MIDI keyboard:**
- `navigator.requestMIDIAccess()` → listen for `MIDIMessageEvent` on all inputs
- MIDI `noteOn` message (status byte `0x9n`) gives you note number and velocity directly — no pitch detection needed
- MIDI path bypasses AudioWorklet entirely; much lower latency (~5ms vs ~50ms for acoustic)
- Detect MIDI availability at startup, prefer MIDI if detected

**For adaptive difficulty engine:**
- Store all stats in Zustand store: `notesAttempted`, `notesCorrect`, `averageDetectionLatency`, `lastNNoteHistory`
- Update difficulty multiplier on wave boundary, not in real-time (prevents oscillation)
- All stats persist to `localStorage` as JSON on wave completion

**For pixel art rendering:**
- Set canvas `imageSmoothingEnabled = false` and CSS `image-rendering: pixelated`
- Render at logical resolution (e.g., 320x180), scale up with CSS `transform: scale(N)` or canvas size
- Never render at display resolution — logical pixel budget is the performance budget

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| pitchy@4.1.0 | Vite 7.x, TypeScript 5.x | Pure ES module — works with Vite natively. No CommonJS issues. |
| howler@2.2.4 | Vite 7.x | Ships CJS and UMD; Vite handles this. `@types/howler@2.2.12` available. |
| zustand@5.x | Vite 7.x, TypeScript 5.x | ES module only in v5. Use `zustand/vanilla` import (no React dependency). |
| Vite 7.x | Node.js 20.19+ or 22.12+ | Dropped Node 18 (EOL). Verify Node version before project start. |
| Web MIDI API | Chrome 43+, Edge 79+, Firefox 108+ | Safari: ZERO support. Design for Chrome-first; note this prominently in the game's landing page. |
| AudioWorklet | Chrome 64+, Firefox 76+, Safari 14.1+ | Widely supported. AnalyserNode is the fallback path; don't bother — AudioWorklet is safe. |

---

## Pitch Detection Architecture Decision

This is the most technically risky choice in the stack. The recommendation is:

**Use pitchy (MPM) via AnalyserNode + requestAnimationFrame polling**, NOT a dedicated AudioWorklet for pitch analysis.

Rationale:
1. pitchy's `findPitch()` is synchronous and fast enough to run on the main thread at 30fps polling without measurable frame drop.
2. AudioWorklet for pitch detection requires passing data across the worklet boundary (SharedArrayBuffer or MessagePort), which adds complexity and requires HTTPS + COOP/COEP headers.
3. The game loop is already at 60fps — pitch detection at 30fps is sufficient for musical note recognition (piano notes sustain for hundreds of milliseconds).
4. If profiling shows pitch detection causing frame drops >2ms, move it to an AudioWorklet + SharedArrayBuffer — but start simple.

Implementation sketch:
```typescript
// Pitch detection loop — runs at 30fps (every other game frame)
const analyser = audioCtx.createAnalyser();
analyser.fftSize = 2048; // ~46ms at 44.1kHz — good piano resolution
const buffer = new Float32Array(analyser.fftSize);
const detector = PitchDetector.forFloat32Array(analyser.fftSize);

function detectPitch(): [number, number] | null {
  analyser.getFloatTimeDomainData(buffer);
  const [pitch, clarity] = detector.findPitch(buffer, audioCtx.sampleRate);
  if (clarity < 0.9) return null; // reject noise
  return [pitch, clarity];
}
```

The `clarity < 0.9` threshold is critical. Piano attacks produce transient noise; wait for the steady-state harmonic to stabilize. Tune this threshold during development — it is the primary accuracy lever.

---

## Sources

- Vite 7 announcement: https://vite.dev/blog/announcing-vite7 — verified current stable version (7.3.1), Node.js requirements
- pitchy GitHub: https://github.com/ianprime0509/pitchy — version 4.1.0 (Jan 2024), MPM algorithm, ES module distribution
- pitchfinder npm: version 2.3.4, multiple algorithms, limited maintenance (founded 2013)
- Web MIDI API browser support: https://caniuse.com/midi — 82.17% global coverage, Safari has zero support (verified Feb 2026)
- Canvas 2D vs WebGL pixel art: Phaser forums confirm 1px pixel art issues in WebGL mode (HIGH confidence — direct community observation)
- AudioWorklet vs ScriptProcessorNode: MDN Web Audio API docs + web.dev patterns (HIGH confidence — official sources)
- Howler.js: v2.2.4, last published ~2 years ago, 622 dependent npm packages, stable (MEDIUM confidence — no major updates but API stable)
- Excalibur.js: v0.32.0 released Dec 2024, still 0.x pre-release — verified via GitHub releases (HIGH confidence)
- JS game engines 2025 benchmark: https://github.com/Shirajuki/js-game-rendering-benchmark — performance comparison across engines
- Zustand vanilla docs: confirmed `zustand/vanilla` works without React (MEDIUM confidence — WebSearch + official docs cross-referenced)

---
*Stack research for: Browser-based piano tower defense game (Pianuki)*
*Researched: 2026-02-27*

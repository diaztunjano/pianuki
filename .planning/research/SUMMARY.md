# Project Research Summary

**Project:** Pianuki
**Domain:** Browser-based piano-controlled tower defense game (music education + tower defense hybrid)
**Researched:** 2026-02-27
**Confidence:** MEDIUM-HIGH

## Executive Summary

Pianuki is a novel genre hybrid: a browser-based tower defense game where players defeat enemies by playing correct musical concepts on a MIDI keyboard (or acoustic piano via microphone). The product sits at the intersection of two well-understood domains — music education apps (Simply Piano, Synthesia) and tower defense games (Bloons TD 6, Kingdom Rush) — but the combination is largely unexplored, making it a genuine differentiator in both markets. The recommended approach is to build on the Web Audio API and Web MIDI API with vanilla TypeScript and Canvas 2D, keeping all framework dependencies minimal and purpose-chosen. The core technical bet is a MIDI-first input path (low latency, high reliability) with acoustic microphone support deferred to v2 after validating the game loop.

The most important architectural decision in this project is the audio input pipeline. Pitch detection via microphone is technically complex: octave confusion, autoplay policy restrictions, microphone feedback from speakers, and end-to-end latency each represent independent failure modes that can each independently break the game feel. The MIDI input path avoids every one of these risks entirely, at the cost of requiring a MIDI keyboard. For v1, this is the correct tradeoff. The entire build order must be structured so that input detection is proven working before any other game systems are built. The architecture research confirms a clear 7-phase build dependency chain from audio pipeline through polish.

The key educational design risk is not technical — it is motivational. Research into music education games consistently shows that extrinsic reward loops (points, badges, coins) crowd out genuine learning. Pianuki's design strength is that the musical concepts ARE the enemies: there is no way to win without actually engaging with the notes and chords being taught. This intrinsic challenge structure must be preserved throughout development. The adaptive difficulty system must be designed to adjust game challenge (enemy speed, wave density) without softening the musical requirement itself — if the game accepts wrong notes to keep the player winning, the educational value collapses.

---

## Key Findings

### Recommended Stack

The project should be built with vanilla TypeScript 5.8 on Vite 7.x, with no UI framework. Canvas 2D handles rendering at game resolutions without the pixel art artifacts and overhead of WebGL. The Web Audio API (via AudioWorklet, not the deprecated ScriptProcessorNode) handles microphone input; the Web MIDI API handles MIDI keyboard input natively in Chrome. The `pitchy` library (v4.1.0, McLeod Pitch Method) is the recommended pitch detector over naive autocorrelation because MPM handles piano's harmonic-rich spectrum with fewer octave errors.

For state management, `zustand/vanilla` (v5.x) provides reactive game-level state (score, wave, lives) without React overhead. `Howler.js` (v2.2.4) manages sound effects cleanly. Vitest provides testing. The complete dependency surface is intentionally small — complex audio pipelines and game loops accumulate technical debt faster than most codebases, so every dependency must earn its place.

**Core technologies:**
- TypeScript 5.8: strict mode eliminates runtime errors in complex game state
- Vite 7.x: instant HMR for Canvas iteration, no framework overhead
- Canvas 2D (native): pixel art renders correctly without WebGL's 1px artifacts; adequate for this entity count
- Web Audio API + AudioWorklet: sub-3ms audio thread, non-negotiable for responsive detection
- Web MIDI API (native): MIDI note numbers directly at ~5ms latency; no library wrapper needed
- pitchy 4.1.0 (MPM): fewer octave errors than YIN autocorrelation on piano fundamentals; clarity score enables noise rejection
- Howler.js 2.2.4: sound effects with sane defaults; keep separate from pitch detection pipeline
- zustand/vanilla 5.x: reactive UI-layer state without React; devtools and time-travel debugging

**Critical version note:** Vite 7.x requires Node.js 20.19+ or 22.12+. Verify Node version before scaffolding.

### Expected Features

The product has a well-defined must-have set from both source genres. Missing any P1 feature makes the product feel broken. The feature that makes Pianuki distinct from all competitors is that musical concepts are the enemies — this is the table stakes item that must be nailed before any differentiator features matter.

**Must have (table stakes for v1):**
- MIDI input detection with <50ms effective latency — game is unplayable without this
- Note-level enemies (single notes, C major) — validates the core loop at minimum theory complexity
- Enemy path + wave system (3-5 waves per level) — foundational tower defense structure
- Correct/incorrect visual feedback per note — provides the per-action reward signal
- Lives/HP system with configurable penalty mode — players must feel stakes, but control the difficulty
- Virtual keyboard (toggleable) — essential for beginners; should be off by default at higher difficulty
- 3-5 levels of increasing difficulty — notes, then intervals, then basic chords
- Session persistence (localStorage) — players must resume progress
- Level select screen — players revisit content to practice specific theory
- HUD (wave indicator, health, detected note display) — players need orientation data at all times

**Should have (differentiators, post-MVP):**
- Skill tree with 2-3 branching musical paths — enables specialization and replay
- Adaptive difficulty with visible stats — builds trust; research shows 30% DAU improvement
- Interval enemies (2-note recognition) — second theory tier
- Chord enemies (major/minor triads) — third theory tier
- Per-session accuracy stats dashboard — turns abstract scores into actionable learning data

**Defer to v2+:**
- Acoustic piano / microphone input — polyphonic chord detection in browser has 100-300ms latency and high error rates; validate separately
- Scale and progression enemies — requires deep content design
- Boss waves — animation-heavy; not essential to validate concept
- Leaderboards and multiplayer — requires backend; out of scope for localStorage v1

**Anti-features (never ship):**
- Song-based content (play Beethoven) — conflicts with theory learning, requires licensing
- Mobile support — Web MIDI API is unusable on mobile; acoustic piano is a desktop peripheral
- In-app MIDI file import — different product goal entirely

### Architecture Approach

The architecture is a layered system with strict unidirectional data flow: Input Layer (audio/MIDI hardware) feeds the Game Core Layer (GameLoop, EventBus, GameStateManager, game systems), which feeds the Rendering Layer (Canvas 2D), which is read-only. A Persistence Layer (localStorage) is written only on state transitions, never per tick. The audio thread (AudioWorklet) communicates with the main thread exclusively through a SharedArrayBuffer ring buffer — never via postMessage for per-frame data. The game loop uses a fixed 50Hz update rate with variable-rate 60fps rendering using position interpolation.

**Major components:**
1. AudioPipeline (audio/): AudioContext + AnalyserNode + AudioWorkletProcessor — pitch detection runs on a dedicated audio thread; isolated because the browser enforces thread separation for worklets
2. InputBroker (audio/): reads ring buffer each game frame; normalizes pitch and MIDI events into unified NoteOn/NoteOff events dispatched to GameEventBus
3. GameLoop (core/): fixed-timestep update (20ms) + variable render (rAF); accumulator pattern prevents spiral-of-death
4. GameEventBus (core/): typed pub/sub with end-of-tick event flushing; prevents mid-tick re-entrant updates between systems
5. GameStateManager (core/): explicit FSM — MENU, PLAYING, PAUSED, WAVE_CLEAR, UPGRADE, GAME_OVER
6. WaveManager / EnemyPool / ProjectilePool (game/): wave scheduling and object-pooled entity management; zero allocation per wave
7. FlowField (game/): BFS computed once per tower placement; all enemies read O(1) direction vectors
8. DifficultyEngine (game/): sliding window of player accuracy adjusts wave density and timing; does NOT modify musical requirements
9. Renderer (render/): read-only Canvas 2D orchestrator; pre-baked OffscreenCanvas tilemap blit + entity draw + HUD
10. ProgressionStore (game/progression/): versioned JSON to localStorage; written only on WAVE_CLEAR and GAME_OVER

### Critical Pitfalls

1. **Octave confusion in pitch detection** — Piano harmonics cause autocorrelation to detect the 2nd harmonic instead of the fundamental, especially on low notes (A0–C3). Use pitchy's MPM algorithm (better harmonic handling than YIN), constrain detection to piano range (27.5–4186 Hz), and add octave-stability smoothing. Measure accuracy across all 88 keys before any game integration. Error rate must be below 5% before proceeding.

2. **AudioContext suspended on page load** — Chrome, Firefox, and Safari all block AudioContext creation until user interaction; iOS Safari is particularly strict. Always resume AudioContext and request getUserMedia in the same user gesture. Design the "Start Game" button as the single atomic action that does both. Test on physical iOS Safari in week one.

3. **Microphone feedback from game speakers** — Acoustic piano players are not wearing headphones. Game audio played through speakers bleeds into the microphone and confuses the pitch detector. Make headphones a mandatory first-run requirement, not a recommendation. Reduce game SFX amplitude and bias frequencies away from piano fundamentals (favor 500–2000 Hz).

4. **Detection latency exceeding game-feel threshold** — The pipeline from piano key to enemy damage has multiple compounding stages totaling 50–120ms. Use `AudioWorklet` (not AnalyserNode polling in rAF), set `latencyHint: 'interactive'`, measure end-to-end timing explicitly, and ship a user-adjustable latency offset slider from day one. Target <80ms. MIDI input bypasses this entirely at ~5ms.

5. **Adaptive difficulty masking learning failure** — A system that accepts lower accuracy or easier notes to keep players winning destroys the educational value. Adaptive difficulty must control game challenge (enemy speed, wave density) not musical requirements (the correct note stays correct). Measure learning signal (accuracy per concept) independently from survival signal, and implement learning measurement before difficulty adjustment logic.

6. **Extrinsic reward loops replacing learning** — Points and badges produce impressive short-term engagement but crowd out intrinsic motivation after 2–4 sessions. The design must require genuine musical accuracy to progress — if a player can win by spamming one note, the game has failed.

---

## Implications for Roadmap

The ARCHITECTURE.md research provides a validated 7-phase build dependency chain. Every phase has hard dependencies on the previous one — building out of order requires rework. The suggested phase structure below maps directly to the architecture build order, cross-referenced with feature priorities from FEATURES.md and pitfall prevention windows from PITFALLS.md.

### Phase 1: Audio Pipeline Foundation
**Rationale:** Input detection is the single foundation everything else depends on. The game is unplayable without a working, accurate, low-latency input path. All major technical risks (octave confusion, AudioContext suspension, feedback loops, latency) must be validated and resolved here before any game logic is built. This is the highest-risk phase technically and must be done first, not deferred.
**Delivers:** Working pitch detection via microphone; working MIDI input; unified NoteOn/NoteOff event stream; latency measured and documented; accuracy tested across 88 keys; iOS Safari tested on physical device.
**Addresses:** MIDI input detection (P1), headphone/permission flow UX
**Avoids:** Octave confusion, AudioContext suspension, feedback loop, latency exceeding threshold
**Stack:** Web Audio API, AudioWorklet, SharedArrayBuffer ring buffer, Web MIDI API, pitchy 4.1.0
**Research flag:** HIGH priority for deeper research during planning — AudioWorklet + COOP/COEP headers, SharedArrayBuffer deployment requirements, iOS Safari behavior specifics

### Phase 2: Game Loop and State Machine
**Rationale:** Once input events exist, the game skeleton (loop + state machine) must be in place before any game systems can be wired together. This phase has no novel technical risk — fixed-timestep game loops are well-documented. Build it cleanly to unblock all downstream phases.
**Delivers:** Fixed-timestep 50Hz update loop; GameStateManager FSM (MENU, PLAYING, PAUSED, WAVE_CLEAR, UPGRADE, GAME_OVER); GameEventBus with typed events; state transition wired to display correct screen.
**Addresses:** Pause functionality, basic game flow
**Stack:** Vanilla TypeScript, requestAnimationFrame, Zustand/vanilla for UI state
**Research flag:** Standard pattern — skip phase research, use architecture doc directly

### Phase 3: Grid, Pathfinding, and Rendering Foundation
**Rationale:** The game world (map, paths, visual output) must exist before any entities can inhabit it. FlowField pathfinding must be built with the grid because enemies depend on it from their first spawn. Canvas rendering must be established with OffscreenCanvas tilemap from the start to avoid later performance refactors.
**Delivers:** Grid data structure; FlowField BFS pathfinding (computed once per layout change, O(1) per enemy read); TilemapRenderer with OffscreenCanvas pre-bake; Renderer orchestrator; static playfield visible in browser.
**Addresses:** Enemy path rendering (P1)
**Avoids:** Flow field recomputed every frame anti-pattern; Canvas performance collapse with many enemies
**Stack:** Canvas 2D, OffscreenCanvas
**Research flag:** Standard pattern — Red Blob Games flow field docs are authoritative

### Phase 4: Entity Systems (Core Loop Playable)
**Rationale:** This is the largest phase and the one that makes the game playable for the first time. Entity systems depend on input (Phase 1), game loop (Phase 2), and pathfinding/rendering (Phase 3). Enemy types must start with single notes in C major to validate the core loop at minimum musical complexity before adding harder content.
**Delivers:** EnemyPool with object pooling; WaveManager scheduling 3-5 waves per level; TowerRegistry; CombatSystem with hit detection; ProjectilePool; correct note input kills enemy; wrong input lets enemy advance; lives/HP system; basic HUD; note-level enemy content (single notes, C major).
**Addresses:** Note-level enemies, wave/enemy system, correct/incorrect feedback, lives system with configurable penalty, wave indicator, HUD (all P1)
**Avoids:** Creating/destroying enemy objects per wave (GC pauses); storing game state in reactive framework stores
**Stack:** TypeScript object pools, Zustand/vanilla for HUD state
**Research flag:** Standard tower defense patterns — well-documented; pitfall list covers known failure modes

### Phase 5: Level Progression and Persistence
**Rationale:** Once the core loop is playable, progression and save state unlock the ability to have multiple levels and validate the curriculum structure. localStorage persistence must exist before the skill tree (which depends on it) and before showing the game to external playtesters (they need save state to give meaningful feedback).
**Delivers:** localStorage save/load with versioned schema; level select screen; session persistence for unlocks and high scores; 3-5 levels of increasing difficulty (single notes → intervals → basic chords); virtual keyboard overlay (toggleable).
**Addresses:** Session persistence, level select, 3-5 levels (all P1), virtual keyboard (P1)
**Avoids:** Hardcoded note curriculum without migration path; localStorage schema without version field
**Stack:** JSON.stringify/parse with versioned schema, Zustand/vanilla
**Research flag:** Standard pattern — localStorage limits (5MB) are not a concern at this scope

### Phase 6: Adaptive Difficulty and Skill Tree
**Rationale:** These features require the core loop to be stable and validated first — adaptive difficulty needs real accuracy data to calibrate, and the skill tree needs level completion tracking established in Phase 5. IMPORTANT: implement the learning measurement system (per-concept accuracy tracking) BEFORE implementing difficulty adjustment logic. This is the design pitfall prevention window.
**Delivers:** DifficultyEngine with sliding window accuracy tracking; wave density/timing adjustment (does NOT adjust musical requirements); per-session accuracy stats dashboard; skill tree with 2-3 branching paths; interval enemies and chord enemies (major/minor triads).
**Addresses:** Adaptive difficulty with visible stats (P2), skill tree (P2), accuracy stats (P2), interval enemies (P2), chord enemies (P2)
**Avoids:** Adaptive difficulty masking learning failure; extrinsic rewards replacing intrinsic motivation
**Research flag:** MEDIUM priority for deeper research — adaptive difficulty calibration requires gameplay data; skill tree balance requires content design review

### Phase 7: Audio, Polish, and Ship
**Rationale:** Polish is last because it depends on stable game systems. Pixel art sprites, sound effects, and animation are high iteration-cost and low rework-cost — doing them last means iterating on final stable systems, not re-doing art when systems change.
**Delivers:** Pixel art sprites via SpriteAtlas; animation (enemy defeat, wave transitions); Howler.js sound effects and BGM; complete HUD polish; latency calibration settings UI; headphone requirement first-run UX; permission explanation screen before browser prompt.
**Addresses:** All UX pitfalls (latency calibration, headphone warning, permission flow explanation); game feel and audio completeness
**Avoids:** UX pitfalls (no detected note display, no latency calibration, no permission explanation)
**Stack:** Howler.js 2.2.4, SpriteAtlas pattern, Canvas pixel art (imageSmoothingEnabled = false, image-rendering: pixelated)
**Research flag:** Standard polish patterns — well-documented for Canvas 2D and Howler.js

### Phase Ordering Rationale

- **Input before everything:** Audio pipeline failure cannot be recovered retroactively once game systems are integrated around it. Research confirms this is the highest technical risk and must be the first validated milestone.
- **Architecture before entity systems:** Grid, pathfinding, and rendering must be in place before entities can inhabit the world. Entities wired to a placeholder renderer require rework.
- **Core loop before progression:** Skill trees and adaptive difficulty are meaningless without a validated, fun core loop. External playtest feedback must come before building v1.x features.
- **Learning measurement before difficulty adjustment:** Pitfalls research is explicit — designing the learning signal measurement system after the difficulty adjustment system results in adaptive difficulty that masks failure rather than revealing it.
- **MIDI before microphone:** MIDI eliminates 4 of the 6 critical pitfalls entirely. Ship with MIDI, defer acoustic microphone to v2.

### Research Flags

Phases needing deeper research during planning:
- **Phase 1 (Audio Pipeline):** AudioWorklet deployment requires COOP/COEP HTTP headers (`Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp`) for SharedArrayBuffer. This has hosting implications — verify deployment environment supports these headers. Also: iOS Safari specific AudioContext lifecycle needs hands-on investigation.
- **Phase 6 (Adaptive Difficulty + Skill Tree):** Calibrating what "good difficulty adjustment" means requires gameplay data that does not exist at planning time. Plan for a post-playtesting calibration iteration within this phase.

Phases with standard patterns (skip deep research during planning):
- **Phase 2 (Game Loop):** Fixed-timestep loop patterns are thoroughly documented; architecture research provides working TypeScript implementations.
- **Phase 3 (Grid + FlowField):** Red Blob Games tower defense pathfinding is the authoritative reference; BFS flow field is a solved problem at this grid scale.
- **Phase 4 (Entity Systems):** Object pooling patterns and tower defense entity architecture are standard; pitfall list covers known failure modes.
- **Phase 5 (Persistence):** localStorage save/load is standard; the only nontrivial part is schema versioning, which is covered in architecture research.
- **Phase 7 (Polish):** Canvas pixel art rendering, Howler.js integration, and UX flows are well-documented patterns.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Core Web APIs (Audio, MIDI, Canvas) are HIGH from MDN and official sources. pitchy MPM recommendation is MEDIUM — limited comparative benchmarks for piano specifically; manual prototype validation needed in Phase 1. |
| Features | MEDIUM | Piano learning app features are HIGH (multiple current sources). Tower defense mechanics are MEDIUM. The music+TD intersection is LOW-MEDIUM — novel genre with no direct comparators; MVP feature set is conservative and de-risked. |
| Architecture | HIGH | Web Audio pipeline patterns are HIGH confidence from Chrome Developers and MDN official docs. Canvas 2D + game loop patterns are HIGH from MDN and Red Blob Games. AudioWorklet SharedArrayBuffer ring buffer pattern is HIGH from padenot/ringbuf.js (the canonical reference). |
| Pitfalls | MEDIUM-HIGH | Core technical pitfalls (octave detection, AudioContext suspension, latency) are HIGH confidence from official specs and measured data. Game design pitfalls (extrinsic rewards, adaptive difficulty) are MEDIUM confidence from academic literature + industry postmortems. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Acoustic piano microphone accuracy:** No benchmark exists for pitchy MPM accuracy on a real acoustic piano in a living room environment with ambient noise. This must be measured empirically in Phase 1. If accuracy does not meet the 95% threshold across 88 keys, the microphone path may need to remain v2-only even more definitively.
- **COOP/COEP header support in deployment environment:** SharedArrayBuffer requires specific HTTP headers. If the final hosting environment (GitHub Pages, Netlify, Vercel, etc.) does not support custom headers easily, the AudioWorklet ring buffer pattern may need to fall back to the simpler AnalyserNode polling approach (which adds latency but avoids the header requirement). Verify in Phase 1 before committing to the AudioWorklet architecture.
- **Chord detection feasibility:** FEATURES.md defers acoustic chord detection to v2, and PITFALLS.md confirms polyphonic detection has 100-300ms latency. However, chord validation via MIDI is straightforward (MIDI provides simultaneous note-on events). The gap is: how does the game communicate "play a C major chord" and validate all three notes? This requires content design input not fully covered in research.
- **Content design (musical concept curriculum):** FEATURES.md identifies enemy type definitions as a blocker for most features, and notes that a curriculum document mapping theory progression to difficulty tiers is required. This is not a technical gap but a product design gap — it must be produced before Phase 4 can be completed.
- **Adaptive difficulty calibration parameters:** The sliding window size, accuracy thresholds, and adjustment magnitude for the DifficultyEngine cannot be determined from research alone. They require gameplay data. Plan for a calibration iteration after first playtesting in Phase 4.

---

## Sources

### Primary (HIGH confidence)
- MDN Web Docs — AudioWorklet, Web MIDI API, Canvas 2D, getUserMedia, game loop anatomy
- Chrome Developers — Audio Worklet Design Pattern, SharedArrayBuffer
- Red Blob Games — Flow Field Pathfinding for Tower Defense (canonical reference)
- pitchy GitHub (v4.1.0) — MPM algorithm, piano pitch detection
- padenot/ringbuf.js — Wait-free ring buffer pattern for AudioWorklet
- Vite 7 announcement (vite.dev) — version, Node.js requirements
- JMIR Games 2026 peer-reviewed study — game-based piano learning
- Game Developer postmortem — Defender's Quest tower defense design
- CREPE paper (Kim et al., ICASSP 2018) — pitch detection accuracy benchmarks

### Secondary (MEDIUM confidence)
- Bloons TD 6 (Steam + Fandom Wiki) — tower defense feature baseline
- Synthesia official site + reviews — piano learning app feature baseline
- Simply Piano vs Yousician comparison — music education app feature set
- BadgeUnlock adaptive difficulty retention data — 30% DAU improvement claim (single source)
- Rhythm Game Crash Course (exceed7.com) — engineering guidance from shipped rhythm game
- Improving HTML5 Canvas Performance (web.dev) — Canvas optimization patterns
- Dynamic Difficulty Adjustment design analysis (wayline.io) — adaptive difficulty pitfalls
- JS game rendering benchmark (Shirajuki/js-game-rendering-benchmark)

### Tertiary (LOW confidence — needs validation)
- Tower Defense in 2026 (towersdefense.org) — single source, limited credibility
- Gamified ear training apps (ToneGym review) — secondary analysis, not direct research
- Adaptive difficulty retention statistics — cited statistics need independent verification

---
*Research completed: 2026-02-27*
*Ready for roadmap: yes*

# Pitfalls Research

**Domain:** Browser-based piano-controlled tower defense game with acoustic pitch detection
**Researched:** 2026-02-27
**Confidence:** MEDIUM (core Web Audio pitfalls HIGH from official sources; game design pitfalls MEDIUM from multiple credible sources; music education pitfalls MEDIUM from academic literature)

---

## Critical Pitfalls

### Pitfall 1: Octave Confusion in Piano Pitch Detection

**What goes wrong:**
The autocorrelation and FFT-based pitch detection algorithms commonly used in the browser confuse a piano note with notes one or two octaves away. A piano's harmonic spectrum is rich — the fundamental frequency (f0) can be weaker than the 2nd or 3rd harmonic. The algorithm detects the dominant harmonic instead of f0, causing the game to register "C5" when the player played "C4". This is especially severe on low notes (A0–C3) where the fundamental sits at 27–130 Hz and the partials dominate the signal.

**Why it happens:**
Standard autocorrelation finds the strongest periodic repetition in the waveform. Piano harmonics at 2×f0 and 3×f0 create periodicities that score higher than the true fundamental when the fundamental is attenuated (as is typical for bass piano strings). The algorithm has no "instrument model" — it just finds periodicity.

**How to avoid:**
- Use a library that implements pYIN or the YIN algorithm with harmonic weighting rather than naive autocorrelation. pYIN is specifically designed to handle the missing-fundamental problem.
- Constrain the detection range. Pianuki only needs to detect piano pitches (A0–C8 = 27.5–4186 Hz). Reject detections outside this range immediately.
- Add octave disambiguation logic: if the detector switches between C4 and C5 rapidly, smooth by biasing toward the note that is closer to the previously confirmed note.
- Build a prototype measuring actual detection accuracy on an acoustic piano in week one (not "it seems to work" — quantify the octave error rate).

**Warning signs:**
- During prototyping, notes in the bass octave (A0–E2) register as an octave higher than played.
- The detected note "flickers" between two octaves of the same pitch class.
- High-note attacks (C6+) get confused with their 2nd harmonic.

**Phase to address:**
Phase 1 (Core Pitch Detection prototype). Do not proceed to game integration until octave error rate is below 5% on a real acoustic piano across the full 88-key range.

---

### Pitfall 2: AudioContext Suspended on Page Load (Autoplay Policy)

**What goes wrong:**
Chrome, Firefox, and Safari all block AudioContext from running until a user gesture occurs. On mobile browsers (especially iOS Safari), the AudioContext silently enters a `suspended` state the moment the page loads. Microphone capture via `getUserMedia` is separate from AudioContext state — you can get audio data without the context running, but analysis via AnalyserNode or AudioWorklet will silently produce no output. The game appears to work but detects nothing.

**Why it happens:**
Browser autoplay policies prevent audio from being created before user interaction. On iOS, this restriction extends to AudioContext itself (not just audio playback). Developers test on desktop Chrome (which may auto-resume the context) and miss the iOS failure until much later.

**How to avoid:**
- Always resume AudioContext inside a user-initiated event handler:
  ```javascript
  document.addEventListener('click', async () => {
    if (audioCtx.state === 'suspended') await audioCtx.resume();
  });
  ```
- Design the "Start Game" button to both resume AudioContext AND request microphone permission in a single user gesture — two-step flows (resume context on click, then getUserMedia on another click) are fragile on iOS.
- Test on physical iOS Safari in week one. This is not fixable by polyfill.
- Handle the `interrupted` state (iOS-specific) by listening to `statechange` events and re-resuming.

**Warning signs:**
- Game works perfectly on desktop but produces no pitch detection on iPhone.
- `audioCtx.state` logs as `suspended` after `getUserMedia` succeeds.
- AnalyserNode `getFloatTimeDomainData` returns all zeros.

**Phase to address:**
Phase 1 (Core Pitch Detection prototype). Write an explicit AudioContext state machine before any other audio code.

---

### Pitfall 3: Microphone Feedback Loop Destroying the Signal

**What goes wrong:**
If the game plays audio through speakers (sound effects, background music) while capturing from the microphone, the microphone picks up the game audio. This creates two problems: (1) the pitch detector may lock onto game audio frequencies instead of piano notes, and (2) on some setups it creates runaway feedback. This is especially severe in living room setups where the acoustic piano and speakers share a room.

**Why it happens:**
The target user is playing an acoustic piano — they are not wearing headphones (acoustic piano sounds much better in the open). Game audio played through speakers bleeds into the microphone. Developers test with headphones on and never discover this.

**How to avoid:**
- Use headphones for all game audio output. Make this a mandatory first-run requirement, not an optional recommendation.
- Alternatively, detect when the captured signal contains the same frequency content as audio being played (acoustic echo cancellation). Web Audio API does not provide AEC natively.
- Reduce game sound effect amplitude to the minimum needed for game feel, and favor mid-range frequencies (500–2000 Hz) that are less likely to be confused with piano fundamentals.
- Consider a "piano only" mode where game is played silent with visual feedback only.

**Warning signs:**
- Pitch detector fires correctly during silence but produces erratic output when game plays sound effects.
- Detected notes correlate with game audio frequencies rather than piano keys.
- Users report the game "thinks they're playing notes" even with hands off the keyboard.

**Phase to address:**
Phase 1 (Core Pitch Detection prototype) and Phase 2 (Game Integration). Add a feedback rejection test case to the pitch detection QA checklist.

---

### Pitfall 4: Detection Latency Exceeding the Game Feel Threshold

**What goes wrong:**
The pipeline from "piano key hits string" to "enemy takes damage on screen" has many latency stages that compound: microphone hardware latency (~5–20ms) + AudioWorklet buffer size (~3–10ms) + pitch algorithm computation (~10–50ms per frame) + game state update (~16ms at 60fps) + rendering (~16ms). Total round-trip latency can reach 50–120ms. At 100ms, players feel the game is "not responding to their playing." At 150ms+, the game becomes genuinely unplayable for fast passages.

**Why it happens:**
Each stage seems acceptable in isolation. Developers measure only algorithm speed, not end-to-end latency. The pitch algorithm runs fast, but the AnalyserNode is polled once per animation frame (16ms), adding up to 32ms of quantization jitter alone.

**How to avoid:**
- Use AudioWorklet (not ScriptProcessorNode, which is deprecated) to process audio on a dedicated thread with minimum buffer sizes.
- Poll the AnalyserNode at audio rate (inside AudioWorklet) rather than at animation frame rate (inside requestAnimationFrame).
- Set `latencyHint: 'interactive'` when constructing AudioContext.
- Measure total pipeline latency explicitly: use a sharp transient (a click sound played on the piano) and measure frames between input and detection in logs.
- Target <80ms end-to-end. If you cannot achieve this with acoustic microphone, consider allowing MIDI input as a lower-latency fallback path.
- Build in a user-adjustable latency compensation offset (like every commercial rhythm game ships).

**Warning signs:**
- Playing fast 16th notes at 120 BPM (125ms per note) — if the game misses notes, latency is too high.
- The game registers notes 1–2 enemies behind where the player "felt" they attacked.
- Users describe the game as "laggy" or "not responsive" despite consistent 60 FPS visual rendering.

**Phase to address:**
Phase 1 (Core Pitch Detection prototype). Latency must be measured and documented before game integration. Cannot be fixed retroactively without major architectural changes.

---

### Pitfall 5: Treating Extrinsic Rewards as Learning Motivation

**What goes wrong:**
The game showers the player with points, coins, level-ups, and badges for playing. Players engage with the reward loop, not the piano. When the rewards stop being novel (typically after 2–4 sessions), engagement collapses. Worse: if the adaptive difficulty reduces challenge to keep players succeeding, it removes the real learning signal — players feel the game is "too easy" and stop believing it is helping them improve. This is the dominant failure mode in music education games.

**Why it happens:**
Extrinsic reward systems are easy to implement and produce impressive short-term engagement metrics. Academic literature consistently shows this pattern: intrinsic motivation (genuine skill improvement) is crowded out by extrinsic rewards. Developers optimize for DAU/session length, which extrinsic rewards do inflate — but the underlying learning is hollow.

**How to avoid:**
- Make skill mastery visible: show the player which notes they play accurately, which they miss, and track improvement over time. The progress graph IS the reward.
- Design game challenges that require genuinely playing specific notes, not just "make a sound." The game should feel unplayable if you cannot play the required notes.
- Avoid pure point accumulation. Points are acceptable as feedback (scored this many enemies), but progression should gate on demonstrated skill (can you play C major scale?), not points.
- The tower defense framing must tie directly to musical skill. If players can win by button-mashing or playing the same 3 notes, the educational value is zero.

**Warning signs:**
- Playtesters say "I love the game!" but cannot identify any new piano notes after 5 sessions.
- Players gravitate to a single "favorite note" and spam it.
- Removing rewards from the game makes it immediately uninteresting (indicates zero intrinsic engagement with the piano challenge itself).

**Phase to address:**
Phase 2 (Game Integration) and Phase 3 (Adaptive Difficulty). Requires explicit game design reviews — not just implementation.

---

### Pitfall 6: Adaptive Difficulty That Masks Learning Failure

**What goes wrong:**
The adaptive system detects that the player is struggling (losing health, missing notes) and responds by slowing enemies, making hitboxes larger, or accepting notes with lower accuracy. The player continues to "win" sessions but does not improve. The game's feedback loop tells them they are succeeding, while the actual signal (cannot play the notes being asked) is suppressed. This is the learning equivalent of rubber-band AI in racing games.

**Why it happens:**
Adaptive difficulty is designed around the question "is the player winning?" not "is the player learning?" These are different questions. A player can win by playing notes they already know while failing to learn new ones. The DDA system sees "player survived" and does not reduce difficulty — but the player never had to practice the new note.

**How to avoid:**
- Measure learning signal separately from survival signal. Track: (1) did the player play the requested note? (2) did the player improve accuracy on previously-struggled notes?
- Difficulty should control the GAME CHALLENGE (enemy speed, wave density), not the MUSICAL REQUIREMENT. The note being asked must remain the correct note even when the game is easy.
- Provide transparency: tell the player "enemies are slower this wave to give you time to find the note." Do not hide that difficulty was adjusted.
- Add a deliberate "no free wins" constraint: at least some waves should require genuine musical accuracy regardless of difficulty level.

**Warning signs:**
- Players consistently pass waves but note accuracy metrics show they are guessing (accuracy around 50%).
- Players report the game feels "easy" even at the highest difficulty setting.
- No correlation between session count and note accuracy improvement across players.

**Phase to address:**
Phase 3 (Adaptive Difficulty). Design the learning measurement system before the difficulty adjustment system, not after.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Naive autocorrelation (no pYIN) | 30 minutes to implement | Octave errors, instability on piano | Never — measure accuracy on day 1 |
| Polling AnalyserNode in requestAnimationFrame | Simplest code path | Adds 16–32ms quantization jitter, unpredictable timing | Never for pitch detection — use AudioWorklet |
| ScriptProcessorNode instead of AudioWorklet | Works in all browsers | Deprecated, runs on main thread, blocks UI | MVP only with explicit migration plan |
| Skip latency calibration UI | Saves 1–2 days of dev | Game feels broken on any hardware with non-standard latency | Never — every rhythm/music game needs this |
| Hardcode note curriculum | Saves design time | Cannot adapt, cannot support full 88 keys easily | MVP only, with data-driven system planned |
| Canvas 2D rendering without offscreen canvas | Straightforward code | Performance collapse with 50+ enemies on screen | Early prototype only |
| Single AudioContext for both game audio and mic analysis | Simpler setup | Context state changes (suspend/resume) affect both | Never — use separate contexts or careful state management |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| getUserMedia + AudioContext | Calling both independently without synchronizing their lifecycle | Resume AudioContext in same user gesture that initiates getUserMedia; treat them as one atomic operation |
| Phaser.js + Web Audio API mic input | Using Phaser's built-in audio system for microphone analysis (it doesn't support this) | Bypass Phaser audio for mic input; use raw Web Audio API nodes alongside Phaser |
| AudioWorklet in Firefox | Importing WASM bindings from inside AudioWorklet (not supported in Firefox) | Keep WASM in main thread, pass processed data via SharedArrayBuffer or MessagePort |
| iOS Safari AudioContext | Context starts suspended even after getUserMedia permission granted | Explicitly call `audioCtx.resume()` inside first touch/click handler after context creation |
| MIDI as fallback | Assuming Web MIDI API works without a flag on some browsers | Feature-detect; Web MIDI requires HTTPS and a browser extension on some platforms (Firefox needs jazz-plugin or similar) |
| Cross-origin iframes | Embedding game in iframe (CMS, portfolio) kills microphone access | Require `allow="microphone"` attribute; document this as deployment requirement |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Clearing full canvas every frame with many entities | Frame rate drops below 60 FPS with 30+ enemies | Dirty-rect rendering or layer separation (background, entities, UI on separate canvases) | ~30–50 enemies on screen simultaneously |
| Allocating Float32Array inside AudioWorklet every process() call | Audio glitches, crackles, garbage collection pauses mid-detection | Pre-allocate all buffers at AudioWorklet construction time; reuse them | Every audio frame (~3ms) — GC can trigger at any frame |
| Running pitch detection synchronously on main thread | UI jank during detection, frame drops | Move pitch detection to AudioWorklet or Web Worker | On any slow device; immediately on mobile |
| Using shadow effects on Canvas sprites | 10–30% performance penalty per shadow | Pre-render shadows to offscreen canvas sprites; never use `shadowBlur` per-frame | Any time it is used in game loop |
| Enemy pathfinding computed every frame for every enemy | CPU bottleneck, frame rate drops | Compute path once per wave per enemy type; cache path nodes; update only when path changes | 20+ enemies with non-trivial path recalculation |
| WebGL/PixiJS ignored in favor of plain Canvas | Acceptable for <50 sprites, degrades for 100+ | Use PixiJS (WebGL-backed) for the renderer from the start; Canvas 2D cannot match WebGL sprite throughput | 100+ simultaneous sprite renders |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No visual feedback of which note was detected | Player cannot tell if the game heard them; confusion about why attacks did or did not fire | Always show detected note in a persistent UI element; flash it on detection |
| No latency calibration setting | Game feels broken on any hardware not matching developer's setup | Ship latency offset slider in settings from the start; auto-calibrate on first launch |
| Requiring microphone permission before explaining why | Users deny permission out of suspicion, then cannot use the game | Show an explanation screen ("Your microphone lets your piano control the game") before the browser prompt appears |
| Demanding perfect note accuracy from session one | Beginners cannot play the required notes and never get to experience the tower defense | Curriculum must start from notes beginners know (or can find easily); difficulty 1 = 3 notes in C major |
| Long waves with no feedback on note progress | Player does not know if they are hitting the right notes until enemies die (too late) | Show hit indicator on every note detection event, not just on enemy damage |
| No pause during wave | Players need to look at their hands (they are beginners); forced into awkward moments | Allow pause at any time; tower defense games are strategic, not reflex-based per the Defender's Quest research |
| Game audio through speakers bleeding into microphone | Pitch detection goes haywire; game feels broken | Show headphones-required message on first launch; make this a hard requirement, not a recommendation |

---

## "Looks Done But Isn't" Checklist

- [ ] **Pitch detection**: Works on developer's microphone close-range — verify at 1–3 meter distance from piano strings, with background noise present
- [ ] **Octave accuracy**: Reports 95%+ accuracy on notes across the full 88-key range — verify with an automated sweep test, not manual spot-checking
- [ ] **iOS Safari**: Microphone + AudioContext pipeline working — verify on physical iPhone, not browser emulation
- [ ] **Feedback loop**: Game audio not contaminating detection signal — verify by playing a loud sound effect during note detection and checking accuracy holds
- [ ] **Latency**: End-to-end latency measured and documented — verify with actual timing measurement, not "feels fast"
- [ ] **Permission flow**: User sees an explanation before the browser permission prompt — verify the explanation appears correctly on fresh profile with no prior permission state
- [ ] **Headphone requirement**: Clearly communicated before game starts — verify a first-time user knows before they begin playing
- [ ] **Adaptive difficulty transparency**: Player knows when difficulty changed — verify by watching session without any UI indicators and asking tester if they noticed adjustments
- [ ] **Learning measurement separate from survival**: Verify that a player can win a session without playing any correct notes by using only their "favorite" note
- [ ] **Canvas performance**: Verify FPS with maximum enemy count on-screen using a mid-range mobile device (not developer's machine)

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Octave confusion discovered after game integration | HIGH | Swap pitch algorithm (drop-in if abstracted); re-measure accuracy; may require curriculum redesign if notes were chosen assuming correct octave detection |
| Latency too high, discovered after game integration | HIGH | Add MIDI input fallback path; add latency compensation offset; may need AudioWorklet refactor if polling was on animation frame |
| Feedback loop destroyed mic signal | MEDIUM | Add mandatory headphones warning; add simple audio-level gate to reject detection during game audio playback |
| AudioContext suspended on iOS | LOW | Add `resume()` call to user gesture handler; 1–2 hour fix if codebase is modular |
| Extrinsic reward loop without learning | HIGH | Requires game design rework; cannot be fixed by code changes alone; need to redesign wave challenge requirements |
| Canvas 2D performance collapse | MEDIUM | Migrate renderer to PixiJS; requires sprite system refactor but not game logic changes |
| Adaptive difficulty masking learning failure | HIGH | Requires designing a separate learning measurement system; affects game state, analytics, and progression design |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Octave confusion | Phase 1: Pitch Detection Prototype | Automated accuracy test across 88 keys; error rate <5% before proceeding |
| AudioContext suspended (mobile/iOS) | Phase 1: Pitch Detection Prototype | Manual test on physical iPhone Safari before game integration begins |
| Microphone feedback loop | Phase 1 + Phase 2: Game Integration | Play test with speakers, measure detection accuracy; must hold above 90% |
| Detection latency | Phase 1: Pitch Detection Prototype | End-to-end timing measurement; document achieved ms before integration |
| Extrinsic rewards replacing learning | Phase 2: Game Design | Design review: can a player win without learning new notes? |
| Adaptive difficulty hiding failure | Phase 3: Adaptive Difficulty | Verify learning metrics are implemented before difficulty adjustment logic |
| Canvas performance with many enemies | Phase 2: Game Integration | Benchmark with maximum enemy count on mid-range device; use PixiJS if Canvas 2D fails |
| Permission flow UX | Phase 1: Pitch Detection Prototype | First-run UX test with user unfamiliar to the project |
| Game audio bleeding into mic | Phase 2: Game Integration | Audio-contamination test case in QA checklist |
| Missing latency calibration UI | Phase 2: Game Integration | Ship with latency offset slider before any external playtest |

---

## Sources

- [Detecting pitch with the Web Audio API and autocorrelation — alexanderell.is](https://alexanderell.is/posts/tuner/) — HIGH confidence, authored analysis of autocorrelation limitations with musical instruments
- [AudioWorklet is a real world disaster — WebAudio/web-audio-api Issue #2632](https://github.com/WebAudio/web-audio-api/issues/2632) — HIGH confidence, official Web Audio API spec repo, developer-reported AudioWorklet failures
- [MDN: MediaDevices getUserMedia()](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) — HIGH confidence, official documentation
- [Common getUserMedia() Errors — addpipe.com](https://blog.addpipe.com/common-getusermedia-errors/) — MEDIUM confidence, comprehensive error taxonomy with cross-browser notes
- [AudioWorklet Latency: Firefox vs Chrome — jefftk.com](https://www.jefftk.com/p/audioworklet-latency-firefox-vs-chrome) — MEDIUM confidence, measured data on browser latency differences
- [Rhythm Game Crash Course — Native Audio / exceed7.com](https://exceed7.com/native-audio/rhythm-game-crash-course/index.html) — HIGH confidence, practical engineering guide from a shipped rhythm game developer
- [Optimizing Tower Defense for FOCUS and THINKING — Defender's Quest — Game Developer](https://www.gamedeveloper.com/design/optimizing-tower-defense-for-focus-and-thinking---defender-s-quest) — HIGH confidence, postmortem from shipped tower defense game
- [Improving HTML5 Canvas performance — web.dev](https://web.dev/canvas-performance/) — HIGH confidence, official Google developer documentation
- [Dynamic Difficulty Adjustment: The Participation Trophy of Game Design — wayline.io](https://www.wayline.io/blog/dynamic-difficulty-adjustment-participation-trophy) — MEDIUM confidence, cited alongside peer-reviewed research
- [Game Difficulty Balancing: Adaptive Difficulty and Its Effect on Player Experience — Preprints.org](https://www.preprints.org/manuscript/202511.2251) — MEDIUM confidence, academic preprint Nov 2025
- [Gamifying Music Curriculum — numberanalytics.com](https://www.numberanalytics.com/blog/gamifying-music-curriculum) — MEDIUM confidence, synthesis of music education research
- [The Gamification of Musical Learning — pianodao.com](https://pianodao.com/2022/08/11/the-gamification-of-musical-learning/) — MEDIUM confidence, critical analysis of extrinsic reward failures in music games
- [CREPE: A Convolutional Representation for Pitch Estimation — Kim et al. ICASSP 2018](https://www.justinsalamon.com/uploads/4/3/9/4/4394963/kim_crepe_icassp_2018.pdf) — HIGH confidence, peer-reviewed, establishes piano pitch detection accuracy benchmarks
- [Autoplay restrictions and WebRTC — webrtcHacks](https://webrtchacks.com/autoplay-restrictions-and-webrtc/) — MEDIUM confidence, detailed analysis of browser autoplay policies
- [Context stuck in suspended state on iOS — WebAudio/web-audio-api Issue #790](https://github.com/WebAudio/web-audio-api/issues/790) — HIGH confidence, official spec repo, confirmed iOS Safari behavior

---
*Pitfalls research for: Pianuki — piano-controlled browser tower defense game*
*Researched: 2026-02-27*

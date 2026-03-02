# Requirements: Pianuki

**Defined:** 2026-02-27
**Core Value:** A piano learner can sit at their real piano, start the game in a browser, and progressively learn music theory — from single note positions to intervals — by playing through increasingly challenging tower defense waves that feel like a game, not a lesson.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Audio Input

- [x] **AINP-01**: Player can use acoustic piano via microphone for single note detection (Web Audio API pitch detection)
- [x] **AINP-02**: Player can use MIDI keyboard as secondary input method (Web MIDI API)
- [x] **AINP-03**: Both input methods produce unified NoteOn/NoteOff events to the game
- [ ] **AINP-04**: Player sees a headphone requirement screen on first launch before gameplay
- [ ] **AINP-05**: Player sees an explanation of why microphone access is needed before the browser permission prompt
- [ ] **AINP-06**: Player can adjust latency offset via slider in settings
- [x] **AINP-07**: Detected note is always visible on screen during gameplay

### Game Core

- [x] **GAME-01**: Enemies walk along a visible path toward a goal
- [x] **GAME-02**: Playing the correct note/interval attacks the corresponding enemy
- [x] **GAME-03**: Enemies spawn in waves (3-5 waves per level)
- [x] **GAME-04**: Player has a lives/HP system — enemies reaching the goal reduce HP
- [x] **GAME-05**: HUD displays current HP, wave counter, and detected note
- [x] **GAME-06**: Player can pause and resume at any time during gameplay
- [x] **GAME-07**: Game over screen appears when HP reaches zero with option to restart or return to menu
- [x] **GAME-08**: Enemy plays a defeat animation when killed by correct input
- [x] **GAME-09**: Wave-clear screen appears between waves for upgrades/choices

### Musical Content

- [x] **MUSC-01**: Note-level enemies represent single notes (starting with C major scale)
- [x] **MUSC-02**: Each enemy visually displays the note/interval it represents
- [x] **MUSC-03**: Levels progress from fewer notes to more notes across the keyboard
- [x] **MUSC-04**: Interval enemies represent 2-note intervals (thirds, fourths, fifths, etc.)
- [x] **MUSC-05**: Interval enemies require player to play both notes of the interval to defeat

### Progression

- [x] **PROG-01**: Player progress (completed levels, scores) persists via localStorage
- [ ] **PROG-02**: Player can select any unlocked level from a level select screen
- [ ] **PROG-03**: Levels unlock sequentially as previous levels are completed
- [x] **PROG-04**: 3-5 levels of increasing difficulty available at launch

### UI / Visual

- [x] **UIVS-02**: Basic HUD displays health, wave count, and currently detected note
- [x] **UIVS-03**: Visual feedback on correct input (enemy damage/removal effect)
- [x] **UIVS-04**: Visual feedback on incorrect input (distinct from correct feedback)

### Player Settings

- [ ] **SETT-01**: Player can configure mistake penalty mode (damage to HP / enemy advances / no penalty)
- [ ] **SETT-02**: Player can see their accuracy and reaction time stats during/after gameplay
- [x] **SETT-03**: Settings persist across sessions via localStorage

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Musical Content

- **MUSC-06**: Chord enemies represent major/minor triads requiring full chord to defeat
- **MUSC-07**: Scale enemies require playing a full scale in sequence
- **MUSC-08**: Progression enemies require harmonic progressions (I-IV-V-I)
- **MUSC-09**: Real song fragments as boss fight levels

### Progression

- **PROG-05**: Skill tree with 2-3 branching paths (chord-focused vs scale-focused)
- **PROG-06**: Per-session accuracy stats dashboard with per-concept breakdown

### Adaptive Difficulty

- **DIFF-01**: Adaptive difficulty engine adjusts game challenge based on player accuracy
- **DIFF-02**: Difficulty transparency — player informed when system adjusts ("slowing down because your accuracy is 40%")

### UI / Visual

- **UIVS-01**: Game uses pixel art / retro visual style (deferred from v1)
- **UIVS-05**: Toggle-able virtual piano keyboard on screen
- **UIVS-06**: Per-concept accuracy display in-game

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Song-based content (play Beethoven) | Conflicts with theory learning goal; licensing complexity |
| Mobile / tablet support | Web MIDI API unusable on mobile; acoustic piano is desktop peripheral |
| Computer keyboard as input | Core vision is playing a real instrument |
| Multiplayer / co-op | Requires backend infrastructure; doubles scope |
| User accounts / server auth | localStorage sufficient for v1 |
| Real-time sheet music display | Separate rendering subsystem (VexFlow); distraction from game canvas |
| AI-generated curriculum | Engineering-heavy, opaque, hard to validate; hand-authored levels suffice |
| In-app MIDI file import | Different product goal entirely |
| Acoustic chord detection via mic | Polyphonic browser detection has 100-300ms latency; defer to v2+ |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AINP-01 | Phase 1 | Complete |
| AINP-02 | Phase 1 | Complete |
| AINP-03 | Phase 1 | Complete |
| AINP-04 | Phase 4 | Pending |
| AINP-05 | Phase 4 | Pending |
| AINP-06 | Phase 4 | Pending |
| AINP-07 | Phase 2 | Complete |
| GAME-01 | Phase 2 | Complete |
| GAME-02 | Phase 2 | Complete |
| GAME-03 | Phase 2 | Complete |
| GAME-04 | Phase 2 | Complete |
| GAME-05 | Phase 2 | Complete |
| GAME-06 | Phase 2 | Complete |
| GAME-07 | Phase 2 | Complete |
| GAME-08 | Phase 2 | Complete |
| GAME-09 | Phase 2 | Complete |
| MUSC-01 | Phase 2 | Complete |
| MUSC-02 | Phase 2 | Complete |
| MUSC-03 | Phase 2 | Complete |
| MUSC-04 | Phase 2 | Complete |
| MUSC-05 | Phase 2 | Complete |
| PROG-01 | Phase 3 | Complete |
| PROG-02 | Phase 3 | Pending |
| PROG-03 | Phase 3 | Pending |
| PROG-04 | Phase 3 | Complete |
| UIVS-01 | v2 | Deferred |
| UIVS-02 | Phase 2 | Complete |
| UIVS-03 | Phase 2 | Complete |
| UIVS-04 | Phase 2 | Complete |
| SETT-01 | Phase 3 | Pending |
| SETT-02 | Phase 3 | Pending |
| SETT-03 | Phase 3 | Complete |

**Coverage:**
- v1 requirements: 31 total
- Mapped to phases: 31
- Unmapped: 0 ✓
- Deferred to v2: 1 (UIVS-01)

---
*Requirements defined: 2026-02-27*
*Last updated: 2026-02-27 after roadmap creation*

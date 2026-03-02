# Roadmap: Pianuki

## Overview

Four phases build from nothing to a shippable piano tower defense game. Phase 1 proves the audio pipeline and lays the technical foundation — the single highest-risk item in the project. Phase 2 assembles a playable core loop: enemies walk, the player plays notes, things die. Phase 3 completes the game with progression, persistence, and settings. Phase 4 polishes the first-run experience and ships.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Audio pipeline proven, game scaffold in place, static world renders
- [x] **Phase 2: Core Loop** - Enemies walk, notes kill them, waves complete — game is playable
- [ ] **Phase 3: Complete Game** - Progression, persistence, and settings make it a full product
- [ ] **Phase 4: UX Polish** - First-run flows, latency calibration, and stats make it shippable

## Phase Details

### Phase 1: Foundation
**Goal**: The audio input pipeline works accurately, the game scaffold is in place, and a static game world renders in the browser
**Depends on**: Nothing (first phase)
**Requirements**: AINP-01, AINP-02, AINP-03
**Success Criteria** (what must be TRUE):
  1. Player can play any note on acoustic piano via microphone and see the detected note name appear on screen with <100ms visible response
  2. Player can plug in a MIDI keyboard and notes are detected immediately without configuration
  3. Both acoustic and MIDI inputs produce the same NoteOn/NoteOff events (verified by a debug display showing unified events)
  4. Game canvas renders with placeholder visuals (colored shapes for path, basic background) in a Chrome browser at target resolution
**Plans:** 3/3 plans executed
Plans:
- [x] 01-01-PLAN.md — React+Vite scaffold, Zustand store with InputEvent types, three-panel layout (game canvas with L-shape path, 88-key keyboard strip, dev-only debug panel), Tailwind v4, all dependencies
- [x] 01-02-PLAN.md — MIDI input hook (Web MIDI API) + microphone pitch detection hook (pitchy + AnalyserNode), unified NoteOn/NoteOff dispatch to Zustand store, mic activation button
- [x] 01-03-PLAN.md — Human verification checkpoint (verify audio pipeline and game scaffold with real hardware)

### Phase 2: Core Loop
**Goal**: The game is playable end-to-end — enemies walk the path, the player plays correct notes to defeat them, waves spawn and complete, and the HUD keeps the player oriented
**Depends on**: Phase 1
**Requirements**: GAME-01, GAME-02, GAME-03, GAME-04, GAME-05, GAME-06, GAME-07, GAME-08, GAME-09, MUSC-01, MUSC-02, MUSC-03, MUSC-04, MUSC-05, UIVS-02, UIVS-03, UIVS-04, AINP-07
**Success Criteria** (what must be TRUE):
  1. Player can start a level and see enemies labeled with note names walking along a visible path toward a goal
  2. Playing the correct note on the piano causes the corresponding enemy to take damage and show visual feedback when defeated
  3. Playing an incorrect note produces a distinct visual effect different from a correct hit
  4. Player survives or loses HP across 3-5 waves per level, with a wave-clear screen appearing between waves
  5. Player can pause and resume gameplay at any time; game over screen appears when HP reaches zero with restart and menu options
**Plans:** 4/4 plans executed
Plans:
- [x] 02-01-PLAN.md — Game state engine: GameSlice expansion, enemy types, wave configs, note matching
- [x] 02-02-PLAN.md — Game loop + canvas rendering: fixed-timestep update, enemy movement, HUD, visual feedback
- [x] 02-03-PLAN.md — UI overlays + controls: start/pause/gameover/wave-clear screens, ESC key handler
- [x] 02-04-PLAN.md — Human verification checkpoint (verified + fixed immer MapSet + tuned mic thresholds)

### Phase 3: Complete Game
**Goal**: The game has persistent progression across sessions — player can select levels, complete them to unlock the next, and configure gameplay to their preferences
**Depends on**: Phase 2
**Requirements**: PROG-01, PROG-02, PROG-03, PROG-04, SETT-01, SETT-02, SETT-03
**Success Criteria** (what must be TRUE):
  1. Player can complete a level and return later to find their progress (completed levels, scores) saved without any sign-in
  2. Player can select any previously completed level from a level select screen and replay it
  3. 3-5 levels of increasing difficulty are available at launch, unlocking sequentially as the player progresses
  4. Player can choose their mistake penalty mode (HP damage / enemy advances / no penalty) and see that setting persist across sessions
  5. Player can view their accuracy and reaction time stats during or after gameplay
**Plans:** 4/5 plans executed
Plans:
- [ ] 03-01-PLAN.md — Store expansion (persist + ProgressSlice + SettingsSlice + currentScreen) + level/enemy/stats data layer
- [ ] 03-02-PLAN.md — Game loop penalty mode + stats tracking + AppShell multi-screen navigation
- [ ] 03-03-PLAN.md — Level Select screen (path/map layout) + Level Summary overlay (end-of-level results)
- [ ] 03-04-PLAN.md — Settings panel (penalty mode + input source) + Stats screen + star animation CSS
- [ ] 03-05-PLAN.md — Human verification checkpoint (verify all Phase 3 features end-to-end)

### Phase 4: UX Polish
**Goal**: The first-run experience is complete and trustworthy — players understand why microphone access is needed, headphones are required, latency is calibrated, and the game feels shippable
**Depends on**: Phase 3
**Requirements**: AINP-04, AINP-05, AINP-06
**Success Criteria** (what must be TRUE):
  1. New player sees a headphone requirement screen before any gameplay begins, with a clear explanation of why headphones are mandatory
  2. Player sees an explanation of why microphone access is needed before the browser permission prompt appears (not after)
  3. Player can adjust a latency offset slider in settings and observe the change in responsiveness during play
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete | 2026-03-01 |
| 2. Core Loop | 4/4 | Complete | 2026-03-02 |
| 3. Complete Game | 4/5 | In Progress|  |
| 4. UX Polish | 0/TBD | Not started | - |

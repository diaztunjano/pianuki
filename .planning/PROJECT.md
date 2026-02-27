# Pianuki

## What This Is

Pianuki is a web-based tower defense survival game where the player's real acoustic piano (or MIDI keyboard) is the controller. Enemies representing musical concepts — notes, intervals, chords, scales, progressions — advance along a path, and the player defeats them by playing the correct musical elements on their instrument. The game's true purpose is pedagogical: building muscle memory, teaching theory, and developing sight-reading skills through engaging gameplay.

## Core Value

A piano learner can sit at their real piano, start the game in a browser, and progressively learn music theory — from single note positions to complex chord progressions — by playing through increasingly challenging tower defense waves that feel like a game, not a lesson.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Acoustic piano input via microphone pitch detection (Web Audio API)
- [ ] MIDI keyboard input as secondary option (Web MIDI API)
- [ ] Top-down tower defense gameplay with enemy waves on a path
- [ ] Enemies labeled with musical concepts (notes, intervals, chords, scales)
- [ ] Playing correct note/chord = direct attack on corresponding enemy
- [ ] Pixel art / retro visual style
- [ ] Skill tree progression with branching paths (notes → intervals → chords → scales → progressions)
- [ ] Adaptive difficulty engine that adjusts based on player accuracy and reaction time
- [ ] Visible player stats (accuracy, speed, adaptation feedback)
- [ ] Configurable mistake penalties (damage, enemy advance, or missed opportunity)
- [ ] Toggle-able virtual piano keyboard on screen
- [ ] Local save via localStorage (progress, unlocked skill tree nodes)
- [ ] Multiple levels of increasing theory difficulty forming a playable loop

### Out of Scope

- Real song fragments as levels — complexity and licensing; defer to v2
- User accounts / server-side persistence — localStorage sufficient for v1
- Mobile / tablet support — desktop only, acoustic piano is the primary input
- Computer keyboard as input — this is about playing a real instrument
- Multiplayer — single player experience for v1
- Tower placement mechanics — notes are direct attacks, not tower builders

## Context

- Primary input is acoustic piano captured via the device microphone, processed through Web Audio API for pitch detection. This is the core technical challenge — real-time, accurate frequency detection in a browser environment.
- MIDI input via Web MIDI API serves as a secondary, more precise input method for players with digital keyboards.
- The game must feel responsive — latency between playing a note and seeing the attack on screen must be minimal for the gameplay to feel satisfying.
- Pixel art style chosen for achievability and lightweight rendering — Canvas-based rendering is the likely approach.
- The pedagogical model follows a skill tree rather than a fixed curriculum, allowing players at different levels to choose their learning path.
- The adaptive difficulty system should show its work — players see their stats and can observe how the game adjusts, making the learning transparent.

## Constraints

- **Platform**: Desktop browsers only (Chrome primary target for Web Audio API and Web MIDI API support)
- **Input latency**: Pitch detection must be fast enough for real-time gameplay (<100ms response)
- **No backend**: v1 is fully client-side. No server, no accounts, no database.
- **Rendering**: Lightweight engine (Canvas 2D) — pixel art doesn't need WebGL
- **Audio**: Must handle ambient noise gracefully — pitch detection in real-world room conditions

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Acoustic piano via mic as primary input | The whole point is playing a real instrument, not pressing computer keys | — Pending |
| Pixel art / retro aesthetic | Achievable scope, lightweight rendering, charming feel | — Pending |
| Skill tree over linear curriculum | Different players at different levels; branching respects diverse learning paths | — Pending |
| Configurable mistake penalties | Different learners benefit from different feedback models | — Pending |
| localStorage over accounts | Simplifies v1 massively; no backend needed | — Pending |
| Visible adaptive difficulty | Player sees their stats and the system adjusting; transparency builds trust in the tutor | — Pending |
| Canvas 2D over WebGL | Pixel art doesn't need 3D; simpler to implement and debug | — Pending |

---
*Last updated: 2026-02-27 after initialization*

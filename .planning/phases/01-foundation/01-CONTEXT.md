# Phase 1: Foundation - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Audio input pipeline (microphone pitch detection + MIDI) working accurately with unified NoteOn/NoteOff events, game scaffold running, and a game canvas rendering with placeholder visuals in the browser. No pixel art or visual polish — functionality only.

</domain>

<decisions>
## Implementation Decisions

### Note detection feedback
- Simple piano keyboard strip at the bottom edge of the screen
- Shows all 88 keys — full piano range always visible
- Detected key lights up with instant on/off behavior — mirrors real-time input exactly, no linger
- No separate text label — the keyboard strip IS the primary note display

### Debug / event display
- Always-visible panel on the right side of the screen during development
- Development-only — must be removable/hidden before shipping to end users
- Each event shows full diagnostic info: note name, On/Off, source (mic/MIDI), frequency, confidence, timestamp
- Rolling buffer of last 50 events — old events scroll off

### Game canvas layout
- Top-down perspective (bird's eye view) — classic tower defense
- Path shape: L-shape or U-shape with 1-2 turns
- Enemy flow: top-to-bottom — enemies enter from top, goal at the bottom (coming "toward" the player at the piano)
- Enemies represented as colored circles with note name text inside (e.g., "C4")

### Screen & resolution
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

</decisions>

<specifics>
## Specific Ideas

- Keyboard strip at bottom mirrors the physical position of the piano relative to the screen — player looks up at the game, down at the piano, keyboard strip bridges the two
- Debug panel is a development tool, not a user feature — architect it so it can be cleanly removed or hidden behind a dev flag
- Enemy circles should be large enough to read the note name inside at laptop resolution

</specifics>

<deferred>
## Deferred Ideas

- Pixel art / retro visual style — deferred to v2 milestone
- Art direction, color palette, theme — deferred to v2 milestone
- All visual polish (sprites, animations, themed environments) — v2

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-02-27*

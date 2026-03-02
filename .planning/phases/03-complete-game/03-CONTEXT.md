# Phase 3: Complete Game - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Persistent progression across sessions — player can select levels, complete them to unlock the next, and configure gameplay to their preferences. The game has 3-5 levels of increasing difficulty, a level select map, settings with penalty modes, and player stats. No new gameplay mechanics — this builds on the existing core loop from Phase 2.

</domain>

<decisions>
## Implementation Decisions

### Level design & difficulty
- Difficulty increases through both more note variety AND faster enemies
- Level 1 starts with a full octave of white keys (C4-C5)
- Later levels (3+) gradually introduce sharps/flats (black keys)
- Wave count increases with difficulty: early levels have 3 waves, later levels have 4-5
- 3-5 levels available at launch, unlocking sequentially

### Level select screen
- Path/map style layout (like Mario World or Candy Crush) — visual sense of journey
- Each level node shows: star rating (1-3 stars), best score, level name/theme, note range preview
- Locked levels are visible but grayed out with a lock icon — player sees the full journey ahead
- Unlocking requires minimum 1 star (e.g. 50%+ accuracy) — ensures basic competency before advancing

### Settings & penalty modes
- Settings accessible from both the pause menu during gameplay AND the level select map screen
- Three penalty modes framed as difficulty labels: Easy (no penalty) / Normal (HP damage) / Hard (enemy advances)
- No reset on mode switch — stars and scores persist regardless of which mode was used
- Input source toggle included (switch between mic and MIDI) alongside penalty mode

### Stats presentation
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

</decisions>

<specifics>
## Specific Ideas

- Path/map should feel like a journey — Mario World style with connected nodes
- Star animation on level complete should feel satisfying (stars filling in one by one)
- "Most missed notes" on stats page is pedagogically useful — helps player know what to practice
- Input source toggle brings mic/MIDI selection into proper settings rather than ad-hoc

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-complete-game*
*Context gathered: 2026-03-02*

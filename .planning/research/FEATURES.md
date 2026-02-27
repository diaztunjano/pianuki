# Feature Research

**Domain:** Piano learning tower defense survival game (web, MIDI controller)
**Researched:** 2026-02-27
**Confidence:** MEDIUM — Piano learning app features are HIGH confidence (verified via multiple live sources). Tower defense mechanics are MEDIUM (verified via multiple sources). Music+TD intersection is LOW-MEDIUM (novel genre, no direct comparators).

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that users assume exist based on the two source genres. Missing these makes the product feel broken or incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Real-time MIDI input detection | Core controller — without this, nothing works | HIGH | Web MIDI API is Chrome-native; Firefox/Safari have uneven support. Must detect note-on/note-off events with <50ms effective latency. |
| Visual feedback on correct/incorrect input | All rhythm games and piano apps do this immediately | LOW | Highlight correct key green, wrong key red. Happens within the same frame as input. |
| Enemy path with enemies walking toward goal | Foundational tower defense UX — players know this pattern | MEDIUM | Needs clear path, visible enemies, obvious goal line. Pixel art style makes this tractable. |
| Visible health/lives counter | Players must know their margin for error | LOW | Standard across all TD games. Show remaining lives or HP bar on HUD. |
| Wave indicator ("Wave 3 of 10") | Players need to understand progression scope | LOW | Standard in Bloons TD, Kingdom Rush. Shows current wave and total remaining. |
| Enemy defeat animation on correct play | Provides the reward signal that makes the loop feel good | MEDIUM | Pixel art death animation or simple pop/dissolve. Must feel satisfying. |
| On-screen virtual keyboard (toggleable) | Piano learners need visual reference, especially beginners | MEDIUM | Show piano keys on screen, highlight which note is needed. Toggle to hide for advanced players. |
| Session progress persistence | Players need to resume where they left off | LOW | localStorage save of unlocked levels, current skill tree state, difficulty settings. 5MB limit is more than enough. |
| Configurable mistake penalty | Accessibility requirement — not everyone wants hard mode | LOW | Toggle between "lenient" (warning only), "normal" (lose HP), "strict" (instant fail). Set before game starts. |
| Increasing difficulty across levels | Core progression expectation from both genres | MEDIUM | Enemies faster/more complex musical concepts per level. Needs careful tuning curve. |
| Level select screen | Players expect to revisit levels, practice specific content | LOW | Show unlocked levels, lock future ones. Display completion star or grade. |
| Pause and quit functionality | Basic game UX requirement | LOW | Pause menu with resume/quit. Saves state on quit. |

### Differentiators (Competitive Advantage)

Features that make Pianuki distinct — not expected by users of either genre, but provide strong value when present.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Musical concept enemies (notes, intervals, chords, scales, progressions) | Turns abstract theory into a tactile enemy to defeat — directly ties gameplay to learning | HIGH | Each enemy type must be visually distinct and map to a musical concept. Intervals might be two-headed creatures; chords could be multi-part enemies requiring a full chord to defeat. This is the core differentiator. |
| Skill tree with branching musical progression | Lets players specialize (e.g., chord-focused vs. scale-focused path) — mirrors how musicians actually develop | HIGH | Based on research: choices must be Different, Balanced, Limited, and Clear. Invest heavily in readable UI here. |
| Adaptive difficulty with visible stats | Shows players their own accuracy trends, adjusting wave tempo/complexity — builds trust | MEDIUM | Research shows adaptive mechanics increase DAU 30%. Make adjustments visible ("slowing down because your chord accuracy is 40%") so players feel in control, not cheated. |
| Acoustic piano support (no MIDI required) | Removes the hardware barrier — acoustic players can use microphone input | HIGH | Requires audio pitch detection (not MIDI). Significant complexity: mic latency, ambient noise, polyphonic detection. Consider v2 or optional feature. |
| Theory-grounded enemy scaling | Later enemies represent harder concepts in a musically logical order (C major → modes → secondary dominants) | MEDIUM | Requires a content design document mapping musical theory progression to game difficulty curve. This is the "curriculum" of the game. |
| Configurable mistake penalty system | Other music games force one penalty mode — Pianuki lets players choose their learning style | LOW | Already listed in table stakes but it's also a differentiator vs. Piano Tiles and Synthesia which have fixed rules. |
| In-game stat dashboard | Shows accuracy per concept, weakest intervals/chords — gives players a learning map | MEDIUM | Display after each wave or level: "Your minor third accuracy: 72%. Your major chord accuracy: 91%." Actionable, not just a score. |
| Survival framing (vs. score attack) | Tower defense framing creates tension and stakes that piano learning apps lack entirely | LOW | The "defend the castle" emotional frame is free — it comes from the genre. Make the threat feel real with good animation and sound design. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem beneficial but introduce scope, complexity, or design problems disproportionate to their value for v1.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Multiplayer / co-op | Social gaming is a top player request; Bloons TD 6 co-op is popular | Requires WebSockets or WebRTC, server infrastructure, latency synchronization — doubles the engineering scope for v1 | Leaderboards (static, async competition) are sufficient for v1 social proof |
| Song-based content (play Beethoven to defeat enemies) | Synthesia's model; appeals to casual players | Conflicts with theory learning — players focus on finger memory, not concept recognition. Also requires licensing or MIDI library curation. | Keep enemies tied to abstract musical concepts (intervals, chords), not specific songs |
| Mobile support | Huge audience; most piano apps are mobile-first | Web MIDI API has poor mobile support. Physical keyboard use on mobile is impractical. Desktop-only is the correct scope. | Explicitly call out desktop-only. MIDI keyboards are desktop peripherals. |
| Microphone-based acoustic piano input (v1) | Removes MIDI hardware requirement | Polyphonic pitch detection in browser (especially chords) has latency of 100-300ms and high error rates. Would undermine the core gameplay feel. | Make it v2 research spike. v1 is MIDI-first. |
| Leaderboards with accounts / social profiles | Competitive players want to compare globally | Requires auth, backend, and moderation. Out of scope for localStorage-based v1. | Local high score display. "Beat your own record" framing. |
| Real-time sheet music display | Synthesia does this; looks impressive | Adds significant rendering complexity. Music notation rendering (VexFlow, etc.) is a subsystem unto itself. Distracts from the game canvas. | Virtual keyboard highlight is sufficient. Sheet music in v2 as optional overlay. |
| AI curriculum generation | Personalized theory paths based on AI | Engineering-heavy, hard to validate correctness, opaque to users. Adaptive difficulty covers the core need simply. | Hand-authored level progression with adaptive tempo/complexity parameters |
| In-app MIDI file import | Synthesia's killer feature; power users want it | Out of scope for theory-game loop. Pianuki is about learning concepts, not playing back songs. | Out of scope for v1. Possibly never — different product goal. |

---

## Feature Dependencies

```
[MIDI Input Detection]
    └──requires──> [Visual Keyboard Display]
    └──requires──> [Note/Chord Validation Logic]
                       └──requires──> [Musical Concept Enemy Definitions]
                                          └──requires──> [Enemy Type Content Design]

[Enemy Spawning / Wave System]
    └──requires──> [Enemy Path Rendering]
    └──requires──> [Wave Config Data]
                       └──requires──> [Musical Concept Enemy Definitions]

[Skill Tree Progression]
    └──requires──> [Session Persistence (localStorage)]
    └──requires──> [Level Completion Tracking]
                       └──requires──> [Wave System]

[Adaptive Difficulty]
    └──requires──> [Note/Chord Validation Logic] (needs accuracy data)
    └──requires──> [Wave Config Data] (needs to modify wave parameters)

[Visible Stats Dashboard]
    └──requires──> [Note/Chord Validation Logic] (source of per-concept accuracy)
    └──enhances──> [Adaptive Difficulty] (makes adjustments legible)

[Configurable Mistake Penalty]
    └──requires──> [Note/Chord Validation Logic]
    └──requires──> [Lives/HP System]

[Virtual Keyboard (toggleable)]
    └──enhances──> [MIDI Input Detection] (visual hint layer)
    └──conflicts──> [Advanced Player Mode] (should be off by default at higher difficulty)
```

### Dependency Notes

- **MIDI Input Detection requires Note/Chord Validation Logic:** Input detection (what note was pressed) and validation (was that the right note for this enemy?) are separate concerns but must be built together — validation is meaningless without input.
- **Musical Concept Enemy Definitions are a blocker for most features:** Enemy types, wave configs, skill tree branches, and stats tracking all depend on having a canonical list of musical concepts mapped to difficulty tiers. This is a content design decision that must be made in Phase 1.
- **Skill tree requires level completion tracking:** Players can't unlock branches if there's no record of what they've done. localStorage must be scaffolded before skill tree UI.
- **Adaptive Difficulty enhances but doesn't require Visible Stats:** Stats can be shown without driving adaptation. Adaptation can happen silently. The combination is the differentiator.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — playable loop with several levels of increasing theory difficulty.

- [ ] **MIDI input detection** — game is unplayable without the controller working
- [ ] **Note-level enemies (single notes in C major)** — simplest musical concept, validates the core loop
- [ ] **Enemy path + wave system (3–5 waves per level)** — must have TD structure to feel like a game
- [ ] **Correct/incorrect visual feedback** — defeat animation on correct, enemy advances on wrong
- [ ] **Lives/HP system + configurable penalty mode** — player must feel stakes and have control over difficulty
- [ ] **Virtual keyboard (toggleable)** — essential for beginners; must be off-by-default option for advanced
- [ ] **3–5 levels of increasing difficulty** — at minimum: single notes, intervals, basic major chords
- [ ] **Session persistence (localStorage)** — players must be able to stop and resume
- [ ] **Level select screen** — players revisit levels to practice specific theory content
- [ ] **Wave indicator + basic HUD** — health, wave count, current concept being tested

### Add After Validation (v1.x)

Features to add once core loop is confirmed fun.

- [ ] **Skill tree with 2-3 branching paths** — add once level progression is stable; branching gives replay motivation
- [ ] **Adaptive difficulty with visible stats** — add once you have enough gameplay data to calibrate what "hard" means
- [ ] **Interval enemies (2-note recognition)** — second wave of theory content; requires note enemies to be solid first
- [ ] **Chord enemies (major/minor triads)** — third tier; significantly harder, requires interval tier working
- [ ] **Per-session accuracy stats** — add after skill tree; gives stats meaning within the progression context

### Future Consideration (v2+)

Features to defer until v1 is validated.

- [ ] **Acoustic piano / microphone input** — high complexity, unproven browser accuracy for chords; validate separately
- [ ] **Scale and progression enemies** — complex theory content; requires deep content design
- [ ] **Boss waves** — requires dedicated design and animation; fun but not essential to validate concept
- [ ] **Sheet music overlay** — separate rendering subsystem; add if users request notation support
- [ ] **Async leaderboards** — requires backend; only meaningful once player base exists

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| MIDI input detection | HIGH | HIGH | P1 |
| Note-level enemies | HIGH | MEDIUM | P1 |
| Wave / enemy path system | HIGH | MEDIUM | P1 |
| Correct/incorrect feedback | HIGH | LOW | P1 |
| Lives system + penalty config | HIGH | LOW | P1 |
| Virtual keyboard (toggleable) | HIGH | MEDIUM | P1 |
| 3-5 levels with increasing difficulty | HIGH | MEDIUM | P1 |
| localStorage persistence | HIGH | LOW | P1 |
| Level select screen | MEDIUM | LOW | P1 |
| HUD (wave, health) | HIGH | LOW | P1 |
| Skill tree (2-3 paths) | HIGH | HIGH | P2 |
| Adaptive difficulty | MEDIUM | MEDIUM | P2 |
| Per-session accuracy stats | MEDIUM | LOW | P2 |
| Interval enemies | HIGH | MEDIUM | P2 |
| Chord enemies | HIGH | MEDIUM | P2 |
| Scale enemies | HIGH | HIGH | P3 |
| Chord progression enemies | HIGH | HIGH | P3 |
| Acoustic piano input | MEDIUM | HIGH | P3 |
| Sheet music overlay | LOW | HIGH | P3 |
| Multiplayer | LOW | HIGH | Never (v1) |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | Synthesia | Simply Piano / Yousician | Piano Tiles | Bloons TD 6 | Pianuki Approach |
|---------|-----------|--------------------------|-------------|-------------|-----------------|
| Controller | MIDI keyboard | MIDI or microphone | Touch screen | Mouse/keyboard | MIDI keyboard (primary); microphone (v2) |
| Core loop | Follow falling notes | Lesson → practice → feedback | Tap rhythm tiles | Place towers, defend path | Play musical concepts to defeat advancing enemies |
| Music theory taught | None | Yes (structured curriculum) | None | N/A | Yes — theory concepts ARE the enemies |
| Real-time feedback | Yes (immediate) | Yes (immediate) | Yes (immediate) | Yes (tower fires) | Yes — defeat/survive feedback per note/chord |
| Adaptive difficulty | No | Yes | Yes (tempo) | Yes (map/mode select) | Yes (wave tempo, concept complexity) |
| Progression system | Song library | Lesson curriculum | Song levels | Upgrade paths | Skill tree with branching theory paths |
| Mistake penalty | Wait for correct note | Retry section | Miss = game over | Leak = HP loss | Configurable (lenient / normal / strict) |
| Visual keyboard | Yes (always) | Yes | No | N/A | Yes (toggleable) |
| Persistence | Local save | Account-based | Local save | Account-based | localStorage (no account required) |
| Social features | None | Community | Leaderboards | Co-op + clan | Out of scope for v1 |
| Music theory integration | None | Partial | None | N/A | Core — deepest integration of any listed app |

---

## Sources

- [Synthesia Piano Review (2026)](https://pianoers.com/synthesia-piano-review/) — MEDIUM confidence; current review source
- [Synthesia official site](https://synthesiagame.com/) — HIGH confidence
- [Simply Piano vs Yousician vs Flowkey comparison](https://www.omarimc.com/simply-piano-vs-yousician-vs-flowkey-review/) — MEDIUM confidence
- [Best Piano Apps 2026 (Skoove)](https://www.skoove.com/blog/best-piano-apps/) — MEDIUM confidence
- [Bloons TD 6 (Fandom Wiki)](https://bloons.fandom.com/wiki/Bloons_TD_6) — MEDIUM confidence
- [Bloons TD 6 on Steam](https://store.steampowered.com/app/960090/Bloons_TD_6/) — HIGH confidence
- [Tower Defense in 2026 (TowersDefense.org)](https://towersdefense.org/articles/tower-defense-2026) — LOW confidence (single source)
- [Gamification in music education (Drimify)](https://drimify.com/en/resources/gamification-music-education/) — MEDIUM confidence
- [Effects of Game-Based Learning on Piano Music Knowledge (JMIR, 2026)](https://games.jmir.org/2026/1/e80766/PDF) — HIGH confidence; peer reviewed
- [Upgrades, Equipment, and Skill Trees (Game Developer)](https://www.gamedeveloper.com/design/upgrades-equipment-and-skill-trees) — HIGH confidence
- [ToneGym gamified ear training (AI for Music)](https://tools.aiformusic.org/knowledgebase/articles/tonegym-gamified-ear-training-music-theory-platform-for-musicians) — MEDIUM confidence
- [Rhythm games frustration/penalty design (LevelUpTalk)](https://leveluptalk.com/news/rhythm-games-unforgiving-mechanics-frustration/) — MEDIUM confidence
- [Adaptive difficulty retention research (BadgeUnlock)](https://www.badgeunlock.com/2025/12/03/how-game-design-impacts-player-engagement-and-drives-long-term-retention/) — LOW confidence (single source, cited statistics need independent verification)
- [Web MIDI API (Smashing Magazine)](https://www.smashingmagazine.com/2018/03/web-midi-api/) — MEDIUM confidence (dated, but API is stable)
- [Real-time piano transcription latency research (arXiv)](https://arxiv.org/abs/2509.07586) — HIGH confidence; academic

---
*Feature research for: Pianuki — piano learning tower defense game*
*Researched: 2026-02-27*

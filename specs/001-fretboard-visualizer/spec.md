# Feature Specification: Interactive Guitar Fretboard Visualizer

**Feature Branch**: `001-fretboard-visualizer`

**Created**: 2026-07-19

**Status**: Draft

**Input**: User description: "Read the file stories.md in this directory and use its contents as the full set of user stories and acceptance criteria for this feature. Do not summarize or truncate — incorporate all 9 stories exactly as written, including the scale/mode degree-formula tables in Story 4."

## Clarifications

### Session 2026-07-19

- Q: Should the app remember the user's last-used settings (tuning, root/key, scale/mode, capo position, label mode, fret range) across a page reload, or should every reload start fresh from defaults? → A: Persist via localStorage — all selections auto-save and restore on next load, using a schemaVersion'd settings object.
- Q: How should the app behave if a required guitar audio sample fails to load (e.g., a network hiccup on first visit, before samples are cached)? → A: Show a visible, non-blocking error indicator (e.g. toast/banner) without blocking other interaction.
- Q: Under capo + Relative label mode, should fret-marker inlay dots (3,5,7,9,12,15,17,19,21,24) stay anchored to the true physical fret position, or track the renumbered/relative fret index? → A: True physical fret position — dots never move; only the fret-number text/note-name shown at a given physical column changes under Relative mode, matching how inlay dots work on a real guitar neck and how Story 9's capo mechanics already treat "frets below N" as physical positions.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visualize the fretboard layout (Priority: P1)

As a guitarist, I want to see a visually accurate, guitar-oriented fretboard
(not sheet-music oriented), so that note positions map intuitively to my
physical instrument.

**Why this priority**: Every other story renders on top of this base view. Without a correctly oriented, readable fretboard, no other feature (tuning, scales, capo, audio) has anywhere to display its output.

**Independent Test**: Can be fully tested by loading the app with no other configuration and visually confirming string order, fret markers, open-string display, and the color+shape distinction rule — delivers immediate value as a static reference fretboard.

**Acceptance Scenarios**:
1. **Given** the app loads, **When** the fretboard renders, **Then** strings
   are ordered high-E at top to low-E at bottom, matching how a player
   looks down at their own neck. low-E is string 6, and high-e is string 1.
2. **Given** standard fret markers (3,5,7,9,12,15,17,19,21,24), **When** the
   fretboard renders, **Then** those frets show inlay dot markers (single,
   except double at 12 and 24).
3. **Given** any note is part of the active scale/chord, **When** it renders,
   **Then** it's visually distinguished by both color AND shape/border from
   non-active notes (not color alone) — per our accessibility principle.
4. **Given** open strings, **When** the fretboard renders, **Then** open-string
   notes are shown distinctly to the left of fret 1, past the nut line.
5. **Given** a capo is active and Relative-mode fret-number renumbering is in
   effect (FR-046), **When** the fretboard renders, **Then** inlay dot markers
   remain visible at their true PHYSICAL fret positions (3,5,7,9,12,15,17,19,
   21,24) — the dots never move or remap to whatever column currently shows
   that number as a Relative-mode label; only the fret-number text and note
   names at a column change under Relative mode, never the dot's physical
   column. *(Amended UAT round 2, section B: dots had regressed to failing to
   render/misaligning after capo-relative fret renumbering was introduced;
   Clarification 2026-07-19 confirms physical-position anchoring, matching a
   real guitar's fixed inlay dots, as the corrected behavior.)*

---

### User Story 2 - Change tuning (Priority: P1)

As a guitarist, I want to select from a library of named tunings (or define
a custom one), so that I can see how note positions shift across alternate tunings.

**Why this priority**: Alternate tunings are core to how many guitarists use this tool; without tuning support the fretboard only ever reflects one configuration and loses most of its practical value.

**Independent Test**: Can be fully tested by selecting each named tuning (or a custom one) from the selector and confirming every string's pitch and all fretted note labels update correctly — delivers value as a standalone tuning reference even before scale/mode features exist.

**Acceptance Scenarios**:

1. **Given** the tuning selector, **When** I choose any supported tuning,
   **Then** all 6 strings retune to the correct pitch and every fretted
   note recalculates accordingly.

2. **Given** the "D-Family" tuning group, **When** I select one of:
   - Drop D (D A D G B E)
   - Double Drop D (D A D G B D)
   - DADGAD / "Dsus4" (D A D G A D)
   - Open D (D A D F# A D)
   - Open D Minor (D A D F A D)
   - D A D E A D (D A D E A D)
   - Drop High D (E A D G B D)
   - D G D F# G G (D add 4)
   **Then** the fretboard reflects that exact tuning.

3. **Given** the "G-Family" tuning group, **When** I select one of:
   - Open G (D G D G B D)
   - Gsus4 (D G D G C D)
   - Open G Minor (D G D G Bb D)
   - D G D G A D (D G D G A D)
   - G6 (D G D G B E)
   **Then** the fretboard reflects that exact tuning.

4. **Given** the "C-Family" tuning group, **When** I select one of:
   - C G D G B E (unlabeled in source)
   - C G D G B D (unlabeled in source)
   - Open C (C G C G C E)
   - Open C Minor (C G C G C Eb)
   **Then** the fretboard reflects that exact tuning.

5. **Given** none of the above match what the user wants, **When** they choose
   "Custom Tuning," **Then** they can independently set each string's pitch
   and the fretboard recalculates accordingly.

6. **Given** any tuning is applied, **When** notes are re-labeled, **Then**
   enharmonic spelling stays consistent with the active key/scale context
   (per our music-theory-correctness principle) rather than defaulting to
   one universal sharp/flat convention regardless of tuning.

---

### User Story 3 - Select root note and enharmonic spelling (Priority: P1)

As a guitarist, I want to choose a root note from all 12 chromatic pitch
classes, each spelled with its one fixed canonical sharp/flat convention,
so that the fretboard matches the key signature I'm thinking in.

> **Amended (UAT round 1, section C3)**: The root selector originally offered
> only the 7 natural letters plus a manual "Prefer flats" sharp/flat toggle.
> UAT testing found this insufficient (guitarists routinely need roots like
> Db or F#) and the manual toggle redundant once every root has one
> unambiguous canonical spelling by circle-of-fifths convention. The
> selector now offers all 12 chromatic roots directly; there is no
> user-facing sharp/flat toggle.

**Why this priority**: Root-note selection is the anchor for every scale, mode, degree-coloring, and interval-label feature that follows; it must exist before those features have meaning.

**Independent Test**: Can be fully tested by selecting each of the 12 root options and confirming the root highlight updates to the correct pitch class, with its spelling matching the fixed circle-of-fifths convention — delivers value as a standalone key-reference tool.

**Acceptance Scenarios**:
1. **Given** the app is loaded, **When** I select a root from the 12 available
   options (displayed alphabetically: A, Ab, B, Bb, C, D, Db, E, Eb, F, F#, G),
   **Then** the fretboard highlights that pitch class as the root/tonic
   everywhere it appears.
2. **Given** any root is selected, **When** the fretboard renders, **Then**
   the root's own label and every other non-diatonic note's sharp/flat
   spelling follow the same fixed circle-of-fifths convention (C G D A E B
   F# spelled sharp-side; Db Ab Eb Bb F spelled flat-side) automatically —
   there is no manual sharp/flat toggle, and pitch is never affected by
   spelling choice.
3. **Given** a root is selected, **When** the root selector renders, **Then**
   the currently-selected root's button displays using the same color as
   that root's degree-1/"root" color-role on the fretboard (Story 5) — never
   a different or generic selection color — for visual consistency between
   the control and the fretboard. *(Added UAT round 2, section D.)*

---

### User Story 4 - Choose scale or mode (Priority: P1)

As a guitarist, I want to select a scale or mode relative to my root note,
so that I can see which notes belong to that scale across the fretboard.

**Why this priority**: Scale/mode highlighting is the primary reason a guitarist uses this tool — it turns a generic fretboard diagram into a study aid for a specific key.

**Independent Test**: Can be fully tested by selecting each scale/mode from the tables below against a fixed root and confirming the highlighted note set exactly matches the listed semitone offsets — delivers value as a standalone scale-reference tool once a root is set.

**Supported Scales & Modes — canonical degree formulas**

All degrees are expressed relative to the major scale (1 2 3 4 5 6 7).
A flat (b) or sharp (#) prefix means that degree is lowered/raised a
half-step from its major-scale position. Semitone offsets from the root
are given for unambiguous implementation.

#### The 7 Church (Diatonic) Modes

| Mode | Degree Formula | Semitones from root |
|---|---|---|
| Ionian (Major) | 1 2 3 4 5 6 7 | 0, 2, 4, 5, 7, 9, 11 |
| Dorian | 1 2 b3 4 5 6 b7 | 0, 2, 3, 5, 7, 9, 10 |
| Phrygian | 1 b2 b3 4 5 b6 b7 | 0, 1, 3, 5, 7, 8, 10 |
| Lydian | 1 2 3 #4 5 6 7 | 0, 2, 4, 6, 7, 9, 11 |
| Mixolydian | 1 2 3 4 5 6 b7 | 0, 2, 4, 5, 7, 9, 10 |
| Aeolian (Natural Minor) | 1 2 b3 4 5 b6 b7 | 0, 2, 3, 5, 7, 8, 10 |
| Locrian | 1 b2 b3 4 b5 b6 b7 | 0, 1, 3, 5, 6, 8, 10 |

#### Pentatonic Scales

| Scale | Degree Formula | Semitones from root |
|---|---|---|
| Major Pentatonic | 1 2 3 5 6 | 0, 2, 4, 7, 9 |
| Minor Pentatonic | 1 b3 4 5 b7 | 0, 3, 5, 7, 10 |

#### Blues Scales

| Scale | Degree Formula | Semitones from root |
|---|---|---|
| Minor Blues | 1 b3 4 b5 5 b7 | 0, 3, 5, 6, 7, 10 |
| Major Blues | 1 2 b3 3 5 6 | 0, 2, 3, 4, 7, 9 |

#### Other Common Scales

| Scale | Degree Formula | Semitones from root |
|---|---|---|
| Harmonic Minor | 1 2 b3 4 5 b6 7 | 0, 2, 3, 5, 7, 8, 11 |
| Melodic Minor (ascending/jazz) | 1 2 b3 4 5 6 7 | 0, 2, 3, 5, 7, 9, 11 |

This table is the single source of truth for scale/mode data — implementation
must reference it directly rather than deriving formulas independently at
different layers, per our music-theory-correctness principle.

**Acceptance Scenarios**:

1. **Given** a root note is selected, **When** I choose any scale or mode
   from the tables above, **Then** exactly the notes matching that scale's
   semitone offsets (relative to the root) are highlighted as "in scale" —
   no more, no fewer.

2. **Given** a scale is selected, **When** I switch to a different mode or
   scale of the same root, **Then** the highlighted note set updates
   immediately to reflect the new scale's formula, with no stale notes
   left highlighted from the previous selection.

3. **Given** any mode/scale in the tables above, **When** it is rendered,
   **Then** its degree labels (if "Degrees" label mode is active) display
   using the exact formula notation shown above (e.g. "b3", "#4", "b7") —
   not alternate enharmonic degree names.

4. **Given** the scale/mode list, **When** the user opens the selector,
   **Then** all scales/modes listed above are available as selectable
   options, grouped as: Church Modes, Pentatonic, Blues, Other.

---

### User Story 5 - Diatonic focal-point highlighting (Priority: P1)

As a guitarist, having selected a root note and scale/mode (Stories 2-4),
I want the fretboard to color-code every diatonic note by its fixed
scale-degree role, with one selectable "focal" degree whose chord tones
are emphasized, so I can explore chord/extension relationships within
the key without losing the key's context.

**Why this priority**: This is what turns the fretboard from a static scale map into an interactive chord/harmony exploration tool — the feature most directly tied to the app's educational value proposition.

**Independent Test**: Can be fully tested by selecting a root/scale, confirming the fixed degree-role coloring, then clicking through several diatonic notes as focal points and confirming triad quality and brightness update correctly — delivers value as a standalone harmonic-analysis tool once Stories 3-4 exist.

**Color & Degree Model**
- The app defines up to 12 color roles, one per possible chromatic
  scale-degree position relative to the key root: 1, b2, 2, b3, 3, 4,
  #4/b5, 5, b6, 6, b7, 7. Each role has a bright and a dark variant.
- Once root + scale/mode are selected, every note on the fretboard is
  assigned its scale-degree role relative to THAT key root. This
  assignment is fixed until the root or scale/mode changes — it never
  changes when the focal point changes.
- Notes diatonic to the selected scale/mode render in their assigned
  color (dark variant, by default).
- Notes NOT diatonic to the selected scale/mode receive no color at all
  — they remain in the neutral base layer only (see Story 6).

**Focal Point behavior**
- On scale/mode selection, focal point defaults to the root (degree 1).
- The user changes focal point by clicking/tapping any diatonically
  colored note. Non-diatonic (uncolored) notes cannot be set as focal.
- Given a focal point, the app computes its diatonic triad by stacking
  the nearest diatonic thirds above it within the current scale, with
  triad quality (major/minor/diminished/augmented) derived from actual
  key content — never assumed independent of key.
- The focal triad's notes render BRIGHT + a secondary visual indicator
  (e.g. border), distinguishing them from non-focal diatonic notes.
- All other notes diatonic to the key (but outside the current focal
  chord/extension selection) render DARK — visible, but receding.

**Custom chord-tone override**
- The user may toggle individual diatonic scale members belonging to
  the focal point's diatonic scale into/out of the bright ("chord tone")
  set — e.g. toggling off the diatonic 3rd and toggling on the diatonic
  4th to build a sus4 voicing from the default triad.
- Only scale positions diatonic to the CURRENTLY selected key/scale can
  be toggled into the bright set. Chromatic alterations not present in
  the current mode cannot be enabled this way.
- A UI element displays the active bright note set (e.g. "E, G, B")
  alongside a recognized chord-quality label (e.g. "Minor") when the
  set matches a standard triad shape.
- (Lower priority) When the active set doesn't map cleanly to one
  canonical chord name (e.g. ambiguity between a sus2 voicing and a
  rootless 9th), the app may leave the name blank or show multiple
  candidates rather than guessing incorrectly.

**Acceptance Scenarios**:

1. **Given** C Major is selected, **When** the fretboard renders,
   **Then** all 7 diatonic notes (C D E F G A B) display in their
   assigned dark color-role, and the 5 non-diatonic notes (C#/Db,
   D#/Eb, F#/Gb, G#/Ab, A#/Bb) display with no color.

2. **Given** C Major with focal point defaulted to root (C),
   **When** the fretboard renders, **Then** C, E, G display bright +
   bordered (C major triad), and D, F, A, B display dark.

3. **Given** C Major, **When** the user clicks E, **Then** focal point
   becomes E, and E, G, B display bright + bordered — correctly shown
   as a minor triad (the diatonic quality of the 3rd degree in C Major).

4. **Given** focal point = E (C Major), **When** "Degrees" label mode
   is active, **Then** E, G, B display "3", "5", "7" — always relative
   to the key root (C), never relative to the focal note.

5. **Given** focal point = E (C Major) with the default minor triad
   active, **When** the user toggles off G and toggles on A, **Then**
   the bright set becomes E, A, B (an Esus4-type voicing) — valid
   because A is diatonic to C Major.

6. **Given** focal point = E (C Major), **When** the user attempts to
   toggle on F# (which would build an Esus2 voicing), **Then** that
   toggle is unavailable, because F# is not diatonic to C Major.

7. **Given** the key changes to C Lydian, **When** focal point = E,
   **Then** F# becomes an available toggle, because F# is diatonic
   to C Lydian.

---

### User Story 6 - Base layer & label display control (Priority: P1)

As a guitarist, I want note names always visible as a neutral base
layer, with an optional overlay showing scale degrees or intervals for
notes relevant to the current key, so the fretboard stays informative
without becoming visually noisy.

**Why this priority**: Without a persistent legible base layer, none of the color-coding from Stories 1 and 5 is interpretable to a user who hasn't memorized the fretboard — this story keeps the whole tool usable for learners.

**Independent Test**: Can be fully tested by toggling between Notes, Degrees, and Intervals label modes on a fixed root/scale and confirming labels update correctly while the base layer never disappears — delivers value as a standalone display-control feature layered on Stories 1, 3-5.

**Acceptance Scenarios**:

1. **Given** any tuning/key selection, **When** the fretboard renders,
   **Then** every fret position displays its note name at all times, in
   a neutral/dark, non-distracting style — this base layer never
   disappears, regardless of scale or focal-point selections.

2. **Given** "Notes" label mode, **When** the fretboard renders,
   **Then** diatonic notes show their letter name inside the colored
   (bright/dark, per Story 5) marker; non-diatonic notes show their
   letter name in the neutral base-layer style only.

3. **Given** "Degrees" label mode, **When** the fretboard renders,
   **Then** diatonic notes show their scale-degree number (relative to
   the key root, per Story 5) instead of the letter name.

4. **Given** "Intervals" label mode, **When** the fretboard renders,
   **Then** diatonic notes show interval names relative to the key root
   (e.g. "R", "M3", "P5", "m7") instead of letters or numbers.

5. **Given** any label mode, **When** the fretboard renders, **Then**
   the key root (scale degree 1) is visually distinguished from other
   diatonic notes by BOTH color-role AND a secondary indicator (e.g.
   distinct border/shape) — never by color alone.

---

### User Story 7 - Adjust visible fret range (Priority: P1)

As a guitarist, I want to truncate the fretboard view from either end
using a dual-handle slider, so that I can focus on a smaller region
(e.g. frets 1–5) or see the whole neck, with clear labeling of exactly
which frets are in view.

**Why this priority**: Focusing the view to a practice-relevant region (e.g. a single position box) is a frequently needed workflow for guitarists studying a specific area of the neck, independent of which key or scale is active.

**Independent Test**: Can be fully tested by dragging each handle independently and in combination against the default full-range view and confirming labels and visible frets update and stay constrained — delivers value as a standalone viewport control on top of Story 1.

**Behavior**
- The slider has two handles: a left handle and a right handle, each
  independently draggable.
- The left handle controls the lower bound of the visible range. Its
  label shows "N" (nut) when positioned at the open-string/nut position,
  or the actual fret number if dragged past fret 0.
- The right handle controls the upper bound of the visible range. Its
  label always shows the actual fret number at its current position.
- Default state on load: left handle at "N" (nut), right handle at 24
  — the full fretboard is visible.
- Maximum right-bound value is 24; minimum left-bound value is the nut
  (equivalent to fret 0).
- The left handle cannot be dragged past (to the right of) the right
  handle's current position, and vice versa — the visible range must
  always contain at least one fret.
- A reset control (e.g. a button near the slider) is always present and,
  when activated, returns both handles to their default positions
  (left="N", right=24) regardless of the current range.

**Acceptance Scenarios**:

1. **Given** the app loads with no prior adjustment, **When** the
   fretboard renders, **Then** the left handle displays "N", the right
   handle displays "24", and all frets 0(nut)–24 are visible.

2. **Given** the default full-range view, **When** I drag the left
   handle right to fret 5, **Then** its label updates to show "5", and
   the fretboard re-renders showing only frets 5–24 (frets 0–4 hidden).

3. **Given** the default full-range view, **When** I drag the right
   handle left to fret 12, **Then** its label updates to show "12", and
   the fretboard re-renders showing only frets N(0)–12 (frets 13–24 hidden).

4. **Given** both handles have been adjusted (e.g. left=3, right=15),
   **When** the fretboard renders, **Then** only frets 3–15 are visible,
   and both handle labels reflect "3" and "15" respectively.

5. **Given** any handle position, **When** I attempt to drag one handle
   past the other's current position, **Then** the drag is constrained
   so the range never inverts or collapses to zero frets.

6. **Given** any adjusted range, **When** the user activates the reset
   control, **Then** the range returns to the default N–24 full view.

   > **Clarification (2026-07-19)**: Per the persistence decision above
   > (FR-039/FR-040), a plain page reload restores the last-used fret
   > range from `localStorage` rather than resetting it — this scenario's
   > reset behavior applies to the explicit reset control (or a genuinely
   > fresh session with no stored settings), not to reload in general.

---

### User Story 8 - Hear notes on the fretboard (Priority: P1)

As a guitarist, I want to click/tap a fret position and hear its pitch
played back with a real guitar tone (not a generic synth beep), so that
I can connect the visual fretboard to actual sound.

**Why this priority**: Audio feedback is what makes the tool useful for ear training and for connecting visual note positions to real pitches — a core promise of the app distinct from a static diagram.

**Independent Test**: Can be fully tested by clicking fret positions across multiple strings/octaves and confirming correct, distinct, real-guitar-sample playback with no cutoffs during rapid triggering — delivers value as a standalone playback feature layered on Story 1.

**Sourcing constraints**
- Audio must come from actual recorded guitar samples (multi-sampled
  per note/octave), not a synthesized waveform approximation — a sine/
  square/sawtooth tone does not satisfy this story.
- Samples must be free to use and license-compatible with a publicly
  shipped, client-side-only app (no per-seat licensing, no attribution
  requirements that can't be satisfied in an about/credits section,
  no restriction against commercial or public use if this app is ever
  made public).
- Samples must be servable as static files alongside the app (client-side
  only, per our no-backend principle) — no server-side audio rendering
  or licensing-gated API calls.
- Candidate source (to be finalized in /speckit.plan): FluidR3_GM
  soundfont, MIT-licensed, with per-note pre-rendered samples available
  via existing open-source browser players (e.g. soundfont-player,
  webaudiofont). Final license verification is a /speckit.plan-stage
  task before committing to this or an alternative source.

**Acceptance Scenarios**:

1. **Given** any fret position, **When** I click/tap it, **Then** the
   correct pitch (correct octave, not just pitch class) plays audibly
   using a real guitar sample, not a synthesized tone.

2. **Given** the same pitch class at different octaves (e.g. open low E
   vs. 12th fret high E), **When** each is played, **Then** they sound
   at their correct distinct octaves — never collapsed to the same
   sample pitch-shifted incorrectly or defaulted to one octave.

3. **Given** the app is used entirely offline after first load (if
   samples are cached), **When** notes are played, **Then** playback
   still works without a live network dependency — audio assets are
   fetched once and reusable, not re-fetched per note trigger.

4. **Given** rapid sequential note triggers (e.g. strumming or fast
   scale runs), **When** multiple notes are played in quick succession,
   **Then** each note plays cleanly without cutting off the previous
   note improperly or introducing audible lag.

5. **Given** a capo is active (Story 9), **When** any fret position is
   played, **Then** audio always sounds the true physical pitch
   (Absolute-mode pitch) regardless of which label mode (Absolute or
   Relative) is currently displayed — labels are cosmetic; sound is not.

---

### User Story 9 - Apply a capo (Priority: P1)

As a guitarist, I want to place a capo at a chosen fret and choose whether
notes are labeled by their true sounding pitch or by the "as if uncapoed"
shape guitarists conventionally use in tutorials, so that I can study
capo positions the way they're actually taught and played.

> **Amended (UAT round 2, section A)**: This story's highlighting behavior
> under capo + Relative mode has gone through two incorrect implementations
> (see `docs/story-drafts/002-mvp-uat-improvements.md` section A, and a
> further incorrect correction after it). `docs/story-drafts/
> 003-uat-round2-fixes.md` section A is the final, confirmed word on this
> topic and supersedes 002's section A entirely — do not consult 002's
> section A for this behavior. Acceptance Scenarios 7-12 below reflect the
> corrected behavior; see the new "Highlighting under capo + Relative mode"
> subsection for the formula.

**Why this priority**: Capo usage is a common real-world guitar technique with its own labeling conventions; supporting it correctly (including the Absolute/Relative distinction) is necessary for the tool to be trustworthy for players who use a capo.

**Independent Test**: Can be fully tested by placing a capo at several fret positions, confirming muted frets below it, the fret-range handle lock, and that Absolute vs. Relative label modes diverge correctly and reconverge at capo 0 — delivers value as a standalone capo-study feature layered on Stories 1, 2, and 7.

**Capo mechanics**
- Capo position is a single fret number, 0 (no capo) through a
  reasonable maximum (assumption: 12 — flag if you want a different cap).
- When a capo is placed at fret N (N > 0), all frets below N become
  unplayable/muted, since a capo physically stops the player from
  fretting behind it.
- Every string's effective open pitch becomes what that string would
  normally sound at physical fret N (i.e. capo doesn't change the
  underlying pitch formula — it changes which frets are reachable).

**Integration with Story 7 (fret range)**
- When a capo is active, Story 7's LEFT handle is fixed at the capo's
  fret position and cannot be dragged away from it — the visible range's
  lower bound always starts exactly at the capo.
- The left handle's label changes from "N" to a distinct "Capo" indicator
  at that position (assumption: distinguishing "the physical nut" from
  "capo position" avoids confusing the two — flag if you'd rather it
  just show the fret number instead).
- The right handle remains freely adjustable as before, up to fret 24.
- Setting capo back to 0 (no capo) releases the left handle back to
  free movement, defaulting again to "N" at the nut.
- **(Added UAT round 2, section C)** When a capo replaces the visible nut
  as the fretboard's left boundary, the fretboard renders a visual position
  indicator (a vertical line/bar, matching the true nut's general treatment)
  at the capo's position, using a color and/or thickness distinct from the
  true nut's indicator, so a capo position is never visually mistaken for
  the instrument's actual nut.

**Absolute vs. Relative note naming**
- **Absolute** mode: every note is labeled by its true sounding pitch —
  the same formula used with no capo (open-string pitch class + physical
  fret number semitones). Capo does not change this formula; it only
  restricts which frets are reachable.
- **Relative** mode: every note is labeled AS IF the capo fret were the
  nut — computed as (open-string pitch class + (physical fret − capo
  fret) semitones). This reproduces the common tutorial convention
  (e.g. "capo 3, still call it Open A") even though the true pitch is
  higher.
- With no capo active (fret 0), Absolute and Relative modes must produce
  identical labels — the distinction only matters once a capo is placed.
- This note-NAME text computation is independent of, and unaffected by,
  the root-highlighting behavior described next — Relative mode shifts
  which letter name a position is labeled with, but (per the corrected
  behavior below) it also shifts which pitch class is treated as "root" for
  color/degree/chord-tone purposes when a capo is active.

**Highlighting under capo + Relative mode (Added/corrected UAT round 2,
section A)**

- With a capo active (capo fret > 0) AND Relative label mode selected, all
  fretboard color highlighting — the root marker, the full diatonic set,
  degree roles, degree labels, interval labels, and chord-tone/bright-set
  membership — is computed against a SHIFTED root, `getHighlightRootSemitone`,
  rather than the literal selected root:

      highlightRootSemitone = (trueRootSemitone + capoFret) mod 12   [capo>0 AND Relative mode]
      highlightRootSemitone = trueRootSemitone                       [otherwise]

  The sign is deliberately **+capoFret** (not -capoFret). Worked example:
  root = C (0), capo = 3 → `highlightRootSemitone` = 3 = Eb. This matches
  the "capo 3, play a C shape" tutorial convention: the position a player
  would call "C" in shape terms is the one colored/bordered as root, even
  though it truly sounds Eb.
- `getDiatonicSemitones`, `computeDefaultTriad`, `isToggleableChordTone`,
  `identifyChordQuality`, `getDegreeRole`, `getDegreeLabel`, and
  `getIntervalLabel` all take `getHighlightRootSemitone`'s output as their
  root/root-derived input, consistently, whenever this shift is active —
  never some anchored to the true root while others use the shifted one.
- What does NOT shift, regardless of capo or Absolute/Relative mode: audio
  playback (always the true physical pitch — clicking the root-colored
  position in the example above must audibly play Eb, never C), and the
  "Bright notes: X, Y, Z (Quality)" text summary (always the TRUE root's
  true chord tones, e.g. "C, E, G (Major)", never the shifted chord).

**Acceptance Scenarios**:

1. **Given** standard tuning with no capo, **When** I place a capo at
   fret 3, **Then** frets 0–2 become unplayable/hidden, and Story 7's
   left handle locks to fret 3, labeled "Capo."

2. **Given** capo at fret 3 in standard tuning, **When** Absolute mode
   is active, **Then** the note at the capo position on the 5th (A)
   string displays as "C" (A + 3 semitones).

3. **Given** the same capo-3 setup, **When** Relative mode is active
   instead, **Then** that same physical position displays as "A" (the
   string's original open-string name, treated as the new reference
   point).

4. **Given** capo at fret 3 in Relative mode, **When** I fret 2 additional
   frets above the capo (physical fret 5) on the A string, **Then** it
   displays as "B" (A + 2 semitones from the capo reference) — while
   Absolute mode simultaneously shows "D" (A + 5 semitones, true pitch)
   for that same physical position.

5. **Given** any tuning/key/scale selection active, **When** a capo is
   placed or removed, **Then** all scale/chord/degree highlighting
   (Stories 3, 4, 5) recalculates correctly against the new set of
   playable frets — no stale highlighting from muted pre-capo frets.

6. **Given** capo set to 0 (no capo), **When** the fretboard renders,
   **Then** Absolute and Relative modes produce identical labels
   everywhere, and Story 7's left handle behaves exactly as originally
   specified (freely draggable, defaulting to "N").

7. **Given** root=C, capo=0, **When** either Absolute or Relative mode is active,
   **Then** `getHighlightRootSemitone` returns C — highlighting is unshifted
   regardless of label mode. *(Corrected UAT round 2, section A — this and
   Scenarios 8-12 replace a prior Scenario 7 that encoded a since-superseded
   design where highlighting never shifted at all.)*

8. **Given** root=C, capo=3, Absolute mode active, **When** the fretboard
   renders, **Then** `getHighlightRootSemitone` returns C (unshifted) — the
   shift only applies in Relative mode.

9. **Given** root=C, capo=3, Relative mode active, **When** the fretboard
   renders, **Then** `getHighlightRootSemitone` returns Eb (semitone 3) — the
   `+capoFret` result — never A (semitone 9, the old, superseded `-capoFret`
   result), and never C.

10. **Given** root=C, capo=3, Relative mode active (root highlighting shifted
    to Eb per Scenario 9), **When** the fretboard computes the diatonic set,
    default triad, chord-tone toggle eligibility, and chord-quality
    identification, **Then** all of these are computed consistently against
    Eb as root — never against C and never against A.

11. **Given** any root, capo, and label-mode combination, **When** any fret
    position is clicked/tapped, **Then** playback always sounds that
    string/fret's true physical pitch — completely unaffected by capo
    position or Absolute/Relative mode (unchanged from FR-032/Story 8
    Scenario 5).

12. **Given** root=C, capo=3, Relative mode active with the default C-major
    triad as focal point, **When** the "Bright notes" text summary renders,
    **Then** it always shows the TRUE root's chord tones ("C, E, G (Major)")
    — never the shifted root's tones — regardless of capo or label mode.

13. **Given** a capo is active, **When** the fretboard renders the capo's
    fret position as the visible left boundary, **Then** a vertical
    position-indicator renders at that position using a color and/or
    thickness visually distinct from the true nut's indicator, so a capo
    position is never visually confused with the instrument's physical nut.
    *(Added UAT round 2, section C.)*

---

### Edge Cases

- What happens when a custom tuning assigns the same or an unplayably low/high pitch to multiple strings? The app should still render and label the fretboard correctly using the raw pitch math, with no special-case rejection.
- What happens when the user switches root note or scale/mode while a non-default focal point or custom chord-tone override is active? Per Story 5, focal point resets to the new root (degree 1) and any custom bright-set override is cleared, since degree-role assignment is recalculated from scratch.
- What happens when a capo is placed at a fret at or beyond the current right-handle position of the fret-range slider (Story 7)? The right handle must move to remain at or above the capo position so the visible range never collapses to zero frets.
- What happens when the user narrows the fret-range slider to exclude the current focal point's chord tones? Highlighting logic still applies to underlying note data; only the visible/rendered frets are limited — no recalculation error should occur for out-of-view notes.
- What happens when rapid tuning changes are made while a note is still audibly playing? The in-flight note finishes per Story 8's Acceptance Scenario 4 (no improper cutoff), and subsequent triggers use the newly selected tuning.
- ~~What happens when the enharmonic sharp/flat toggle (Story 3) is applied to a root note with no meaningful enharmonic equivalent?~~ Moot per UAT round 1 section C3: the manual toggle is removed; every one of the 12 root options has exactly one fixed canonical spelling.
- What happens when a required audio sample fails to load (e.g., a network hiccup on first visit before samples are cached)? The app shows a visible, non-blocking error indicator (e.g. toast/banner) and continues to allow all other interaction; the fret that failed to load simply produces no sound until the sample can be fetched successfully on a later attempt.
- What happens when a non-diatonic note's label is shown while "Degrees" or "Intervals" label mode is active? It always displays its note name regardless of the active label mode — reviewed and CONFIRMED as intended behavior in UAT round 2 (`docs/story-drafts/003-uat-round2-fixes.md` section G), not a bug. No change made; deferred as a possible enhancement for a future round.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST render a 6-string fretboard oriented with string 1 (high-E) at the top and string 6 (low-E) at the bottom, spanning frets 0 (open/nut) through 24.
- **FR-002**: System MUST display inlay fret markers at frets 3, 5, 7, 9, 12, 15, 17, 19, 21, and 24, with a double-dot marker at frets 12 and 24 and single-dot markers elsewhere.
- **FR-003**: System MUST render open-string notes visually distinct from fretted notes, positioned to the left of fret 1 past the nut line.
- **FR-004**: System MUST visually distinguish any "active" note (in-scale, root, or chord tone) from inactive notes using both a color cue AND a non-color cue (shape/border), never color alone.
- **FR-005**: System MUST provide a tuning selector offering named tuning groups ("D-Family," "G-Family," "C-Family") with the exact tunings enumerated in User Story 2, plus a "Custom Tuning" option allowing independent per-string pitch assignment.
- **FR-006**: System MUST recalculate every string's pitch and every fretted note's label immediately upon any tuning change, whether from a named preset or a custom assignment.
- **FR-007**: System MUST derive enharmonic spelling (sharp vs. flat letter names) from the active key/scale context rather than a fixed global convention, for every tuning.
- **FR-008**: System MUST allow selection of a root note from all 12 chromatic pitch classes — displayed alphabetically as A, Ab, B, Bb, C, D, Db, E, Eb, F, F#, G — and highlight that pitch class as the root/tonic in every occurrence on the fretboard. *(Amended UAT round 1 section C3: previously 7 natural letters only.)*
- **FR-009**: System MUST determine each root's sharp/flat spelling automatically via a fixed circle-of-fifths convention (C, G, D, A, E, B, F# spelled sharp-side; Db, Ab, Eb, Bb, F spelled flat-side), applied consistently to the root's own label and to every other non-diatonic note's spelling, with NO user-facing sharp/flat toggle. *(Amended UAT round 1 section C3: replaces the removed manual "Prefer flats" toggle.)*
- **FR-010**: System MUST provide selection of any scale or mode from the canonical degree-formula tables in User Story 4 (7 Church Modes, 2 Pentatonic, 2 Blues, 2 Other), grouped in the selector as Church Modes, Pentatonic, Blues, and Other.
- **FR-011**: System MUST treat the degree-formula tables in User Story 4 as the single source of truth for scale/mode data, computing in-scale notes as exactly the root plus each listed semitone offset — no more, no fewer.
- **FR-012**: System MUST update the highlighted "in scale" note set immediately, with no stale highlighting, whenever the root, scale, or mode selection changes.
- **FR-013**: System MUST display, when "Degrees" label mode is active, each in-scale note's degree using the exact formula notation from the User Story 4 tables (e.g. "b3", "#4", "b7").
- **FR-014**: System MUST assign every note on the fretboard a fixed scale-degree color role (one of up to 12 chromatic positions relative to the key root: 1, b2, 2, b3, 3, 4, #4/b5, 5, b6, 6, b7, 7) whenever root + scale/mode are selected, and MUST NOT change this assignment when only the focal point changes.
- **FR-015**: System MUST render notes diatonic to the selected scale/mode in their assigned color-role dark variant by default, and render non-diatonic notes with no color (neutral base layer only).
- **FR-016**: System MUST default the focal point to the root (scale degree 1) whenever a new root or scale/mode is selected.
- **FR-017**: System MUST allow the user to change the focal point by clicking/tapping any diatonically colored note, and MUST prevent non-diatonic notes from being set as focal.
- **FR-018**: System MUST compute the focal point's diatonic triad by stacking the nearest diatonic thirds above it within the current scale, deriving triad quality (major/minor/diminished/augmented) from the actual key content rather than an assumed default quality.
- **FR-019**: System MUST render the focal triad's notes bright plus a secondary visual indicator (e.g. border), and render all other diatonic notes in the key dark.
- **FR-020**: System MUST allow the user to toggle individual diatonic scale members belonging to the focal point's scale into or out of the bright ("chord tone") set, while preventing any toggle of a chromatic alteration not diatonic to the current mode.
- **FR-021**: System MUST display the active bright note set (e.g. "E, G, B") together with a recognized chord-quality label (e.g. "Minor") whenever the set matches a standard chord shape, and MAY leave the label blank or show multiple candidates when the set does not map cleanly to one canonical name.
- **FR-022**: System MUST display every fret position's note name at all times as a neutral, non-distracting base layer, regardless of scale, key, or focal-point selection.
- **FR-023**: System MUST provide a label-mode control with at least three modes — "Notes" (letter names), "Degrees" (scale-degree numbers relative to the key root), and "Intervals" (interval names relative to the key root, e.g. "R", "M3", "P5", "m7") — applied to diatonic notes; non-diatonic notes always show their letter name in the neutral base-layer style.
- **FR-024**: System MUST visually distinguish the key root (scale degree 1) from other diatonic notes by both a color-role AND a secondary indicator (border/shape), in every label mode.
- **FR-025**: System MUST provide a dual-handle fret-range slider whose left handle controls the lower visible-fret bound (labeled "N" at the nut, or the fret number if moved past fret 0) and whose right handle controls the upper visible-fret bound (labeled with the fret number), defaulting on load to left="N" and right=24 with all frets 0–24 visible.
- **FR-026**: System MUST constrain the fret-range slider so the left handle cannot move past the right handle's position (or vice versa), always leaving at least one fret visible, and MUST hide frets outside the selected range.
- **FR-027**: System MUST provide an explicit reset control that restores the fret-range slider to its default N–24 full view when activated. The system MUST also restore this default on first load with no previously stored settings; a plain reload with existing stored settings MUST instead restore the last-used range per FR-039.
- **FR-028**: System MUST play, on click/tap of any fret position, the correct pitch at its correct octave using a recorded/multi-sampled real guitar tone (not a synthesized waveform).
- **FR-029**: System MUST produce audibly distinct playback for the same pitch class at different octaves (e.g. open low E vs. 12th-fret high E), never collapsing them to one sample or one octave.
- **FR-030**: System MUST fetch required audio assets once and reuse them for subsequent playback, without a live network dependency for notes already loaded, and without re-fetching per trigger.
- **FR-031**: System MUST support rapid sequential note triggers (e.g. fast scale runs) with each note playing cleanly, without improper cutoff of the previous note or audible lag.
- **FR-032**: System MUST always play the true physical (Absolute-mode) pitch for any fret position when a capo is active, regardless of whether Absolute or Relative label mode is currently displayed.
- **FR-033**: System MUST provide a capo control accepting a fret position from 0 (no capo) through 12, and MUST make all frets below an active capo position unplayable/muted.
- **FR-034**: System MUST compute each string's effective open pitch, when a capo is active, as the pitch that string would normally sound at the physical capo fret, without altering the underlying open-string-plus-semitones pitch formula.
- **FR-035**: System MUST lock the fret-range slider's left handle to the active capo's fret position (displaying a distinct "Capo" indicator in place of "N") whenever a capo is active, and MUST release it back to free movement (defaulting to "N") when the capo is set to 0.
- **FR-036**: System MUST keep the fret-range slider's right handle freely adjustable up to fret 24 independent of capo state, and MUST move the right handle to remain at or above the capo position if it would otherwise fall below it.
- **FR-037**: System MUST provide an Absolute label mode (true sounding pitch: open-string pitch class + physical fret semitones) and a Relative label mode (open-string pitch class + (physical fret − capo fret) semitones) for note names, and MUST produce identical labels in both modes whenever the capo is at 0.
- **FR-038**: System MUST recalculate all scale/chord/degree highlighting (root, scale, focal point, chord tones) against the current set of playable frets whenever a capo is placed or removed, leaving no stale highlighting on muted frets.
- **FR-039**: System MUST persist the user's current tuning, root note, enharmonic (sharp/flat) preference, scale/mode, capo position, label mode, and fret-range selections to `localStorage` as they change, and MUST restore them automatically on the next page load in place of the documented defaults.
- **FR-040**: System MUST version its persisted settings object with a `schemaVersion` field and apply any needed migration on load before using stored data, per the project's localStorage schema-versioning constraint.
- **FR-041**: System MUST display a visible, non-blocking error indicator (e.g. toast/banner) when a required audio sample fails to load, without blocking any other interaction, and MUST allow the affected note to be retried (e.g. on a subsequent tap) rather than permanently failing.
- **FR-042**: System MUST display a visible, always-accessible credit line attributing the FluidR3_GM sample source under its CC BY 3.0 license (e.g. in a footer or About section), satisfying the attribution condition of Story 8's sourcing constraints.

**The following requirements were added in UAT round 1 (`docs/story-drafts/002-mvp-uat-improvements.md`), sections C1–C5:**

- **FR-043** *(section C1)*: System MUST keep the fretboard's total rendered height and width fixed regardless of the visible fret range, and MUST scale fret spacing inversely with the number of currently visible frets — fewer visible frets render more spread out, filling the same fixed width — overriding the original "visibility only, no re-layout" simplification (frets outside the range are still excluded from pitch/diatonic recomputation, only their on-screen geometry changes).
- **FR-044** *(section C2)*: System MUST, when the capo fret changes, snap the fret-range slider's left handle to the new capo fret and shift the right handle by that same delta so the previously-visible fret-range WIDTH is preserved, clamping the right handle to a maximum of 24 regardless of the computed delta.
- **FR-045** *(section C4)*: System MUST color each scale-degree chord-tone toggle button to match its corresponding fretboard color role: the active/"on" state uses that role's bright variant, the diatonic-but-inactive/"off" state uses that role's dark variant, and non-diatonic (disabled) toggles remain visually disabled as already specified by FR-020.
- **FR-046** *(sections C5/E)*: System MUST display fret-position number labels at standard marker positions at both the visual top and bottom of the fretboard, following the same Absolute/Relative convention as note names — in Relative mode showing `(physicalFret − capoFret)`, in Absolute mode showing the true physical fret number — using the same arithmetic as `getRelativeLabelSemitone` without the note-name conversion step.

**The following requirements were added or corrected in UAT round 2 (`docs/story-drafts/003-uat-round2-fixes.md`), sections A–F. Section A supersedes the highlighting behavior implied by round 1's section A entirely — do not apply that section for this topic:**

- **FR-047** *(section A)*: System MUST compute a shifted highlight-root semitone, `getHighlightRootSemitone`, equal to `(trueRootSemitone + capoFret) mod 12` whenever capo > 0 AND Relative label mode is active, and equal to the true root semitone otherwise, and MUST use this value consistently as the root/root-derived input to diatonic-set computation (`getDiatonicSemitones`), default-triad computation (`computeDefaultTriad`), chord-tone-toggle eligibility (`isToggleableChordTone`), chord-quality identification (`identifyChordQuality`), degree-role assignment (`getDegreeRole`), degree labels (`getDegreeLabel`), and interval labels (`getIntervalLabel`) — never mixing true-root-based and shifted-root-based results across these functions.
- **FR-048** *(section A)*: System MUST NOT apply `getHighlightRootSemitone`'s shift to audio playback (every fret's true physical pitch, per FR-032/FR-034) or to the "Bright notes" chord-quality text summary, both of which MUST always reflect the true selected root regardless of capo position or Absolute/Relative mode.
- **FR-049** *(section B; resolved per Clarification 2026-07-19)*: System MUST render inlay dot markers at the standard marker frets' true PHYSICAL fret positions (3, 5, 7, 9, 12, 15, 17, 19, 21, 24) at all times, whether or not a capo is active — dot position MUST be computed from absolute physical fret number, completely independent of the Relative-mode renumbering logic used for fret-number labels and note names (FR-046, FR-037) — so dots remain visible and correctly aligned to the same physical column regardless of capo position or label mode, never silently failing to render or drifting to a different column.
- **FR-050** *(section C)*: System MUST render a visual position indicator (a vertical line/bar, matching the true nut's general treatment) at the active capo's fret position, using a color and/or thickness distinct from the true-nut indicator, so a capo position is never visually confused with the physical nut.
- **FR-051** *(section D)*: System MUST render the currently-selected root's button in the root selector using the same color as that root's degree-1/"root" color-role on the fretboard (FR-014, FR-024), for visual consistency between the control and the fretboard.
- **FR-052** *(section E)*: System MUST define all degree-role colors (bright and dark variants, for all 12 roles) plus root/UI accent colors as a single set of centrally-editable design tokens (e.g. CSS custom properties declared once in a `:root` block) rather than hardcoded per-component values, such that the entire color scheme can be changed by editing that one location alone — this is a refactor of WHERE colors are defined, not a change to any color's current value or to any other behavior.
- **FR-053** *(section F)*: System MUST display a link to `https://buymeacoffee.com/stevetakadimi`, opening in a new tab (`target="_blank" rel="noopener noreferrer"`), with text "☕ Enjoying Fret Navigator? Buy me a coffee →", placed near the existing attribution/credit line (FR-042) and styled consistently with existing fonts, colors, and spacing.

### Key Entities

- **Note**: A pitch at a specific string/fret position; carries a pitch class, absolute octave/MIDI value, and (when applicable) an enharmonic spelling, a scale-degree role, and diatonic/non-diatonic status relative to the active key.
- **String**: One of the 6 physical guitar strings (1 = high-E through 6 = low-E); carries an open pitch determined by the active tuning.
- **Tuning**: A named or custom set of 6 open-string pitches; belongs to a tuning group (D-Family, G-Family, C-Family, or Custom) when named.
- **Scale/Mode**: A named degree formula (from the canonical tables in Story 4) defining which semitone offsets from a root are diatonic; belongs to a category (Church Modes, Pentatonic, Blues, Other).
- **Key Context**: The combination of root note (one of the 12 canonical chromatic roots, each with a fixed circle-of-fifths sharp/flat spelling — UAT round 1 section C3) and active scale/mode that determines every note's diatonic status, degree role, and label spelling. For highlighting purposes (color, degree roles/labels, interval labels, chord-tone membership) the effective root is `getHighlightRootSemitone`'s output, which shifts from the true root only when capo > 0 AND Relative label mode is active (UAT round 2 section A); audio and the "Bright notes" text summary always use the true root regardless.
- **Focal Point**: The currently selected scale-degree acting as the reference for chord-tone (bright set) computation; defaults to the root and resets on key/scale change.
- **Chord-Tone Set**: The user-adjustable set of diatonic degrees currently marked "bright" relative to the focal point, along with an optional recognized chord-quality label.
- **Label Mode**: The current note-label rendering choice — Notes, Degrees, or Intervals — applied to diatonic notes on top of the persistent base layer.
- **Fret Range**: The user-adjustable visible window of frets, bounded by a left handle (nut or capo-locked) and a right handle (up to fret 24).
- **Capo**: A single fret position (0–12) that mutes all frets below it, shifts the reference point used by Relative-mode note-name labeling and (per UAT round 2 section A) by highlighting via `getHighlightRootSemitone`, without altering true sounding pitch; rendered on the fretboard with its own visual position indicator distinct from the true nut (UAT round 2 section C).
- **Audio Sample**: A pre-recorded, real-guitar-tone asset mapped to a specific note/octave, fetched once and reused for playback.
- **Color Token**: A centrally-defined design-system value (e.g. a CSS custom property) representing one of the 12 degree-role colors (bright/dark variants), a root/UI accent color, or another fretboard color, serving as the single editable source for that color across every component that renders it (UAT round 2 section E).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of rendered notes match their expected pitch class and diatonic status for every combination of tuning, root, and scale/mode, verified against the canonical degree-formula tables.
- **SC-002**: Changing tuning, root, scale/mode, focal point, label mode, fret range, or capo position updates the entire fretboard's highlighting and labels with no perceptible delay (updates feel instantaneous to the user, with no stale or flickering intermediate state).
- **SC-003**: A user unfamiliar with the tool can correctly identify the notes of a selected scale, the current root, and the current focal chord's tones at a glance, relying on shape/border cues alone (i.e., with color removed or simulated as colorblind), with no loss of information.
- **SC-004**: A user can narrow the visible fretboard to any target fret range (e.g. frets 1–5) in two or fewer direct interactions with the range slider.
- **SC-005**: Clicking/tapping any fret position produces audible, correctly-pitched, correct-octave playback with no perceptible delay between interaction and sound onset, for 100% of playable positions.
- **SC-006**: A user studying a capoed song can correctly relate the Relative-mode "as if uncapoed" labels to real tutorial shapes while the app simultaneously confirms the true Absolute-mode pitch, without needing outside reference material.
- **SC-007**: After first successful load, the app remains fully usable (all visual features and audio playback) without any further network requests.

## Assumptions

- The fretboard covers frets 0 (open/nut) through 24 as the maximum physical range, per User Story 7's stated maximum.
- Capo position is capped at fret 12 as a reasonable maximum for a physical capo; this is an explicit assumption carried over from the source material and may be revisited if a different cap is wanted.
- The active capo's fret-range lower-bound indicator is labeled "Capo" (distinct from "N" for the open nut) to avoid confusing "physical nut" with "capo position"; this is an explicit assumption carried over from the source material and may be revisited in favor of simply showing the fret number.
- Final selection and license verification of the real-guitar-sample audio source (e.g. FluidR3_GM soundfont via an open-source browser player) is deferred to the planning stage, per User Story 8's sourcing constraints; this specification only requires that whatever source is chosen satisfies the stated licensing and multi-sample constraints.
- The app is a single-page, client-side-only experience with no backend, consistent with the project constitution. Per the Clarifications session, the user's last-used tuning, root/key, scale/mode, capo position, label mode, and fret range ARE persisted via `localStorage` (schemaVersion'd) and restored on reload; no other persistence (e.g. multiple named custom-tuning presets) is required unless it emerges during planning.
- Switching root note or scale/mode resets focal point to the new root and clears any custom chord-tone override, since degree-role assignment is fully recalculated from the new key context (per Story 5's fixed-until-key-changes rule).
- Standard tuning (E A D G B E) is available in the tuning selector as the default/baseline tuning alongside the named alternate-tuning groups, since User Story 2's acceptance scenarios reference it as a baseline for capo examples.
- The capo position indicator's exact color and/or thickness (UAT round 2 section C) is left to the planning/design stage, provided it is visually distinct from the true-nut indicator; the requirement only constrains that the two must never be visually confusable.
- The color-scheme design-token refactor (UAT round 2 section E) is a pure refactor with no intended change to any color's current rendered value — if implementation reveals a token's current value was itself inconsistent across components, that discrepancy should be flagged rather than silently resolved one way or the other.

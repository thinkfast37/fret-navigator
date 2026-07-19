### User Story 1 - Visualize the fretboard layout (Priority: P1)

As a guitarist, I want to see a visually accurate, guitar-oriented fretboard
(not sheet-music oriented), so that note positions map intuitively to my
physical instrument.

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

---

### User Story 2 - Change tuning (Priority: P1)

As a guitarist, I want to select from a library of named tunings (or define
a custom one), so that I can see how note positions shift across alternate tunings.

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

As a guitarist, I want to choose a root note and whether it displays as sharp
or flat, so that the fretboard matches the key signature I'm thinking in.

**Acceptance Scenarios**:
1. **Given** the app is loaded, **When** I select a note letter (C D E F G A B),
   **Then** the fretboard highlights that note as the root/tonic everywhere it appears.
2. **Given** a root note has an enharmonic equivalent, **When** I toggle
   sharp vs. flat, **Then** all affected note labels switch spelling
   (e.g. F# vs Gb) without changing pitch or highlighted positions.

---

### User Story 4 - Choose scale or mode (Priority: P1)

As a guitarist, I want to select a scale or mode relative to my root note,
so that I can see which notes belong to that scale across the fretboard.

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

6. **Given** any adjusted range, **When** I reset (if a reset control
   exists) or reload, **Then** the range returns to the default
   N–24 full view.

---

### User Story 8 - Hear notes on the fretboard (Priority: P1)

As a guitarist, I want to click/tap a fret position and hear its pitch
played back with a real guitar tone (not a generic synth beep), so that
I can connect the visual fretboard to actual sound.

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

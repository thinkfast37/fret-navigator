# Research — Feature 003 Chord Mode

Decisions made 2026-09-07 with the maintainer (interactive clarification round) and
during planning. Each entry: Decision / Rationale / Alternatives considered.

## R-301: Replace, don't coexist with, the focal-point system

- **Decision**: The chord picker + view toggle fully replaces focal-point clicks, the 12
  per-degree toggle buttons, bright/dim rendering, and the "Bright notes" summary.
- **Rationale**: Maintainer's explicit choice ("Replace"). Two overlapping chord concepts
  would double maintenance and confuse the UI the feature exists to simplify.
- **Alternatives**: Keeping both behind the view toggle — rejected by maintainer.

## R-302: Chord quality vocabulary and formulas

- **Decision**: 20 qualities as data (`CHORD_QUALITIES` in `theory.js`), intervals in
  semitones from the chord root:
  Major [0,4,7]; Minor [0,3,7]; Diminished [0,3,6]; Augmented [0,4,8]; Sus2 [0,2,7];
  Sus4 [0,5,7]; 7 [0,4,7,10]; Maj7 [0,4,7,11]; m7 [0,3,7,10]; m7b5 [0,3,6,10];
  Dim7 [0,3,6,9]; 6 [0,4,7,9]; m6 [0,3,7,9]; 9 [0,2,4,7,10]; m9 [0,2,3,7,10];
  Maj9 [0,2,4,7,11]; Add9 [0,2,4,7]; 11 [0,2,4,5,7,10]; 13 [0,2,4,7,9,10];
  7sus4 [0,5,7,10].
- **Rationale**: Maintainer chose "Full extended". Standard jazz/pop formulas; extensions
  include implied lower tones; the 13 omits the 11 per common practice (spec Assumption).
  On a 12-pitch-class fretboard, 9/11/13 collapse to their pitch classes (2/5/9), which
  is exactly what highlighting needs.
- **Alternatives**: Triads-only (too small per maintainer); omitting the full stacks from
  extended chords (rejected — spec edge case says show the full theoretical stack).

## R-303: Chord root stored as an offset from the scale root

- **Decision**: State stores `chordRootOffset` (0–11, semitones above the scale root),
  not an absolute pitch class.
- **Rationale**: The chord is chosen *within the context of the scale* (a "degree"), and
  the capo binding rule then composes naturally: fretboard membership =
  `highlightRoot + chordRootOffset + quality intervals`, while the summary text uses
  `trueRoot + chordRootOffset` — the same two-root split the codebase already has
  (FR-047/FR-048). Matches how `focalDegreeSemitone` worked, minimizing render-path change.
- **Alternatives**: Absolute pitch class — breaks the degree framing and would need its
  own capo shift logic.

## R-304: Degree labels — Roman numerals with data-driven borrowed sources

- **Decision**: For 7-note scales, each of the 12 chromatic offsets gets a numeral from a
  fixed chromatic table (I, bII, II, bIII, III, IV, #IV/bV, V, bVI, VI, bVII, VII),
  adjusted to the scale: a diatonic offset uses the scale's own `degreeFormula` accidental
  and is cased by the diatonic triad built on it (upper = major/augmented, lower =
  minor/diminished, "°" suffix for diminished, "+" for augmented). Non-diatonic offsets
  keep the chromatic-table spelling in upper case and are annotated with borrowed-from
  sources computed by scanning the other church modes on the same tonic for membership
  (listing up to two, preferring Aeolian/Ionian which additionally read
  "parallel minor"/"parallel major"). Non-7-note scales (pentatonic/blues) skip numeral
  analysis: options are labelled by note name with an "in scale" marker (AC-3.3.3).
- **Rationale**: Casing from the actual diatonic triad is the standard convention and is
  computable from the existing `computeDefaultTriad`/`getTriadQuality`. Scanning parallel
  modes is data-driven (no hand-maintained mixture table), pure, and produces the
  requested "bVII (borrowed: Mixolydian / parallel minor)" for Ionian automatically.
  Harmonic/melodic minor are excluded as borrow sources to keep names conventional.
- **Alternatives**: Hand-written mixture table per scale (more editorial control, more
  maintenance, silent gaps); no source names (maintainer chose "Degree + borrowed-from").

## R-305: Default chord on root/scale change

- **Decision**: Changing scale root or scale resets `chordRootOffset` to 0 and
  `chordQualityId` to the scale's own degree-1 triad quality via
  `getDefaultChordQualityId(scaleId)`: `getTriadQuality(computeDefaultTriad(0, …))` when
  recognized; otherwise minor if the scale contains a b3, else major.
- **Rationale**: Mirrors the old focal-point reset rule (least surprise), and the tonic
  chord is the musically obvious default. The fallback covers pentatonic/blues scales
  whose stacked "triad" isn't tertian.
- **Alternatives**: Keeping the chord selection across scale changes — a D minor chord
  makes no degree sense after switching keys; rejected.

## R-306: Chord view rendering — three layers by class

- **Decision**: `fretboard.js` computes `computeChordToneSet(appState)` (absolute pitch
  classes from the highlight root) and in chord view assigns per note exactly one of:
  `is-chord-tone` (full colour + label, existing role colour relative to the scale
  highlight root; out-of-scale chord tones get a neutral chord colour), `is-ghost`
  (scale member, faint small dot, empty label, still clickable for audio, aria-label
  retained), or `chord-hidden` (`display: none` on the group, tabindex −1). Scale view
  renders exactly as today minus bright/dim.
- **Rationale**: Reuses the existing per-note class-toggle render path (no DOM
  restructuring); satisfies FR-111 (ghost distinguished by missing label + smaller
  marker, not colour alone; hidden notes leave the tab order).
- **Alternatives**: Opacity-only ghosting (fails colour-independence); removing ghost
  nodes from the DOM (fights the prebuilt-skeleton architecture).

## R-307: Schema migration v1 → v2

- **Decision**: `schemaVersion: 2`. `migrate()` upgrades v1 payloads: drop
  `focalDegreeSemitone` and `chordToneOverrides`, add `chordRootOffset: 0`,
  `chordQualityId` from `getDefaultChordQualityId(scaleId)`, `viewMode: "scale"`.
  All surviving v1 fields pass through unchanged. Idempotent and append-only per the
  constitution.
- **Rationale**: The old fields describe UI the app no longer has; mapping an arbitrary
  bright set onto a named chord quality is lossy and often impossible, so the degree-I
  default is the honest migration. Everything the user actually configured (tuning, root,
  scale, capo, range, label modes) survives (AC-3.1.6).
- **Alternatives**: Attempting bright-set → chord inference (unreliable); discarding the
  whole payload (violates the constitution's no-silent-discard rule).

## R-308: Superseded feature 001 Story 5 ACs and their tests

- **Decision**: Feature 001's Story 5 ACs (focal point, toggles, bright/dim, Bright-notes
  summary) are revised with dated parentheticals marking them superseded by feature 003;
  their tests are removed or rewritten against the new ACs in the same change, each
  removal citing the 001 spec revision. Baseline entries for superseded ACs are pruned.
- **Rationale**: §2/§2a of the working agreement — spec before code; a test may change
  only when the AC that justified it changes first, which is exactly this case.
- **Alternatives**: Leaving Story 5 ACs intact (they would contradict feature 003 and
  fail honest traceability).

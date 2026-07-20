# Contract: `js/theory.js` Public Function Signatures

This is the "public API" contract for the app's single canonical music-theory module (constitution
Principle I). It is the internal library boundary that `tests/theory.test.js` exercises directly
and that `fretboard.js`/`audio.js`/`controls.js` call into — no other module may duplicate this
math. All functions are pure: same inputs always produce the same outputs, no I/O, no mutation of
arguments.

## Reference data exports

- `TUNINGS: Tuning[]` — all named tunings (Standard + D/G/C-Family, per data-model.md), grouped by
  `group`.
- `SCALES: Scale[]` — all 13 scales/modes from the Story 4 tables, grouped by `category`.
- `DEGREE_ROLES: ChromaticDegreeRole[]` — the 12 chromatic scale-degree roles.
- `ROOTS: Root[]` *(added UAT round 1 section C3)* — all 12 canonical chromatic roots, in display
  order (A, Ab, B, Bb, C, D, Db, E, Eb, F, F#, G), each with its `semitone` and fixed
  circle-of-fifths `accidentalPreference`. Replaces the naturals-only 7-letter root model.

## Pitch computation

### `noteAt(tuning, stringIndex, fret) -> { midiNote, pitchClassSemitone }`
- **Input**: a `Tuning` (or custom equivalent), `stringIndex` (0–5), `fret` (0–24).
- **Output**: the absolute MIDI note number and its pitch-class semitone (0–11).
- **Contract**: `fret` is always physical fret position (never capo-relative) — this is the single
  source of true sounding pitch used everywhere audio is triggered (FR-028, FR-029, FR-032).

### `spellPitchClass(semitone, keyContext) -> string`
- **Input**: a semitone 0–11, and the current `{ root, accidentalPreference, scaleId }`, where
  `root` is now any of the 12 canonical `ROOTS` labels (e.g. `"Db"`, `"F#"`), not naturals-only
  (amended UAT round 1 section C3).
- **Output**: the letter name (e.g. `"F#"` or `"Gb"`) spelled consistently with the active
  key/scale context (FR-007) — never a fixed global sharp/flat default.
- **Contract**: the diatonic-spelling branch derives its starting natural letter from `root`'s
  own first character (e.g. `"Db"[0] === "D"`, `"F#"[0] === "F"`) — every canonical root label is
  exactly one natural letter optionally followed by a single accidental, so this is always
  unambiguous and requires no separate root→letter lookup table.

### `rootLetterToSemitone(rootLabel) -> number`
- **Input**: any of the 12 canonical `ROOTS` labels (amended UAT round 1 section C3 — previously
  naturals-only).
- **Output**: that root's chromatic semitone (0–11).

## Scale/degree computation

### `getDiatonicSemitones(root, scaleId) -> Set<number>`
- **Output**: exactly the semitones (0–11, relative to chromatic 0=C) that are in-scale for this
  root+scale — root's semitone plus each of `scaleId`'s `semitoneOffsets`, mod 12. No more, no
  fewer (FR-011).

### `getDegreeRole(semitoneFromRoot) -> ChromaticDegreeRole`
- **Output**: the fixed color-role descriptor for a semitone-from-root position (0–11), independent
  of whether that position is currently diatonic (FR-014).

### `getDegreeLabel(semitoneFromRoot, scaleId) -> string`
- **Output**: the exact formula token from the Story 4 tables (e.g. `"b3"`, `"#4"`, `"b7"`) for a
  diatonic semitone-from-root within the given scale (FR-013). Throws/returns `null` if the
  semitone is not diatonic to `scaleId` (callers must check `isDiatonic` first).

### `getIntervalLabel(semitoneFromRoot) -> string`
- **Output**: interval shorthand relative to root (e.g. `"R"`, `"M3"`, `"P5"`, `"m7"`) for
  "Intervals" label mode (FR-023).

## Chord/focal-point computation

### `computeDefaultTriad(focalSemitone, root, scaleId) -> number[3]`
- **Output**: the 3 semitones-from-root forming the focal point's diatonic triad, built by
  stacking the nearest diatonic thirds above it within the scale (FR-018). Triad quality is an
  emergent property of these 3 semitones, not a separate assumed input.

### `getTriadQuality(triadSemitones) -> "major"|"minor"|"diminished"|"augmented"|null`
- **Output**: quality derived purely from the interval structure of the given 3 semitones — never
  passed in or assumed (FR-018).

### `isToggleableChordTone(semitoneFromRoot, root, scaleId) -> boolean`
- **Output**: `true` only if `semitoneFromRoot` is in `getDiatonicSemitones(root, scaleId)` — gates
  the custom chord-tone override UI (FR-020, Story 5 Acceptance Scenarios 5–7).

### `identifyChordQuality(brightSetSemitones, root) -> string | null`
- **Output**: a recognized chord-quality label (e.g. `"Minor"`, `"Sus4"`) when `brightSetSemitones`
  matches a standard shape relative to `root`, else `null` (FR-021 — ambiguous sets may legitimately
  return `null` rather than a guessed name).

## Capo computation

### `getHighlightRootSemitone(rootSemitone, capoFret, labelMode) -> number`
*(Added/corrected UAT round 2, section A — supersedes round 1's "Root stability rule" below;
do not apply round 1's rule for this topic.)*
- **Output**: `(rootSemitone + capoFret) mod 12` when `capoFret > 0 AND labelMode === "relative"`;
  otherwise `rootSemitone` unchanged (FR-047).
- **Contract**: the sign is deliberately **`+capoFret`**, not `-capoFret`. This is a NEW function —
  it is not a revival of the round-1-removed `getDisplayRootSemitone` (which used `-capoFret` and
  was wrong). Worked example: `rootSemitone=0` (C), `capoFret=3` → returns `3` (Eb).

**Highlighting-root rule** *(corrects round 1's "Root stability rule" — see history note below)*:
`getDiatonicSemitones`, `computeDefaultTriad`, `isToggleableChordTone`, `identifyChordQuality`,
`getDegreeRole`, `getDegreeLabel`, and `getIntervalLabel` all take `getHighlightRootSemitone`'s
OUTPUT — not the literal Story-3-selected root's raw semitone — as their `root`/root-derived input,
consistently, whenever capo>0 AND Relative mode is active (FR-047). All must shift together; never
some anchored to the true root while others use the shifted one.

**What stays anchored to the literal true root always** (never fed by `getHighlightRootSemitone`,
regardless of capo position or Absolute/Relative mode) — FR-048:
- `noteAt`/`midiNote` — always the true sounding pitch (unchanged from round 1; FR-032, FR-034).
- The "Bright notes: X, Y, Z (Quality)" text-summary computation. This means callers need TWO
  separate invocations of `computeDefaultTriad`/`identifyChordQuality` when a capo+Relative shift
  is active: one fed `getHighlightRootSemitone`'s output (drives what's actually rendered bright on
  the fretboard), and one fed the literal true root semitone (drives the text summary only). These
  two invocations may legitimately disagree on which pitch classes they name — that divergence is
  intentional (Story 9 Acceptance Scenario 12), not a bug to reconcile.

**History note**: round 1 (`docs/story-drafts/002-mvp-uat-improvements.md` section A) had
established a "Root stability rule" stating these functions ALWAYS take the literal selected root,
with no shift ever — that rule is now superseded by the above. Do not reintroduce the round-1
behavior; do not revive `getDisplayRootSemitone`'s `-capoFret` formula either. `getHighlightRootSemitone`
is the sole, currently-correct function for this purpose.

### `getRelativeLabelSemitone(physicalFret, capoFret) -> number`
- **Output**: `physicalFret - capoFret`, the semitone offset added to a string's ORIGINAL
  open pitch class (never a capo-raised pitch) for Relative-mode NOTE NAME display only
  (FR-037). When `capoFret === 0`, this always equals `physicalFret`, guaranteeing Absolute
  and Relative modes produce identical note-name labels with no capo.

**Note-name resolution in Relative mode**: Relative-mode note names are NOT produced by a
capo-specific function. The caller computes them as
`spellPitchClass(tuning.openPitchClasses[stringIndex]'s semitone + getRelativeLabelSemitone(fret, capoFret), keyContext)`
— using the tuning's already-defined static open pitch class (data-model.md's `Tuning.openPitchClasses`)
directly, never a capo-raised pitch. This is why no separate "effective open pitch" function
exists in this contract: the reference point is existing static tuning data, not a new
computation.

### `isFretPlayable(fret, capoFret) -> boolean`
- **Output**: `fret >= capoFret` (FR-033).

## Testability contract

Every function above must be covered by `tests/theory.test.js` for at minimum: open strings
(`fret=0`), the 12-fret octave wraparound, enharmonic equivalents, every `Tuning` in `TUNINGS`,
and edge frets (0, 12, 24) — per the constitution's Principle I hard-gate requirement.

Include `getHighlightRootSemitone` regression test cases per the spec's required tests (UAT round
2 section A) — do NOT assert the round-1 "identical results with/without capo" behavior; that
rule is superseded:
1. root=C, capo=0: `getHighlightRootSemitone` returns C regardless of Absolute/Relative mode.
2. root=C, capo=3, Absolute mode: `getHighlightRootSemitone` returns C (unshifted).
3. root=C, capo=3, Relative mode: `getHighlightRootSemitone` returns Eb (3) — never A (9, the old
   `-capoFret` result) and never C.
4. root=C, capo=3, Relative mode: `getDiatonicSemitones`/`computeDefaultTriad`/
   `isToggleableChordTone`/`identifyChordQuality` all produce results consistent with root=Eb, not
   root=C and not root=A.
5. `noteAt`/`midiNote` for any tuning/string/physical-fret combination is COMPLETELY UNCHANGED by
   capo or Absolute/Relative mode.
6. The "Bright notes" text-summary computation (wherever it lives) always uses the true root (C,
   E, G for root=C major), never `getHighlightRootSemitone`'s output, regardless of capo/mode.

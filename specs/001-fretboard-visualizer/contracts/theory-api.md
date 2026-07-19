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

## Pitch computation

### `noteAt(tuning, stringIndex, fret) -> { midiNote, pitchClassSemitone }`
- **Input**: a `Tuning` (or custom equivalent), `stringIndex` (0–5), `fret` (0–24).
- **Output**: the absolute MIDI note number and its pitch-class semitone (0–11).
- **Contract**: `fret` is always physical fret position (never capo-relative) — this is the single
  source of true sounding pitch used everywhere audio is triggered (FR-028, FR-029, FR-032).

### `spellPitchClass(semitone, keyContext) -> string`
- **Input**: a semitone 0–11, and the current `{ root, accidentalPreference, scaleId }`.
- **Output**: the letter name (e.g. `"F#"` or `"Gb"`) spelled consistently with the active
  key/scale context (FR-007) — never a fixed global sharp/flat default.

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

### `getDisplayRootSemitone(trueRootSemitone, capoFret, pitchReferenceMode) -> number`
- **Input**: the Story 3-selected root's semitone, current capo fret, and current
  Absolute/Relative mode.
- **Output**: `trueRootSemitone` when `capoFret === 0` or `pitchReferenceMode === "absolute"`;
  otherwise `(trueRootSemitone - capoFret + 12) mod 12`.
- **Contract**: this is the ONLY root semitone that `getDiatonicSemitones`, `getDegreeRole`,
  `getDegreeLabel`, `getIntervalLabel`, and all focal-point/chord-tone computation may use
  when Relative mode + an active capo apply. The literal Story-3 root selection is preserved
  unchanged in the UI and in Key Context's `root` field — only internal calculation redirects
  through this function's output. When `capoFret === 0`, output always equals
  `trueRootSemitone`, guaranteeing identical highlighting/labels with no capo (Story 9
  Acceptance Scenario 6).

**Binding rule**: `getDiatonicSemitones`, `computeDefaultTriad`, `isToggleableChordTone`, and
`identifyChordQuality` all take a `root` parameter above. That parameter MUST be
`getDisplayRootSemitone`'s output, never the raw Story-3-selected root directly, whenever
Relative mode + an active capo apply — otherwise diatonic highlighting and focal-point/chord-tone
computation silently stay anchored to the true root even though Story 9 Acceptance Scenario 7
requires them to shift. When capo is 0 or Absolute mode is active, `getDisplayRootSemitone`
already returns the true root unchanged, so calling these four functions with its output is
always correct — callers should route through it unconditionally rather than branching.

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

Include a capo + Relative-mode test case that verifies `getDiatonicSemitones`, `computeDefaultTriad`,
`isToggleableChordTone`, and `identifyChordQuality` all shift correctly when called with
`getDisplayRootSemitone`'s output.

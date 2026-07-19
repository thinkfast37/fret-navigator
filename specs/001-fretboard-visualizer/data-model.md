# Phase 1 Data Model: Interactive Guitar Fretboard Visualizer

This document translates the spec's Key Entities into concrete field-level shapes shared by the
in-memory app state (`js/state.js`), the `theory.js` pure functions (`contracts/theory-api.md`),
and the persisted `localStorage` object (`contracts/settings-schema.md`). There is no database —
every entity below is a plain JS value (object/array/primitive), not a persisted record with its
own lifecycle, except where noted.

## Core reference data (static, bundled in `js/theory.js`)

### Tuning
| Field | Type | Notes |
|---|---|---|
| `id` | string | Stable identifier, e.g. `"drop-d"`, `"open-g"`, `"custom"`. |
| `label` | string | Display name, e.g. `"Drop D"`, `"DADGAD / \"Dsus4\""`. |
| `group` | `"D-Family" \| "G-Family" \| "C-Family" \| "Standard" \| "Custom"` | Selector grouping (FR-005). Standard (E A D G B E) is included as the default/baseline tuning per the spec's Assumptions. |
| `openPitchClasses` | `string[6]` | Pitch class per string, index 0 = string 1 (high-E) ... index 5 = string 6 (low-E), e.g. `["E","B","G","D","A","D"]` for Drop D. |
| `openOctaves` | `number[6]` | Reference octave per string's open pitch, needed for correct absolute MIDI (FR-029). |

All ~17 named tunings enumerated in User Story 2 (D-Family ×8, G-Family ×5, C-Family ×4) plus
Standard are represented as `Tuning` records; "Custom Tuning" is the same shape with user-supplied
`openPitchClasses`/`openOctaves` instead of a preset.

### Scale/Mode
| Field | Type | Notes |
|---|---|---|
| `id` | string | e.g. `"dorian"`, `"minor-pentatonic"`, `"harmonic-minor"`. |
| `label` | string | Display name exactly as in the Story 4 tables. |
| `category` | `"Church Modes" \| "Pentatonic" \| "Blues" \| "Other"` | Selector grouping (FR-010). |
| `degreeFormula` | `string[]` | Exact formula tokens from Story 4, e.g. `["1","2","b3","4","5","6","b7"]` for Dorian — used verbatim for "Degrees" label mode (FR-013). |
| `semitoneOffsets` | `number[]` | Matching semitone-from-root values, e.g. `[0,2,3,5,7,9,10]` for Dorian — the single source of truth for in-scale computation (FR-011). |

All 13 scales/modes from Story 4's four tables are represented as `Scale` records.

### Chromatic Degree Role
| Field | Type | Notes |
|---|---|---|
| `semitoneFromRoot` | `0..11` | One of the 12 chromatic positions. |
| `roleLabel` | string | Canonical degree name for that position: `1, b2, 2, b3, 3, 4, #4/b5, 5, b6, 6, b7, 7` (Story 5 Color & Degree Model). |
| `colorRoleId` | string | Stable id used to look up bright/dark CSS variants in `css/styles.css`. |

### Root *(added UAT round 1 section C3 — replaces the naturals-only 7-letter root)*
| Field | Type | Notes |
|---|---|---|
| `label` | string | One of the 12 canonical root labels, e.g. `"Db"`, `"F#"`, `"C"`. |
| `semitone` | `0..11` | The root's chromatic pitch class. |
| `accidentalPreference` | `"sharp" \| "flat"` | Fixed by circle-of-fifths convention for this root (C, G, D, A, E, B, F# = sharp; Db, Ab, Eb, Bb, F = flat) — not user-settable. |

All 12 `Root` records are represented, displayed in the selector in this exact alphabetical
order: A, Ab, B, Bb, C, D, Db, E, Eb, F, F#, G (FR-008). Selecting a root sets Key Context's
`root` AND automatically derives `accidentalPreference` from this table (FR-009) — there is no
independent user-facing accidental toggle.

## Runtime/computed entities (produced by `theory.js`, consumed by `fretboard.js`)

### Key Context
Derived, not stored directly — computed from `{ root, accidentalPreference, scale }`.
| Field | Type | Notes |
|---|---|---|
| `root` | string (one of the 12 `Root.label` values) | Selected root pitch class (FR-008; amended UAT round 1 section C3 — previously naturals-only). |
| `accidentalPreference` | `"sharp" \| "flat"` | Derived automatically from `root` via the `Root` reference table's circle-of-fifths convention (FR-009); no longer an independent user toggle (UAT round 1 section C3 removes the "Prefer flats" checkbox). |
| `scaleId` | string | FK into `Scale` reference data. |
| `diatonicSemitones` | `Set<0..11>` | The literal selected root's semitone + each `scale.semitoneOffsets`, mod 12 — the exact "in scale" set (FR-011, FR-012). Unaffected by capo position or Absolute/Relative mode (UAT round 1 section A) — `diatonicSemitones`, degree-role assignment, degree labels, interval labels, and focal-point/chord-tone computation all key off the literal selected root at all times. |

### Note (one per string × fret × current tuning/capo)
Computed per render, not persisted individually.
| Field | Type | Notes |
|---|---|---|
| `stringIndex` | `0..5` | 0 = string 1 (high-E) ... 5 = string 6 (low-E). |
| `fret` | `0..24` | 0 = open string. |
| `midiNote` | number | Absolute pitch used for audio playback (FR-028, FR-029, FR-032) — always true sounding pitch regardless of label mode. |
| `pitchClass` | string | Letter name at this position, spelled per `accidentalPreference` and Key Context (FR-007). |
| `degreeRole` | Chromatic Degree Role reference or `null` | `null` when non-diatonic (Story 5: "receive no color at all"). |
| `isDiatonic` | boolean | Derived from `degreeRole !== null`. |
| `isRoot` | boolean | True when `pitchClass` matches the Key Context root. |
| `isFocalChordTone` | boolean | True when this degree is in the current Chord-Tone Set (Story 5). |
| `isPlayable` | boolean | False when muted by an active capo (`fret < capoFret`) — Story 9. |
| `displayLabel` | string | Computed per active Label Mode (Notes/Degrees/Intervals) and Absolute/Relative mode (FR-023, FR-037). |

### Focal Point / Chord-Tone Set
| Field | Type | Notes |
|---|---|---|
| `focalDegreeSemitone` | `0..11` | Semitone-from-root of the current focal point; defaults to `0` (the root) on every root/scale change (FR-016). |
| `defaultTriadSemitones` | `number[3]` | Computed by stacking nearest diatonic thirds above the focal point within the current scale (FR-018). |
| `chordToneOverrides` | `{ semitone: 0..11, on: boolean }[]` | User toggles layered on top of `defaultTriadSemitones`; only entries whose `semitone` is in `diatonicSemitones` are valid (FR-020). |
| `activeBrightSet` | `number[]` | `defaultTriadSemitones` merged with `chordToneOverrides`; the notes rendered bright + bordered. |
| `chordQualityLabel` | string \| null | Recognized chord-quality name (e.g. `"Minor"`) when `activeBrightSet` matches a standard shape, else `null` (FR-021). |

### Fret Range
| Field | Type | Notes |
|---|---|---|
| `lowerBound` | `0..24` | Left-handle position; `0` displays as `"N"` unless a capo locks it (Story 7/9). |
| `upperBound` | `0..24` | Right-handle position; always shown as its fret number. |
| Invariant | — | `lowerBound <= upperBound` at all times (FR-026); when a capo is active, `lowerBound === capoFret` and is not user-adjustable (FR-035). |

`Fret Range` now also drives the fretboard's rendered horizontal geometry (FR-043, UAT round 1
section C1): fret spacing is recomputed each render as the fixed total drawable width divided by
`(upperBound - firstVisibleFret + 1)`, so a narrower range spreads its frets out rather than
shrinking. This is a layout-only recomputation — it never touches `Note.midiNote` or Key Context.
When the capo fret changes, `lowerBound` snaps to it and `upperBound` shifts by the same delta to
preserve the previously-visible width, clamped to a maximum of 24 (FR-044, section C2).

### Capo
| Field | Type | Notes |
|---|---|---|
| `capoFret` | `0..12` | `0` = no capo (FR-033). |
| `labelMode` (capo-scoped) | `"absolute" \| "relative"` | Governs `displayLabel` computation only; audio always uses Absolute/true pitch (FR-032, FR-037). |

## Persisted entity: App Settings (the single `localStorage` record)

This is the one entity with an explicit lifecycle (created on first load, read/migrated on every
subsequent load, overwritten on every user change). Full field list and JSON shape are defined in
`contracts/settings-schema.md`; it is the serialized union of: current `Tuning` selection (id or
custom pitches), Key Context fields, focal point + chord-tone overrides, label mode, Fret Range,
and Capo fret — i.e., every field FR-039 lists — plus the `schemaVersion` integer required by
FR-040.

## Relationships summary

```
Tuning ──┐
Scale ───┼──> Key Context ──> Note[] (6 strings × 25 frets) ──> rendered SVG elements
Capo ────┘        │
                   └──> Focal Point / Chord-Tone Set ──> Note[].isFocalChordTone / displayLabel

Fret Range ──> Note[] visibility AND rendered fret-spacing geometry (section C1) — still never
                affects Key Context or Note.midiNote

App Settings (localStorage) ══ serializes ══> { Tuning selection, Key Context, Focal Point,
                                                  Label Mode, Fret Range, Capo }
```

No entity has a multi-step lifecycle/state machine beyond the simple "default → user-modified →
persisted → restored-or-migrated-on-load" cycle described above and in `research.md` §5.

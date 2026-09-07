# Data Model — Feature 003 Chord Mode

## State (localStorage `fret-navigator-settings`, schemaVersion 2)

| Field | Type | Range / values | Notes |
|---|---|---|---|
| `chordRootOffset` | integer | 0–11 | Semitones above the **scale root** (a degree, not an absolute pitch class). Default 0. Reset to 0 on scale-root or scale change. |
| `chordQualityId` | string | one of the 20 `CHORD_QUALITIES` ids | Default: `getDefaultChordQualityId(scaleId)` (degree-1 triad quality; fallback minor-if-b3 else major). Reset on root/scale change. |
| `viewMode` | string | `"scale"` \| `"chord"` | Default `"scale"`. Persisted; survives root/scale changes. |

**Removed from v1**: `focalDegreeSemitone`, `chordToneOverrides`.

**Migration v1→v2** (append-only, idempotent): drop the two removed fields; add the three
new fields at their defaults (`chordQualityId` derived from the payload's `scaleId`);
pass every other field through; set `schemaVersion: 2`. Invalid/unknown payloads still
fall back to `defaultState()` as today.

**Validation additions**: `chordRootOffset` integer 0–11; `chordQualityId` member of the
vocabulary; `viewMode` member of the two-value set.

## Theory-layer entities (`theory.js`, pure data + functions)

### CHORD_QUALITIES (exported table, 20 entries)

`{ id, label, intervals }` — intervals are semitones from the chord root (see research
R-302 for the full list). `id`s: `major`, `minor`, `dim`, `aug`, `sus2`, `sus4`, `dom7`,
`maj7`, `min7`, `m7b5`, `dim7`, `six`, `m6`, `dom9`, `min9`, `maj9`, `add9`, `dom11`,
`dom13`, `7sus4`.

### Functions

| Function | Signature | Returns |
|---|---|---|
| `computeChordTones` | `(chordRootSemitone, qualityId)` | array of absolute pitch-class semitones (root first) |
| `getChordName` | `(chordRootSemitone, qualityId, keyContext)` | display name, e.g. `"E7"`, `"Bbm7b5"` (root spelled via key context) |
| `getChordRootOptions` | `(rootSemitone, scaleId, accidentalPreference)` | 12 entries `{ offset, semitone, noteName, degreeLabel, inScale, borrowedFrom }` — `degreeLabel` per R-304 (Roman for 7-note scales, note-name fallback otherwise); `borrowedFrom` array of source names or `null` |
| `getDefaultChordQualityId` | `(scaleId)` | quality id for the degree-1 default (R-305); `"major"` when `scaleId` is null |

### Derived (fretboard.js, not re-derived elsewhere)

`computeChordToneSet(appState)` → `Set` of absolute pitch classes =
`computeChordTones(highlightRoot + chordRootOffset, chordQualityId)`. Chord summary text
uses the same arithmetic on the **true** root (FR-108).

## Render classification (chord view)

Per note, exactly one of:

| Class | Condition | Treatment |
|---|---|---|
| `is-chord-tone` | pitch class ∈ chord-tone set | full colour + label; role colour when in scale, neutral chord colour when out of scale |
| `is-ghost` | in diatonic set, not a chord tone | faint small dot, no label, clickable for audio, aria-label kept |
| `chord-hidden` | neither | not rendered, tabindex −1 |

Scale view: existing rendering minus the bright/dim split (`is-bright` removed).

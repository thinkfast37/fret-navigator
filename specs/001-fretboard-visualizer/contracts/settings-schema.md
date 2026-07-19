# Contract: `localStorage` Settings Schema

**Key**: `fret-navigator-settings`
**Format**: a single JSON-serialized object (`JSON.stringify`/`JSON.parse`), owned exclusively by
`js/state.js` — no other module reads or writes this key directly (FR-039, FR-040).

## Shape (schemaVersion 1)

```jsonc
{
  "schemaVersion": 1,
  "tuning": {
    // Either a reference to a named preset...
    "presetId": "drop-d",
    // ...or, when presetId === "custom", explicit per-string data instead:
    "customOpenPitchClasses": null,   // string[6] | null
    "customOpenOctaves": null         // number[6] | null
  },
  "root": "C",
  "accidentalPreference": "sharp",
  "scaleId": "ionian",
  "focalDegreeSemitone": 0,
  "chordToneOverrides": [
    // { "semitone": 4, "on": false }, ...
  ],
  "labelMode": "notes",              // "notes" | "degrees" | "intervals"
  "capoFret": 0,                      // 0-12
  "capoLabelMode": "absolute",        // "absolute" | "relative"
  "fretRange": {
    "lowerBound": 0,                  // 0-24 (0 displays "N" unless capo-locked)
    "upperBound": 24                  // 0-24
  }
}
```

## Field contract notes

- `schemaVersion` MUST be present and MUST be checked on every load before any other field is
  used. If absent or lower than the current code's expected version, `state.js` MUST run the
  matching migration step(s) in order, then re-save, before applying the data (constitution
  localStorage-versioning constraint; FR-040).
- Every field here corresponds 1:1 to an item in spec FR-039's persisted-settings list: tuning,
  root note, enharmonic preference, scale/mode, capo position, label mode, and fret-range
  selections. No additional user-facing settings are persisted under this feature.
- `chordToneOverrides` only ever contains entries for semitones diatonic to the current
  `(root, scaleId)`; `state.js` MUST drop any override entries that become non-diatonic when
  `root`/`scaleId` changes, mirroring the Edge Case: "focal point resets to the new root and any
  custom bright-set override is cleared."
- When `capoFret > 0`, `fretRange.lowerBound` MUST equal `capoFret` (FR-035) — `state.js` MUST
  enforce this invariant on write, not rely on callers to pass a consistent value.
- On the very first load (key absent from `localStorage`), `state.js` MUST fall back to the
  documented defaults: `tuning.presetId = "standard"`, `root = null` (no root selected), no scale
  selected, `labelMode = "notes"`, `capoFret = 0`, `capoLabelMode = "absolute"`,
  `fretRange = { lowerBound: 0, upperBound: 24 }` — matching Story 7's stated load-time default
  and FR-027's "first load with no previously stored settings" case.
- Any field failing basic type/range validation on read (e.g. `capoFret` outside 0–12, corrupted
  JSON) MUST cause `state.js` to discard the entire stored object and fall back to defaults rather
  than partially apply malformed data — this app has no server-side recovery path, so client-side
  robustness here is required.

## Consumers

- **Write path**: every user-initiated change funneled through `controls.js` calls one `state.js`
  setter, which updates the in-memory state object and immediately persists the full object back
  to this key (debouncing is an implementation-time detail, not a contract requirement).
- **Read path**: `main.js` calls `state.js`'s load function exactly once at bootstrap, before the
  first `fretboard.js` render, so the initial render already reflects restored settings with no
  visible default-then-restore flash.

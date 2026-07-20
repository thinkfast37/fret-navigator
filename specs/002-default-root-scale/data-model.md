# Data Model: Default Root & Scale on First Load

No new entities are introduced. This feature changes the default values of two existing fields on the single app-state object owned by `src/js/state.js`.

## Selection State (existing entity, defaults changed)

| Field | Type | Previous default | New default | Notes |
|---|---|---|---|---|
| `root` | `string \| null` | `null` | `"C"` | Must remain one of `VALID_ROOTS` (from `theory.js` `ROOTS`); validation in `isValidStoredState()` is unchanged. |
| `scaleId` | `string \| null` | `null` | `"ionian"` | Must remain a key in `SCALES` (`theory.js`); validation is unchanged. |

All other fields of the state object (`tuning`, `accidentalPreference`, `focalDegreeSemitone`, `chordToneOverrides`, `labelMode`, `capoFret`, `capoLabelMode`, `fretRange`) are unaffected by this change.

## State transitions

- **First load, no persisted settings**: `load()` finds no `localStorage` entry → returns `defaultState()` → `root = "C"`, `scaleId = "ionian"` → fretboard renders C Ionian highlighted immediately (no transition needed; this is the new resting state).
- **Load with persisted settings**: `load()` finds a valid stored entry → uses the stored `root`/`scaleId` (which may be `null` only if a pre-existing installation had persisted `null` before this change, or the user's actual saved choice) → unaffected by this change, per FR-005.
- **User changes root/scale post-load**: `setRoot()`/`setScaleId()` behave exactly as before (reset focal point/overrides, persist) — no change.

## Schema versioning

`SCHEMA_VERSION` remains `1`. The shape of the persisted object is unchanged (`root`/`scaleId` were always nullable strings); only the value assigned by `defaultState()` when nothing is persisted changes. No migration is required.

# Research: Default Root & Scale on First Load

No open unknowns — the Technical Context in `plan.md` contains no `NEEDS CLARIFICATION` markers. This file records the two decisions made while confirming the approach against the existing codebase.

## Decision 1: Where the default is set

- **Decision**: Change `root: null` → `root: "C"` and `scaleId: null` → `scaleId: "ionian"` inside `defaultState()` in `src/js/state.js`.
- **Rationale**: `defaultState()` is the single source of the in-memory default shape, and `load()` already only calls it when `localStorage` has no valid `fret-navigator-settings` entry (empty, unparsable JSON, or failing `isValidStoredState`). Changing the default there — rather than adding a separate "first load" branch in `main.js` — means the existing persisted-state precedence logic (spec Edge Cases / FR-005) requires zero new code: a returning user's saved root/scale is loaded and used exactly as before; only a genuinely fresh browser (no saved key) gets the new default.
- **Alternatives considered**:
  - Adding an `isFirstLoad` check in `main.js` that calls `setRoot("C")`/`setScaleId("ionian")` after `load()` when both are null — rejected: duplicates the "no persisted state" detection that `state.js` already performs, and would trigger an extra `save()` write (and the focal-point/override reset in `setRoot`/`setScaleId`) on every fresh load for no benefit.
  - Defaulting in `controls.js` (UI layer) instead of `state.js` — rejected: would leave `state.getState().root` as `null` at first render, breaking `fretboard.js`'s existing "render only when root && scaleId are set" contract (FR-002 requires the same render path as a manual selection, not a UI-only illusion of selection).

## Decision 2: Values chosen

- **Decision**: `"C"` (matches the `label` of the C entry in `ROOTS`, `theory.js`) and `"ionian"` (matches the `id` of the Ionian entry in `SCALES`, `theory.js`).
- **Rationale**: These are the exact identifiers `isValidStoredState()` and `getDiatonicSemitones()`/`getScale()` already expect and validate against, and "C Ionian" (C major) is the most universally recognizable key for a first-time demo, per the feature description.
- **Alternatives considered**: None — the feature description explicitly specifies C Ionian.

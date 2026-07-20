# Implementation Plan: Default Root & Scale on First Load

**Branch**: `002-default-root-scale` | **Date**: 2026-07-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-default-root-scale/spec.md`

## Summary

`state.js` currently initializes `root: null` and `scaleId: null` in `defaultState()`, so a brand-new user (no saved `fret-navigator-settings` in localStorage) sees a blank fretboard until they manually pick a root and scale. The fix is to change the two default values to `root: "C"` and `scaleId: "ionian"` in `defaultState()`. Because `load()` in `state.js` only falls back to `defaultState()` when there is no stored value or the stored value fails validation, any existing persisted selection is untouched — the new default only ever applies on a genuinely first-time load, satisfying FR-005 and the Edge Cases in the spec for free, with no additional branching logic required.

## Technical Context

**Language/Version**: JavaScript (ES modules), vanilla, no build step

**Primary Dependencies**: None beyond existing project modules (`theory.js`, `state.js`, `fretboard.js`, `controls.js`, `main.js`); no new dependency introduced

**Storage**: Browser `localStorage`, key `fret-navigator-settings`, versioned via `schemaVersion` in `state.js`

**Testing**: `node --test` (jsdom-based), per constitution Principle IV — existing `tests/state.test.js` and `tests/main.test.js` cover `defaultState()`/`load()`/render-on-load behavior

**Target Platform**: Browser (static single-page app, `src/index.html` + ES modules)

**Project Type**: Single-page client-side web app (no backend)

**Performance Goals**: N/A — no perf-sensitive path touched (one-time default assignment at load)

**Constraints**: Must not change the stored `schemaVersion` or persisted-state validation contract; must not regress existing users who already have a saved root/scale

**Scale/Scope**: Two literal values changed in one function (`defaultState()` in `src/js/state.js`); no new files, no schema migration

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment |
|---|---|
| I. Music Theory Correctness | PASS — no new theory logic; "C" and "ionian" are existing, already-tested values from `ROOTS`/`SCALES` in `theory.js`. |
| II. Visualization Consistency | PASS — rendering path is unchanged; the fretboard renders C Ionian using the exact same code path as a user-selected root/scale (FR-002). |
| III. Audio Behavior | N/A — feature does not touch audio playback. |
| IV. Testing Standards | PASS (gate) — `tests/state.test.js` must add/update a case asserting `defaultState()`/`load()` with no stored settings yields `root: "C"`, `scaleId: "ionian"`; `tests/main.test.js` should assert the fretboard/controls render as highlighted on a clean load. |
| V. Simplicity & Scope Discipline | PASS — minimal two-value change, no new abstractions, no schema version bump needed since the shape of stored data is unchanged (only the in-memory default differs). |

No violations. Complexity Tracking table not needed.

## Project Structure

### Documentation (this feature)

```text
specs/002-default-root-scale/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
src/
├── index.html
├── css/
└── js/
    ├── theory.js       # unchanged - source of ROOTS/SCALES ("C", "ionian" already valid)
    ├── state.js        # CHANGED - defaultState() root/scaleId defaults
    ├── fretboard.js     # unchanged - renders from state, already handles a set root/scale
    ├── controls.js      # unchanged - selector UI reflects state.root/state.scaleId
    └── main.js          # unchanged - wires load() -> initial render

tests/
├── state.test.js        # CHANGED - assert new defaults
├── main.test.js         # CHANGED - assert initial render is highlighted, not blank
├── fretboard.test.js     # unchanged
└── controls.test.js      # unchanged
```

**Structure Decision**: Single existing static web app (`src/js/*` ES modules, no bundler). This feature is a targeted default-value change confined to `src/js/state.js`, with corresponding test updates in `tests/state.test.js` and `tests/main.test.js`. No new files or directories are introduced.

## Complexity Tracking

Not applicable — no Constitution Check violations.

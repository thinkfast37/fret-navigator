# Implementation Plan: Instrument Toggle — Guitar or Ukulele

**Branch**: `claude/guitar-ukulele-tunings-cd1n0o` | **Date**: 2026-09-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-instrument-ukulele/spec.md`

## Summary

String count stops being a constant and becomes a property of the selected instrument.
`theory.js` gains an `INSTRUMENTS` table (guitar: 6 strings; ukulele: 4) and tags every
tuning with the instrument it belongs to, adding the four ukulele presets (R-701).
`state.js` bumps to `schemaVersion` 3, holding `instrument` plus a `tunings` map keyed by
instrument, with one `getActiveTuning()` accessor and a 2 → 3 migration (R-703).
`fretboard.js` reads the string count from the selected instrument and rebuilds its
skeleton when that count changes, keeping physical string order for re-entrant tunings
(R-702). `controls.js` gains the Instrument selector, filters the tuning selector to the
selected instrument, and builds the custom-tuning modal with one row per string.

## Technical Context

**Language/Version**: ES2022 modules, no build step

**Primary Dependencies**: None (jsdom for DOM tests only)

**Storage**: `localStorage` — **schema change**: version 2 → 3. A v2 payload's `tuning`
becomes `tunings.guitar`, `instrument` becomes `"guitar"`, and the ukulele takes its
default. The migration rewrites saved settings on load and is not reversible by a later
commit; the maintainer was told so before approving.

**Testing**: `tests/theory.test.js` (pure: the instrument table, the ukulele preset
pitches, true-octave note math), `tests/state.test.js` (per-instrument memory, migration,
validation fallbacks), `tests/fretboard.test.js` (DOM-capable: row count, physical row
order), `tests/controls.test.js` (DOM-capable: the Instrument selector, the filtered tuning
list, the N-row custom modal), `tests/main.test.js` (DOM-capable: restore on reload)

**Target Platform**: Browser; TV-first pointer interaction

**Project Type**: Static SPA

**Performance Goals**: N/A — a ukulele draws fewer elements than a guitar.

**Constraints**: `theory.js` stays pure (constitution Principle I); the instrument table
and tuning library live there and no view re-derives string count (FR-509). Inlay dots
stay physical (AC-1.1.5) and identical on both instruments. The capo binding rule is
untouched.

**Scale/Scope**: `src/js/theory.js`, `src/js/state.js`, `src/js/fretboard.js`,
`src/js/controls.js`, `src/index.html` + five test suites. Schema bump; no new tooling.

## Constitution Check

| Principle | Assessment |
|---|---|
| I. Music Theory Correctness | PASS — the preset pitch tables and the true-octave rule for re-entrant strings live in the pure layer and are tested exhaustively per preset. |
| II. Visualization Consistency | PASS — the same render path draws N rows; no instrument-specific colour, shape or dot rule. |
| III. Audio Behavior | PASS — playback already reads each note's own MIDI number; a re-entrant string simply carries a higher one. |
| IV. Testing Standards | PASS — AC-7.x tests, DOM-level for every criterion naming a control or the board. |
| V. Simplicity & Scope Discipline | PASS — generalises an existing constant rather than adding a parallel ukulele code path; no dependency added. |

No violations.

## Project Structure

```text
src/js/theory.js          # CHANGED — INSTRUMENTS table; instrument tag on every tuning;
                          #   the four ukulele presets; tuningsForInstrument()
src/js/state.js           # CHANGED — instrument + per-instrument tunings map,
                          #   getActiveTuning(), setInstrument(), schema v2 -> v3 migration
src/js/fretboard.js       # CHANGED — string count from the instrument; skeleton rebuild
                          #   when it changes; height/divider geometry follows it
src/js/controls.js        # CHANGED — Instrument selector; instrument-filtered tuning list;
                          #   N-row custom-tuning modal
src/index.html            # CHANGED — #instrument-controls mount point
tests/theory.test.js      # CHANGED — AC-7.2.1, AC-7.2.3
tests/state.test.js       # CHANGED — AC-7.1.3, AC-7.4.1, AC-7.4.2, AC-7.4.3
tests/fretboard.test.js   # CHANGED — AC-7.1.1, AC-7.2.2
tests/controls.test.js    # CHANGED — AC-7.1.2, AC-7.3.1, AC-7.3.2
tests/main.test.js        # CHANGED — AC-7.1.4
specs/007-instrument-ukulele/  # this feature's documents
```

**Structure Decision**: One instrument table, read everywhere. The view asks the
instrument how many strings it has; nothing counts them for itself.

## Complexity Tracking

Not applicable.

## Traceability Matrix

| Plan item | Covers | Acceptance Criteria | Implementation tasks | Test tasks |
|---|---|---|---|---|
| **P-601** | Instrument selector and the N-string fretboard | AC-7.1.1 | T710 | T701 |
| **P-602** | Tuning selector scoped to the selected instrument | AC-7.1.2 | T711 | T702 |
| **P-603** | The ukulele tuning library, physical row order, true octaves | AC-7.2.1, AC-7.2.2, AC-7.2.3 | T712 | T703 |
| **P-604** | Custom-tuning editor with one row per string | AC-7.3.1, AC-7.3.2 | T713 | T704 |
| **P-605** | Per-instrument tuning memory and an untouched musical context | AC-7.1.3, AC-7.1.4, AC-7.4.1 | T714 | T705 |
| **P-606** | schemaVersion 3 migration and validation fallbacks | AC-7.4.2, AC-7.4.3 | T715 | T706 |

# Implementation Plan: Key-Aware Chord Picker + Tappable Fret Range

**Branch**: `claude/navigator-chord-scale-ui-y4kdua` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-key-aware-chords/spec.md`

## Summary

Three theory-layer additions and one interaction fix. `theory.js` gains
`getDefaultChordQualityForRoot` (the key-aware default quality, R-602),
`analyzeChordMixture` (whole-chord diatonic/borrowed/chromatic verdict, R-601) and
`getChordQualityOptions` (the vocabulary annotated for the current root); the existing
root-only `getBorrowedSources` is refactored onto the shared
`parallelModesContaining` helper the new analysis needs, with no behaviour change.
`state.setChordRootOffset` snaps the quality through the new function. `controls.js`
marks the quality dropdown and renders the mixture line. The fret-range slider gains
track-tap-to-nearest-handle with a gesture-scoped movement transition.

## Technical Context

**Language/Version**: ES2022 modules, no build step

**Primary Dependencies**: None (jsdom for DOM tests only)

**Storage**: `localStorage` — **no schema change**; `chordQualityId` already exists and
its valid-value set is unchanged, so no migration and no `schemaVersion` bump.

**Testing**: `tests/theory.test.js` (pure: quality defaults, mixture analysis),
`tests/state.test.js` (the snap on root change and its persistence),
`tests/controls.test.js` (DOM-capable: dropdown marking, mixture line, slider tapping),
`tests/styles.test.js` (DOM-capable: transition rules)

**Target Platform**: Browser; TV-first pointer interaction for US4

**Project Type**: Static SPA

**Performance Goals**: N/A — the analysis is 7 modes × ≤6 tones per render.

**Constraints**: `theory.js` stays pure (constitution Principle I); all diatonic and
mixture determinations live there and no view re-derives them (FR-406). Dropdown marking
is not colour alone (constitution Accessibility).

**Scale/Scope**: `src/js/theory.js`, `src/js/state.js`, `src/js/controls.js`,
`src/css/styles.css` + four test suites. No schema, no new tooling.

## Constitution Check

| Principle | Assessment |
|---|---|
| I. Music Theory Correctness | PASS — the core of the change; every determination is in the pure layer and exhaustively tested across all 12 roots × 13 scales. |
| II. Visualization Consistency | PASS — marking uses italic/weight, never colour alone; the fretboard render path is untouched. |
| III. Audio Behavior | PASS — playback still reads the same root+quality pair; no audio change. |
| IV. Testing Standards | PASS — AC-6.x tests, DOM-level for every criterion naming a control. |
| V. Simplicity & Scope Discipline | PASS — the new mode scan *replaces* a duplicate of itself in `getBorrowedSources`; no dependency added. |

No violations.

## Project Structure

```text
src/js/theory.js        # CHANGED — parallelModesContaining/modeShortName helpers;
                        #   getDefaultChordQualityForRoot, analyzeChordMixture,
                        #   getChordQualityOptions
src/js/state.js         # CHANGED — setChordRootOffset snaps the quality
src/js/controls.js      # CHANGED — quality-option marking, mixture line, slider tapping
src/css/styles.css      # CHANGED — quality marking, mixture line, slider transition/target
tests/theory.test.js    # CHANGED — AC-6.1.1/6.1.2/6.1.4, AC-6.3.1/6.3.2/6.3.3
tests/state.test.js     # CHANGED — AC-6.1.3
tests/controls.test.js  # CHANGED — AC-6.2.1/6.2.2, AC-6.4.1/6.4.2
tests/styles.test.js    # CHANGED — AC-6.4.3
specs/006-key-aware-chords/  # this feature's documents
```

**Structure Decision**: Theory-first. Every verdict is a pure function tested without a
DOM; the views only render what those functions return.

## Complexity Tracking

Not applicable.

## Traceability Matrix

| Plan item | Covers | Acceptance Criteria | Implementation tasks | Test tasks |
|---|---|---|---|---|
| **P-501** | Key-aware default quality on chord-root change | AC-6.1.1, AC-6.1.2, AC-6.1.4 | T610 | T601 |
| **P-502** | The chosen quality's persistence lifecycle | AC-6.1.3 | T611 | T602 |
| **P-503** | Diatonic marking in the quality dropdown | AC-6.2.1, AC-6.2.2 | T612 | T603 |
| **P-504** | Whole-chord modal-mixture readout | AC-6.3.1, AC-6.3.2, AC-6.3.3 | T613 | T604 |
| **P-505** | Tap-to-set fret range with gesture-scoped animation | AC-6.4.1, AC-6.4.2, AC-6.4.3 | T614 | T605 |

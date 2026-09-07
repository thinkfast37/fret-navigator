# Tasks: Key-Aware Chord Picker + Tappable Fret Range

**Input**: Design documents from `/specs/006-key-aware-chords/`

**Prerequisites**: plan.md, spec.md, research.md

**Tests**: Included — AC-6.x.y named verbatim; every criterion naming a control is tested
in a DOM-capable suite.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T609 Register feature 006 in `spec-trace.config.json` and `tests/ac-coverage.js`.

## Phase 2: User Story 1 — The chord root brings its own quality (P1)

- [X] T601 [US1] In `tests/theory.test.js`: tests named `AC-6.1.1 — A diatonic chord root
  defaults to the scale's own triad on that degree` (Cases /1 ii of C Ionian → minor, /2
  vii of C Ionian → diminished, /3 exhaustive over all 7-note scales × all their degrees),
  `AC-6.1.2 — A non-diatonic chord root defaults to its borrowed mode's triad` (bIII in
  Ionian → major from Dorian; every chromatic offset resolves to a valid quality id), and
  `AC-6.1.4 — Non-heptatonic scales keep one predictable default` (pentatonic/blues roots
  all return the scale's tonic-triad default).
- [X] T610 [US1] In `src/js/theory.js`: add `parallelModesContaining`/`modeShortName`
  (refactoring `getBorrowedSources` onto them, R-601) and
  `getDefaultChordQualityForRoot` (R-602). In `src/js/state.js`: `setChordRootOffset`
  sets the quality through it.

## Phase 3: User Story 1 (cont.) — quality persistence lifecycle (P1)

- [X] T602 [US1] In `tests/state.test.js`: a test named `AC-6.1.3 — An explicitly chosen
  quality survives until the root or key changes` (an overridden quality persists across
  save/load and is replaced by the next chord-root, scale-root or scale change).
- [X] T611 [US1] In `src/js/state.js`: confirm `setChordQualityId` persists the override
  untouched and that only `setChordRootOffset`/`setRoot`/`setScaleId` replace it; no
  schema change or migration (the valid-value set is unchanged).

## Phase 4: User Story 2 — See which qualities belong to the key (P1)

- [X] T603 [US2] In `tests/controls.test.js`: tests named `AC-6.2.1 — Quality options are
  marked diatonic or not for the selected chord root` (C Ionian, chord root IV: Maj7
  marked diatonic, 7 not; chord root V: 7 marked diatonic) and `AC-6.2.2 — Scales that
  support no diatonic verdict leave every quality unmarked` (a pentatonic scale yields no
  marked option).
- [X] T612 [US2] In `src/js/theory.js`: `getChordQualityOptions`. In
  `src/js/controls.js`: render the marks. In `src/css/styles.css`: the italic/weight
  (non-colour) cue.

## Phase 5: User Story 3 — Modal-mixture readout (P2)

- [X] T604 [US3] In `tests/theory.test.js`: tests named `AC-6.3.1 — A chord entirely
  inside the key is reported as diatonic`, `AC-6.3.2 — A chord outside the key names the
  parallel modes that contain it` (F7 in C Ionian → Dorian), and `AC-6.3.3 — A chord no
  parallel mode contains is reported as chromatic` (a dim7 on the tonic). Their rendered
  panel wording is asserted alongside the DOM tests in `tests/controls.test.js`.
- [X] T613 [US3] In `src/js/theory.js`: `analyzeChordMixture` (R-601). In
  `src/js/controls.js`: the `.chord-mixture` line under the chord summary. In
  `src/css/styles.css`: its three states.

## Phase 6: User Story 4 — Set the visible fret range by tapping (P1)

- [X] T605 [US4] In `tests/controls.test.js`: tests named `AC-6.4.1 — Tapping the slider
  moves the nearer handle to the tapped fret` and `AC-6.4.2 — A capo-locked left handle is
  never the one a tap moves`. In `tests/styles.test.js`: `AC-6.4.3 — The tap animates, the
  drag does not`.
- [X] T614 [US4] In `src/js/controls.js`: `moveHandleTo` + the slider-level `pointerdown`
  handler (nearest handle, capo-aware), handle presses stopping propagation, and the
  `is-dragging` class scoping. In `src/css/styles.css`: the position transition, its
  `.is-dragging` and `prefers-reduced-motion` suppressions, and the padded tap target.

## Phase 7: Polish & gates

- [X] T620 Run all four gates; regenerate and commit the matrix.

## Dependencies

- T609 before the gates; each test task before its implementation task; T610 before T612
  and T613 (both use `parallelModesContaining`); T620 last.

## Implementation Strategy

Theory layer first — US1's default quality, then the shared mode scan US2 and US3 both
read. US4 is independent of all three and can land in parallel.


---

## Completion log

*2026-09-07 — All tasks done. T610/T612/T613 in `src/js/theory.js`
(`parallelModesContaining` + `modeShortName` extracted from `getBorrowedSources` with no
behaviour change; `getDefaultChordQualityForRoot`, `analyzeChordMixture`,
`getChordQualityOptions`) and `src/js/state.js` (`setChordRootOffset` snaps the quality).
T612/T613/T614 in `src/js/controls.js` (quality-option marking, `.chord-mixture` verdict
line, slider-level pointerdown moving the nearer handle with `is-dragging` scoping) and
`src/css/styles.css`. Tests T601/T604 in `tests/theory.test.js`, T602 in
`tests/state.test.js`, T603/T604/T605 in `tests/controls.test.js`, T605 in
`tests/styles.test.js`. T620: all four gates pass. Auto landing.*

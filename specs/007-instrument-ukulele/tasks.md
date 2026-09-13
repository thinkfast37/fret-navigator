# Tasks: Instrument Toggle — Guitar or Ukulele

**Input**: Design documents from `/specs/007-instrument-ukulele/`

**Prerequisites**: plan.md, spec.md, research.md

**Tests**: Included — AC-7.x.y named verbatim; every criterion naming a control or the
board is tested in a DOM-capable suite.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T709 Register feature 007 in `spec-trace.config.json` and `tests/ac-coverage.js`.

## Phase 2: User Story 1 — Switch the fretboard to a ukulele (P1)

- [X] T701 [US1] In `tests/fretboard.test.js`: a test named `AC-7.1.1 — The instrument
  selector renders that instrument's string count`, with Cases `AC-7.1.1/1 — Selecting
  Guitar renders six string rows` and `AC-7.1.1/2 — Selecting Ukulele renders four string
  rows` (row count, note-group count and SVG height all follow the instrument).
- [X] T710 [US1] In `src/js/theory.js`: the `INSTRUMENTS` table (guitar 6 strings, ukulele
  4) and `getInstrument()`. In `src/js/fretboard.js`: string count read from the selected
  instrument, skeleton rebuilt when it changes, height and divider geometry derived from
  it. In `src/index.html`: the `#instrument-controls` mount point.

- [X] T702 [US1] In `tests/controls.test.js`: a test named `AC-7.1.2 — The tuning selector
  offers only the selected instrument's tunings` (guitar lists Standard/D/G/C families and
  no ukulele preset; ukulele lists the four presets and no guitar tuning; Custom Tuning
  present in both).
- [X] T711 [US1] In `src/js/theory.js`: `tuningsForInstrument()`. In `src/js/controls.js`:
  the Instrument selector and the instrument-filtered tuning selector, rebuilt on switch.

## Phase 3: User Story 2 — Pick a common ukulele tuning (P1)

- [X] T703 [US2] In `tests/theory.test.js`: a test named `AC-7.2.1 — The four ukulele
  presets are reflected exactly`, with Cases `AC-7.2.1/1 — Standard (high-G) GCEA is G4 C4
  E4 A4, string 4 to string 1`, `AC-7.2.1/2 — Low-G GCEA is G3 C4 E4 A4, string 4 to
  string 1`, `AC-7.2.1/3 — Canadian / D tuning ADF#B is A4 D4 F#4 B4, string 4 to string
  1` and `AC-7.2.1/4 — Baritone DGBE is D3 G3 B3 E4, string 4 to string 1`; and a test
  named `AC-7.2.3 — Every string sounds and labels at its true octave` (high-G open string
  4 is MIDI 67, low-G is 55, an octave apart at every fret). In
  `tests/fretboard.test.js`: a test named `AC-7.2.2 — Re-entrant tunings keep physical
  string order` (row 0 is string 1/A, row 3 is string 4/G, and row 3's open MIDI note is
  higher than row 2's).
- [X] T712 [US2] In `src/js/theory.js`: the four ukulele presets in `TUNINGS`, each tagged
  with its instrument and group (R-701).

## Phase 4: User Story 3 — Define a custom ukulele tuning (P2)

- [X] T704 [US3] In `tests/controls.test.js`: tests named `AC-7.3.1 — The custom-tuning
  editor shows one row per string of the current instrument` (four rows on a ukulele, six
  on a guitar, seeded from the previously active tuning) and `AC-7.3.2 — A custom tuning
  applies to the instrument it was written for` (a ukulele custom tuning does not become
  the guitar's tuning on switch).
- [X] T713 [US3] In `src/js/controls.js`: the custom-tuning modal built for the current
  instrument's string count with per-instrument string labels, rebuilt on instrument
  switch; read/seed helpers sized from the instrument rather than from six.

## Phase 5: User Story 4 — Come back to the instrument you left (P1)

- [X] T705 [US4] In `tests/state.test.js`: tests named `AC-7.1.3 — Switching instruments
  leaves the musical context untouched` (root, scale, capo, fret range, label mode, chord
  root and quality all unchanged) and `AC-7.4.1 — Each instrument remembers its own last
  tuning` (guitar DADGAD ↔ ukulele Canadian, both preserved, custom included). In
  `tests/main.test.js`: a test named `AC-7.1.4 — The instrument choice survives a reload`.
- [X] T714 [US4] In `src/js/state.js`: `instrument` plus the per-instrument `tunings` map,
  `getActiveTuning()`, `setInstrument()` and `setTuning()` writing to the active
  instrument's entry only (R-703).

- [X] T706 [US4] In `tests/state.test.js`: tests named `AC-7.4.2 — Settings saved before
  this feature load as a guitar in their saved tuning` (a v2 payload, custom tuning
  included) and `AC-7.4.3 — Saved settings whose string count contradicts their instrument
  fall back safely` (unknown instrument; four-entry custom tuning under guitar).
- [X] T715 [US4] In `src/js/state.js`: `SCHEMA_VERSION` 3, `migrateV2ToV3`, and validation
  that checks the instrument and sizes each custom tuning against its own instrument.

## Phase 6: Polish & gates

- [X] T720 Run all four gates; regenerate and commit the matrix.

## Dependencies

- T709 before the gates; each test task before its implementation task; T710 (the
  instrument table) before T711, T712, T713 and T714; T714 before T715; T720 last.

## Implementation Strategy

Theory layer first — the instrument table and the tuning library are what every other
layer reads. State next (the map, the accessor, the migration), then the two views, which
only ever ask the instrument how many strings it has.


---

## Completion log

*2026-09-13 — All tasks done. T710/T712 in `src/js/theory.js` (the `INSTRUMENTS` table,
`getInstrument`, `tuningsForInstrument`, `tuningGroupsForInstrument`, every tuning tagged
with its instrument, and the four ukulele presets — research R-701). T714/T715 in
`src/js/state.js` (`instrument` + the per-instrument `tunings` map, `getActiveTuning`,
`setInstrument`, `setTuning` writing only the active instrument's entry, `SCHEMA_VERSION`
3 with `migrateV2ToV3`, and validation sizing each custom tuning against its own
instrument). T710 in `src/js/fretboard.js` (string count read from the instrument, the
skeleton rebuilt when it changes, board height and divider geometry following it).
T711/T713 in `src/js/controls.js` (`initInstrumentControls`, the instrument-filtered
tuning selector, the custom-tuning modal built for the current instrument's string count)
and `src/index.html` (`#instrument-controls`). Tests T701/T703 in `tests/theory.test.js`
and `tests/fretboard.test.js`, T702/T704 in `tests/controls.test.js`, T705/T706 in
`tests/state.test.js`, T705 in the new `tests/main-instrument.test.js`. T709 registered
007 in `spec-trace.config.json` (including the new DOM-capable suite) and
`tests/ac-coverage.js`. Feature 001's six-string ACs were revised first, under
`specs/001-fretboard-visualizer/tasks.md` T139 (the maintainer's approved spill). T720:
all four gates pass — 340 tests, `coverage:ac` no gaps outside the baseline,
`check:trace` 0 new findings. Auto landing.*

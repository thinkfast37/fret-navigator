# Tasks: Piano Mode

**Input**: Design documents from `/specs/008-instrument-piano/`

**Prerequisites**: plan.md, spec.md, research.md

**Tests**: Included — AC-8.x.y named verbatim; every criterion naming a control, the
board or a gesture is tested in a DOM-capable suite.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T809 Register feature 008 in `spec-trace.config.json` (with the new DOM-capable
  suites `tests/piano.test.js` and `tests/main-piano.test.js`) and `tests/ac-coverage.js`.
  Revise the spilled criteria first, in their own features: feature 001 T144 (AC-1.8.1,
  FR-028), feature 004 T422 (AC-4.1.1, FR-201, FR-203), feature 007 T721 (AC-7.1.1,
  AC-7.1.3, FR-501).

## Phase 2: User Story 1 — Switch to a piano (P1)

- [X] T801 [US1] In `tests/piano.test.js`: tests named `AC-8.1.1/1 — Selecting Piano draws
  piano keys and no fretboard.` and `AC-8.1.1/2 — Selecting a stringed instrument after
  Piano draws the fretboard again.`; and `AC-8.1.5 — The piano highlights exactly the
  notes the fretboard highlights` (every key's classes and label equal the fretboard's
  for its pitch class, in Scale view, Chord view with degrees, and a borrowed chord with
  intervals).
- [X] T810 [US1] In `src/js/theory.js`: `kind`, `voice` and `chordStrumSeconds` on every
  instrument and the Piano entry. In `src/js/keyboard.js`: the piano renderer. In
  `src/js/fretboard.js`: the keyboard dispatch in `render()`, and the highlight rules
  factored into `highlightContext()`, `describePitchClass()` and `applyNoteState()`,
  shared by the fret loop and the keyboard (R-805). In `src/css/styles.css`: piano keys.

- [X] T802 [US1] In `tests/piano.test.js`: tests named `AC-8.1.2/1 — On the piano the
  tuning, capo, Absolute/Relative and fret-range controls are hidden and the key-count
  control is shown.`, `AC-8.1.2/2 — On a stringed instrument the key-count control is
  hidden and the tuning, capo, Absolute/Relative and fret-range controls are shown.` and
  `AC-8.1.3 — Stringed-instrument settings survive a trip to the piano` (DADGAD, capo 3,
  Relative and a 3–15 range through the controls). In `tests/state.test.js`: the same
  criterion at the state layer.
- [X] T811 [US1] In `src/js/controls.js`: `syncInstrumentControls()` hiding the
  stringed-only containers and showing the key-count one; `initTuningControls()` builds
  nothing for an instrument with no tuning. In `src/js/state.js`: `getActiveTuning()`
  null and `setTuning()` a no-op on the piano. In `src/css/styles.css`:
  `#controls > div[hidden]`.

- [X] T803 [US1] In `tests/piano.test.js`: a test named `AC-8.1.4 — The capo never shifts
  the piano's highlighting` (capo 3 Relative shifts the guitar's highlight root to Eb;
  the piano's stays C).
- [X] T812 [US1] In `src/js/fretboard.js`: `getHighlightRootSemitone()` passes capo 0 for
  a keyboard instrument (FR-603).

## Phase 3: User Story 2 — Choose how many keys (P1)

- [X] T804 [US2] In `tests/theory.test.js`: `AC-8.2.1`, the six `AC-8.2.2/n` Cases and
  `AC-8.2.2` (the size table), as keyboard arithmetic. In `tests/piano.test.js`:
  `AC-8.2.1 — The piano defaults to 88 keys from A0 to C8`, the six Cases
  `AC-8.2.2/1 — 25 keys span C3 to C5.` … `AC-8.2.2/6 — 88 keys span A0 to C8.` through
  the control, and `AC-8.2.3 — The key-count control offers only the standard sizes`.
- [X] T813 [US2] In `src/js/theory.js`: `KEYBOARD_SIZES`, `DEFAULT_KEY_COUNT`,
  `keyboardKeys()` (R-802). In `src/js/state.js`: `keyCount`, `setKeyCount()`. In
  `src/js/controls.js`: `initKeyCountControls()`. In `src/index.html`:
  `#key-count-controls`.

## Phase 4: User Story 3 — Fit the keyboard on the screen (P1)

- [X] T805 [US3] In `tests/piano.test.js`: `AC-8.3.1 — The keyboard uses one row when
  every white key fits`, `AC-8.3.2/1 — 88 keys split into A0–B3 on the top row and C4–C8
  on the bottom row.`, `AC-8.3.2/2 — The two rows together hold every key exactly once,
  in ascending order.` and `AC-8.3.3 — Black keys sit between their neighbouring white
  keys`. In `tests/theory.test.js`: the split arithmetic for both Cases. In
  `tests/main-piano.test.js`: `AC-8.3.4 — The keyboard re-fits when the screen size
  changes`.
- [X] T814 [US3] In `src/js/theory.js`: `splitKeyboardRows()` (R-803). In
  `src/js/keyboard.js`: `MIN_WHITE_KEY_PX`, `chooseRowCount()`, `needsRefit()`, row and
  black-key geometry. In `src/js/main.js`: the resize listener.

## Phase 5: User Story 4 — Hear a piano (P1)

- [X] T806 [US4] In `tests/synth.test.js`: `AC-8.4.2 — The piano voice is rhythm-master's
  melodic voice` (the node graph, and one bus per context). In `tests/piano.test.js`:
  `AC-8.4.1 — Tapping a key plays its exact pitch with the piano voice` (click and Enter),
  `AC-8.4.3 — The chord Play button strikes every chord tone at once on the piano` and
  `AC-8.4.4 — Stringed instruments keep the guitar sample` (guitar and ukulele). In
  `tests/theory.test.js`: `midiToFrequency()` for AC-8.4.1. New
  `tests/helpers/web-audio-mock.js`.
- [X] T815 [US4] New `src/js/synth.js` (R-801). In `src/js/theory.js`:
  `midiToFrequency()`. In `src/js/audio.js`: `play`, `playChord` and `resetAudio` take a
  voice and route "synth" through `synth.playNote` on the shared, self-recovering
  context. In `src/js/controls.js`: the Play button uses the instrument's strum and
  voice. In `src/js/main.js`: Reset audio confirms in the current instrument's voice. In
  `src/index.html`: the piano credit line.

## Phase 6: User Story 5 — Come back to the piano you left (P2)

- [X] T807 [US5] In `tests/main-piano.test.js`: `AC-8.5.1 — The piano and its key count
  survive a reload`. In `tests/state.test.js`: `AC-8.5.2 — Settings saved before this
  feature load unchanged with 88 keys` (v3 and v2 payloads) and `AC-8.5.3 — Saved
  settings with an impossible key count fall back safely`.
- [X] T816 [US5] In `src/js/state.js`: `SCHEMA_VERSION` 4, `migrateV3ToV4`, `keyCount`
  validation, tunings defaulted and validated for stringed instruments only (R-804).

## Phase 7: Polish & gates

- [X] T820 Run all four gates; regenerate and commit the matrix.

## Dependencies

- T809 before the gates; each test task before its implementation task; T810 before every
  other implementation task; T813 before T814; T820 last.

## Implementation Strategy

Theory first — the instrument kinds, sizes, split and frequency are what everything else
reads. State next (key count, migration), then the board (dispatch and shared rules, then
the keyboard), then controls, then sound.

---

## Completion log

*2026-10-18 — All tasks done. Spec defects in 001/004/007 revised before the code
(T144, T422, T721). Test defects corrected under T144/T721 (§2a): the schemaVersion
assertions in `tests/state.test.js` now expect 4 (FR-039/FR-040 require the current
version, which this feature bumps), and the instrument-table test in
`tests/theory.test.js` counts stringed instruments, as the revised AC-7.1.1 says. No
assertion was relaxed, narrowed or removed. Auto landing.*

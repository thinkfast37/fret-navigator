# Tasks: Piano Key Colours

**Input**: Design documents from `/specs/009-piano-key-hue/`

**Prerequisites**: plan.md, spec.md, research.md

**Tests**: Required (constitution Principle IV). Each test task precedes its
implementation task.

## Phase 1: User Story 1 — See the scale in the keys themselves (P1)

- [X] T901 [US1] In `tests/piano.test.js`: `AC-9.1.1 — A scale note's key takes its
  marker's colour` (C Ionian and D Dorian, every key, the tint role equal to the marker's
  role), `AC-9.1.3 — Keys outside the scale stay plain`, and the three Cases of AC-9.1.4.
  In `tests/styles.test.js`: `AC-9.1.2 — White keys take a light tint and black keys a
  deep shade` (the strength tokens, light below deep, and a rule per role).
- [X] T904 [US1] In `src/js/keyboard.js`: `data-hue` and `data-hue-role` from each key's
  `describe()` result. In `src/css/styles.css`: the four `--piano-hue-*` strengths, the
  role mapping and the `color-mix()` fills (R-901).

## Phase 2: User Story 2 — Turn key colours on and off (P1)

- [X] T902 [US2] In `tests/piano.test.js`: `AC-9.2.1 — A Key colours toggle appears only
  on the piano`, `AC-9.2.2 — Turning key colours off restores plain keys` and
  `AC-9.2.3 — Key colours start on` (a first visit, through the DOM). In
  `tests/state.test.js`: `AC-9.2.3 — Key colours start on` (the default and the setter).
- [X] T905 [US2] In `src/js/controls.js`: `initKeyHueControls()`, its container in the
  keyboard-only list. In `src/index.html`: `#key-hue-controls`. In `src/js/state.js`:
  `setKeyHue()`.

## Phase 3: User Story 3 — Keep the choice (P2)

- [X] T903 [US3] In `tests/main-piano.test.js`: `AC-9.3.1 — The key colours choice
  survives a reload`. In `tests/state.test.js`: `AC-9.3.2 — Settings saved before this
  feature load unchanged with key colours on` (v4 and v3 payloads) and `AC-9.3.3 — A saved
  key colours value that is neither on nor off falls back safely`.
- [X] T906 [US3] In `src/js/state.js`: `SCHEMA_VERSION` 5, `migrateV4ToV5`, `keyHue`
  default and validation (R-902). Test defect corrected (§2a): three assertions in
  `tests/state.test.js` expected a saved payload's schemaVersion to be 4; FR-039/FR-040
  require the *current* version, which this feature raises, so they now expect 5 (as
  feature 008 did for 4). No assertion was relaxed, narrowed or removed.

## Phase 4: Polish & gates

- [X] T907 Run all four gates; regenerate and commit the matrix. Register the feature in
  `spec-trace.config.json` and `tests/ac-coverage.js`.

## Dependencies

- Each test task before its implementation task; T906 before T905 (the toggle reads the
  setting); T907 last. Feature 008's T824/T825 (middle C tip) ship in the same change.

## Implementation Strategy

State first (the setting and its migration), then the keyboard's tint marks and their
styles, then the toggle.

# Tasks: Play the Selected Chord

**Input**: Design documents from `/specs/004-play-chord/`

**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: Included — constitution Principles III/IV; AC-4.1.x tests named verbatim.

**Organization**: Single user story; tests first.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T409 Register feature 004 in `spec-trace.config.json` and add
  `specs/004-play-chord/spec.md` to the `SPECS` list in `tests/ac-coverage.js`.

## Phase 2: User Story 1 — Hear the selected chord (P1) 🎯 MVP

### Tests first ⚠️

- [X] T401 [P] [US1] In `tests/theory.test.js` + `tests/audio.test.js`: tests named
  `AC-4.1.1 — Play button strums the selected chord's tones ascending from its root`
  (voicing pitch classes = chord tones, strictly ascending MIDI, 12×20 sweep; playChord
  schedules one voice per note at 50 ms offsets) and `AC-4.1.2 — Extended chords voice
  their extensions above the octave` (9/11/13/add9 lift to +14/+17/+21; sus2 stays low).
- [X] T402 [P] [US1] In `tests/controls.test.js`: tests named `AC-4.1.3 — Playback is
  anchored to the true root, unaffected by capo Relative mode` and `AC-4.1.4 — Chord
  playback only ever fires on the Play gesture` (state changes trigger no playback;
  button click/Enter does; accessible name present).

### Implementation

- [X] T410 [US1] In `src/js/theory.js`: add `voicingOffsets` to the six extended
  qualities in `CHORD_QUALITIES` and export
  `computeChordVoicing(chordRootSemitone, qualityId, baseOctave = 3)` (R-402).
- [X] T411 [US1] In `src/js/audio.js`: export `playChord(midiNotes, strumSeconds = 0.05)`
  scheduling each note on the AudioContext clock via the existing instrument path (R-403).
- [X] T412 [US1] In `src/js/controls.js`: add the "Play chord" button to the chord panel
  (`#play-chord-button`, aria-label), wired to
  `computeChordVoicing(trueRoot + chordRootOffset, chordQualityId)` → `audio.playChord`
  inside the click handler only (R-404).

## Phase 3: Polish & gates

- [X] T420 Run all four gates; regenerate and commit the matrix.
- [X] T421 Manual quickstart validation (real audio needs the maintainer's ears; the
  session validates DOM/scheduling via the mocked suites and a headless-browser click).

## Dependencies

- T409 before gates; T401/T402 before T410–T412; T420 after all; T421 after T420.

## Implementation Strategy

Tests → theory voicing → audio scheduling → button. Single-story MVP.


---

## Completion log

*2026-09-07 — All tasks done. T410 (`src/js/theory.js`: voicingOffsets + computeChordVoicing),
T411 (`src/js/audio.js`: playChord), T412 (`src/js/controls.js`: #play-chord-button);
tests in `tests/theory|audio|controls.test.js`. T420: all four gates pass (211 app tests).
T421: headless-Chromium click confirms E7 schedules MIDI 52/56/59/62 at 50 ms strum
offsets with aria-label "Play E7 chord" and no page errors; actual sample audio needs
the maintainer's ears on the live site (the sandbox blocks the soundfont CDN).*

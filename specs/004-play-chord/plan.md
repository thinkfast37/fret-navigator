# Implementation Plan: Play the Selected Chord

**Branch**: `claude/chord-root-mode-selection-38t633` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-play-chord/spec.md`

## Summary

Add `computeChordVoicing` to `theory.js` (pure: chord root semitone + quality → ascending
MIDI notes, root anchored at octave 3, extensions lifted an octave via per-quality
`voicingOffsets` data), `playChord` to `audio.js` (schedules each note on the shared
AudioContext clock at 50 ms strum intervals through the existing lazily-loaded
instrument), and a Play button to the chord panel in `controls.js` wired to the true
root. No new dependencies; the mocked-soundfont jsdom test rig already in place covers
the wiring.

## Technical Context

**Language/Version**: JavaScript (ES modules), vanilla, no build step

**Primary Dependencies**: None new (soundfont-player already loaded; its
`instrument.play(note, when)` signature schedules against the AudioContext clock)

**Storage**: None — no state/schema change; the button reads existing chord selection

**Testing**: `node --test`; voicing math in `tests/theory.test.js`; playChord scheduling
in `tests/audio.test.js`; button DOM/gesture-only in `tests/controls.test.js`

**Target Platform**: Browser (static SPA)

**Project Type**: Single-page client-side web app

**Performance Goals**: N/A — a handful of scheduled sample voices per press

**Constraints**: Constitution III — AudioContext touched only inside the gesture handler;
no autoplay on any state change. True-root anchoring (FR-048 analogue). Theory purity.

**Scale/Scope**: 3 source files touched, no schema change, ~1 new function per layer.

## Constitution Check

| Principle | Assessment |
|---|---|
| I. Music Theory Correctness | PASS — voicing computed in `theory.js` from the existing quality table (+ explicit `voicingOffsets` for the six extended qualities), exhaustively tested 12×20. |
| II. Visualization Consistency | PASS — no rendering change; one button added to the existing chord panel rebuild. |
| III. Audio Behavior | PASS (gate) — playback only inside the Play click/keydown handler; reuses the lazy AudioContext/instrument path; correct absolute MIDI pitches incl. octaves. |
| IV. Testing Standards | PASS — every new export tested; AC-4.1.x named tests across theory/audio/controls suites. |
| V. Simplicity & Scope Discipline | PASS — no dependency, no state, no config; fixed strum timing (YAGNI: no tempo control). |

No violations.

## Project Structure

### Documentation (this feature)

```text
specs/004-play-chord/
├── spec.md
├── plan.md              # This file
├── research.md
├── quickstart.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
src/js/theory.js     # CHANGED — voicingOffsets on extended qualities, computeChordVoicing
src/js/audio.js      # CHANGED — playChord(midiNotes, strumSeconds)
src/js/controls.js   # CHANGED — Play button in the chord panel
tests/theory.test.js   # CHANGED — voicing tests (AC-4.1.2 + 12×20 sweep)
tests/audio.test.js    # CHANGED — playChord scheduling tests
tests/controls.test.js # CHANGED — button + gesture-only tests (AC-4.1.1/3/4)
```

**Structure Decision**: One new function per existing layer; no new files.

## Complexity Tracking

Not applicable — no violations.

## Traceability Matrix

| Plan item | Covers | Acceptance Criteria | Implementation tasks | Test tasks |
|---|---|---|---|---|
| **P-301** | Chord voicing math + strummed audio scheduling | AC-4.1.1, AC-4.1.2 | T410, T411 | T401 |
| **P-302** | Play button UI, true-root anchoring, gesture-only invariant | AC-4.1.3, AC-4.1.4 | T412 | T402 |

# Implementation Plan: Piano Mode

**Branch**: `claude/peaceful-cray-cznwl2` | **Date**: 2026-10-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-instrument-piano/spec.md`

## Summary

The piano joins feature 007's instrument table as the first *keyboard* instrument.
`theory.js` gives every instrument a `kind` (stringed or keyboard), a `voice` and a chord
strum, and gains the keyboard arithmetic: the six standard sizes and their ranges
(R-802), every key of a size, the two-row split at a C (R-803), and MIDI → frequency.
`state.js` bumps to `schemaVersion` 4 to hold `keyCount`; tunings stay keyed by stringed
instrument only (R-804). A new `keyboard.js` draws the piano into the same `#fretboard`
SVG, dispatched from `fretboard.render()`, which hands it the highlight rules it shares
with the fretboard so a key and a fret of one pitch class can never disagree (R-805). A
new `synth.js` ports rhythm-master's melodic voice (R-801); `audio.js` routes each call
to the sample or the synth by voice. `controls.js` hides the stringed-only controls on
the piano and adds the key-count selector.

## Technical Context

**Language/Version**: ES2022 modules, no build step

**Primary Dependencies**: None added — the piano voice is raw Web Audio (jsdom for DOM
tests only)

**Storage**: `localStorage` — **schema change**: version 3 → 4 adds `keyCount` (88). The
migration rewrites saved settings on load and is not reversible by a later commit; the
maintainer was told so before choosing the landing mode.

**Testing**: `tests/theory.test.js` (pure: sizes, ranges, split, frequency),
`tests/synth.test.js` (the voice's Web Audio graph against a recording mock),
`tests/state.test.js` (key count, migration, fallback, settings kept across the piano),
`tests/piano.test.js` (DOM-capable: instrument switch, hidden controls, highlighting
parity with the fretboard, key-count control, rows, key geometry, piano playback),
`tests/main-piano.test.js` (DOM-capable: reload and resize through the real bootstrap)

**Target Platform**: Browser; TV-first pointer interaction, tablets and phones

**Project Type**: Static SPA

**Performance Goals**: A full 88-key redraw is ~90 SVG groups, fewer than the guitar's
150 notes; a resize redraws only when the row count changes.

**Constraints**: `theory.js` stays pure (Principle I) — the keyboard ranges, the split and
the frequency maths live there. The capo binding rule stays in
`fretboard.getHighlightRootSemitone`, which now passes capo 0 for a keyboard instrument
(FR-603); no consumer re-derives it. Audio only from a gesture (Principle III).

**Scale/Scope**: `src/js/theory.js`, `state.js`, `audio.js`, `fretboard.js`,
`controls.js`, `main.js`, new `keyboard.js` and `synth.js`, `src/index.html`,
`src/css/styles.css`; five test files (two new DOM suites, one new pure suite).

## Constitution Check

| Principle | Assessment |
|---|---|
| I. Music Theory Correctness | PASS — key ranges, split points and frequencies are pure functions in `theory.js`, tested for every size. |
| II. Visualization Consistency | PASS — the keyboard replaces the fretboard inside the one board view, never alongside it; its highlighting is the fretboard's own rules (R-805), and root/degree cues keep their non-colour markers. |
| III. Audio Behavior | PASS — exact MIDI pitch, raw Web Audio, no new library; playback only from a key, fret or Play gesture. |
| IV. Testing Standards | PASS — AC-8.x tests, DOM-level for every criterion naming a control, the board or a gesture; the two new modules have their own tests. |
| V. Simplicity & Scope Discipline | PASS — no dependency; the synth replaces nothing and adds no asset; one `kind` field rather than a parallel piano code path through state. |

No violations.

## Project Structure

```text
src/js/theory.js          # CHANGED — kind/voice/chordStrumSeconds per instrument; Piano;
                          #   STRINGED_INSTRUMENTS, KEYBOARD_SIZES, keyboardKeys(),
                          #   splitKeyboardRows(), midiToFrequency()
src/js/state.js           # CHANGED — keyCount, setKeyCount(), tunings for stringed
                          #   instruments only, schema v3 -> v4 migration
src/js/keyboard.js        # NEW — piano rendering, row fitting, key activation
src/js/synth.js           # NEW — rhythm-master's melodic voice, ported
src/js/audio.js           # CHANGED — play/playChord/resetAudio take a voice
src/js/fretboard.js       # CHANGED — dispatch to keyboard.js; shared highlight rules;
                          #   no capo shift on a keyboard
src/js/controls.js        # CHANGED — instrument-specific control visibility, key-count
                          #   selector, Play button sounds per instrument
src/js/main.js            # CHANGED — resize re-fit; Reset audio confirms per voice
src/index.html            # CHANGED — #key-count-controls; piano credit line
src/css/styles.css        # CHANGED — piano keys; [hidden] control containers
tests/theory.test.js      # CHANGED — AC-8.2.1, AC-8.2.2, AC-8.3.2, AC-8.4.1
tests/synth.test.js       # NEW — AC-8.4.2
tests/state.test.js       # CHANGED — AC-8.1.3, AC-8.5.2, AC-8.5.3
tests/piano.test.js       # NEW — AC-8.1.x, AC-8.2.x, AC-8.3.1–AC-8.3.3, AC-8.4.1/3/4
tests/main-piano.test.js  # NEW — AC-8.3.4, AC-8.5.1
tests/helpers/web-audio-mock.js  # NEW — recording Web Audio mock
```

**Structure Decision**: One board view and one set of highlight rules. `fretboard.render`
stays the single entry point; a keyboard instrument is drawn by `keyboard.js` with the
rules passed in, so `keyboard.js` imports nothing from `fretboard.js` and there is no
import cycle.

## Complexity Tracking

Not applicable.

## Traceability Matrix

| Plan item | Covers | Acceptance Criteria | Implementation tasks | Test tasks |
|---|---|---|---|---|
| **P-701** | The piano in the shared board, highlighted by the fretboard's rules | AC-8.1.1, AC-8.1.5 | T810 | T801 |
| **P-702** | Stringed-only controls hidden on the piano, their settings kept | AC-8.1.2, AC-8.1.3 | T811 | T802 |
| **P-703** | The capo binding rule skips keyboard instruments | AC-8.1.4 | T812 | T803 |
| **P-704** | Keyboard sizes, ranges and the key-count control | AC-8.2.1, AC-8.2.2, AC-8.2.3 | T813 | T804 |
| **P-705** | One or two rows, key geometry, re-fit on resize | AC-8.3.1, AC-8.3.2, AC-8.3.3, AC-8.3.4 | T814 | T805 |
| **P-706** | The piano voice, struck chords, stringed playback unchanged | AC-8.4.1, AC-8.4.2, AC-8.4.3, AC-8.4.4 | T815 | T806 |
| **P-707** | Key count persisted, schemaVersion 4 migration and fallback | AC-8.5.1, AC-8.5.2, AC-8.5.3 | T816 | T807 |

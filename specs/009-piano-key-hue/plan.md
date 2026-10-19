# Implementation Plan: Piano Key Colours

**Branch**: `claude/piano-key-hue` | **Date**: 2026-10-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-piano-key-hue/spec.md`

## Summary

`state.js` gains `keyHue` (default on) behind a schemaVersion 4 → 5 migration (R-902).
`controls.js` adds a "Key colours" On/Off toggle in a new keyboard-only container.
`keyboard.js` reads `keyHue` and, for each key, the same `describe()` result its marker
uses (feature 008, R-805), and marks tinted keys with `data-hue` / `data-hue-role`;
`styles.css` turns those into `color-mix()` tints of the role colours (R-901). Shipped
with feature 008's AC-8.2.4 revision: the middle C caption becomes a black tip (R-903).

## Technical Context

**Language/Version**: ES2022 modules, no build step

**Primary Dependencies**: None added

**Storage**: `localStorage` — **schema change**: version 4 → 5 adds `keyHue` (true). The
migration rewrites saved settings on load and is not reversible by a later commit; the
maintainer was told so before choosing the landing mode.

**Testing**: `tests/state.test.js` (default, migration, fallback),
`tests/piano.test.js` (DOM-capable: tints per key, Chord view, toggle, middle C tip),
`tests/main-piano.test.js` (DOM-capable: the choice through a reload),
`tests/styles.test.js` (DOM-capable: the tint rules and strength tokens in the stylesheet)

**Target Platform**: Browser; TV-first pointer interaction, tablets and phones

**Project Type**: Static SPA

**Constraints**: No consumer re-derives highlight membership — the tint reads the same
`describe()` result as the marker (FR-604). Colours stay tokens in `:root` (FR-052).

**Scale/Scope**: `src/js/state.js`, `controls.js`, `keyboard.js`, `src/index.html`,
`src/css/styles.css`; four test files.

## Constitution Check

| Principle | Assessment |
|---|---|
| I. Music Theory Correctness | PASS — no musical arithmetic changes; tints read existing highlight results. |
| II. Visualization Consistency | PASS — a key's tint is its marker's colour by construction; markers and labels keep their non-colour cues. |
| III. Audio Behavior | PASS — untouched. |
| IV. Testing Standards | PASS — AC-9.x tests, DOM-level for every criterion about the board or a control. |
| V. Simplicity & Scope Discipline | PASS — one boolean, one versioned migration, no dependency. |

No violations.

## Project Structure

```text
src/js/state.js           # CHANGED — keyHue, setKeyHue(), schema v4 -> v5 migration
src/js/controls.js        # CHANGED — Key colours toggle, keyboard-only
src/js/keyboard.js        # CHANGED — data-hue/data-hue-role per key; middle C tip (008)
src/index.html            # CHANGED — #key-hue-controls
src/css/styles.css        # CHANGED — tint strengths, role mapping, tint fills; tip token
tests/state.test.js       # CHANGED — AC-9.2.3, AC-9.3.2, AC-9.3.3
tests/piano.test.js       # CHANGED — AC-9.1.x, AC-9.2.1, AC-9.2.2; AC-8.2.4 revised
tests/main-piano.test.js  # CHANGED — AC-9.3.1
tests/styles.test.js      # CHANGED — AC-9.1.2
```

## Complexity Tracking

Not applicable.

## Traceability Matrix

| Plan item | Covers | Acceptance Criteria | Implementation tasks | Test tasks |
|---|---|---|---|---|
| **P-801** | Keys tinted by their marker's colour, light on white and deep on black, faint for ghosts | AC-9.1.1, AC-9.1.2, AC-9.1.3, AC-9.1.4 | T904 | T901 |
| **P-802** | The Key colours toggle, piano only, starting on | AC-9.2.1, AC-9.2.2, AC-9.2.3 | T905 | T902 |
| **P-803** | The choice persisted, schemaVersion 5 migration and fallback | AC-9.3.1, AC-9.3.2, AC-9.3.3 | T906 | T903 |

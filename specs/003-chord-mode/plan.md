# Implementation Plan: Chord Mode — Scale Root vs Chord Root

**Branch**: `claude/chord-root-mode-selection-38t633` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-chord-mode/spec.md`

## Summary

Add a chord layer on top of the existing scale layer: a chord picker (root as scale
degrees with modal-mixture naming, quality from a 20-entry vocabulary) and a Scale/Chord
view toggle. Chord view fully renders only the chord's tones, ghosts the remaining scale
tones, and hides everything else. This replaces feature 001 Story 5's focal-point clicks,
per-degree chord-tone toggles, bright/dim rendering, and "Bright notes" summary. All new
musical arithmetic (chord-tone formulas, Roman-numeral/borrowed-source degree labelling,
default triad quality) lives in `theory.js`; state moves to `schemaVersion: 2` with a
migration; `controls.js` gains the picker and toggle; `fretboard.js` gains the
chord/ghost/hidden render classes.

## Technical Context

**Language/Version**: JavaScript (ES modules), vanilla, no build step

**Primary Dependencies**: None new. Existing modules only (`theory.js`, `state.js`,
`fretboard.js`, `controls.js`, `audio.js`, `main.js`).

**Storage**: `localStorage` key `fret-navigator-settings`; `schemaVersion` 1 → **2**
with an append-only migration (drop `focalDegreeSemitone`/`chordToneOverrides`, add
`chordRootOffset`/`chordQualityId`/`viewMode`).

**Testing**: `node --test`; pure chord/degree math in `tests/theory.test.js`; jsdom
suites (`state`, `controls`, `fretboard`, `main`) for migration, picker DOM, and render
classes. Tests named `AC-3.x.y — <title>` per the traceability gate.

**Target Platform**: Browser (static SPA, `src/index.html` + ES modules)

**Project Type**: Single-page client-side web app (no backend)

**Performance Goals**: Render path stays a per-note class toggle over the existing 150
note elements — no new layout work per render.

**Constraints**: Capo binding rule — chord-tone fretboard membership derives from
`getHighlightRootSemitone`, chord summary text from the true root (FR-047/FR-048 split
preserved). `theory.js` stays pure. Colour-independence: ghosts differ from full notes
by label presence and marker treatment, not colour alone.

**Scale/Scope**: ~4 source files changed, no new source files; feature 001 spec revised
(Story 5 superseded); v1→v2 settings migration.

## Constitution Check

| Principle | Assessment |
|---|---|
| I. Music Theory Correctness | PASS — chord formulas, Roman-numeral casing, borrowed-source naming, and diatonic-triad-quality defaults all added to `theory.js` as pure functions with exhaustive tests (12 roots × 20 qualities; all church modes for numeral casing). No view re-derives them. |
| II. Visualization Consistency | PASS — one fretboard; visual state remains a pure function of state, now `(tuning, root, scaleId, chordRootOffset, chordQualityId, viewMode, …)`. Ghost vs full rendering is label + marker treatment, not colour alone (FR-111). |
| III. Audio Behavior | PASS — click-to-play unchanged; clicks stop mutating selection (removal of focal point), audio path untouched. |
| IV. Testing Standards | PASS (gate) — every new exported theory function gets unit tests; migration gets state tests; picker/toggle get controls tests; render classes get fretboard tests. Superseded Story 5 tests are removed/replaced in the same change, cited against the 001 spec revision (§2a: the tests asserted behaviour the revised ACs no longer say). |
| V. Simplicity & Scope Discipline | PASS — no new dependency, no build step. Schema change carries a real migration (append-only, idempotent). The 20-quality table is data, not abstraction. |

No violations. Complexity Tracking table not needed.

## Project Structure

### Documentation (this feature)

```text
specs/003-chord-mode/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── checklists/requirements.md
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
src/js/
├── theory.js       # CHANGED — CHORD_QUALITIES, computeChordTones, getChordName,
│                   #   getChordRootOptions (degree labels + borrowed sources),
│                   #   getDefaultChordQualityId
├── state.js        # CHANGED — schemaVersion 2, new fields + setters, v1→v2 migration
├── fretboard.js    # CHANGED — chord view classes (is-chord-tone / is-ghost / chord-hidden),
│                   #   computeChordToneSet; focal-point click mutation removed
├── controls.js     # CHANGED — "Scale Root" label, chord picker (2 dropdowns),
│                   #   Scale/Chord view toggle, chord summary; toggle row + Bright-notes removed
├── audio.js        # unchanged
└── main.js         # unchanged (wiring only via controls)

src/css/styles.css  # CHANGED — ghost/hidden/full chord-view styles

tests/
├── theory.test.js   # CHANGED — chord formula / numeral / borrowed-source suites
├── state.test.js    # CHANGED — v2 defaults, migration, validation
├── controls.test.js # CHANGED — picker DOM, toggle, summary; toggle-row tests removed
├── fretboard.test.js# CHANGED — view filtering classes, capo-relative chord shift
└── main.test.js     # CHANGED where Story 5 flows were asserted
```

**Structure Decision**: Existing flat module layout retained; the chord layer is new
functions in existing modules, honouring the theory-purity and state-single-source rules.

## Complexity Tracking

Not applicable — no Constitution Check violations.

## Traceability Matrix

| Plan item | Covers | Acceptance Criteria | Implementation tasks | Test tasks |
|---|---|---|---|---|
| **P-201** | Chord theory: quality vocabulary + tone computation | AC-3.1.2, AC-3.1.3 | T310 | T301 |
| **P-202** | Chord-root degree labelling incl. Roman casing, borrowed sources, non-heptatonic fallback | AC-3.1.1, AC-3.3.1, AC-3.3.2, AC-3.3.3 | T311 | T302 |
| **P-203** | State schema v2: chord selection fields, defaults, reset rule, migration, persistence | AC-3.1.4, AC-3.1.5, AC-3.1.6 | T312 | T303 |
| **P-204** | Chord picker + view toggle + summary UI | AC-3.2.1, AC-3.2.9, AC-3.4.1 | T313 | T304 |
| **P-205** | Chord-view fretboard rendering: full/ghost/hidden layers + accessibility | AC-3.2.2, AC-3.2.3, AC-3.2.4, AC-3.2.7 | T314 | T305 |
| **P-206** | Removal of focal-point/toggle system; Scale view and audio-click invariants | AC-3.2.5, AC-3.2.6 | T315 | T306 |
| **P-207** | Capo Relative binding for chord view | AC-3.2.8 | T316 | T307 |

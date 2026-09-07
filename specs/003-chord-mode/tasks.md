# Tasks: Chord Mode — Scale Root vs Chord Root

**Input**: Design documents from `/specs/003-chord-mode/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Included — constitution Principle IV; every AC-3.x.y must have a test naming
it verbatim (spec-trace gate). Test IDs T301–T307 map to plan items P-201–P-207.

**Organization**: The stories are tightly coupled through the shared theory/state layer,
so tasks are grouped by plan item (theory → state → UI → rendering → removal → capo),
tests first within each group.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Paths are relative to repository root (`src/`, `tests/`)

---

## Phase 1: Setup

**Purpose**: Spec-side prerequisites so the traceability gates can pass.

- [X] T308 Revise `specs/001-fretboard-visualizer/spec.md`: mark Story 5's focal-point /
  chord-tone-toggle / bright-dim / Bright-notes ACs superseded with dated parentheticals
  citing feature 003 (spec before code, §2); prune the corresponding entries from
  `specs/traceability-baseline.json` when their tests are removed.
- [X] T309 Register feature 003 in `spec-trace.config.json` (`features` triple) and add
  `specs/003-chord-mode/spec.md` to the `SPECS` list in `tests/ac-coverage.js`.

---

## Phase 2: Foundational — theory + state (P-201, P-202, P-203)

### Tests first ⚠️ (write, observe failing, then implement)

- [X] T301 [P] [US1] In `tests/theory.test.js`: tests named `AC-3.1.2 — Chord quality
  dropdown offers the full vocabulary` (CHORD_QUALITIES table completeness) and
  `AC-3.1.3 — Selected chord's tones are computed from root + quality` (computeChordTones
  across all 20 qualities, sample roots incl. wraparound, E+dom7 → E,G#,B,D; plus
  getChordName spelling cases).
- [X] T302 [P] [US1] In `tests/theory.test.js`: tests named `AC-3.1.1 — Chord root
  dropdown lists all 12 chromatic roots as degrees of the current scale`,
  `AC-3.3.1 — Diatonic chord roots are labelled with case-correct Roman numerals`
  (all seven church modes), `AC-3.3.2 — Non-diatonic chord roots are labelled as borrowed
  with a source when one is common` (Ionian bVII → Mixolydian/parallel minor, bIII/bVI →
  Aeolian, etc.), `AC-3.3.3 — Non-seven-note scales fall back to degree-only labels`.
- [X] T303 [P] [US1] In `tests/state.test.js`: tests named `AC-3.1.4 — Chord selection
  defaults to the scale root with a diatonic quality` (defaults + reset on
  setRoot/setScaleId), `AC-3.1.5 — Chord selection persists across reloads`
  (save/load round-trip, v2 validation), `AC-3.1.6 — Saved settings from the previous
  focal-point system load cleanly` (v1 payload migrates: old fields dropped, surviving
  fields preserved, schemaVersion 2 written).

### Implementation

- [X] T310 [US1] In `src/js/theory.js`: add `CHORD_QUALITIES` (20 entries per research
  R-302), `computeChordTones(chordRootSemitone, qualityId)`, and
  `getChordName(chordRootSemitone, qualityId, keyContext)`. Pure functions only.
- [X] T311 [US1] In `src/js/theory.js`: add `getChordRootOptions(rootSemitone, scaleId,
  accidentalPreference)` (12 options with degree labels, Roman casing from diatonic
  triads, borrowed-from via parallel church-mode scan, note-name fallback for
  non-heptatonic scales and null scale) and `getDefaultChordQualityId(scaleId)` (R-305).
- [X] T312 [US1] In `src/js/state.js`: bump `SCHEMA_VERSION` to 2; replace
  `focalDegreeSemitone`/`chordToneOverrides` with `chordRootOffset`, `chordQualityId`,
  `viewMode`; add setters `setChordRootOffset`, `setChordQualityId`, `setViewMode`;
  reset chord selection on root/scale change; add v1→v2 `migrate()` step and v2
  validation; remove `setFocalDegreeSemitone`/`setChordToneOverride`/
  `pruneChordToneOverrides`.

---

## Phase 3: User Story 2 + UI — picker, toggle, rendering (P-204, P-205)

### Tests first ⚠️

- [X] T304 [P] [US2] In `tests/controls.test.js`: tests named `AC-3.2.1 — View toggle
  switches between Scale and Chord views`, `AC-3.2.9 — Chord summary line names the chord
  and its tones`, and `AC-3.4.1 — Root control is labelled "Scale Root" and chord picker
  "Chord Root"` [US4]; picker dropdown DOM (12 root options, 20 quality options) asserted
  under the AC-3.1.1/AC-3.1.2 names with `: controls` qualifiers.
- [X] T305 [P] [US2] In `tests/fretboard.test.js`: tests named `AC-3.2.2 — Chord view
  fully renders only the chord's tones` (incl. out-of-scale chord tone case),
  `AC-3.2.3 — Chord view ghosts the remaining scale tones`, `AC-3.2.4 — Chord view hides
  non-scale non-chord notes`, `AC-3.2.7 — Ghost dots remain non-interactive for selection
  but stay accessible` (ghost keeps aria-label + audio activation; hidden notes
  tabindex −1).

### Implementation

- [X] T313 [US2] In `src/js/controls.js`: rename root heading to "Scale Root"; add
  chord-picker section (Chord Root select from `getChordRootOptions`, Chord Quality
  select from `CHORD_QUALITIES`, Scale/Chord view toggle buttons); replace
  `updateChordInfo`'s toggle row + Bright-notes summary with the chord summary
  (`getChordName` + spelled tones from the true root). Wire to new state setters.
  Update `src/index.html` container ids if needed.
- [X] T314 [US2] In `src/js/fretboard.js`: add `computeChordToneSet(appState)` (highlight
  root + chordRootOffset + quality intervals); in `updateNotes`, when
  `viewMode === "chord"`, assign exactly one of `is-chord-tone` / `is-ghost` /
  `chord-hidden` per data-model rules (ghost = no label text; hidden = tabindex −1);
  neutral chord colour class for out-of-scale chord tones. Add ghost/hidden/chord-tone
  styles to `src/css/styles.css` (ghost distinguishable without colour).

---

## Phase 4: Removal + invariants (P-206) and capo binding (P-207)

### Tests first ⚠️

- [X] T306 [P] [US2] Tests named `AC-3.2.5 — Scale view is unchanged by chord selection`
  (`tests/fretboard.test.js`) and `AC-3.2.6 — Clicking a note plays its pitch in both
  views` (audio still fires; no state mutation on click; `is-bright` and focal behaviour
  gone). Remove/rewrite the superseded Story-5 tests, citing the T308 spec revision in
  the commit.
- [X] T307 [P] [US2] In `tests/fretboard.test.js`: test named `AC-3.2.8 — Chord view
  shifts with the capo highlight root in Relative mode` (capo 2 + relative: chord-tone
  set shifts with highlight root; summary text stays on true root).

### Implementation

- [X] T315 [US2] In `src/js/fretboard.js` + `src/js/controls.js`: remove the focal-point
  click mutation in `onNoteActivated` (keep audio), the `is-bright` class logic, and any
  leftover chord-tone-toggle code paths; keep `computeDefaultTriad`/`getTriadQuality` in
  theory (still used for numeral casing/default quality) but remove now-unused exports
  (`isToggleableChordTone`, `identifyChordQuality`, `computeActiveBrightSet`) and their
  call sites.
- [X] T316 [US2] Verify capo wiring: `computeChordToneSet` consumes
  `getHighlightRootSemitone`; chord summary consumes `getEffectiveRootSemitone`
  (implemented as part of T313/T314; this task is the explicit AC-3.2.8 verification +
  any fix).

---

## Phase 5: Polish & gates

- [X] T320 Run all four gates (`npm test`, `npm run coverage:ac`, `npm run trace:matrix`
  + commit the regenerated matrix, `npm run check:trace`) and prune
  `specs/traceability-baseline.json` entries retired by this change
  (`npm run trace:prune`).
- [X] T321 Manual quickstart validation per `specs/003-chord-mode/quickstart.md` in a
  real browser (maintainer or session-run where possible).

---

## Phase 6: Bug fixes after landing

- [X] T322 [US2] **Bug (AC-3.2.2)**: an out-of-scale chord tone rendered as bare text with
  no marker circle — D major in C Ionian showed D and A as chord tones but left F# looking
  like any other chromatic note. `src/js/fretboard.js` set `.is-chord-tone` correctly; the
  defect was a CSS cascade tie in `src/css/styles.css`, where the UAT round 1 B2 rule
  `.note:not(.is-diatonic):not(.is-root) .note-marker { display: none }` matched
  out-of-scale chord tones at the same specificity as the neutral-fill rule below it, so
  the fill applied to a marker already blanked. Exempted `.is-chord-tone` from the hiding
  rule; out-of-scale chord tones now carry the full chord-tone ring on the
  `--color-neutral` dark-grey fill with the white label. No spec change — AC-3.2.2 already
  required this. Files: `src/css/styles.css`, `tests/styles.test.js` (two source-level
  tests named for AC-3.2.2; the existing jsdom tests could not see this because they never
  load the stylesheet).

---

## Dependencies

- T308/T309 (setup) before the gates can pass; T308 before superseded tests are removed (T306).
- T301–T303 before T310–T312; T310/T311 before T312 (migration derives default quality).
- T312 before T313/T314. T304/T305 before T313/T314. T306/T307 before T315/T316.
- T320 after everything; T321 after T320.

## Implementation Strategy

Foundational theory/state first (Phase 2 is the MVP core — US1 testable via theory/state
alone), then UI + rendering (Phase 3 delivers the visible feature), then removal/capo
(Phase 4), then gates (Phase 5). Commits cite US/AC IDs.


---

## Completion log

*2026-09-07 — T301–T316 implemented and green (`src/js/theory.js`, `src/js/state.js`,
`src/js/controls.js`, `src/js/fretboard.js`, `src/css/styles.css`; tests across
`tests/theory|state|controls|fretboard.test.js`). T308: feature 001 Story 5 revised
(AC-1.5.2/3/5/6/7 deleted as superseded, AC-1.5.1 retitled, AC-1.5.4 revised); baseline
pruned 57→52. T320: all four gates pass. T321: quickstart scenarios 1–3 validated in
headless Chromium (E7-in-A chord view, bVII borrowed label, scale view); audio and the
remaining scenarios validated via the mocked jsdom suites — maintainer eyes on the live
site still welcome.*

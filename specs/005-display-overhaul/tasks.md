# Tasks: Display Overhaul — Contrast, Stable Colors, TV Layout

**Input**: Design documents from `/specs/005-display-overhaul/`

**Prerequisites**: plan.md, spec.md, research.md

**Tests**: Included — AC-5.x.y named verbatim in `tests/styles.test.js` (DOM-capable).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T509 Register feature 005 in `spec-trace.config.json` and `tests/ac-coverage.js`.

## Phase 2: User Story 1 — One readable color identity per degree (P1)

- [X] T501 [US1] In `tests/styles.test.js`: tests named `AC-5.1.1 — Each degree role has
  exactly one color, used identically in both views` (no `-bright`/`-dark` tokens
  remain; no `.is-chord-tone` fill override per role), `AC-5.1.2 — Note labels meet
  WCAG AA contrast on every role color` (parse all 12 `--role-*` tokens, compute
  relative-luminance contrast vs the label color, assert ≥ 4.5), and `AC-5.1.3 — Chord
  tones are marked by ring and size, never by a color swap` (`.is-chord-tone` rule sets
  stroke + radius, not fill). Update the FR-051 token-name assertions here and in
  `tests/controls.test.js` (R-505).
- [X] T510 [US1] In `src/css/styles.css`: replace the 24 variant tokens with 12
  `--role-*` tokens (R-502 values); point every consumer (note fills, root-button
  selected state) at them; make diatonic note labels bold white; restyle
  `.is-chord-tone` as white ring + larger radius over the unchanged fill (root+chord
  keeps the root accent ring).

## Phase 3: User Stories 2–3 — TV layout + bounded selects (P1/P2)

- [X] T502 [P] [US2] In `tests/styles.test.js`: tests named `AC-5.2.1 — Wide viewports
  get compact controls and a fretboard-first layout` (≥1280px media tier with compact
  control rules; `#fretboard-container` remains the `flex: 1` region of the ≥768px
  layout) and `AC-5.3.1 — Chord picker dropdowns have a bounded width` [US3]
  (max-width rule on the chord selects).
- [X] T511 [US2] In `src/css/styles.css`: add the ≥1280px compact tier (tighter gaps,
  smaller control labels/selects/buttons, slimmer header/footer) and the chord-select
  max-width + ellipsis rules (US3).

## Phase 4: Polish & gates

- [X] T520 Run all four gates; regenerate and commit the matrix.
- [X] T521 Screenshot validation at 390px (phone), 1024px (iPad), and 1920px (TV)
  widths in headless Chromium; attach to the Review PR. Maintainer merges (Review
  landing — taste is the deliverable).

## Dependencies

- T509 before gates; T501/T502 before T510/T511; T520/T521 last.

## Implementation Strategy

Palette + ring first (US1 is the readability core), then layout tier and select caps.


---

## Completion log

*2026-09-07 — All tasks done. T510/T511 in `src/css/styles.css` (12 unified `--role-*`
tokens, white bold labels, chord ring+size emphasis, ≥1280px compact tier, bounded chord
selects, horizontal chord-panel flow via `.chord-subcontrol` groups in
`src/js/controls.js`); `ROW_HEIGHT` 40→48 in `src/js/fretboard.js` so the width-capped
board uses more height on big screens. T501/T502 in `tests/styles.test.js` (incl. the
computational WCAG AA gate) with the FR-051 token rename mirrored in
`tests/controls.test.js`. T520: all four gates pass (220 app tests). T521: headless
Chromium at 390/1024/1920px — the fretboard container now takes 73% of a 1080p viewport
(controls strip ~200px, two rows); screenshots attached to the Review PR conversation.
Review landing: maintainer merges after looking.*

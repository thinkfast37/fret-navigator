# Implementation Plan: Display Overhaul — Contrast, Stable Colors, TV Layout

**Branch**: `claude/chord-root-mode-selection-38t633` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-display-overhaul/spec.md`

## Summary

CSS-only change (plus test updates). Replace the 12 bright/dark color-variant pairs with
one deep saturated `--role-*` token each (all validated ≥ 4.5:1 against white labels);
recolor note labels white/bold on colored fills; restyle `.is-chord-tone` as ring+size
emphasis over the unchanged fill; add a ≥1280px compact-controls tier; cap the chord
selects' width. `tests/styles.test.js` gains a computational contrast test and
token-structure assertions; the two tests that asserted the old `--role-1-bright` token
name update to `--role-1` (the token the FR now names).

## Technical Context

**Language/Version**: CSS (no JS change); tests in `node --test` reading the stylesheet source

**Primary Dependencies**: None

**Storage**: None

**Testing**: `tests/styles.test.js` (DOM-capable per spec-trace config) — source-level
assertions incl. a WCAG relative-luminance contrast computation over the `--role-*` tokens

**Target Platform**: Browser; breakpoints — <768px document flow, ≥768px no-scroll
flex, ≥1280px compact TV tier

**Project Type**: Static SPA

**Performance Goals**: N/A

**Constraints**: Color-independence (constitution Accessibility): root ring, diatonic
border, chord ring, label presence all non-color cues — preserved. Review landing:
hues are maintainer-approved via PR screenshots before merge.

**Scale/Scope**: `src/css/styles.css` + `tests/styles.test.js` (+ the token-name update
in `tests/controls.test.js`); no JS, no schema.

## Constitution Check

| Principle | Assessment |
|---|---|
| I. Music Theory Correctness | N/A — no theory change. |
| II. Visualization Consistency | PASS — strengthens it: one color per degree across views; markers/labels stay non-color-cued. |
| III. Audio Behavior | N/A. |
| IV. Testing Standards | PASS — AC-5.x tests in the DOM-capable styles suite; the contrast floor becomes an automated gate rather than a hope. |
| V. Simplicity & Scope Discipline | PASS — token consolidation removes 12 variables; no new tooling. |

No violations.

## Project Structure

```text
src/css/styles.css      # CHANGED — palette tokens, chord-tone ring, TV tier, select cap
tests/styles.test.js    # CHANGED — AC-5.1.1/5.1.2/5.1.3/5.2.1/5.3.1 tests; FR-051 token rename
tests/controls.test.js  # CHANGED — FR-051 assertion follows the renamed token
specs/005-display-overhaul/  # this feature's documents
```

**Structure Decision**: CSS-only; the render path's class assignments are untouched.

## Complexity Tracking

Not applicable.

## Traceability Matrix

| Plan item | Covers | Acceptance Criteria | Implementation tasks | Test tasks |
|---|---|---|---|---|
| **P-401** | Unified high-contrast degree palette + chord-tone ring | AC-5.1.1, AC-5.1.2, AC-5.1.3 | T510 | T501 |
| **P-402** | TV-tier compact layout + bounded chord selects | AC-5.2.1, AC-5.3.1 | T511 | T502 |

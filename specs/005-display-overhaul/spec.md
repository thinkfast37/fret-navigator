# Feature Specification: Display Overhaul — Contrast, Stable Colors, TV Layout

**Feature Branch**: `claude/chord-root-mode-selection-38t633`

**Created**: 2026-09-07

**Status**: Draft

**Input**: User description: "On the TV the fretboard has shrunk — controls take three
quarters of the screen. The letters are tiny and the circles are light pastel colors
that are hard to see; there's no contrast. The chord root and quality dropdowns are
really wide. And when I go from Scale mode to Chord mode the colors change, which is
jarring — ideally it doesn't change." Clarified with the maintainer: one color per
degree in both views with chord tones marked by a strong ring; deep saturated palette
with white labels; target is a fullscreen browser on a TV (1080p/4K wide viewport);
landing mode Review.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - One readable color identity per degree (Priority: P1)

The guitarist sees each scale degree in the same rich, high-contrast color whether they
are in Scale or Chord view. Switching views changes *which notes appear*, never what
color a degree is. Chord tones stand out through a bold ring and larger marker, and
every note label is bold white text that is readable from across the room.

**Why this priority**: Readability is the stated pain; the view-switch color jump and
the pastel palette share the fix.

**Acceptance Scenarios**:

- **AC-5.1.1** — Each degree role has exactly one color, used identically in both views

  **Given** any root and scale, **When** the fretboard renders in Scale view and then
  in Chord view, **Then** every visible note's fill color token is the same in both
  views (one `--role-*` token per degree; no bright/dark variant pair remains).

- **AC-5.1.2** — Note labels meet WCAG AA contrast on every role color

  **Given** the deployed stylesheet, **When** each degree-role fill is checked against
  the white note-label color, **Then** every pairing has a contrast ratio of at least
  4.5:1 (constitution Accessibility baseline), verified computationally from the
  stylesheet's own tokens.

- **AC-5.1.3** — Chord tones are marked by ring and size, never by a color swap

  **Given** Chord view is active, **When** chord tones render, **Then** they keep
  their degree's fill color and are distinguished by a thick high-contrast ring and a
  larger marker radius — a non-color cue that also satisfies the color-independence
  rule.

---

### User Story 2 - The fretboard owns the screen on a TV (Priority: P1)

On a fullscreen browser at TV widths, the guitarist sees a compact control strip and a
big fretboard — not the reverse. Controls tighten up (smaller paddings/gaps) so the
board gets the majority of the viewport height.

**Acceptance Scenarios**:

- **AC-5.2.1** — Wide viewports get compact controls and a fretboard-first layout

  **Given** the no-scroll layout is active (laptop width and above), **When** the page
  renders, **Then** the fretboard container is the flex-growing region of the page and
  a wide-viewport style tier tightens control spacing, font sizes, and select heights
  so the control strip stays compact.

---

### User Story 3 - Narrow chord pickers (Priority: P2)

The Chord Root and Chord Quality dropdowns take a sensible fixed width; the long
borrowed-from descriptions live in the open option list, not in the collapsed control.

**Acceptance Scenarios**:

- **AC-5.3.1** — Chord picker dropdowns have a bounded width

  **Given** any scale with long borrowed-root option labels, **When** the chord panel
  renders, **Then** the Chord Root and Chord Quality selects are capped to a fixed
  maximum width (long option text may truncate in the collapsed control but remains
  fully visible in the opened list).

---

### Edge Cases

- Notes that are both root and chord tone: the root's accent ring wins (root identity
  must never be lost — feature 001 color-independence rule).
- Ghost dots (feature 003) are unaffected: still faint, unlabelled, non-color-coded.
- Mobile/iPad (below the no-scroll breakpoint): document flow unchanged; only the
  shared palette applies.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-301**: The stylesheet MUST define exactly one color token per degree role
  (`--role-1` … `--role-7`), consumed by every rule that colors that degree (fretboard
  scale view, chord view, and the root-button selected state), replacing the
  bright/dark pair.
- **FR-302**: Every degree-role fill MUST meet WCAG AA (≥ 4.5:1) contrast against the
  white note-label color, enforced by an automated test that computes the ratios from
  the stylesheet source.
- **FR-303**: Chord-tone emphasis MUST be a ring + size treatment layered over the
  unchanged degree color.
- **FR-304**: At the no-scroll breakpoint and above, the fretboard container MUST be
  the growing flex region; a wide-viewport tier (≥ 1280px) MUST apply compact control
  styling.
- **FR-305**: The chord root and quality selects MUST carry a bounded max-width.
- **FR-306**: Root markers, diatonic borders, and label presence MUST remain non-color
  cues (no regression of the color-independence rules).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-301**: 12/12 degree-role colors pass 4.5:1 against white labels (automated).
- **SC-302**: Switching Scale ↔ Chord view changes zero fill-color tokens on visible
  notes.
- **SC-303**: At 1920×1080 the fretboard container receives the majority of the
  viewport height (verified by inspection/screenshot at review).
- **SC-304**: All existing suites pass — no behavioural regressions.

## Assumptions

- The dark background theme stays; "TV mode" is a fullscreen browser at 1080p/4K.
- Exact hues are maintainer taste, reviewed via screenshots (Review landing); the
  gates enforce only the contrast floor and token structure.
- Native `<select>` collapsed-state truncation behaviour varies by browser; the width
  cap is the requirement, ellipsis where supported.

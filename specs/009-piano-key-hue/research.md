# Research: Piano Key Colours

**Feature**: 009-piano-key-hue | **Date**: 2026-10-18

## R-901 — Tints are CSS mixes of the role colours, not a second palette

**Decision**: A tinted key's fill is `color-mix(in srgb, var(--role-<id>) <strength>,
<plain key colour>)`. Four strength tokens in `:root` set how strong each tint is: full on
white keys 42%, full on black keys 58%, ghost on white keys 18%, ghost on black keys 30%.
`keyboard.js` marks a tinted key with `data-hue="full|faint"` and `data-hue-role="<id>"`;
twelve one-line rules map each role id to its `--role-*` token.

**Rationale**: FR-706 asks for the tints to follow the role colours from one place.
Mixing in CSS means re-tuning `--role-3` re-tunes every third's key, and the four
strengths are the only new knobs, which matters because the maintainer has not decided
whether they like the look and will want it adjusted. A light mix towards the white-key
colour and a deep mix towards the black-key colour keeps every tinted white key lighter
than every tinted black key (AC-9.1.2) for all twelve role colours, which are all
mid-dark (each passes 4.5:1 against white, AC-5.1.2).

`color-mix()` is supported by every browser this app targets that runs ES modules
released since 2023 (Chrome 111, Safari 16.2, Firefox 113). Where it is not, the
declaration is invalid and the key keeps its plain fill — the feature degrades to "off",
never to a broken keyboard.

**Alternatives rejected**:

- *36 precomputed hex tokens (12 roles × full-white, full-black, ghost)*: works in older
  browsers, but every re-tune of a role colour or a strength means recomputing tokens by
  hand, and it triples the palette FR-052 keeps central.
- *A translucent coloured overlay on each key*: one more SVG element per key and the key
  edge and black-key overlap blend unpredictably.

## R-902 — The setting is `keyHue`, one per app, behind a schemaVersion 5 migration

**Decision**: State gains `keyHue: true`; `schemaVersion` 4 → 5 adds it to old payloads
and passes everything else through; a stored value that is not a boolean fails
validation and the app starts from defaults (AC-9.3.3, as AC-8.5.3 does for the key
count).

**Rationale**: Principle V requires a versioned, append-only migration for any stored
field. The maintainer chose "remembered, starts on" knowing the upgrade rewrites saved
settings and cannot be undone by a later commit. It is one setting, not per instrument:
only the piano has keys.

## R-903 — Middle C's tip is a band inside the key, drawn under its marker

**Decision**: AC-8.2.4 (revised) is met by a 6-unit black band across the bottom of the
C4 key, inside the key body, drawn before the note group so the marker sits on top. The
caption, its 16-unit band under each row, and the pale-blue tint are removed.

**Rationale**: The caption sat in a band the SVG could not reliably show in the
full-screen layout, and the maintainer asked for a visual indicator rather than words. A
band inside the key cannot be clipped, needs no extra height, stays visible on a tinted
key, and a black tip on a white key cannot be confused with a black key (black keys never
reach the bottom edge).

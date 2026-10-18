# Research: Piano Mode

**Feature**: 008-instrument-piano | **Date**: 2026-10-18

## R-801 — The piano voice is rhythm-master's synthesised melodic voice, ported as is

**Decision**: Port rhythm-master's `src/audio/melodic.js` and `src/audio/nodes.js` into
`src/js/synth.js`: three sine oscillators detuned 0/+5/−5 cents, one gain envelope, a
2000 → 600 Hz low-pass sweep, a compressor on the dry path and a 35% send into a
synthesised 1.5 s reverb. A tap takes the Strong (accent 3) envelope — 0.88 peak after
10 ms, 0.55 s decay — since this app has no accent levels.

**Rationale**: The maintainer asked for "what is in rhythm-master". rhythm-master's own
research (its D-entry on the melodic voice) records that it *replaced* a sampled piano
with this voice because the maintainer liked the sampled one less, and dropped a vendored
soundfont of several MB. Asked directly, knowing it is synthesised and not a realistic
piano, the maintainer chose the port. It needs no download, so piano playback is ready
offline at once and has no loading or error state.

**Alternatives rejected**:

- *FluidR3 `acoustic_grand_piano` from the guitar's CDN*: realistic, and the old
  rhythm-master behaviour, but not what the maintainer chose.
- *Re-deriving a "piano-like" synth*: the maintainer asked for rhythm-master's sound,
  not a new one.

## R-802 — Key counts are the sizes sold, over their conventional ranges

**Decision**: 25 (C3–C5), 37 (C3–C6), 49 (C2–C6), 61 (C2–C7), 76 (E1–G7), 88 (A0–C8).

**Rationale**: The maintainer chose standard sizes over a free count. These are the
ranges controllers and digital pianos of each size ship with, so a player's own keyboard
matches the screen. A free count would need an arbitrary anchoring rule.

## R-803 — Two rows only when one row would be too thin to play, split at a C

**Decision**: One row while the board width gives every white key at least 22 CSS px;
otherwise two rows, split at the C nearest the middle key (the lower one on a tie), the
lower notes on top. The board re-fits on window resize, redrawing only when the row
count changes.

**Rationale**: The maintainer chose "auto" over always-two-rows or scrolling. 22 px is a
little under a fingertip and keeps 88 keys in one row on a laptop or TV (≥ ~1150 px of
board) while a tablet or phone wraps. Splitting at a C means each row starts on an octave
the eye recognises; 88 keys split A0–B3 / C4–C8, putting middle C at the start of the
second row. Lower-notes-first reads like wrapped text.

**Alternatives rejected**: *Even split by key count* (rows begin mid-octave); *higher
notes on top* (contradicts reading order, and the maintainer was shown low-on-top).

## R-804 — The key count is stored once, behind a schemaVersion 4 migration

**Decision**: State gains `keyCount` (default 88); `schemaVersion` 3 → 4 adds it to old
payloads and passes everything else through. `tunings` stays keyed by stringed
instrument; the piano has no entry, and `getActiveTuning()` returns null on it.

**Rationale**: Every other setting persists, and Principle V requires a versioned
migration. The capo, Relative mode and fret range are deliberately *not* reset on the
piano — they are kept for the guitar (FR-602), so no field is per-instrument except the
tunings, which already were.

## R-805 — The keyboard is drawn in the fretboard's view, by the fretboard's rules

**Decision**: `fretboard.render()` stays the one render entry. For a keyboard instrument
it computes the highlight context once and passes `keyboard.render()` a
`describe(pitchClass)` function and the `applyNoteState` helper — the same two functions
the fretboard's own note loop now uses. The highlight root ignores the capo on a keyboard
instrument, inside `getHighlightRootSemitone`.

**Rationale**: Principle II allows one board view; swapping what it draws keeps that. The
capo binding rule says one function decides the display root and consumers may not
re-derive it; passing the rules in (rather than re-implementing them in `keyboard.js`)
makes "the piano highlights exactly what the fretboard highlights" (AC-8.1.5) true by
construction, and avoids an import cycle.

**Alternatives rejected**: *A second SVG for the piano* (two board views); *a separate
highlight implementation for keys* (two sources of truth for degree colour and labels).

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

### R-801 reversed (2026-10-18, UAT) — the piano voice is the Salamander Grand Piano

**Decision**: The piano plays recorded samples of the Salamander Grand Piano (Alexander
Holm, a Yamaha C5, CC BY 3.0), bundled in `src/audio/piano/` as 29 MP3s (≈2 MB) — every
three semitones from A0 to A7, the set Tone.js publishes. `src/js/piano-sampler.js` plays
the nearest recording through an `AudioBufferSourceNode` with `playbackRate`
2^(semitones/12), so no key is re-pitched by more than a semitone (three at the very top),
then a compressor keeps stacked chord tones from clipping. `synth.js` is removed.

**Rationale**: Hearing the port in this app, the maintainer found it "really weird" and
synth-like as a piano: it works as rhythm-master's beat voice, but here single notes are
the whole experience, and three sines with a 0.55 s decay carry no low end, so bass notes
read as the wrong octave. They asked for authentic, octave-accurate piano sounds.

Each recording was checked against its note before bundling (harmonic sweep of the first
0.6 s): all within ±15 cents through A6, the top octave up to +30 cents sharp as a real
piano's stretch tuning is — except C8, almost a full semitone sharp (≈4425 Hz against
4186 Hz). C8 is therefore left out, and A#7–C8 are played from A7.

The constitution's dependency-vetting rule asks a bundled sample library to justify
itself: synthesis (R-801 as first decided) was tried and rejected by the maintainer in
UAT, and no Web API produces a realistic piano. The samples are bundled rather than
hot-linked so the live site does not depend on another project's GitHub Pages staying
up, and they are same-origin. They are fetched on the first piano tap, never on load
(Principle III), so the guitar pays nothing for them.

**Alternatives rejected**:

- *FluidR3 `acoustic_grand_piano` through soundfont-player* (the guitar's path): no new
  code, but a General MIDI piano markedly less realistic than Salamander — and the one
  rhythm-master's maintainer liked less than its synth.
- *MusyngKite `acoustic_grand_piano`*: better than FluidR3, still a GM soundfont piano,
  and a single multi-MB base64 file that must fully download before the first note.
- *Tone.js `Sampler`*: does the same nearest-sample re-pitching, but brings its own
  context, which would fight `audio.js`'s dead-context replacement (AC-1.8.6); the
  sampler is ~100 lines of raw Web Audio.

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

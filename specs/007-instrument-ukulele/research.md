# Research: Instrument Toggle — Guitar or Ukulele

**Feature**: 007-instrument-ukulele | **Date**: 2026-09-13

## R-701 — The ukulele preset pitches, and what "Canadian tuning" means

**Decision**: Ship four ukulele presets, with these exact pitches (string 4 → string 1):

| Preset | Pitches | Note |
|---|---|---|
| Standard (high-G) | G4 C4 E4 A4 | Re-entrant; the default |
| Low-G | G3 C4 E4 A4 | Linear; same shapes, lower 4th |
| Canadian / D tuning | A4 D4 F#4 B4 | Re-entrant; a whole tone above standard |
| Baritone | D3 G3 B3 E4 | Linear; the guitar's top four strings |

**Rationale**: The maintainer asked for "standard" and "Canadian" by name and was unsure
what the latter was. Canadian tuning is A-D-F#-B, the old D-tuning: a whole tone above
GCEA, so every chord shape transposes up a tone unchanged. It was the standard ukulele
tuning into the 1930s — ukulele sheet music of that era assumes it — and stayed the
teaching tuning in Canadian school programmes, which is where the name comes from. It is
re-entrant in the same way standard GCEA is: the 4th string (A4) sits above the 3rd (D4).
Low-G and baritone were added because they are the two other tunings a player is likely to
meet, and the maintainer chose all four when asked.

**Alternatives rejected**:

- *Standard GCEA only*: the maintainer's own message named Canadian tuning, and a
  one-tuning instrument makes the tuning selector pointless.
- *Low-A Canadian (A3 D4 F#4 B4)*: real but uncommon; the custom editor covers it without
  a fifth entry cluttering a short list.

**Sources**: [UkuTabs — Ukulele tunings](https://ukutabs.com/ukulele-guides/different-ukulele-tunings/),
[Ukulele Underground — ADF#B vs GCEA](https://forum.ukuleleunderground.com/threads/adf-b-vs-gcea.10043/),
[ukulele-arts — Standard tunings for the ukulele](https://www.ukulele-arts.com/learn/standard-tunings-for-the-ukulele/?lang=en).

## R-702 — Re-entrant strings keep their physical row, not a pitch-sorted one

**Decision**: Rows are drawn string 1 at the top through string N at the bottom, always.
A re-entrant tuning's bottom row (string 4) sounds higher than the row above it, and the
board says so rather than re-sorting.

**Rationale**: The maintainer's decision, and the one that matches the instrument in their
hands: on a real ukulele the high-G string is physically the one nearest your face, and a
fretboard diagram that re-sorted it would put your fingers in the wrong place. It also
keeps feature 001's orientation rule (FR-001) true for both instruments instead of
introducing a second, conditional ordering. Every pitch, label and played note still uses
the string's **true** octave, so the board looks physical and sounds correct.

**Alternatives rejected**:

- *Sort rows by sounding pitch*: musically tidy, physically wrong, and would make the
  ukulele board disagree with every chord chart the player owns.

## R-703 — Tuning is stored per instrument, behind a schemaVersion 3 migration

**Decision**: State carries `instrument` plus a `tunings` map keyed by instrument, each
holding that instrument's `{ presetId, customOpenPitchClasses, customOpenOctaves }`. The
active tuning is read through one accessor; no view indexes the map itself.
`schemaVersion` goes 2 → 3: a v2 payload's single `tuning` becomes the guitar's entry, the
ukulele gets its default, and `instrument` becomes `"guitar"`.

**Rationale**: The maintainer chose "remember each instrument's last tuning" over
"reset to default", so the memory has to be persisted, not held in a variable. Keying by
instrument rather than keeping a second "last guitar tuning" field means a custom tuning's
string count is always implied by the key it lives under, which is what validation needs
(AC-7.4.3): a four-entry custom tuning under `guitar` is a corrupt payload, and the app
falls back to defaults rather than rendering a board with two missing strings.

**Alternatives rejected**:

- *Keep a single `tuning` and reset on switch*: destroys a deliberate setting on every
  toggle; explicitly rejected by the maintainer.
- *Keep `tuning` as the active copy alongside a memory map*: two places to hold the same
  fact, and they drift. One map, one accessor.

## R-704 — Baritone is a ukulele tuning, not a third instrument

**Decision**: Baritone DGBE is listed under the ukulele's tunings.

**Rationale**: It is a four-string ukulele; everything this app models about an instrument
is its string count and its tunings, and the baritone differs from a concert ukulele in
neither. A third instrument entry would add a selector option that changes nothing the
tuning does not already change. If per-instrument fret counts ever arrive, that is the
change that would justify splitting it out.

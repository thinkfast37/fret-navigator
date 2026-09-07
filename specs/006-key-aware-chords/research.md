# Research: Key-Aware Chord Picker + Tappable Fret Range

**Feature**: 006-key-aware-chords | **Date**: 2026-09-07

## R-601 — "Diatonic" is a property of the whole chord, not of its root

**Decision**: A chord is diatonic to the key when **every** chord tone is a member of the
scale. Modal mixture is analysed over the whole tone set against the seven parallel church
modes on the same tonic.

**Rationale**: The maintainer's own example settles it: F is the IV of C major, so the
chord-root dropdown calls it diatonic — yet Fmaj7 (F A C E) is in the key and F7
(F A C E**b**) is not. Only the tone set can tell them apart. Running the same
parallel-mode scan over the full tone set answers "where does this chord come from?"
directly: F7's Eb-with-A pairing exists in C Dorian, and Dorian is what the readout names.

**Alternatives rejected**:

- *Root-only analysis (status quo)*: cannot distinguish Fmaj7 from F7 at all — the exact
  gap reported.
- *Scanning all 13 scales including harmonic/melodic minor as sources*: "modal mixture"
  conventionally means borrowing from a parallel **mode**; adding harmonic minor makes
  nearly every altered chord "explainable" and the readout stops discriminating. They
  remain valid *current* scales, just not reported sources.

**Consequence**: `getBorrowedSources` (R-304, root-only) and the new whole-chord analysis
are the same question over different tone sets, so both are built on one
`parallelModesContaining(offsets, scale)` helper rather than two parallel scans.

## R-602 — A chord root defaults to the triad it carries where it comes from

**Decision**: Choosing a chord root sets the quality to the scale's own tertian triad on
that degree; for a chromatic root, to the triad that root carries in the closest parallel
church mode containing it. Non-heptatonic scales keep feature 003's single tonic default.

**Rationale**: Feature 003 only defaulted the quality on a **scale or key** change
(AC-3.1.4), leaving a stale quality attached to every subsequent chord-root change — so
picking ii in C Ionian produced D major. Deriving it from the same
`computeDefaultTriad`/`getTriadQuality` pair that already cases the Roman numerals means
the dropdown label and the resulting chord can never disagree: what reads "ii" *is* minor.

Extending the rule to chromatic roots (maintainer's choice) uses the borrowed-source scan
already computed for the root's own annotation: bIII in C Ionian is closest to Dorian,
whose triad there is major, giving Eb major — the chord a guitarist means by "bIII".

**Alternatives rejected**:

- *Seventh chords as the default*: rejected by the maintainer; triads are the working
  vocabulary and a seventh is one dropdown change away.
- *Leaving chromatic roots' quality untouched*: considered, and rejected by the maintainer
  in favour of the borrowed triad; it would have kept the original complaint alive in the
  chromatic half of the dropdown.

**Consequence**: The quality is now derived state on every root change. The override is
still sticky (AC-6.1.3): it survives reloads and is only replaced by the next root, scale
or key change — the same lifecycle feature 003 gave the root itself.

## R-603 — Track tapping: nearest handle, animated only when it leaps

**Decision**: A pointer press anywhere on the padded slider box moves the nearer handle to
that fret and then begins a normal drag. Handle presses stop propagation so they keep
their existing behaviour. A CSS transition on the handle/fill position is active for the
tap's jump and suppressed by an `.is-dragging` class for the length of any drag.

**Rationale**: On a TV browser the pointer is a remote or a trackpad-driven cursor with no
reliable press-and-hold-and-move gesture, so the 2.2rem thumb is effectively unreachable —
the control exists but cannot be operated, which is why it read as broken. "Nearest
handle" is the standard dual-range behaviour and needs no new affordance. Animating the
drag would make the handle lag the pointer, which is why the transition is gestural rather
than global; `prefers-reduced-motion` turns it off entirely.

**Alternatives rejected**:

- *Two native `<input type=range>` elements*: reverts the UAT round 1 section B1
  consolidation and reintroduces the overlap problem that consolidation solved.
- *Click-to-step (nudge by one fret per tap)*: 24 taps to cross the neck.
- *Animating every position change*: makes capo-driven and reset-driven jumps lag too, and
  makes dragging feel rubbery.

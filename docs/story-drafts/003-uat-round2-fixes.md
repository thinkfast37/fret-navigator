# UAT Round 2 — Capo/Relative Correction + Remaining Round 1 Gaps + New Requirements

Supplements 001-fretboard-visualizer. This document supersedes docs/story-drafts/
002-mvp-uat-improvements.md's Section A entirely — that section's fix was executed
incorrectly (it corrected getDisplayRootSemitone's arithmetic instead of removing it, then
a further correction removed it entirely but left highlighting fully unshifted, which was
also not what was actually wanted). This document is the final, confirmed word on the
capo/Relative highlighting behavior. Do not consult 002's Section A for this topic.

## A. Capo + Relative mode: corrected root-highlighting behavior (supersedes 002 Section A)

**Confirmed final behavior**: with a capo active and Relative mode selected, fretboard
color highlighting (root marker, full diatonic set, degree roles, degree labels, interval
labels, chord-tone/bright-set membership) is computed against a SHIFTED root:

    highlightRootSemitone = (trueRootSemitone + capoFret) mod 12    [when capo>0 AND relative mode]
    highlightRootSemitone = trueRootSemitone                        [otherwise]

This is a NEW function, `getHighlightRootSemitone`, NOT a revival of the old
`getDisplayRootSemitone` (which used -capoFret and was wrong). The sign is deliberately
+capoFret. Worked example: root=C (0), capo=3 → highlightRootSemitone = 3 = Eb. This
matches "capo 3, play a C shape" tutorial convention: the position a player would call "C"
in shape terms is the one that should be colored/bordered as root, even though it truly
sounds Eb.

**What does NOT change — these stay anchored to the TRUE root/TRUE pitch always,
regardless of capo or Absolute/Relative mode**:
- Audio playback (noteAt, midiNote) — always the true physical pitch. Clicking the
  root-colored position in the example above must audibly play Eb, never C.
- The "Bright notes: X, Y, Z (Quality)" text summary — always shows the TRUE root's true
  chord tones (e.g. "C, E, G (Major)"), never the shifted chord.

**What DOES change (in addition to the root marker itself)**: getDiatonicSemitones,
computeDefaultTriad, isToggleableChordTone, identifyChordQuality, getDegreeRole,
getDegreeLabel, and getIntervalLabel all take getHighlightRootSemitone's output as their
root/root-derived input, consistently, whenever capo>0 and Relative mode is active. All of
these must shift together — never some anchored to true root while others use the shifted
one.

**Required regression tests** (write these BEFORE touching implementation code):
1. root=C, capo=0: getHighlightRootSemitone returns C regardless of Absolute/Relative mode.
2. root=C, capo=3, Absolute mode: getHighlightRootSemitone returns C (unshifted — shift
   only applies in Relative mode).
3. root=C, capo=3, Relative mode: getHighlightRootSemitone returns Eb (3), NOT A (9, the
   old wrong -capoFret result) and NOT C.
4. With root=C, capo=3, Relative mode: getDiatonicSemitones/computeDefaultTriad/
   isToggleableChordTone/identifyChordQuality all produce results consistent with root=Eb,
   not root=C and not root=A.
5. Regardless of all the above: noteAt/midiNote for any given tuning/string/physical-fret
   combination is COMPLETELY UNCHANGED by capo or Absolute/Relative mode — same true pitch
   every time.
6. The "Bright notes" text-summary computation (wherever it lives) always uses the true
   root (C, E, G for root=C major), never getHighlightRootSemitone's output, regardless of
   capo/mode.

## B. Bug: fret marker dots missing at bottom in capo/relative-renumbered view

Original Story 1 spec (inlay dots at standard marker frets 3,5,7,9,12,15,17,19,21,24,
single except double at 12/24) appears to no longer render correctly once capo-relative
fret renumbering was added. Investigate whether dot-marker positioning was updated to
follow the same relative-renumbering logic as the fret-number text, or whether it's still
keyed off absolute fret positions and silently failing to align/render under a capo.
Root-cause and fix; do not guess without checking the actual current dot-rendering code.

## C. New requirement: capo position indicator on the fretboard

When capo replaces the visible nut (left range bound locked to capo fret, per existing
Story 9 mechanics), render a visual indicator distinguishing the capo position from a true
nut — same general treatment (a vertical line/bar) but a different color and/or thickness,
so it's visually clear this is a capo, not the instrument's actual nut.

## D. New requirement: root selector color consistency
The root-selector buttons (A, Ab, B, Bb, C, D, Db, E, Eb, F, F#, G) should use the same
color for the currently-selected root as that root's color on the fretboard (currently red
for role "1"/root) — for visual consistency between the control and the fretboard.

## E. New requirement: configurable color-scheme / design-token system
Colors currently used for chord-tone degree roles are hardcoded per-component. Introduce a
CSS custom-property (CSS variable) layer defining all 12 degree-role colors (bright + dark
variants) plus root/UI accent colors as a single, centrally-editable set of tokens (e.g. in
a :root block in css/styles.css), so the entire color scheme can be swapped by editing one
place rather than hunting through multiple files/components. This does not change any
color's current value — it only changes WHERE each color is defined, from scattered
hardcoded values to a single token source. No behavior change; purely a refactor for future
adjustability.

## F. New requirement: "Buy Me a Coffee" link

Add a link to https://buymeacoffee.com/stevetakadimi, opening in a new tab
(target="_blank" rel="noopener noreferrer"), text "☕ Enjoying Fret Navigator? Buy me a
coffee →", placed in a sensible spot matching existing header/nav conventions (e.g. near
the existing attribution credit line), styled consistently with existing fonts/colors/
spacing rather than introducing new CSS patterns.

## G. Confirmed non-issue (no action needed)
Non-diatonic notes always displaying their note name regardless of active label mode
(Notes/Degrees/Intervals) is CONFIRMED INTENDED behavior for now, not a bug. Deferred
enhancement for a future round — do not change this.
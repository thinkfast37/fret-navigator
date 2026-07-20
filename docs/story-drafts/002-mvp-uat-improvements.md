# UAT Round 1 — Fixes, Amendments, and New Requirements

This document supplements specs/001-fretboard-visualizer/ (same feature, not a new one).
Items are grouped by type so implementation order can prioritize correctly: critical bug
fixes first, then spec amendments, then design polish, then new requirements.

## A. Critical Bug + Design Reversal (highest priority — regression risk)

### A1. Capo + Relative mode incorrectly shifts highlighting/degrees/chord-tone identity

**Current (wrong) behavior**: With capo active and Relative mode selected, the app computes
a "display root" that silently substitutes for the actual selected root when determining
diatonic highlighting, the default triad, chord-tone toggle eligibility, degree labels, and
interval labels. This produces a visibly wrong root (e.g. selecting C, capo 3, Relative mode
shows the highlighted root as F#) and a wrong/incoherent "Bright notes" list.

**Correct behavior**: The selected root (whatever is clicked in the Root selector) NEVER
changes for highlighting/degree/chord-tone purposes, regardless of capo position or
Absolute/Relative mode. `getDiatonicSemitones`, `computeDefaultTriad`,
`isToggleableChordTone`, `identifyChordQuality`, `getDegreeLabel`, and `getIntervalLabel`
always use the literal selected root. Remove `getDisplayRootSemitone` and its binding rule
entirely — this was based on an earlier design decision that testing has shown to be wrong.

**What still correctly changes with capo + Relative mode**: ONLY the note-NAME text (in
"Notes" label mode) — via the existing, unaffected `getRelativeLabelSemitone` logic, which
labels positions using the "as-if-uncapoed" shape convention guitarists use in tutorials
(e.g. capo 3, calling a position "Open A" even though it isn't literally A).

**Audio is unaffected and must stay unaffected**: regardless of any of the above, clicking
any fret must always play its true physical pitch. If root=C, capo=3, Relative mode, and a
position is labeled/colored as "C" (root), clicking it must still audibly play whatever pitch
is truly sounding there (e.g. Eb) — never the labeled/highlighted pitch class. This was
already correctly specified (FR-032, Story 8 Scenario 5) and must not be touched.

**Acceptance test to add**: Given root=C, capo=3, When toggling Absolute↔Relative, Then the
bright/diatonic note set, chord-tone identity, and all degree/interval labels remain
unchanged — only note-name text differs. AND: clicking any fret plays its true physical
pitch regardless of label mode.

## B. Bugs (implementation contradicts existing spec)

### B1. Fret-range control is two separate sliders
FR-025 specifies "a dual-handle fret-range slider" — one control, two handles. Current
implementation built two independent sliders. Consolidate into a single slider with two
draggable handles, each large enough to display its fret number directly inside the handle.

### B2. Non-diatonic notes render with a circle/background
Non-diatonic notes must render as plain text (letter, degree, or interval per current label
mode) with NO background shape or circle whatsoever. Currently all notes get a circle
regardless of diatonic status.

## C. Spec Amendments (existing FR needs updating)

### C1. Fretboard content must rescale horizontally with visible fret count
Overrides the original "visibility only, no recomputation" simplification. Fretboard height
and total width stay fixed; fret spacing scales inversely with the number of currently
visible frets (fewer visible frets = more spread out).

### C2. Capo shifts the fret-range window on change
When capo fret changes, the left handle snaps to the new capo fret. The right handle shifts
by the same delta to preserve the previously-visible width, clamped to a maximum of 24
(never exceeds 24 regardless of the math).

### C3. Root selector expands to all 12 chromatic roots
Replace the current 7-natural-note selector with all 12: A, Ab, B, Bb, C, D, Db, E, Eb, F,
F#, G — displayed in this exact alphabetical order. Sharp/flat spelling is automatically
determined by circle-of-fifths convention (C G D A E B F# = sharp side; Db Ab Eb Bb F = flat
side) — NOT a user toggle. Remove the "Prefer flats" checkbox entirely; it no longer has a
role once every root has one fixed canonical spelling.

### C4. Chord-tone toggle list colors must match fretboard colors
In the scale-degree toggle row: "on" (active chord tone) uses that note's actual bright
color from the fretboard; "off" (diatonic but not selected) uses that note's dark color
variant; non-diatonic stays visually disabled as currently implemented (no change needed
there).

### C5. Fret position numbers displayed at top and bottom
Add fret number labels at standard marker positions, at both the visual top and bottom of
the fretboard. These follow the same Absolute/Relative convention as note names: in
Relative mode, the displayed number is (physicalFret − capoFret) — reusing the same
arithmetic as getRelativeLabelSemitone, without the note-name conversion step. In Absolute
mode, the true physical fret number is shown.

## D. Design/Polish (presentation only, no behavior change)

### D1. Custom tuning UX
Collapse the always-visible custom-tuning panel into: one tuning dropdown; selecting
"Custom" opens a modal prepopulated with the current tuning's note + octave per string;
re-selecting "Custom" (or a small "Edit" button shown only while custom mode is active)
reopens the modal for further edits.

### D2. Full-screen, no-scroll layout
On laptop and tablet screen sizes, the entire app must fit without scrolling, prioritizing
maximum fretboard real estate over control size (controls must remain legible, but should
not compete for space). Mobile may scroll; layout must be responsive across breakpoints.

## E. New Requirements (not previously specified)

### E1. Control labels
Add visible labels to every control:
- Tuning dropdown → "Tuning"
- Root selector → "Root"
- Scale/mode dropdown → "Scale / Mode"
- Notes/Degrees/Intervals button group → "Label Mode"
- Fret-range slider → "Visible Frets"
- Capo selector → "Capo"
- Absolute/Relative toggle → "Fret Reference"
- Chord-tone degree toggle row → "Chord Tones"
- Custom tuning modal heading → "Custom Tuning"


### E1. Control labels (addendum)
Each custom-tuning string row currently shows a note dropdown and a bare octave number with
no label. Add a column header above the octave number boxes reading "Octave" (or, if space
is tight in the modal layout, a placeholder/tooltip on each box). Consider whether the
existing row label format ("String 1 (high E)") should also show the note+octave together
more explicitly once populated, e.g. "String 1 (high E) — currently E3", so the octave's
role is unambiguous even before someone touches the control.

(Future: each label may get accompanying help text — not in this round's scope, just noting
the label text/hooks should be structured to make that easy to add later.)
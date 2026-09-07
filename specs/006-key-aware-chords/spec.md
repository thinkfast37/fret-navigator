# Feature Specification: Key-Aware Chord Picker + Tappable Fret Range

**Feature Branch**: `claude/navigator-chord-scale-ui-y4kdua`

**Created**: 2026-09-07

**Status**: Draft

**Input**: User description: "If I'm in a specific scale root and mode and I pick a chord
root, it should default to whatever the diatonic chord is for that scale/mode setting —
if I'm in Ionian, scale root C, and I pick chord root 2, that should pick a D minor
chord. Right now it always keeps the chord quality as major. Next, it would be helpful to
see which chords would be diatonic to the key and which would not — an F major seven is
diatonic to C, an F seven is not, a G seven is. And when I pick a specific chord quality
it would be helpful to see what modal mixture that provides given the chord root AND the
chord quality — right now we only say the chord ROOT is borrowed from another mode, but
the quality can also be borrowed. Lastly, the visible-frets slider only works if I drag
the handle. On a TV dragging isn't possible — I want to tap in the slider and have it
work, and it needs to be smooth."

Clarified with the maintainer: diatonic default is the **triad** (ii → D minor, not Dm7);
a **non-diatonic** chord root defaults to the triad it carries in the closest parallel
mode it is borrowed from; the quality dropdown marks diatonic/non-diatonic the same way
the chord-root dropdown already does; landing mode Auto.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The chord root brings its own quality (Priority: P1)

The guitarist picks a scale degree from the Chord Root dropdown and gets the chord that
degree actually is in the current key, without having to fix the quality afterwards.
Degree ii in C Ionian is D minor. Degree V is G major. Degree vii° is B diminished. A
chromatic root arrives with the quality it carries in the mode it is borrowed from, so
bIII in C Ionian is Eb major rather than an Eb of whatever quality happened to be left
over from the previous selection.

**Why this priority**: This is the everyday interaction. Every chord-root change currently
produces a wrong chord that the guitarist must repair by hand.

**Independent Test**: Set C Ionian, pick chord root "ii — D"; verify the quality selector
reads Minor and the summary reads "Dm: D, F, A" with no further input.

**Acceptance Scenarios**:

- **AC-6.1.1** — A diatonic chord root defaults to the scale's own triad on that degree

  **Given** a 7-note scale and root are selected, **When** a chord root that is a degree
  of that scale is chosen, **Then** the chord quality becomes the triad quality the scale
  itself stacks on that degree (major, minor, diminished or augmented), with no further
  input.

  - **Cases**:
    - **AC-6.1.1/1** — Degree ii of C Ionian yields a minor quality.
    - **AC-6.1.1/2** — Degree vii of C Ionian yields a diminished quality.
    - **AC-6.1.1/3** — Every degree of every 7-note scale yields that scale's own triad quality on that degree.

- **AC-6.1.2** — A non-diatonic chord root defaults to its borrowed mode's triad

  **Given** a 7-note scale and root are selected, **When** a chord root outside that scale
  is chosen, **Then** the chord quality becomes the triad that root carries in the closest
  parallel church mode containing it (bIII in C Ionian → major, from Dorian), and falls
  back to the scale's tonic-triad quality when no parallel mode stacks a tertian triad
  there.

- **AC-6.1.3** — An explicitly chosen quality survives until the root or key changes

  **Given** the guitarist has overridden the quality from the quality dropdown, **When**
  no root, scale or key change occurs, **Then** that quality is retained (including across
  a reload), and it is replaced only by the next chord-root, scale-root or scale change.

- **AC-6.1.4** — Non-heptatonic scales keep one predictable default

  **Given** a pentatonic or blues scale is selected, **When** any chord root is chosen,
  **Then** the quality becomes that scale's single tonic-triad default rather than an
  arbitrary non-tertian stack.

---

### User Story 2 - See which qualities belong to the key (Priority: P1)

Opening the Chord Quality dropdown, the guitarist can tell at a glance which qualities
produce a chord entirely inside the current key for the chord root they have selected.
With chord root IV in C major, Maj7 is marked diatonic and 7 is not; with chord root V, 7
is marked diatonic.

**Why this priority**: It turns the picker into the thing that answers "what fits this
key?", which is the question the guitarist is actually asking.

**Independent Test**: Set C Ionian, chord root "IV — F", open the quality dropdown; verify
Maj7 is marked diatonic and 7 is not. Change to chord root "V — G"; verify 7 is now marked
diatonic.

**Acceptance Scenarios**:

- **AC-6.2.1** — Quality options are marked diatonic or not for the selected chord root

  **Given** a 7-note scale and a selected chord root, **When** the quality dropdown
  renders, **Then** each quality whose every chord tone is a member of the scale is marked
  diatonic and each quality with any tone outside the scale is marked non-diatonic, using
  a non-colour cue.

- **AC-6.2.2** — Scales that support no diatonic verdict leave every quality unmarked

  **Given** a non-heptatonic scale (or no scale) is selected, **When** the quality dropdown
  renders, **Then** no quality option carries a diatonic or non-diatonic mark.

---

### User Story 3 - See the modal mixture the whole chord implies (Priority: P2)

Having chosen a root and a quality, the guitarist reads one line saying where that chord
sits relative to the key: inside it, borrowed from named parallel modes, or outside every
mode. F7 in C major reports mixture from C Dorian — an analysis the chord-root dropdown
cannot give, because F itself is perfectly diatonic and only the chord's Eb is not.

**Why this priority**: Valuable and the maintainer's stated "super cool", but the picker
is usable without it.

**Independent Test**: Set C Ionian, chord root "IV — F", quality Maj7; verify the readout
says diatonic. Switch the quality to 7; verify it names Dorian as the borrowed source.

**Acceptance Scenarios**:

- **AC-6.3.1** — A chord entirely inside the key is reported as diatonic

  **Given** a 7-note scale, **When** the selected root and quality produce a chord whose
  every tone is a scale member, **Then** the chord panel states that the chord is diatonic
  to the current root and scale, naming them.

- **AC-6.3.2** — A chord outside the key names the parallel modes that contain it

  **Given** a 7-note scale, **When** the selected root and quality produce a chord with at
  least one tone outside the scale but whose every tone belongs to one or more parallel
  church modes on the same tonic, **Then** the chord panel names those modes as the
  borrowed sources, closest relative to the current scale first.

- **AC-6.3.3** — A chord no parallel mode contains is reported as chromatic

  **Given** a 7-note scale, **When** no parallel church mode on the current tonic contains
  every tone of the selected chord, **Then** the chord panel reports the chord as chromatic
  rather than naming a source.

---

### User Story 4 - Set the visible fret range by tapping (Priority: P1)

On a TV, where a precise drag is not possible, the guitarist taps anywhere along the
Visible Frets slider and the nearer handle travels to that fret. Dragging a handle still
works exactly as before.

**Why this priority**: The control is currently unreachable on the maintainer's primary
device.

**Independent Test**: With the range at N–24, tap near the right end of the slider track;
verify the upper bound moves to the tapped fret and the fretboard re-renders.

**Acceptance Scenarios**:

- **AC-6.4.1** — Tapping the slider moves the nearer handle to the tapped fret

  **Given** the fret-range slider is rendered, **When** a pointer press lands on the
  slider away from either handle, **Then** whichever handle is nearer the tapped position
  moves to that fret and the visible range updates, without requiring a drag.

- **AC-6.4.2** — A capo-locked left handle is never the one a tap moves

  **Given** a capo is active, so the left handle is locked to the capo fret (FR-035),
  **When** the slider is tapped anywhere — including below the capo position — **Then**
  the right handle is the one that moves and the lower bound stays at the capo fret.

- **AC-6.4.3** — The tap animates, the drag does not

  **Given** the slider is rendered, **When** a tap moves a handle, **Then** the handle and
  fill carry a movement transition; **and When** a drag gesture is in progress, **Then**
  that transition is suppressed so the handle tracks the pointer exactly.

---

### Edge Cases

- Tapping exactly midway between the handles moves the left handle (deterministic tie-break).
- Tapping past a handle's constraint (e.g. left of the right handle's floor) still clamps
  via the existing no-inversion rule (FR-026) — no range inversion is possible.
- A chord root change while a capo is active is unaffected: the chord panel is anchored to
  the TRUE root (FR-108), and the quality snap uses the same true-root degree offset.
- Harmonic and melodic minor are 7-note but not church modes: they get diatonic marking and
  mixture analysis against the seven parallel church modes, which is the standard reading.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-401**: Selecting a chord root MUST set the chord quality to that root's default
  quality in the current key — the scale's own tertian triad on a diatonic degree, the
  closest containing parallel church mode's triad on a chromatic one, and the scale's
  tonic-triad default when neither yields a tertian triad. The quality selector MUST
  remain free to override it (FR-102).
- **FR-402**: The chord-quality selector MUST mark each quality as diatonic or
  non-diatonic for the currently selected chord root, by a cue that is not colour alone,
  and MUST leave every option unmarked for scales the analysis does not apply to.
- **FR-403**: The chord panel MUST report, for the selected root AND quality together,
  whether the chord is diatonic to the current key, borrowed from named parallel church
  modes on the same tonic, or chromatic.
- **FR-404**: The fret-range slider MUST move the nearer handle to a pointer press landing
  anywhere on the slider, honouring the capo lock (FR-035) and the no-inversion constraint
  (FR-026), and MUST continue tracking the pointer if that press becomes a drag.
- **FR-405**: Handle movement MUST be animated for a tap and un-animated during a drag.
- **FR-406**: All diatonic, borrowed and mixture determinations MUST be computed in
  `theory.js`; no view may re-derive them.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-401**: For all 12 chord roots × all 13 scales, the defaulted quality matches the
  scale's or borrowed mode's triad, verified exhaustively by automated test.
- **SC-402**: The guitarist reaches D minor from C Ionian in one interaction (choose the
  root) rather than two (choose the root, then fix the quality).
- **SC-403**: The visible fret range is settable with single taps, no drag required.
- **SC-404**: All existing suites pass — no behavioural regressions.

## Assumptions

- "Diatonic" means every chord tone is a scale member; a chord is not diatonic merely
  because its root is.
- Modal mixture is analysed against the seven parallel **church modes** on the same tonic,
  matching the existing borrowed-root analysis (R-304). Harmonic/melodic minor are analysed
  against, but never reported as, mixture sources.
- Non-heptatonic scales (pentatonic, blues) support neither diatonic marking nor mixture
  analysis; they keep feature 003's single tonic-quality default.
- The chord-root dropdown's existing borrowed-root annotation stays; the new mixture line
  is about the whole chord, and the two are complementary rather than duplicative.

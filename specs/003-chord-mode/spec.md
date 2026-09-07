# Feature Specification: Chord Mode — Scale Root vs Chord Root

**Feature Branch**: `claude/chord-root-mode-selection-38t633`

**Created**: 2026-09-07

**Status**: Draft

**Input**: User description: "There should be a scale root and a chord root within the context of that scale. The chord root can be any of the 12 chromatic degrees — diatonic ones shown plainly, non-diatonic ones named as modal mixture (e.g. bVII major in C Ionian) with the borrowed-from source named. A chord picker selects root + quality (full extended vocabulary incl. diminished, augmented, sus, sevenths, extensions). A Chord view mode lights up ONLY the selected chord's tones; other scale notes become faint unlabeled ghost dots; non-scale non-chord notes disappear. This replaces the focal-point clicks, the 12 per-degree chord-tone toggles, the bright/dim distinction, and the Bright-notes summary. Clicking a note still plays audio. Capo Relative mode shifts chord highlighting with everything else."

## Supersession of feature 001 Story 5

This feature **replaces** the focal-point/chord-tone system specified in feature 001, User
Story 5. The superseded behaviours: clicking a diatonic note sets a focal point and lights
its default stacked triad; the 12 per-degree toggle buttons edit a "bright set"; bright vs
dim colouring distinguishes chord tones from other scale tones; the "Bright notes" text
summary names the bright set. Feature 001's spec is revised in the same change with dated
parentheticals marking AC-1.5.x as superseded by this feature. The replacement rationale:
the maintainer found the bright/dim distinction illegible and the degree-toggle workflow
demanded theory knowledge (knowing a ii chord is degrees 2-4-6) that the app should supply
instead.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pick a chord by root and quality (Priority: P1)

A guitarist playing in a key wants to see a specific chord — say E7 in the key of A — without
having to know which scale degrees make it up. They pick the chord's root from a dropdown
that speaks in scale degrees ("V — E") and the chord's quality ("7") from a second dropdown,
and the app computes the chord's tones itself.

**Why this priority**: This is the core capability — naming a chord instead of assembling it
degree by degree. Everything else (view filtering, mixture naming) builds on the selection
existing.

**Independent Test**: Select scale root A Ionian, chord root "V — E", quality "7"; verify the
app reports/renders exactly E, G#, B, D as the chord tones.

**Acceptance Scenarios**:

- **AC-3.1.1** — Chord root dropdown lists all 12 chromatic roots as degrees of the current scale

  **Given** any scale root and scale are selected, **When** the chord root dropdown is opened,
  **Then** it contains exactly 12 options, one per chromatic pitch class, each labelled with
  its degree relative to the scale root and its note name (e.g. in C Ionian: "I — C",
  "ii — D", … and non-diatonic entries such as "bVII — Bb").

- **AC-3.1.2** — Chord quality dropdown offers the full vocabulary

  **Given** the chord picker is visible, **When** the quality dropdown is opened, **Then** it
  offers: Major, Minor, Diminished, Augmented, Sus2, Sus4, 7, Maj7, m7, m7b5, Dim7, 6, m6,
  9, m9, Maj9, Add9, 11, 13, 7sus4.

- **AC-3.1.3** — Selected chord's tones are computed from root + quality

  **Given** a chord root and quality are selected, **When** the selection is applied, **Then**
  the set of highlighted chord tones equals the quality's interval formula stacked on the
  chord root (e.g. E + "7" → E, G#, B, D), independent of which of those tones are in the
  scale.

- **AC-3.1.4** — Chord selection defaults to the scale root with a diatonic quality

  **Given** a scale root and scale are selected and no chord has been chosen yet (or the
  scale/root just changed), **When** the chord picker renders, **Then** the chord root
  defaults to the scale root (degree I/i) and the quality defaults to the triad quality the
  scale builds on that degree (e.g. Major in Ionian, Minor in Aeolian).

- **AC-3.1.5** — Chord selection persists across reloads

  **Given** a chord root and quality have been selected, **When** the page is reloaded,
  **Then** the same chord selection is restored.

- **AC-3.1.6** — Saved settings from the previous focal-point system load cleanly

  **Given** saved settings from the prior schema exist (containing focal-point and chord-tone
  override fields), **When** the app loads, **Then** the settings load without error into the
  new schema, preserving tuning/root/scale/capo/fret-range values and applying the default
  chord selection of AC-3.1.4.

---

### User Story 2 - Chord view: see only the chord (Priority: P1)

The guitarist switches the fretboard from Scale view to Chord view. Instead of every scale
note competing for attention, only the selected chord's tones are fully lit and labelled;
the rest of the scale fades to faint unlabelled dots for spatial orientation; everything
else disappears.

**Why this priority**: The filtering is the stated pain — "too much information". Without it
the chord selection has no payoff.

**Independent Test**: In C Ionian with G Major selected, switch to Chord view; verify G, B, D
positions are fully rendered, other C-major-scale positions are faint unlabelled dots, and
chromatic positions show nothing.

**Acceptance Scenarios**:

- **AC-3.2.1** — View toggle switches between Scale and Chord views

  **Given** the app is loaded, **When** the user activates the Scale/Chord view toggle,
  **Then** the fretboard switches between the two views and the toggle reflects the active
  one.

- **AC-3.2.2** — Chord view fully renders only the chord's tones

  **Given** Chord view is active, **When** the fretboard renders, **Then** every position
  whose pitch class is a selected-chord tone is rendered fully — coloured and labelled —
  including chord tones that are outside the current scale.

- **AC-3.2.3** — Chord view ghosts the remaining scale tones

  **Given** Chord view is active, **When** the fretboard renders, **Then** scale-member
  positions that are not chord tones render as faint, unlabelled ghost dots.

- **AC-3.2.4** — Chord view hides non-scale non-chord notes

  **Given** Chord view is active, **When** the fretboard renders, **Then** positions that are
  neither chord tones nor scale members render nothing.

- **AC-3.2.5** — Scale view is unchanged by chord selection

  **Given** Scale view is active, **When** the fretboard renders, **Then** the display is the
  full scale rendering (all scale tones coloured and labelled, non-scale notes in their
  existing plain form), regardless of the current chord selection.

- **AC-3.2.6** — Clicking a note plays its pitch in both views

  **Given** either view is active, **When** the user clicks/taps any rendered (non-hidden,
  playable) note, **Then** its true sounding pitch plays; and clicking no longer changes any
  selection (the focal-point behaviour is removed).

- **AC-3.2.7** — Ghost dots remain non-interactive for selection but stay accessible

  **Given** Chord view is active, **When** a ghost or hidden position is examined, **Then**
  ghost dots are still clickable for audio with an accessible label, while hidden positions
  are inert and removed from the tab order.

- **AC-3.2.8** — Chord view shifts with the capo highlight root in Relative mode

  **Given** a capo is set and Relative labelling is active, **When** Chord view renders,
  **Then** chord-tone membership is computed against the shifted highlight root, consistent
  with how the scale highlighting shifts (feature 001 Story 9 binding rule).

- **AC-3.2.9** — Chord summary line names the chord and its tones

  **Given** a chord is selected, **When** the chord panel renders, **Then** it shows the
  chord name (e.g. "E7") and its spelled tones (e.g. "E, G#, B, D") using key-context
  spelling — replacing the removed "Bright notes" summary.

---

### User Story 3 - Modal mixture named in the chord root dropdown (Priority: P2)

The guitarist in C Ionian wants a Bb major chord — the bVII borrowed chord. The dropdown
doesn't just permit it; it names what it is: "bVII — Bb (borrowed: Mixolydian / parallel
minor)", teaching where the mixture comes from.

**Why this priority**: Valuable and explicitly requested, but the picker (US1) and view
(US2) are useful without the naming.

**Acceptance Scenarios**:

- **AC-3.3.1** — Diatonic chord roots are labelled with case-correct Roman numerals

  **Given** a 7-note scale is selected, **When** the chord root dropdown renders, **Then**
  each diatonic degree's Roman numeral is cased by the scale's own triad quality on that
  degree (upper for major/augmented, lower for minor/diminished, with ° for diminished —
  e.g. Ionian: I, ii, iii, IV, V, vi, vii°).

- **AC-3.3.2** — Non-diatonic chord roots are labelled as borrowed with a source when one is common

  **Given** a 7-note scale is selected, **When** the chord root dropdown renders a
  non-diatonic pitch class, **Then** its option is visually distinguished from diatonic
  options and labelled with its chromatic degree (e.g. bVII) plus a borrowed-from source
  when a common one exists (e.g. in Ionian, bVII: "borrowed: Mixolydian / parallel minor");
  when no common source exists, it is marked simply as chromatic.

- **AC-3.3.3** — Non-seven-note scales fall back to degree-only labels

  **Given** a pentatonic or blues scale is selected, **When** the chord root dropdown
  renders, **Then** in-scale roots are marked as in-scale and all 12 roots remain selectable,
  labelled by interval degree from the scale root, without seven-degree Roman-numeral
  analysis being forced onto the scale.

---

### User Story 4 - "Scale Root" naming (Priority: P3)

The guitarist sees two root concepts on screen and is never confused about which is which:
the existing root control is now labelled "Scale Root", and the chord picker's root is
labelled "Chord Root".

**Acceptance Scenarios**:

- **AC-3.4.1** — Root control is labelled "Scale Root" and chord picker "Chord Root"

  **Given** the app is loaded, **When** the controls render, **Then** the 12-button root
  selector's heading reads "Scale Root" and the chord picker's root dropdown is labelled
  "Chord Root".

---

### Edge Cases

- Selecting a chord whose tones all lie outside the scale (e.g. F#dim7 in C Ionian):
  Chord view still fully renders every chord tone (AC-3.2.2 covers out-of-scale tones);
  the ghost layer is unaffected.
- "(No scale)" selected: the chord picker still works — root options fall back to plain
  note names (no degree analysis), and Chord view shows chord tones with no ghost layer.
- Changing scale root or scale resets the chord selection to the new degree-I default
  (AC-3.1.4), mirroring the old focal-point reset rule.
- Extended qualities (9/11/13) on guitar: the full theoretical stack is highlighted; the
  app does not omit tones players commonly drop from voicings.
- Capo Absolute mode: chord highlighting stays on the true root, exactly as scale
  highlighting does.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-101**: The system MUST provide a chord-root selector offering all 12 chromatic pitch
  classes, labelled as degrees of the current scale root/scale per AC-3.1.1/AC-3.3.x.
- **FR-102**: The system MUST provide a chord-quality selector with the 20 qualities of
  AC-3.1.2, each defined by a canonical interval formula.
- **FR-103**: The system MUST compute chord-tone pitch-class sets purely from chord root +
  quality formula in the canonical theory layer; no view may re-derive them.
- **FR-104**: The system MUST provide a Scale/Chord view-mode toggle; Chord view renders
  chord tones fully, remaining scale tones as faint unlabelled ghosts, all else hidden.
- **FR-105**: The system MUST remove the focal-point click behaviour, the per-degree
  chord-tone toggle buttons, the bright/dim rendering distinction, and the "Bright notes"
  summary, replacing the summary with the chord-name summary of AC-3.2.9.
- **FR-106**: Note clicks MUST continue to play the true sounding pitch and MUST NOT change
  any selection.
- **FR-107**: Chord selection and view mode MUST persist in the versioned settings store;
  loading prior-version settings MUST migrate them without data loss to the surviving
  fields (per AC-3.1.6) — not silently discard them.
- **FR-108**: Under capo Relative mode, chord-tone membership on the fretboard MUST derive
  from the same shifted highlight root as all other highlighting (one function decides —
  the capo binding rule); the chord summary text MUST stay anchored to the true root,
  matching the FR-047/FR-048 split of feature 001.
- **FR-109**: Roman-numeral casing, borrowed-source naming, and in-scale/out-of-scale
  classification of chord roots MUST be computed in the canonical theory layer.
- **FR-110**: The root selector MUST be relabelled "Scale Root"; the chord root selector
  labelled "Chord Root".
- **FR-111**: Ghosted and fully-rendered notes MUST remain distinguishable without colour
  (label presence and marker treatment differ), and every rendered note keeps a meaningful
  accessible name; hidden notes MUST leave the tab order.

### Key Entities

- **Chord Selection**: `{ chord root pitch class, quality id }` — the user's current chord,
  interpreted against the scale context for labelling but standing alone for tone
  computation.
- **Chord Quality**: A named interval formula (e.g. "7" → root, major third, perfect fifth,
  minor seventh). Fixed vocabulary of 20.
- **View Mode**: Scale | Chord — which rendering filter the fretboard applies.
- **Degree Label**: The Roman-numeral/chromatic-degree description of a pitch class relative
  to the scale, including diatonic casing and borrowed-source annotation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-101**: A user who knows only a chord's name (root + quality) can display exactly its
  tones with two dropdown picks and at most one view-toggle click — no scale-degree
  knowledge required.
- **SC-102**: In Chord view, 100% of fully-rendered positions are chord tones; no non-chord
  position renders a label.
- **SC-103**: Every one of the 12×20 root×quality combinations yields a correct tone set
  from the theory layer, verified by automated tests over the full quality vocabulary.
- **SC-104**: Zero regressions in scale rendering, capo behaviour, tuning, fret-range, and
  audio playback (existing suites still pass, minus the deliberately removed Story 5
  behaviours).

## Assumptions

- The 20-quality vocabulary uses standard jazz/pop interval formulas; extensions include
  their implied lower tones (e.g. 13 = 1,3,5,b7,9,13 — the 11 is omitted per common
  practice on major-quality 13th chords).
- Borrowed-source names are provided for the common Ionian/Aeolian mixture degrees; other
  scale/degree combinations may fall back to "chromatic" without a source name.
- Chord view's ghost layer derives from the current scale; with no scale selected there are
  no ghosts.
- The removed per-degree toggles have no replacement for hand-building arbitrary note sets;
  the chord vocabulary is the replacement. (Accepted scope decision by the maintainer.)

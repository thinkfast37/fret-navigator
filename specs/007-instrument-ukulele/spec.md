# Feature Specification: Instrument Toggle — Guitar or Ukulele

**Feature Branch**: `claude/guitar-ukulele-tunings-cd1n0o`

**Created**: 2026-09-13

**Status**: Draft

**Input**: User description: "Right now it's looking pretty good for guitars, but I would
like you to now create an option to toggle between guitar and ukulele. And also, for
ukulele, from what I understand, there's different stringings and multiple tunings as well
that are common. If I understand there's a standard tuning in ukulele and a Canadian
tuning. I needed to research that because I don't know that much about ukulele. But
ideally you can create your own custom tuning, but there aren't as many tunings as we'd
have on the guitar. And so the tunings feature would really just be picking from the
different tuning options and tuning options within those that are common."

Clarified with the maintainer before specification: ship four ukulele presets (Standard
GCEA high-G, Low-G GCEA, Canadian/D-tuning ADF#B, Baritone DGBE) plus a custom tuning;
re-entrant tunings keep **physical** string order and are never re-sorted by pitch; the
app remembers **each instrument's** last tuning independently; the ukulele uses the same
fret range and the same physical inlay-dot positions as the guitar. The maintainer
approved the spill into feature 001's six-string assumptions (see Spec Defects Revised
below). Landing mode: Auto.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Switch the fretboard to a ukulele (Priority: P1)

The player picks Ukulele from an Instrument control and the fretboard becomes a four-string
ukulele board: four strings instead of six, the ukulele's own tunings in the tuning
selector, and everything else — root, scale, capo, chord selection, label mode, fret
range — exactly as it was. Picking Guitar puts the six-string board back.

**Why this priority**: Without the toggle there is no feature; every other story hangs off
it.

**Independent Test**: With C Ionian selected and a capo at fret 2, switch the Instrument
control to Ukulele; verify the board renders four strings, the tuning selector lists only
ukulele tunings, and the root, scale and capo are untouched.

**Acceptance Scenarios**:

- **AC-7.1.1** — The instrument selector renders that instrument's string count

  **Given** the Instrument control, **When** an instrument is selected, **Then** the
  fretboard renders exactly that instrument's number of strings, string 1 at the top
  through string N at the bottom, over the same fret span.

  - **Cases**:
    - **AC-7.1.1/1** — Selecting Guitar renders six string rows.
    - **AC-7.1.1/2** — Selecting Ukulele renders four string rows.

- **AC-7.1.2** — The tuning selector offers only the selected instrument's tunings

  **Given** an instrument is selected, **When** the tuning selector renders, **Then** it
  lists every tuning belonging to that instrument and no tuning belonging to another
  instrument, with the Custom Tuning option always present.

- **AC-7.1.3** — Switching instruments leaves the musical context untouched

  **Given** a root, scale, capo position, label mode, fret range and chord selection are
  set, **When** the instrument is switched, **Then** every one of those settings is
  unchanged and only the string count and tuning change.

- **AC-7.1.4** — The instrument choice survives a reload

  **Given** an instrument has been selected, **When** the app is reloaded, **Then** the
  same instrument, with the tuning it was last showing, is restored.

---

### User Story 2 - Pick a common ukulele tuning (Priority: P1)

The player opens the tuning selector on a ukulele and finds the tunings actually in use:
standard GCEA with its high re-entrant fourth string, the linear low-G variant of it, the
Canadian (D) tuning ADF#B that older ukulele music is written in, and the baritone's DGBE.
Choosing one retunes all four strings and relabels every fret.

**Why this priority**: The tunings *are* the feature the maintainer asked for; a ukulele
that only plays one tuning is the guitar page with two fewer strings.

**Independent Test**: On a ukulele, select Canadian (D) tuning; verify the open strings
read A, D, F#, B from string 1 down and every fretted note relabels.

**Acceptance Scenarios**:

- **AC-7.2.1** — The four ukulele presets are reflected exactly

  **Given** the ukulele tuning selector, **When** a preset is selected, **Then** the four
  open strings take that preset's exact pitches and octaves and every fretted note
  recalculates.

  - **Cases**:
    - **AC-7.2.1/1** — Standard (high-G) GCEA is G4 C4 E4 A4, string 4 to string 1.
    - **AC-7.2.1/2** — Low-G GCEA is G3 C4 E4 A4, string 4 to string 1.
    - **AC-7.2.1/3** — Canadian / D tuning ADF#B is A4 D4 F#4 B4, string 4 to string 1.
    - **AC-7.2.1/4** — Baritone DGBE is D3 G3 B3 E4, string 4 to string 1.

- **AC-7.2.2** — Re-entrant tunings keep physical string order

  **Given** a re-entrant tuning, whose string 4 sounds higher than string 3, **When** the
  fretboard renders, **Then** string 1 is still the top row and string 4 the bottom row —
  the rows are never re-sorted by pitch, matching the physical instrument.

- **AC-7.2.3** — Every string sounds and labels at its true octave

  **Given** a re-entrant tuning, **When** a note is played or labelled, **Then** the pitch
  used is that string's true octave, so standard high-G's open string 4 is G4 and low-G's
  is G3, an octave apart at the same fret.

---

### User Story 3 - Define a custom ukulele tuning (Priority: P2)

The player opens Custom Tuning on a ukulele and sees four string rows, not six — one per
string that instrument actually has — and sets each one's pitch and octave freely.

**Why this priority**: Useful, but the four presets cover the common cases the maintainer
named.

**Independent Test**: On a ukulele, choose Custom Tuning; verify the editor shows four
rows labelled for strings 1–4, and that changing one re-renders that string alone.

**Acceptance Scenarios**:

- **AC-7.3.1** — The custom-tuning editor shows one row per string of the current instrument

  **Given** the custom-tuning editor is opened, **When** it renders, **Then** it shows
  exactly one pitch-and-octave row per string of the currently selected instrument,
  labelled for that instrument's strings, and is seeded from the tuning that was active
  when it opened.

- **AC-7.3.2** — A custom tuning applies to the instrument it was written for

  **Given** a custom tuning has been entered for one instrument, **When** the other
  instrument is selected, **Then** that custom tuning is not applied to it; each
  instrument keeps its own custom tuning.

---

### User Story 4 - Come back to the instrument you left (Priority: P1)

Switching to the ukulele and back does not cost the player their guitar tuning. Each
instrument remembers the tuning it was last showing, including a custom one.

**Why this priority**: Without it, every instrument switch silently destroys a setting the
player chose deliberately — the maintainer picked this over resetting to defaults.

**Independent Test**: Set the guitar to DADGAD, switch to Ukulele, select Canadian tuning,
switch back to Guitar; verify DADGAD is still selected.

**Acceptance Scenarios**:

- **AC-7.4.1** — Each instrument remembers its own last tuning

  **Given** each instrument has had a tuning selected, **When** the instrument is switched
  back and forth, **Then** each one returns showing the tuning it was last left on,
  preset or custom.

- **AC-7.4.2** — Settings saved before this feature load as a guitar in their saved tuning

  **Given** settings persisted by an earlier version of the app, which had no instrument
  setting, **When** the app loads them, **Then** they open as a guitar with the tuning
  they were saved with, and every other saved setting intact.

- **AC-7.4.3** — Saved settings whose string count contradicts their instrument fall back safely

  **Given** persisted settings naming an unknown instrument, or a custom tuning whose
  number of strings does not match its instrument, **When** the app loads them, **Then**
  the app opens on valid defaults rather than a broken board.

---

### Edge Cases

- A capo on a ukulele behaves exactly as on a guitar: the same fret, the same relative
  renumbering, the same locked lower bound on the fret range. Nothing about the capo is
  instrument-specific.
- Inlay dots are physical (AC-1.1.5) and stay at frets 3, 5, 7, 9, 12, 15, 17, 19, 21, 24
  on both instruments; the maintainer chose the same fret span for both, so no dot is
  dropped or moved for the ukulele.
- Chord and scale analysis is pitch-class work and is unaffected by string count: a chord
  that has no voicing reachable on four strings simply shows fewer marked notes.
- Baritone DGBE duplicates the guitar's top four strings. That is correct and not a bug:
  it is a ukulele tuning, listed under the ukulele.
- A custom tuning that assigns the same pitch to several strings still renders, per
  feature 001's existing rule.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-501**: System MUST provide an instrument selector offering Guitar (6 strings) and
  Ukulele (4 strings), and MUST render the fretboard with exactly the selected
  instrument's number of strings over the existing fret span.
- **FR-502**: The tuning library MUST associate every tuning with an instrument, and the
  tuning selector MUST offer only the selected instrument's tunings plus Custom Tuning.
- **FR-503**: System MUST offer the ukulele tunings Standard (high-G) G4 C4 E4 A4, Low-G
  G3 C4 E4 A4, Canadian / D tuning A4 D4 F#4 B4, and Baritone D3 G3 B3 E4.
- **FR-504**: System MUST render string rows in physical order, string 1 at the top through
  string N at the bottom, and MUST NOT reorder rows by pitch for re-entrant tunings.
- **FR-505**: Every note name, degree, interval and played pitch MUST derive from the true
  octave of the string it sits on, for re-entrant tunings as for linear ones.
- **FR-506**: The custom-tuning editor MUST present exactly one row per string of the
  currently selected instrument and MUST seed from the previously active tuning.
- **FR-507**: System MUST persist, per instrument, that instrument's last selected tuning
  (preset or custom), and MUST restore it when that instrument is selected again or the app
  is reloaded.
- **FR-508**: System MUST migrate settings persisted without an instrument to Guitar with
  their saved tuning, and MUST fall back to defaults when persisted settings name an
  unknown instrument or carry a custom tuning of the wrong string count.
- **FR-509**: String count MUST be a property of the selected instrument, read from one
  place; no view may assume six strings.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-501**: The player reaches a correctly tuned ukulele fretboard in one interaction
  (select Ukulele), with no further setup.
- **SC-502**: All four ukulele presets render open strings matching their published
  pitches, verified by automated test against the pitch tables in AC-7.2.1.
- **SC-503**: Switching instrument and back preserves both instruments' tunings and every
  musical setting, verified by automated test.
- **SC-504**: Settings saved by the previous version load without loss, as a guitar.
- **SC-505**: All existing suites pass — no behavioural regressions on the guitar.

## Key Entities

- **Instrument**: A named playable instrument with a fixed string count and a set of
  tunings — Guitar (6) and Ukulele (4). Owns which tunings the selector offers and how many
  rows the fretboard draws.
- **Tuning**: Extended from feature 001 — a named or custom set of open-string pitches,
  now belonging to exactly one instrument and carrying as many pitches as that instrument
  has strings.

## Spec Defects Revised

Revised in this feature, with the maintainer's approval, because feature 001 wrote the
guitar's six strings into criteria that are really about *the instrument's* strings:

- Feature 001's criterion `AC-1.2.1`: "All 6 strings" → "every string".
- Feature 001's `FR-001`: "a 6-string fretboard … string 1 (high-E) … string 6 (low-E)" →
  the selected instrument's string count, string 1 at the top through string N at the
  bottom.
- Feature 001's `FR-005`: the tuning selector's groups are the selected instrument's
  groups.
- Feature 001's Key Entities → Tuning: a set of open-string pitches sized to its
  instrument.

## Assumptions

- "Canadian tuning" is the ADF#B D-tuning, re-entrant like standard GCEA, and is the
  tuning older ukulele sheet music assumes. Its low-A variant is out of scope; the custom
  editor covers it.
- Baritone is listed as a ukulele tuning rather than as a third instrument: it is four
  strings and the maintainer asked for two instruments.
- The ukulele shares the guitar's 0–24 fret span by the maintainer's decision, even though
  a soprano ukulele has fewer frets. A per-instrument fret count is deliberately out of
  scope.
- Nothing about scales, modes, chords, capo, labels, colours or audio is
  instrument-specific; this feature changes how many strings there are and what they are
  tuned to, and nothing else.

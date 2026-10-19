# Feature Specification: Piano Key Colours

**Feature Branch**: `claude/piano-key-hue`

**Created**: 2026-10-18

**Status**: Draft

**Input**: User description: "I would love it if the keys weren't white and black and
instead we used a different shade hue of the note labels. We could have a toggle control
whether to show the hue or not as I don't know yet if I like it."

Clarified with the maintainer before specification:

- **Which keys**: scale notes only. A key takes the colour of its note's marker (its
  degree-role colour) — a light tint of it on a white key, a deep shade of it on a black
  key, so white and black keys stay told apart. Keys outside the scale stay plain.
- **Chord view**: chord tones are tinted, the faint "ghost" scale notes get a fainter
  tint, and keys whose notes are hidden in Chord view stay plain.
- **The toggle**: a "Key colours" On/Off control, shown only on the piano, remembered
  across reloads like every other setting, starting On. Remembering it needs a settings
  format upgrade (schemaVersion 4 → 5); the maintainer was told it cannot be undone by a
  later commit.

Landing mode: Auto. Shipped alongside a revision of feature 008's AC-8.2.4 (middle C is
marked by a black tip, not a caption).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the scale in the keys themselves (Priority: P1)

With key colours on, the piano's keys carry the colours of the notes they play: the root's
keys are tinted red, the third's green, and so on through the scale — the same colours the
note markers already use. White keys take a light tint and black keys a deep shade, so the
keyboard still reads as a keyboard. Keys outside the scale stay plain white and black, so
the scale stands out as a coloured shape across the whole keyboard.

**Why this priority**: It is the feature the maintainer asked for.

**Independent Test**: Select Piano, C Ionian, key colours on; verify every C key is tinted
with the root colour, every E key with the third's colour, and every C#, D#, F#, G# and A#
key stays plain black. Select D Dorian; verify the tints move to the new scale's notes.

**Acceptance Scenarios**:

- **AC-9.1.1** — A scale note's key takes its marker's colour

  **Given** key colours are on, **When** the piano is drawn, **Then** every key whose
  note is in the scale is tinted with that note's degree-role colour — the same colour as
  its marker — and that tint follows the root, scale and chord whenever they change.

- **AC-9.1.2** — White keys take a light tint and black keys a deep shade

  **Given** key colours are on, **When** a white key and a black key are both tinted,
  **Then** the white key is a light tint of its colour and the black key a deep shade of
  its colour, so every tinted white key stays lighter than every tinted black key.

- **AC-9.1.3** — Keys outside the scale stay plain

  **Given** key colours are on, **When** the piano is drawn, **Then** every key whose
  note is not in the scale is plain white or plain black, exactly as with key colours off.

- **AC-9.1.4** — Chord view tints chord tones fully and ghost notes faintly

  **Given** key colours are on in Chord view, **When** the piano is drawn, **Then** chord
  tones carry the full tint, ghost scale notes a fainter tint of their colour, and keys
  whose notes Chord view hides stay plain.

  - **Cases**:
    - **AC-9.1.4/1** — Chord tones carry the full tint in Chord view
    - **AC-9.1.4/2** — Ghost scale notes carry a fainter tint in Chord view
    - **AC-9.1.4/3** — Keys whose notes Chord view hides stay plain

---

### User Story 2 - Turn key colours on and off (Priority: P1)

The maintainer does not yet know whether they like coloured keys, so a "Key colours"
On/Off control sits beside the key-count control on the piano. Off gives back exactly the
plain white and black keyboard of feature 008.

**Why this priority**: The maintainer made the toggle a condition of the feature.

**Independent Test**: Select Piano; verify a Key colours control is shown, set On. Turn it
off; verify no key is tinted. Select Guitar; verify the control is gone.

**Acceptance Scenarios**:

- **AC-9.2.1** — A Key colours toggle appears only on the piano

  **Given** the controls, **When** the piano is selected, **Then** a "Key colours" control
  offering On and Off is shown with the current choice pressed; **When** a stringed
  instrument is selected, **Then** it is hidden.

- **AC-9.2.2** — Turning key colours off restores plain keys

  **Given** key colours are on and keys are tinted, **When** Off is chosen, **Then** no key
  is tinted and the markers, labels and middle C tip are unchanged; **When** On is chosen
  again, **Then** the tints return.

- **AC-9.2.3** — Key colours start on

  **Given** a first visit with no saved settings, **When** the piano is shown, **Then** key
  colours are on.

---

### User Story 3 - Keep the choice (Priority: P2)

Whatever the maintainer decides sticks across reloads, and settings saved before this
feature still load.

**Why this priority**: Every setting in the app persists; it follows from the stories
above.

**Independent Test**: Turn key colours off, reload; verify they are still off.

**Acceptance Scenarios**:

- **AC-9.3.1** — The key colours choice survives a reload

  **Given** key colours have been turned off (or on), **When** the app is reloaded,
  **Then** the piano reopens with the same choice.

- **AC-9.3.2** — Settings saved before this feature load unchanged with key colours on

  **Given** settings saved by an earlier version, **When** the app loads them, **Then**
  every earlier setting is kept and key colours are on.

- **AC-9.3.3** — A saved key colours value that is neither on nor off falls back safely

  **Given** saved settings whose key colours value is not on or off, **When** the app
  loads, **Then** it starts from the defaults rather than failing, as for any other
  corrupt setting.

---

### Edge Cases

- "(No scale)": no key is in a scale, so with key colours on only the root's keys are
  marked by their marker and no key is tinted.
- The middle C tip (feature 008, AC-8.2.4) stays visible on a tinted middle C.
- The capo never affects the piano (AC-8.1.4), so it never moves the tints either.
- A chord tone outside the scale has no degree-role colour (its marker is a neutral fill),
  so its key stays plain.
- The choice is kept while a stringed instrument is shown, like the key count.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-701**: With key colours on, every piano key whose note is in the scale MUST be
  tinted with its note's degree-role colour — light on white keys, deep on black keys —
  computed by the same rules that colour its marker (feature 008, FR-604).
- **FR-702**: Keys whose notes are not in the scale MUST stay plain; in Chord view chord
  tones MUST carry the full tint, ghost scale notes a fainter one, and hidden notes none.
- **FR-703**: A "Key colours" On/Off control MUST be shown on the piano only, beside the
  key-count control.
- **FR-704**: With key colours off the keyboard MUST look exactly as it did before this
  feature.
- **FR-705**: The choice MUST default to On, persist across reloads, and be added to
  saved settings by a versioned migration (schemaVersion 4 → 5) that keeps every other
  setting; an invalid stored value MUST fall back to defaults.
- **FR-706**: The tint colours MUST be defined once, centrally, alongside the existing
  degree-role colours, so re-tuning a role colour re-tunes its key tint.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-701**: With C Ionian on 88 keys, all 52 white keys and none of the 36 black keys
  are tinted; with key colours off, none of the 88 are.
- **SC-702**: One interaction (Off) returns the keyboard to plain white and black.
- **SC-703**: The choice survives a reload, verified by automated test.
- **SC-704**: All existing suites pass — no regressions on the guitar, the ukulele or the
  piano's markers, labels and sound.

## Key Entities

- **Key colours setting**: on or off, default on; one per app, not per instrument.

## Assumptions

- "A different shade hue of the note labels" means the colour of each note's marker, the
  degree-role colour, not the label text colour (which is white on every marker).
- The light and deep shades are mixes of the role colour with the existing white-key and
  black-key colours; their exact strengths are a matter of taste, tuned in the plan and
  open to adjustment after the maintainer has tried them.
- The toggle's wording is "Key colours" with On/Off buttons, matching the app's other
  two-way toggles.

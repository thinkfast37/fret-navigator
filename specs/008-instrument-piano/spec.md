# Feature Specification: Piano Mode

**Feature Branch**: `claude/peaceful-cray-cznwl2`

**Created**: 2026-10-18

**Status**: Draft

**Input**: User description: "i want a new feature that shows a piano instead of a guitar.
any guitar specific controls would not appear there (eg: capo and absolute/releative).
also instead of number of frets its should be number of keys with the default being 88 .
but it may need to show two rows of keys to fit everything. also when i am in piano mode i
should be able to hear piano sounds. use what is in rhythm-master for that in terms of the
sounds."

Clarified with the maintainer before specification:

- **Sound**: rhythm-master no longer plays piano samples. Its melodic voice is synthesised
  (three detuned sines, a low-pass sweep, a reverb send) and replaced the sampled piano
  there because the maintainer preferred it. The maintainer chose to port that synthesised
  voice as it is.
- **Layout**: one row of keys when every white key fits at a usable width; otherwise two
  stacked rows split at a C, lower notes on the top row.
- **Key count**: the standard keyboard sizes 25, 37, 49, 61, 76 and 88, each spanning its
  conventional range; 88 is the default.
- **Chord playback**: on the piano the Play button strikes every chord tone at once.

The maintainer approved the spill into features 001, 004 and 007 (see Spec Defects Revised
below). Landing mode: Auto.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Switch to a piano (Priority: P1)

The player picks Piano from the Instrument control and the fretboard is replaced by a piano
keyboard. Everything musical comes with it: the root, scale, chord, view and label mode
highlight the keys exactly as they highlighted the frets. The controls that only mean
something on a stringed instrument — tuning, capo, Absolute/Relative and the visible-fret
range — disappear, and a key-count control takes the fret range's place. Picking Guitar or
Ukulele brings the fretboard and every one of those settings back as they were left.

**Why this priority**: Without the switch there is no feature.

**Independent Test**: With C Ionian, Chord view on G major, a capo at fret 3 in Relative
mode and DADGAD tuning, select Piano; verify the board shows piano keys, no tuning, capo,
Absolute/Relative or fret-range control is shown, the C keys carry the root marker and the
G, B and D keys are the chord tones. Select Guitar; verify DADGAD, capo 3 and Relative are
all still set.

**Acceptance Scenarios**:

- **AC-8.1.1** — Selecting Piano replaces the fretboard with a keyboard

  **Given** the Instrument control, **When** Piano is selected, **Then** the board shows
  piano keys and no strings, frets, nut, capo bar or inlay dots; **When** a stringed
  instrument is selected again, **Then** the fretboard returns.

  - **Cases**:
    - **AC-8.1.1/1** — Selecting Piano draws piano keys and no fretboard
    - **AC-8.1.1/2** — Selecting a stringed instrument after Piano draws the fretboard again

- **AC-8.1.2** — Stringed-instrument controls are hidden on the piano

  **Given** Piano is selected, **When** the controls render, **Then** the tuning selector
  (with its custom-tuning Edit button), the capo selector, the Absolute/Relative toggle
  and the visible-frets slider are not shown and the key-count control is; **Given** a
  stringed instrument is selected, **Then** the reverse holds.

  - **Cases**:
    - **AC-8.1.2/1** — On the piano the tuning, capo, Absolute/Relative and fret-range controls are hidden and the key-count control is shown
    - **AC-8.1.2/2** — On a stringed instrument the key-count control is hidden and the tuning, capo, Absolute/Relative and fret-range controls are shown

- **AC-8.1.3** — Stringed-instrument settings survive a trip to the piano

  **Given** a tuning, capo position, Absolute/Relative choice and fret range are set,
  **When** the player switches to Piano and back, **Then** every one of them is unchanged.

- **AC-8.1.4** — The capo never shifts the piano's highlighting

  **Given** a capo is set with Relative labelling, **When** the piano is shown, **Then**
  the root, scale degrees, intervals and chord tones are computed from the true scale
  root, as if no capo were set.

- **AC-8.1.5** — The piano highlights exactly the notes the fretboard highlights

  **Given** a root, scale, chord, view and label mode, **When** the piano is shown,
  **Then** every key whose pitch class is highlighted on the fretboard is highlighted
  with the same root marker, degree role, label and chord-tone or ghost state, and every
  other key is not.

---

### User Story 2 - Choose how many keys (Priority: P1)

Instead of a visible-frets range the piano has a key count: the sizes keyboards are
actually sold in. Each size spans the range a real keyboard of that size spans, so a
61-key board starts on the same C a 61-key controller does.

**Why this priority**: The maintainer asked for it in place of the fret count, with 88 as
the default.

**Independent Test**: Select Piano; verify 88 keys from A0 to C8. Choose 61 keys; verify
61 keys from C2 to C7.

**Acceptance Scenarios**:

- **AC-8.2.1** — The piano defaults to 88 keys from A0 to C8

  **Given** the piano has never had its key count changed, **When** it is shown, **Then**
  it has 88 keys, the lowest A0 and the highest C8.

- **AC-8.2.2** — Each key count spans its conventional range

  **Given** the key-count control, **When** a size is selected, **Then** the keyboard has
  exactly that many keys over that size's conventional range.

  - **Cases**:
    - **AC-8.2.2/1** — 25 keys span C3 to C5
    - **AC-8.2.2/2** — 37 keys span C3 to C6
    - **AC-8.2.2/3** — 49 keys span C2 to C6
    - **AC-8.2.2/4** — 61 keys span C2 to C7
    - **AC-8.2.2/5** — 76 keys span E1 to G7
    - **AC-8.2.2/6** — 88 keys span A0 to C8

- **AC-8.2.3** — The key-count control offers only the standard sizes

  **Given** the piano is selected, **When** the key-count control renders, **Then** it
  offers 25, 37, 49, 61, 76 and 88 keys, in that order, with the current count selected.

---

### User Story 3 - Fit the keyboard on the screen (Priority: P1)

On a wide screen the whole keyboard sits in one row. When the screen is too narrow for
every key to stay playable in one row, it wraps into two rows like a line of text: the
lower notes on the top row, the rest underneath, split at a C so each row starts where an
octave starts.

**Why this priority**: 88 keys in one row on a tablet are too thin to tap; the maintainer
expected two rows to be needed.

**Independent Test**: Show 88 keys in a container narrow enough that 52 white keys would
each be thinner than the minimum; verify two rows, A0–B3 above and C4–C8 below. Widen
it; verify one row.

**Acceptance Scenarios**:

- **AC-8.3.1** — The keyboard uses one row when every white key fits

  **Given** the board's width divided by the number of white keys is at least the
  minimum usable white-key width, **When** the keyboard renders, **Then** every key is in
  one row.

- **AC-8.3.2** — A keyboard too wide for the screen splits into two rows at a C

  **Given** the white keys would be thinner than the minimum usable width in one row,
  **When** the keyboard renders, **Then** it is drawn as two rows, the lower notes on the
  top row, split at the C nearest the middle of the keyboard so the bottom row begins on
  a C.

  - **Cases**:
    - **AC-8.3.2/1** — 88 keys split into A0–B3 on the top row and C4–C8 on the bottom row
    - **AC-8.3.2/2** — The two rows together hold every key exactly once, in ascending order

- **AC-8.3.3** — Black keys sit between their neighbouring white keys

  **Given** any key count, **When** the keyboard renders, **Then** every sharp/flat is a
  shorter, narrower black key drawn over the boundary between the white keys a semitone
  either side of it, in the familiar groups of two and three.

- **AC-8.3.4** — The keyboard re-fits when the screen size changes

  **Given** the piano is shown, **When** the window is resized across the one-row
  threshold, **Then** the keyboard switches between one and two rows without a reload.

---

### User Story 4 - Hear a piano (Priority: P1)

Tapping a key plays that key's pitch with rhythm-master's melodic voice, not the guitar
sample, and the chord Play button strikes the whole chord at once, as a pianist would.
The guitar and ukulele keep sounding like a guitar.

**Why this priority**: The maintainer asked to hear piano sounds in piano mode, using
rhythm-master's voice.

**Independent Test**: In piano mode tap middle C; verify (via the mocked audio layer) one
note at 261.63 Hz through the synthesised voice and no guitar-sample load. Press Play on
C major; verify C, E and G all start at the same instant.

**Acceptance Scenarios**:

- **AC-8.4.1** — Tapping a key plays its exact pitch with the piano voice

  **Given** the piano is shown, **When** a key is clicked, tapped or activated from the
  keyboard, **Then** that key's exact pitch (its MIDI note, at A4 = 440 Hz equal
  temperament) plays through the synthesised piano voice and the guitar sample is not
  used.

- **AC-8.4.2** — The piano voice is rhythm-master's melodic voice

  **Given** a piano note is played, **When** it sounds, **Then** it is built as
  rhythm-master builds its melodic voice: three sine oscillators detuned 0, +5 and −5
  cents, a shared gain envelope peaking at 0.88 after 10 ms and decaying over 0.55 s, a
  low-pass filter sweeping from 2000 Hz to 600 Hz over the decay, and a dry path through a
  compressor plus a 35% reverb send.

- **AC-8.4.3** — The chord Play button strikes every chord tone at once on the piano

  **Given** the piano is shown, **When** the Play button is activated, **Then** every
  tone of the chord's voicing starts at the same instant through the piano voice.

- **AC-8.4.4** — Stringed instruments keep the guitar sample

  **Given** the guitar or ukulele is selected, **When** a fret or the Play button is
  activated, **Then** it plays through the guitar sample, strummed for a chord, exactly as
  before this feature.

---

### User Story 5 - Come back to the piano you left (Priority: P2)

The app reopens on the piano if that is where the player left it, at the key count they
chose, and settings saved before this feature still load.

**Why this priority**: Persistence is expected of every setting in the app, but it follows
from the stories above.

**Independent Test**: Select Piano with 49 keys, reload; verify the piano reopens with 49
keys.

**Acceptance Scenarios**:

- **AC-8.5.1** — The piano and its key count survive a reload

  **Given** the piano was selected with a key count, **When** the app is reloaded,
  **Then** it reopens on the piano with that key count.

- **AC-8.5.2** — Settings saved before this feature load unchanged with 88 keys

  **Given** settings persisted by an earlier version of the app, which had no key count,
  **When** the app loads them, **Then** every saved setting is intact and the piano's key
  count is 88.

- **AC-8.5.3** — Saved settings with an impossible key count fall back safely

  **Given** persisted settings whose key count is not one of the standard sizes, **When**
  the app loads them, **Then** the app opens on valid defaults rather than a broken
  keyboard.

---

### Edge Cases

- A capo or Relative mode saved on the guitar has no effect on the piano and is still
  there when the guitar comes back (AC-8.1.3, AC-8.1.4).
- In Chord view, keys that are neither chord tones nor in the scale lose their label and
  marker, but the key itself stays drawn and playable — a piano cannot hide a key the
  way the fretboard hides a fret position.
- The chord voicing is the same on every instrument (feature 004 FR-202); only how it is
  sounded differs.
- "(No scale)" behaves as on the fretboard: the root keys are still marked and every
  other key shows its note name.
- The Reset audio button (AC-1.8.7) confirms with a piano note in piano mode and a guitar
  note otherwise.
- The synthesised voice has nothing to download, so the sample-load error banner can
  never appear for piano playback.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-601**: The Instrument selector MUST offer Piano alongside Guitar and Ukulele; when
  Piano is selected the board MUST be drawn as a piano keyboard in the same single board
  view, never alongside a fretboard.
- **FR-602**: On the piano the tuning, custom-tuning, capo, Absolute/Relative and
  visible-frets controls MUST be hidden and a key-count control shown; their stored
  values MUST be kept unchanged for when a stringed instrument is selected again.
- **FR-603**: The highlight root on the piano MUST be the true scale root; the capo
  binding rule applies only to stringed instruments.
- **FR-604**: Key highlighting MUST use the same root, degree-role, label, chord-tone and
  ghost rules as the fretboard, keyed by pitch class.
- **FR-605**: The key count MUST be one of 25, 37, 49, 61, 76 or 88 (default 88), each
  spanning C3–C5, C3–C6, C2–C6, C2–C7, E1–G7 and A0–C8 respectively.
- **FR-606**: The keyboard MUST render in one row when the board width gives every white
  key at least the minimum usable width, otherwise in two rows split at the C nearest the
  middle, lower notes on top; it MUST re-fit on resize.
- **FR-607**: Piano notes and piano chords MUST play through a Web Audio port of
  rhythm-master's melodic voice; piano chords MUST start every tone at once; playback MUST
  start only from a user gesture (constitution Principle III).
- **FR-608**: Guitar and ukulele playback MUST be unchanged.
- **FR-609**: The key count MUST persist; saved settings without one MUST migrate to 88
  keys with every other setting intact; an invalid stored key count MUST fall back to
  defaults.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-601**: The player reaches a fully highlighted 88-key piano in one interaction
  (select Piano).
- **SC-602**: Every key count spans its conventional range, verified by automated test
  against the table in AC-8.2.2.
- **SC-603**: Switching to the piano and back preserves every stringed-instrument setting,
  verified by automated test.
- **SC-604**: All existing suites pass — no behavioural regressions on the guitar or
  ukulele.

## Key Entities

- **Instrument**: Extended from feature 007 — now either *stringed* (a string count and a
  tuning library) or a *keyboard* (a key count), and each names the voice it plays with.
- **Keyboard size**: a key count with its lowest and highest note.

## Spec Defects Revised

Revised in this change, with the maintainer's approval, because earlier features wrote
"the instrument" where they meant "a stringed instrument":

- Feature 001's `AC-1.8.1` and `FR-028`: the real-guitar-sample rule applies to fret
  positions, i.e. stringed instruments; the piano's voice is AC-8.4.x.
- Feature 004's `AC-4.1.1`, `FR-201` and `FR-203`: the strum and the sampled-guitar path
  apply on stringed instruments; the piano strikes the chord (AC-8.4.3).
- Feature 007's `AC-7.1.1`, `AC-7.1.3` and `FR-501`: the instrument selector also offers
  Piano; the string-count and "only the string count and tuning change" rules are about
  switching between stringed instruments.

## Assumptions

- "Piano sounds from rhythm-master" means rhythm-master's current melodic voice, which is
  synthesised; the maintainer confirmed this knowing it is not a sampled piano.
- The piano's only size setting is the key count; there is no visible-range slider on top
  of it.
- Label modes, colours and chord analysis are not instrument-specific.

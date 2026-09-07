# Feature Specification: Play the Selected Chord

**Feature Branch**: `claude/chord-root-mode-selection-38t633`

**Created**: 2026-09-07

**Status**: Draft

**Input**: User description: "After we implement chord mode, I also want a button to try to play the chord, so I can hear it." Clarified with the maintainer: strummed playback (not block), Auto landing.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Hear the selected chord (Priority: P1)

The guitarist has picked a chord in the chord panel (feature 003) and presses a **Play**
button to hear it: the chord's tones sound low-to-high as a strum, using the same guitar
samples as fret clicks, so they can check the chord by ear before finding it on the neck.

**Why this priority**: The entire feature — a single button and its sound.

**Independent Test**: Select E7 in A Ionian, press Play, and verify (via the mocked audio
layer) that exactly E, G#, B, D sound once each, ascending from the chord root, with
strum spacing.

**Acceptance Scenarios**:

- **AC-4.1.1** — Play button strums the selected chord's tones ascending from its root

  **Given** a chord root and quality are selected, **When** the Play button is
  activated, **Then** each of the chord's tones plays exactly once with the correct
  absolute pitch, in ascending order starting from the chord root, each note offset
  from the previous by a short strum delay.

- **AC-4.1.2** — Extended chords voice their extensions above the octave

  **Given** an extended quality is selected (9, m9, Maj9, Add9, 11, 13), **When** the
  chord is played, **Then** the 9th/11th/13th tones sound above the chord's octave
  (root + 14/17/21 semitones), never crushed inside the first octave as 2nds/4ths/6ths.

- **AC-4.1.3** — Playback is anchored to the true root, unaffected by capo Relative mode

  **Given** a capo is set and Relative labelling is active, **When** the chord is
  played, **Then** the sounded pitches derive from the true (unshifted) scale root plus
  the chord-root degree — matching the chord summary text, per the feature 001
  FR-048 audio-anchoring rule.

- **AC-4.1.4** — Chord playback only ever fires on the Play gesture

  **Given** the app is in any state, **When** the chord root, quality, view mode,
  scale root, or scale changes, **Then** no chord playback is triggered — sound occurs
  only from activating the Play button (or existing fret clicks).

---

### Edge Cases

- Samples not yet loaded / load failure: Play triggers the same lazy load + retry path
  as fret clicks; on failure the existing non-blocking audio-error banner appears and
  Play does nothing audible (no crash).
- Rapid repeated presses: each press strums independently; voices overlap naturally
  (same policy as rapid fret clicks, feature 001 FR-031).
- "(No scale)" selected: the chord picker still works (feature 003 edge case), and Play
  sounds that chord.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-201**: The chord panel MUST include a Play control that strums the currently
  selected chord on activation.
- **FR-202**: The chord's sounded pitches MUST be computed in the canonical theory layer
  as an ascending MIDI voicing (root in a fixed comfortable guitar octave, extensions
  lifted above the octave); no view may re-derive the voicing.
- **FR-203**: Playback MUST reuse the existing sampled-guitar audio path (lazy load,
  retry, error banner) and MUST derive pitches from the true scale root (never the
  capo-shifted highlight root).
- **FR-204**: Chord playback MUST occur only inside the Play control's user-gesture
  handler — never on load or on any state change (constitution Principle III).
- **FR-205**: The Play control MUST be keyboard-activatable with an accessible name.

### Key Entities

- **Chord Voicing**: The ascending list of MIDI notes for a chord — root anchored to a
  fixed octave, quality tones stacked above it, extensions raised an octave.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-201**: From a chord selection, hearing the chord takes exactly one click/keypress.
- **SC-202**: For all 12 roots × 20 qualities, the voicing's pitch classes equal the
  chord's tone set and the MIDI sequence is strictly ascending (verified by automated
  tests).
- **SC-203**: Zero autoplay regressions: no state change triggers sound.

## Assumptions

- Root octave 3 (MIDI 48–59) as the strum's bass anchor — a comfortable guitar register.
- Strum spacing ~50 ms per note, low-to-high (downstroke), fixed (no tempo control).
- One Play button (strum only) per the maintainer's clarification; a block-chord option
  was declined.

# Research — Feature 004 Play the Selected Chord

## R-401: Strummed, single button

- **Decision**: One Play button, strummed low-to-high at 50 ms per note.
- **Rationale**: Maintainer's explicit choice ("Strummed"); natural on guitar samples.
- **Alternatives**: Block chord; both buttons — declined in clarification.

## R-402: Voicing as data (`voicingOffsets`), not inference

- **Decision**: `computeChordVoicing(rootSemitone, qualityId, baseOctave = 3)` returns
  ascending MIDI notes: root at `rootSemitone + (baseOctave + 1) * 12`, then
  `voicingOffsets ?? intervals` added to it. Only the six extended qualities carry
  `voicingOffsets` (9 → …,14; m9/maj9/add9 → 14; 11 → 14, 17; 13 → 14, 21); all other
  qualities voice their pitch-class intervals as-is (sus2's 2 is genuinely a low 2nd).
- **Rationale**: Extensions can't be inferred from pitch-class intervals alone (a 2 is a
  9th in add9 but a true 2nd in sus2). Explicit per-quality data is precise, pure, and
  testable; `intervals` stays untouched so all feature 003 highlighting and tests are
  unaffected.
- **Alternatives**: Heuristic lifting of small intervals (breaks sus2); ascending-walk
  normalization (mis-voices sorted interval arrays).

## R-403: Scheduling via soundfont-player's `when` parameter

- **Decision**: `audio.playChord(midiNotes, strumSeconds = 0.05)` schedules
  `instrument.play(note, ctx.currentTime + i * strumSeconds)` for each note, inside the
  existing lazy-load/retry path.
- **Rationale**: Sample-accurate strum timing off the AudioContext clock, no setTimeout
  drift; failure and retry behaviour identical to fret clicks for free.
- **Alternatives**: setTimeout chains (drifty, harder to test deterministically).

## R-404: True-root anchoring

- **Decision**: The button computes the chord root as
  `trueRootSemitone + chordRootOffset` — the same arithmetic as the chord summary,
  never `getHighlightRootSemitone`.
- **Rationale**: Feature 001 FR-048: audio is always true pitch; feature 003's summary
  already established the split for chords.
- **Alternatives**: Highlight-root playback (would make the capo change what you hear —
  contradicts the audio-anchoring rule).

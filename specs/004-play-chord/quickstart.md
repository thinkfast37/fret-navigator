# Quickstart Validation — Feature 004 Play the Selected Chord

## Automated gates

```bash
npm test && npm run coverage:ac && npm run trace:matrix && npm run check:trace
```

## Manual scenarios (serve `src/`, needs real audio output)

1. Key of A Ionian, chord "V — E" + quality "7", press **Play chord**: hear E–G#–B–D
   strummed low to high (SC-201).
2. Quality "9": the D (9th) sounds clearly above the octave, not as a low 2nd
   (AC-4.1.2).
3. Capo 3 + Relative: Play still sounds the same pitches as with no capo (AC-4.1.3).
4. Change root/scale/quality/view repeatedly: silence until Play or a fret is clicked
   (AC-4.1.4).
5. Tab to the Play button and press Enter: it plays (FR-205).

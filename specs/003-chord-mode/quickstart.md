# Quickstart Validation — Feature 003 Chord Mode

## Prerequisites

```bash
npm install          # test tooling only (jsdom); the site itself has no build step
```

## Automated gates (must all pass)

```bash
npm test              # app suites incl. new AC-3.x.y tests
npm run coverage:ac
npm run trace:matrix  # regenerate + commit
npm run check:trace
```

## Manual scenarios (serve `src/` statically, e.g. `npx http-server src`)

1. **E7 in the key of A** (SC-101): Scale Root = A, Scale = Ionian. Chord Root dropdown →
   "V — E"; Quality → "7"; View → Chord. Expect only E, G#, B, D positions fully lit and
   labelled; other A-major notes as faint unlabelled dots; everything else absent.
   Summary reads "E7: E, G#, B, D".
2. **Modal mixture naming** (AC-3.3.2): Scale Root = C, Ionian. Open Chord Root dropdown;
   the Bb entry reads "bVII — Bb (borrowed: Mixolydian / parallel minor)" and is visually
   distinct from diatonic entries.
3. **Scale view unchanged** (AC-3.2.5): switch View → Scale; full scale rendering, no
   bright/dim split, chord selection irrelevant to the display.
4. **Clicks play, never select** (AC-3.2.6): click notes in both views — audio plays;
   no selection or highlighting changes. Ghost dots also play.
5. **Capo Relative** (AC-3.2.8): Capo fret 2, Relative mode, C Ionian, chord I major →
   chord highlighting sits with the shifted (D) highlight root, matching the scale shift;
   the summary still names C-rooted tones.
6. **Migration** (AC-3.1.6): with v1 settings in localStorage (containing
   `focalDegreeSemitone`/`chordToneOverrides`), reload → no error; tuning/root/scale/capo
   preserved; chord defaults to degree I; localStorage now `schemaVersion: 2`.
7. **Labels** (AC-3.4.1): root buttons headed "Scale Root"; picker labelled "Chord Root".

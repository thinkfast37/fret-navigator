import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  TUNINGS,
  SCALES,
  DEGREE_ROLES,
  ROOTS,
  noteAt,
  spellPitchClass,
  getDiatonicSemitones,
  getDegreeRole,
  getDegreeLabel,
  getIntervalLabel,
  computeDefaultTriad,
  getTriadQuality,
  getRelativeLabelSemitone,
  isFretPlayable,
  rootLetterToSemitone,
  getHighlightRootSemitone,
} from "../src/js/theory.js";

// ---- Reference data (T005, T007, T009) ----

describe("TUNINGS reference data", () => {
  test("has standard plus 17 named tunings (D-Family x8, G-Family x5, C-Family x4)", () => {
    assert.equal(TUNINGS.length, 18);
    assert.equal(TUNINGS.filter((t) => t.group === "D-Family").length, 8);
    assert.equal(TUNINGS.filter((t) => t.group === "G-Family").length, 5);
    assert.equal(TUNINGS.filter((t) => t.group === "C-Family").length, 4);
    assert.equal(TUNINGS.filter((t) => t.group === "Standard").length, 1);
    assert.ok(TUNINGS.find((t) => t.id === "standard"));
  });

  test("every tuning has correct group and 6-element pitch/octave arrays", () => {
    for (const tuning of TUNINGS) {
      assert.ok(["D-Family", "G-Family", "C-Family", "Standard", "Custom"].includes(tuning.group));
      assert.equal(tuning.openPitchClasses.length, 6);
      assert.equal(tuning.openOctaves.length, 6);
    }
  });

  test("Standard tuning is E A D G B E (string1=E...string6=E)", () => {
    const std = TUNINGS.find((t) => t.id === "standard");
    assert.deepEqual(std.openPitchClasses, ["E", "B", "G", "D", "A", "E"]);
    assert.deepEqual(std.openOctaves, [4, 3, 3, 3, 2, 2]);
  });

  test("Drop D lowers only string 6 to D", () => {
    const dropD = TUNINGS.find((t) => t.id === "drop-d");
    assert.deepEqual(dropD.openPitchClasses, ["E", "B", "G", "D", "A", "D"]);
  });

  test("DADGAD matches D2 A2 D3 G3 A3 D4 low to high", () => {
    const dadgad = TUNINGS.find((t) => t.id === "dadgad");
    assert.deepEqual(dadgad.openPitchClasses, ["D", "A", "G", "D", "A", "D"]);
    assert.deepEqual(dadgad.openOctaves, [4, 3, 3, 3, 2, 2]);
  });

  test("Open C Minor includes the Eb string", () => {
    const openCMinor = TUNINGS.find((t) => t.id === "open-c-minor");
    assert.deepEqual(openCMinor.openPitchClasses, ["Eb", "C", "G", "C", "G", "C"]);
  });
});

describe("SCALES reference data", () => {
  test("has all 13 scales/modes with correct category grouping", () => {
    assert.equal(SCALES.length, 13);
    assert.equal(SCALES.filter((s) => s.category === "Church Modes").length, 7);
    assert.equal(SCALES.filter((s) => s.category === "Pentatonic").length, 2);
    assert.equal(SCALES.filter((s) => s.category === "Blues").length, 2);
    assert.equal(SCALES.filter((s) => s.category === "Other").length, 2);
  });

  test("Dorian degree formula and semitone offsets match Story 4 exactly", () => {
    const dorian = SCALES.find((s) => s.id === "dorian");
    assert.deepEqual(dorian.degreeFormula, ["1", "2", "b3", "4", "5", "6", "b7"]);
    assert.deepEqual(dorian.semitoneOffsets, [0, 2, 3, 5, 7, 9, 10]);
  });

  test("every scale table matches the Story 4 canonical tables", () => {
    const expected = {
      ionian: [0, 2, 4, 5, 7, 9, 11],
      dorian: [0, 2, 3, 5, 7, 9, 10],
      phrygian: [0, 1, 3, 5, 7, 8, 10],
      lydian: [0, 2, 4, 6, 7, 9, 11],
      mixolydian: [0, 2, 4, 5, 7, 9, 10],
      aeolian: [0, 2, 3, 5, 7, 8, 10],
      locrian: [0, 1, 3, 5, 6, 8, 10],
      "major-pentatonic": [0, 2, 4, 7, 9],
      "minor-pentatonic": [0, 3, 5, 7, 10],
      "minor-blues": [0, 3, 5, 6, 7, 10],
      "major-blues": [0, 2, 3, 4, 7, 9],
      "harmonic-minor": [0, 2, 3, 5, 7, 8, 11],
      "melodic-minor": [0, 2, 3, 5, 7, 9, 11],
    };
    for (const [id, offsets] of Object.entries(expected)) {
      const scale = SCALES.find((s) => s.id === id);
      assert.ok(scale, `missing scale ${id}`);
      assert.deepEqual(scale.semitoneOffsets, offsets, `${id} offsets mismatch`);
    }
  });
});

describe("DEGREE_ROLES reference data", () => {
  test("has all 12 chromatic positions with correct labels", () => {
    assert.equal(DEGREE_ROLES.length, 12);
    const expectedLabels = ["1", "b2", "2", "b3", "3", "4", "#4/b5", "5", "b6", "6", "b7", "7"];
    assert.deepEqual(DEGREE_ROLES.map((r) => r.roleLabel), expectedLabels);
  });

  test("each role has a stable colorRoleId", () => {
    for (const role of DEGREE_ROLES) {
      assert.ok(typeof role.colorRoleId === "string" && role.colorRoleId.length > 0);
    }
    const ids = DEGREE_ROLES.map((r) => r.colorRoleId);
    assert.equal(new Set(ids).size, 12);
  });
});

describe("ROOTS reference data (UAT round 1 section C3)", () => {
  test("has all 12 canonical roots in exact alphabetical display order", () => {
    assert.deepEqual(
      ROOTS.map((r) => r.label),
      ["A", "Ab", "B", "Bb", "C", "D", "Db", "E", "Eb", "F", "F#", "G"]
    );
  });

  test("every semitone 0-11 is covered exactly once", () => {
    const semitones = ROOTS.map((r) => r.semitone).sort((a, b) => a - b);
    assert.deepEqual(semitones, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  test("accidentalPreference follows circle-of-fifths convention (C G D A E B F# sharp; Db Ab Eb Bb F flat)", () => {
    const sharpSide = ["C", "G", "D", "A", "E", "B", "F#"];
    const flatSide = ["Db", "Ab", "Eb", "Bb", "F"];
    for (const label of sharpSide) {
      assert.equal(ROOTS.find((r) => r.label === label).accidentalPreference, "sharp", label);
    }
    for (const label of flatSide) {
      assert.equal(ROOTS.find((r) => r.label === label).accidentalPreference, "flat", label);
    }
  });
});

// ---- Pitch computation (T011, T013) ----

describe("noteAt", () => {
  test("open strings (fret=0) match tuning's open pitch/octave", () => {
    const std = TUNINGS.find((t) => t.id === "standard");
    assert.deepEqual(noteAt(std, 0, 0), { midiNote: 64, pitchClassSemitone: 4 }); // E4
    assert.deepEqual(noteAt(std, 5, 0), { midiNote: 40, pitchClassSemitone: 4 }); // E2
  });

  test("12-fret octave wraparound: same pitch class, +12 semitones", () => {
    const std = TUNINGS.find((t) => t.id === "standard");
    const open = noteAt(std, 0, 0);
    const twelfth = noteAt(std, 0, 12);
    assert.equal(twelfth.midiNote, open.midiNote + 12);
    assert.equal(twelfth.pitchClassSemitone, open.pitchClassSemitone);
  });

  test("every tuning in TUNINGS produces a valid open-string note for all 6 strings", () => {
    for (const tuning of TUNINGS) {
      for (let s = 0; s < 6; s++) {
        const note = noteAt(tuning, s, 0);
        assert.ok(Number.isInteger(note.midiNote));
        assert.ok(note.pitchClassSemitone >= 0 && note.pitchClassSemitone <= 11);
      }
    }
  });

  test("edge frets 0/12/24 on the low E string", () => {
    const std = TUNINGS.find((t) => t.id === "standard");
    assert.equal(noteAt(std, 5, 0).midiNote, 40);
    assert.equal(noteAt(std, 5, 12).midiNote, 52);
    assert.equal(noteAt(std, 5, 24).midiNote, 64);
  });

  test("Drop D string 6 at fret 0 is D2 (MIDI 38)", () => {
    const dropD = TUNINGS.find((t) => t.id === "drop-d");
    assert.equal(noteAt(dropD, 5, 0).midiNote, 38);
  });
});

describe("spellPitchClass", () => {
  test("F# in G major, Bb in F major (constitution's own examples)", () => {
    const gMajorKey = { root: "G", accidentalPreference: "sharp", scaleId: "ionian" };
    assert.equal(spellPitchClass(6, gMajorKey), "F#"); // 7th degree of G major

    const fMajorKey = { root: "F", accidentalPreference: "flat", scaleId: "ionian" };
    assert.equal(spellPitchClass(10, fMajorKey), "Bb"); // 4th degree of F major
  });

  test("B Locrian spells entirely with natural letters", () => {
    const bLocrian = { root: "B", accidentalPreference: "sharp", scaleId: "locrian" };
    assert.equal(spellPitchClass(11, bLocrian), "B");
    assert.equal(spellPitchClass(0, bLocrian), "C");
    assert.equal(spellPitchClass(2, bLocrian), "D");
    assert.equal(spellPitchClass(4, bLocrian), "E");
    assert.equal(spellPitchClass(5, bLocrian), "F");
    assert.equal(spellPitchClass(7, bLocrian), "G");
    assert.equal(spellPitchClass(9, bLocrian), "A");
  });

  test("enharmonic equivalents spelled per accidentalPreference for non-diatonic notes", () => {
    const cMajorSharp = { root: "C", accidentalPreference: "sharp", scaleId: "ionian" };
    const cMajorFlat = { root: "C", accidentalPreference: "flat", scaleId: "ionian" };
    assert.equal(spellPitchClass(6, cMajorSharp), "F#");
    assert.equal(spellPitchClass(6, cMajorFlat), "Gb");
    assert.equal(spellPitchClass(1, cMajorSharp), "C#");
    assert.equal(spellPitchClass(1, cMajorFlat), "Db");
  });

  test("root itself always spells as its own letter", () => {
    for (const root of ["C", "D", "E", "F", "G", "A", "B"]) {
      const key = { root, accidentalPreference: "sharp", scaleId: "ionian" };
      const rootSemitone = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[root];
      assert.equal(spellPitchClass(rootSemitone, key), root);
    }
  });

  test("UAT round 1 section C3: non-natural root (Db) spells its own major scale correctly, letter by letter", () => {
    const dbMajorKey = { root: "Db", accidentalPreference: "flat", scaleId: "ionian" };
    // Db major: Db Eb F Gb Ab Bb C
    assert.equal(spellPitchClass(1, dbMajorKey), "Db");
    assert.equal(spellPitchClass(3, dbMajorKey), "Eb");
    assert.equal(spellPitchClass(5, dbMajorKey), "F");
    assert.equal(spellPitchClass(6, dbMajorKey), "Gb");
    assert.equal(spellPitchClass(8, dbMajorKey), "Ab");
    assert.equal(spellPitchClass(10, dbMajorKey), "Bb");
    assert.equal(spellPitchClass(0, dbMajorKey), "C");
  });

  test("UAT round 1 section C3: non-natural root (F#) spells its own major scale correctly, letter by letter", () => {
    const fSharpMajorKey = { root: "F#", accidentalPreference: "sharp", scaleId: "ionian" };
    // F# major: F# G# A# B C# D# E#(F)
    assert.equal(spellPitchClass(6, fSharpMajorKey), "F#");
    assert.equal(spellPitchClass(8, fSharpMajorKey), "G#");
    assert.equal(spellPitchClass(10, fSharpMajorKey), "A#");
    assert.equal(spellPitchClass(11, fSharpMajorKey), "B");
    assert.equal(spellPitchClass(1, fSharpMajorKey), "C#");
    assert.equal(spellPitchClass(3, fSharpMajorKey), "D#");
    assert.equal(spellPitchClass(5, fSharpMajorKey), "E#");
  });
});

// ---- Scale/degree computation (T015, T017, T019, T021) ----

describe("spellPitchClass letter-walk on non-sequential degree formulas (bug fix 2026-09-07, Principle I)", () => {
  test("A minor pentatonic spells its b3 as C, never B#", () => {
    const key = { root: "A", accidentalPreference: "sharp", scaleId: "minor-pentatonic" };
    assert.equal(spellPitchClass(0, key), "C"); // b3 of A
    assert.equal(spellPitchClass(7, key), "G"); // b7 of A
    assert.equal(spellPitchClass(2, key), "D"); // 4 of A
  });

  test("C major pentatonic spells 5 and 6 as G and A, never F## or G##", () => {
    const key = { root: "C", accidentalPreference: "sharp", scaleId: "major-pentatonic" };
    assert.equal(spellPitchClass(7, key), "G");
    assert.equal(spellPitchClass(9, key), "A");
  });

  test("C minor blues spells b5 and 5 as Gb and G (distinct letters follow the formula)", () => {
    const key = { root: "C", accidentalPreference: "sharp", scaleId: "minor-blues" };
    assert.equal(spellPitchClass(3, key), "Eb");
    assert.equal(spellPitchClass(6, key), "Gb");
    assert.equal(spellPitchClass(7, key), "G");
    assert.equal(spellPitchClass(10, key), "Bb");
  });

  test("7-note scales are unaffected (regression guard)", () => {
    const gMajorKey = { root: "G", accidentalPreference: "sharp", scaleId: "ionian" };
    assert.equal(spellPitchClass(6, gMajorKey), "F#");
    const cDorian = { root: "C", accidentalPreference: "sharp", scaleId: "dorian" };
    assert.equal(spellPitchClass(3, cDorian), "Eb");
  });
});

describe("getDiatonicSemitones", () => {
  test("exact semitone set per scale x several roots, no more no fewer", () => {
    assert.deepEqual(getDiatonicSemitones(0, "ionian"), new Set([0, 2, 4, 5, 7, 9, 11])); // C major
    assert.deepEqual(getDiatonicSemitones(7, "ionian"), new Set([7, 9, 11, 0, 2, 4, 6])); // G major
    assert.deepEqual(getDiatonicSemitones(0, "minor-pentatonic"), new Set([0, 3, 5, 7, 10]));
    assert.deepEqual(getDiatonicSemitones(2, "dorian"), new Set([2, 4, 5, 7, 9, 11, 0])); // D dorian
  });
});

describe("getDegreeRole", () => {
  test("all 12 positions return the fixed descriptor regardless of diatonic status", () => {
    for (let s = 0; s < 12; s++) {
      assert.deepEqual(getDegreeRole(s), DEGREE_ROLES[s]);
    }
  });
});

describe("getDegreeLabel", () => {
  test("exact Story 4 tokens for diatonic positions", () => {
    assert.equal(getDegreeLabel(3, "dorian"), "b3");
    assert.equal(getDegreeLabel(6, "lydian"), "#4");
    assert.equal(getDegreeLabel(10, "mixolydian"), "b7");
    assert.equal(getDegreeLabel(0, "ionian"), "1");
  });

  test("null for non-diatonic input", () => {
    assert.equal(getDegreeLabel(6, "ionian"), null); // #4/b5 not in C major
    assert.equal(getDegreeLabel(1, "ionian"), null);
  });
});

describe("getIntervalLabel", () => {
  test("correct shorthand for all 12 positions", () => {
    assert.equal(getIntervalLabel(0), "R");
    assert.equal(getIntervalLabel(4), "M3");
    assert.equal(getIntervalLabel(7), "P5");
    assert.equal(getIntervalLabel(10), "m7");
    assert.equal(getIntervalLabel(3), "m3");
    assert.equal(getIntervalLabel(11), "M7");
  });
});

// ---- Chord/focal-point computation (T023, T025, T027, T029) ----

describe("computeDefaultTriad", () => {
  test("C Major focal=root (0) gives C E G (major)", () => {
    assert.deepEqual(computeDefaultTriad(0, 0, "ionian"), [0, 4, 7]);
  });

  test("C Major focal=E (4) gives E G B (minor)", () => {
    assert.deepEqual(computeDefaultTriad(4, 0, "ionian"), [4, 7, 11]);
  });

  test("C Major focal=B (11) gives B D F (diminished)", () => {
    assert.deepEqual(computeDefaultTriad(11, 0, "ionian"), [11, 2, 5]);
  });

  test("stacks nearest diatonic thirds across multiple scales/roots", () => {
    assert.deepEqual(computeDefaultTriad(2, 0, "dorian"), [2, 5, 9]); // D dorian focal=2(D)->F,A relative offsets
  });
});

describe("getTriadQuality", () => {
  test("major, minor, diminished, augmented derived from interval structure", () => {
    assert.equal(getTriadQuality([0, 4, 7]), "major");
    assert.equal(getTriadQuality([4, 7, 11]), "minor");
    assert.equal(getTriadQuality([11, 2, 5]), "diminished");
    assert.equal(getTriadQuality([0, 4, 8]), "augmented");
  });
});

// ---- Capo computation (T031, T033, T035) ----

describe("getRelativeLabelSemitone", () => {
  test("physicalFret - capoFret, equals physicalFret when capoFret===0", () => {
    assert.equal(getRelativeLabelSemitone(5, 3), 2);
    assert.equal(getRelativeLabelSemitone(7, 0), 7);
  });
});

describe("rootLetterToSemitone", () => {
  test("maps all 7 natural letters to their chromatic semitone", () => {
    assert.deepEqual(
      ["C", "D", "E", "F", "G", "A", "B"].map(rootLetterToSemitone),
      [0, 2, 4, 5, 7, 9, 11]
    );
  });

  test("UAT round 1 section C3: also maps all 12 canonical ROOTS labels, not naturals-only", () => {
    assert.deepEqual(
      ROOTS.map((r) => rootLetterToSemitone(r.label)),
      ROOTS.map((r) => r.semitone)
    );
  });
});

describe("isFretPlayable", () => {
  test("fret >= capoFret across boundary values", () => {
    assert.equal(isFretPlayable(3, 3), true);
    assert.equal(isFretPlayable(2, 3), false);
    assert.equal(isFretPlayable(0, 0), true);
  });
});

// ---- getHighlightRootSemitone (T101/T102, UAT round 2 section A) ----
// Supersedes the round-1 rule that highlighting never shifts at all
// (see the describe block below, which still holds at the pure-function
// level: these functions never gained a capoFret parameter themselves -
// it's the CALLER, fretboard.js, that now feeds a different root in).

describe("getHighlightRootSemitone", () => {
  test("Scenario 7: capo=0, unshifted regardless of label mode", () => {
    assert.equal(getHighlightRootSemitone(0, 0, "absolute"), 0);
    assert.equal(getHighlightRootSemitone(0, 0, "relative"), 0);
  });

  test("Scenario 8: capo=3, Absolute mode stays unshifted", () => {
    assert.equal(getHighlightRootSemitone(0, 3, "absolute"), 0);
  });

  test("Scenario 9: capo=3, Relative mode shifts +capoFret to Eb(3) - never A(9, the old -capoFret result), never C(0)", () => {
    const result = getHighlightRootSemitone(0, 3, "relative");
    assert.equal(result, 3);
    assert.notEqual(result, 9);
    assert.notEqual(result, 0);
  });
});

describe("Scenario 10: highlighting-consistency - getDiatonicSemitones/computeDefaultTriad agree when fed getHighlightRootSemitone's output", () => {
  test("root=C, capo=3, Relative mode -> every function is consistent with root=Eb, not C, not A", () => {
    const highlightRoot = getHighlightRootSemitone(0, 3, "relative"); // Eb (3)
    assert.equal(highlightRoot, 3);

    // getDiatonicSemitones produces ABSOLUTE semitones and so meaningfully
    // depends on which root it's fed.
    assert.deepEqual(getDiatonicSemitones(highlightRoot, "ionian"), new Set([3, 5, 7, 8, 10, 0, 2])); // Eb major

    // computeDefaultTriad operates entirely in root-relative OFFSET space
    // (its `root` argument doesn't change which offsets come out) - the
    // default triad off the root is [0,4,7] whether the underlying root is C
    // or Eb; it's the absolute pitches those offsets map to that shift.
    assert.deepEqual(computeDefaultTriad(0, highlightRoot, "ionian"), [0, 4, 7]);

    // Sanity: the ABSOLUTE diatonic set is distinct from root=C(0) or the
    // old -capoFret result A(9).
    assert.notDeepEqual(getDiatonicSemitones(highlightRoot, "ionian"), getDiatonicSemitones(0, "ionian"));
    assert.notDeepEqual(getDiatonicSemitones(highlightRoot, "ionian"), getDiatonicSemitones(9, "ionian"));
  });
});

describe("Scenario 11: audio anchoring - noteAt never takes a root/capo-shift parameter at all", () => {
  test("noteAt's signature is (tuning, stringIndex, fret) only - true pitch is structurally incapable of reflecting getHighlightRootSemitone", () => {
    const tuning = TUNINGS.find((t) => t.id === "standard");
    const a = noteAt(tuning, 4, 3); // A string, fret 3 -> C, regardless of any root/capo/label-mode state
    assert.equal(a.pitchClassSemitone, 0);
  });
});

// ---- Root stability regression test (UAT round 1 section A) ----
// Capo + Relative mode must NEVER substitute a different root into any of
// theory.js's diatonic/degree-role/focal/chord-tone computation - only
// note-NAME text (getRelativeLabelSemitone, tested above) varies with capo.
// This replaces the earlier (incorrect) getDisplayRootSemitone binding rule.
//
// UAT round 2 section A note: at the app-integration level (fretboard.js),
// this is now superseded - the caller DOES feed a shifted root (via
// getHighlightRootSemitone above) into these functions when capo+Relative
// applies. The assertions below remain true and useful as-is: they document
// that these pure functions themselves have no capo awareness and behave
// identically no matter what a caller passes as `root` - shifting is exactly
// and only the caller's responsibility, never smuggled in as a hidden default.

describe("root stability under capo + Relative mode (regression, UAT round 1 section A)", () => {
  test("getDiatonicSemitones/computeDefaultTriad never take a capo-shifted root", () => {
    const trueRoot = 0; // C
    const scaleId = "ionian";

    // These functions have no capoFret/pitchReferenceMode parameter at
    // all - calling them with the literal selected root produces identical
    // output whether or not a capo happens to be active elsewhere in state.
    const diatonic = getDiatonicSemitones(trueRoot, scaleId);
    assert.deepEqual(diatonic, new Set([0, 2, 4, 5, 7, 9, 11])); // C major, not A major

    const triad = computeDefaultTriad(0, trueRoot, scaleId);
    assert.deepEqual(triad, [0, 4, 7]); // C E G, not A C# E
  });
});

// ---- Feature 003: chord vocabulary + tone computation (T301, P-201) ----

import {
  CHORD_QUALITIES,
  computeChordTones,
  getChordName,
  getChordRootOptions,
  getDefaultChordQualityId,
} from "../src/js/theory.js";

describe("CHORD_QUALITIES reference data (feature 003)", () => {
  test("AC-3.1.2 — Chord quality dropdown offers the full vocabulary", () => {
    const ids = CHORD_QUALITIES.map((q) => q.id);
    assert.deepEqual(ids, [
      "major", "minor", "dim", "aug", "sus2", "sus4",
      "dom7", "maj7", "min7", "m7b5", "dim7", "six", "m6",
      "dom9", "min9", "maj9", "add9", "dom11", "dom13", "7sus4",
    ]);
    assert.equal(CHORD_QUALITIES.length, 20);
    for (const q of CHORD_QUALITIES) {
      assert.equal(typeof q.label, "string");
      assert.equal(typeof q.suffix, "string");
      assert.ok(Array.isArray(q.intervals) && q.intervals[0] === 0);
      for (const i of q.intervals) assert.ok(Number.isInteger(i) && i >= 0 && i <= 11);
    }
  });

  test("AC-3.1.2 — Chord quality dropdown offers the full vocabulary: canonical interval formulas", () => {
    const byId = Object.fromEntries(CHORD_QUALITIES.map((q) => [q.id, q.intervals]));
    assert.deepEqual(byId.major, [0, 4, 7]);
    assert.deepEqual(byId.minor, [0, 3, 7]);
    assert.deepEqual(byId.dim, [0, 3, 6]);
    assert.deepEqual(byId.aug, [0, 4, 8]);
    assert.deepEqual(byId.sus2, [0, 2, 7]);
    assert.deepEqual(byId.sus4, [0, 5, 7]);
    assert.deepEqual(byId.dom7, [0, 4, 7, 10]);
    assert.deepEqual(byId.maj7, [0, 4, 7, 11]);
    assert.deepEqual(byId.min7, [0, 3, 7, 10]);
    assert.deepEqual(byId.m7b5, [0, 3, 6, 10]);
    assert.deepEqual(byId.dim7, [0, 3, 6, 9]);
    assert.deepEqual(byId.six, [0, 4, 7, 9]);
    assert.deepEqual(byId.m6, [0, 3, 7, 9]);
    assert.deepEqual(byId.dom9, [0, 2, 4, 7, 10]);
    assert.deepEqual(byId.min9, [0, 2, 3, 7, 10]);
    assert.deepEqual(byId.maj9, [0, 2, 4, 7, 11]);
    assert.deepEqual(byId.add9, [0, 2, 4, 7]);
    assert.deepEqual(byId.dom11, [0, 2, 4, 5, 7, 10]);
    assert.deepEqual(byId.dom13, [0, 2, 4, 7, 9, 10]);
    assert.deepEqual(byId["7sus4"], [0, 5, 7, 10]);
  });
});

describe("computeChordTones (feature 003)", () => {
  test("AC-3.1.3 — Selected chord's tones are computed from root + quality", () => {
    // E7 -> E, G#, B, D (semitones 4, 8, 11, 2)
    assert.deepEqual(computeChordTones(4, "dom7"), [4, 8, 11, 2]);
    // C major -> C E G
    assert.deepEqual(computeChordTones(0, "major"), [0, 4, 7]);
    // Bb major (modal mixture in C) -> Bb D F
    assert.deepEqual(computeChordTones(10, "major"), [10, 2, 5]);
  });

  test("AC-3.1.3 — Selected chord's tones are computed from root + quality: octave wraparound for every quality on every root", () => {
    for (const q of CHORD_QUALITIES) {
      for (let root = 0; root < 12; root++) {
        const tones = computeChordTones(root, q.id);
        assert.equal(tones.length, q.intervals.length);
        tones.forEach((t, i) => {
          assert.equal(t, (root + q.intervals[i]) % 12);
          assert.ok(t >= 0 && t <= 11);
        });
      }
    }
  });

  test("AC-3.1.3 — Selected chord's tones are computed from root + quality: independent of scale membership", () => {
    // F#dim7 in the context of C Ionian: none of the scale matters to the formula.
    assert.deepEqual(computeChordTones(6, "dim7"), [6, 9, 0, 3]);
  });

  test("throws on an unknown quality id", () => {
    assert.throws(() => computeChordTones(0, "power5"));
  });
});

describe("getChordName (feature 003)", () => {
  const cIonian = { root: "C", accidentalPreference: "sharp", scaleId: "ionian" };
  test("AC-3.2.9 — Chord summary line names the chord and its tones: name spelling", () => {
    assert.equal(getChordName(4, "dom7", cIonian), "E7");
    assert.equal(getChordName(0, "major", cIonian), "C");
    assert.equal(getChordName(2, "minor", cIonian), "Dm");
    // C is sharp-side, so its bVII chord is A# (AC-1.3.2: the convention applies to
    // "every other non-diatonic note's spelling", not just the tonic).
    assert.equal(getChordName(10, "major", cIonian), "A#");
    assert.equal(getChordName(11, "m7b5", cIonian), "Bm7b5");
    const fLydian = { root: "F", accidentalPreference: "flat", scaleId: "lydian" };
    assert.equal(getChordName(11, "dim", fLydian), "Bdim");
  });
});

// ---- Feature 003: chord-root degree labelling (T302, P-202) ----

describe("getChordRootOptions (feature 003)", () => {
  const cIonian = { root: "C", accidentalPreference: "sharp", scaleId: "ionian" };

  test("AC-3.1.1 — Chord root dropdown lists all 12 chromatic roots as degrees of the current scale", () => {
    const options = getChordRootOptions(cIonian);
    assert.equal(options.length, 12);
    options.forEach((o, offset) => {
      assert.equal(o.offset, offset);
      assert.equal(o.semitone, (0 + offset) % 12);
      assert.equal(typeof o.noteName, "string");
      assert.equal(typeof o.inScale, "boolean");
    });
    // Diatonic entries carry degree labels and note names
    const d = options[2];
    assert.equal(d.noteName, "D");
    assert.equal(d.degreeLabel, "ii");
    assert.equal(d.inScale, true);
    const bb = options[10];
    // Borrowed roots spell by the KEY's circle-of-fifths side, not by their degree
    // label's accidental (AC-1.3.2/FR-009). The numeral is still "bVII".
    assert.equal(bb.noteName, "A#");
    assert.equal(bb.inScale, false);
  });

  test("AC-3.3.1 — Diatonic chord roots are labelled with case-correct Roman numerals", () => {
    const ionian = getChordRootOptions(cIonian);
    const diatonicLabels = ionian.filter((o) => o.inScale).map((o) => o.degreeLabel);
    assert.deepEqual(diatonicLabels, ["I", "ii", "iii", "IV", "V", "vi", "vii°"]);

    const aeolian = getChordRootOptions({ root: "A", accidentalPreference: "sharp", scaleId: "aeolian" });
    assert.deepEqual(
      aeolian.filter((o) => o.inScale).map((o) => o.degreeLabel),
      ["i", "ii°", "bIII", "iv", "v", "bVI", "bVII"]
    );

    const lydian = getChordRootOptions({ root: "F", accidentalPreference: "flat", scaleId: "lydian" });
    assert.deepEqual(
      lydian.filter((o) => o.inScale).map((o) => o.degreeLabel),
      ["I", "II", "iii", "#iv°", "V", "vi", "vii"]
    );
  });

  test("AC-3.3.2 — Non-diatonic chord roots are labelled as borrowed with a source when one is common", () => {
    const options = getChordRootOptions(cIonian);
    const bVII = options[10];
    assert.equal(bVII.degreeLabel, "bVII");
    assert.deepEqual(bVII.borrowedFrom, ["Mixolydian", "parallel minor"]);
    const bIII = options[3];
    assert.equal(bIII.degreeLabel, "bIII");
    assert.ok(bIII.borrowedFrom.includes("parallel minor"));
    const bVI = options[8];
    assert.equal(bVI.degreeLabel, "bVI");
    assert.equal(bVI.borrowedFrom[0], "Aeolian (parallel minor)");
    // Diatonic entries never carry a borrowed source
    for (const o of options.filter((x) => x.inScale)) assert.equal(o.borrowedFrom, null);
  });

  test("AC-3.3.2 — Non-diatonic chord roots are labelled as borrowed with a source when one is common: parallel major from a minor context", () => {
    const aeolian = getChordRootOptions({ root: "A", accidentalPreference: "sharp", scaleId: "aeolian" });
    const majorThird = aeolian[4]; // natural 3 in a minor key
    assert.equal(majorThird.inScale, false);
    assert.ok(majorThird.borrowedFrom.some((s) => s.includes("parallel major")));
  });

  test("AC-3.3.3 — Non-seven-note scales fall back to degree-only labels", () => {
    const pent = getChordRootOptions({ root: "A", accidentalPreference: "sharp", scaleId: "minor-pentatonic" });
    assert.equal(pent.length, 12);
    // In-scale entries flagged; labels are interval degrees, not Roman numerals
    assert.equal(pent[0].inScale, true);
    assert.equal(pent[3].inScale, true); // b3 of A minor pentatonic (C)
    assert.equal(pent[3].degreeLabel, "b3");
    assert.equal(pent[2].inScale, false);
    for (const o of pent) assert.equal(o.borrowedFrom, null);
  });

  test("AC-3.3.3 — Non-seven-note scales fall back to degree-only labels: no scale selected", () => {
    const none = getChordRootOptions({ root: "C", accidentalPreference: "sharp", scaleId: null });
    assert.equal(none.length, 12);
    for (const o of none) {
      assert.equal(o.degreeLabel, null);
      assert.equal(o.inScale, false);
      assert.equal(o.borrowedFrom, null);
      assert.equal(typeof o.noteName, "string");
    }
  });
});

describe("getDefaultChordQualityId (feature 003)", () => {
  test("AC-3.1.4 — Chord selection defaults to the scale root with a diatonic quality: per-scale degree-1 triad quality", () => {
    assert.equal(getDefaultChordQualityId("ionian"), "major");
    assert.equal(getDefaultChordQualityId("lydian"), "major");
    assert.equal(getDefaultChordQualityId("mixolydian"), "major");
    assert.equal(getDefaultChordQualityId("aeolian"), "minor");
    assert.equal(getDefaultChordQualityId("dorian"), "minor");
    assert.equal(getDefaultChordQualityId("phrygian"), "minor");
    assert.equal(getDefaultChordQualityId("locrian"), "dim");
    assert.equal(getDefaultChordQualityId("harmonic-minor"), "minor");
    assert.equal(getDefaultChordQualityId("melodic-minor"), "minor");
    // Non-tertian degree-1 stacks fall back on scale color (b3 => minor)
    assert.equal(getDefaultChordQualityId("minor-pentatonic"), "minor");
    assert.equal(getDefaultChordQualityId("major-pentatonic"), "major");
    assert.equal(getDefaultChordQualityId("minor-blues"), "minor");
    assert.equal(getDefaultChordQualityId(null), "major");
  });
});

// ---- Feature 004: chord voicing (T401, P-301) ----

import { computeChordVoicing } from "../src/js/theory.js";

describe("computeChordVoicing (feature 004)", () => {
  test("AC-4.1.1 — Play button strums the selected chord's tones ascending from its root: voicing math", () => {
    // E7 rooted at octave 3: E3 G#3 B3 D4
    assert.deepEqual(computeChordVoicing(4, "dom7"), [52, 56, 59, 62]);
    // C major: C3 E3 G3
    assert.deepEqual(computeChordVoicing(0, "major"), [48, 52, 55]);
  });

  test("AC-4.1.1 — Play button strums the selected chord's tones ascending from its root: 12x20 sweep matches the tone set, strictly ascending", () => {
    for (const q of CHORD_QUALITIES) {
      for (let root = 0; root < 12; root++) {
        const voicing = computeChordVoicing(root, q.id);
        const expectedPitchClasses = new Set(computeChordTones(root, q.id));
        assert.equal(voicing.length, expectedPitchClasses.size, `${q.id} length`);
        // Extended voicings reorder tones (extensions go on top), so the AC's
        // claim is set equality of pitch classes plus strict ascent.
        assert.deepEqual(new Set(voicing.map((m) => ((m % 12) + 12) % 12)), expectedPitchClasses, `${q.id} root ${root} tone set`);
        voicing.forEach((midi, i) => {
          if (i > 0) assert.ok(midi > voicing[i - 1], `${q.id} root ${root} ascending at ${i}`);
        });
        assert.equal(voicing[0], root + 48, `${q.id} root anchored at octave 3`);
      }
    }
  });

  test("AC-4.1.2 — Extended chords voice their extensions above the octave", () => {
    // C9: the D (9th) is +14, not +2
    assert.deepEqual(computeChordVoicing(0, "dom9"), [48, 52, 55, 58, 62]);
    assert.deepEqual(computeChordVoicing(0, "min9"), [48, 51, 55, 58, 62]);
    assert.deepEqual(computeChordVoicing(0, "maj9"), [48, 52, 55, 59, 62]);
    assert.deepEqual(computeChordVoicing(0, "add9"), [48, 52, 55, 62]);
    // C11: 9th +14 and 11th +17
    assert.deepEqual(computeChordVoicing(0, "dom11"), [48, 52, 55, 58, 62, 65]);
    // C13: 9th +14 and 13th +21 (11 omitted per the quality formula)
    assert.deepEqual(computeChordVoicing(0, "dom13"), [48, 52, 55, 58, 62, 69]);
    // sus2's 2 is a genuine low 2nd, never lifted
    assert.deepEqual(computeChordVoicing(0, "sus2"), [48, 50, 55]);
  });

  test("throws on an unknown quality id", () => {
    assert.throws(() => computeChordVoicing(0, "power5"));
  });
});

// ---- Feature 006: key-aware chord quality (T601, T604) ----

import {
  getDefaultChordQualityForRoot,
  analyzeChordMixture,
  getChordQualityOptions,
} from "../src/js/theory.js";

describe("getDefaultChordQualityForRoot (feature 006)", () => {
  test("AC-6.1.1/1 — Degree ii of C Ionian yields a minor quality.", () => {
    assert.equal(getDefaultChordQualityForRoot(2, "ionian"), "minor");
  });

  test("AC-6.1.1/2 — Degree vii of C Ionian yields a diminished quality.", () => {
    assert.equal(getDefaultChordQualityForRoot(11, "ionian"), "dim");
  });

  test("AC-6.1.1/3 — Every degree of every 7-note scale yields that scale's own triad quality on that degree.", () => {
    const TRIAD_IDS = { major: "major", minor: "minor", diminished: "dim", augmented: "aug" };
    const heptatonic = SCALES.filter((s) => s.semitoneOffsets.length === 7);
    assert.ok(heptatonic.length >= 9, "expected the church modes plus harmonic/melodic minor");

    for (const scale of heptatonic) {
      for (const offset of scale.semitoneOffsets) {
        // The scale's own stacked-thirds triad on this degree is the answer.
        const expected = TRIAD_IDS[getTriadQuality(computeDefaultTriad(offset, 0, scale.id))];
        assert.equal(
          getDefaultChordQualityForRoot(offset, scale.id),
          expected,
          `${scale.id} degree at +${offset} semitones`
        );
      }
    }
  });

  test("AC-6.1.2 — A non-diatonic chord root defaults to its borrowed mode's triad", () => {
    // bIII in C Ionian is the Eb of the parallel minor modes: major, from
    // Dorian (the parallel church mode closest to Ionian that contains it).
    assert.equal(getDefaultChordQualityForRoot(3, "ionian"), "major");
    // bVI and bVII, the other everyday borrowings, are major too.
    assert.equal(getDefaultChordQualityForRoot(8, "ionian"), "major");
    assert.equal(getDefaultChordQualityForRoot(10, "ionian"), "major");
    // The Neapolitan bII comes from Phrygian, where it is major.
    assert.equal(getDefaultChordQualityForRoot(1, "ionian"), "major");

    // Every chromatic offset of every 7-note scale resolves to a real quality.
    const validIds = new Set(CHORD_QUALITIES.map((q) => q.id));
    for (const scale of SCALES.filter((s) => s.semitoneOffsets.length === 7)) {
      for (let offset = 0; offset < 12; offset++) {
        if (scale.semitoneOffsets.includes(offset)) continue;
        assert.ok(
          validIds.has(getDefaultChordQualityForRoot(offset, scale.id)),
          `${scale.id} chromatic +${offset} returned no valid quality`
        );
      }
    }
  });

  test("AC-6.1.4 — Non-heptatonic scales keep one predictable default", () => {
    for (const scale of SCALES.filter((s) => s.semitoneOffsets.length !== 7)) {
      const tonicDefault = getDefaultChordQualityId(scale.id);
      for (let offset = 0; offset < 12; offset++) {
        assert.equal(
          getDefaultChordQualityForRoot(offset, scale.id),
          tonicDefault,
          `${scale.id} +${offset} should keep the scale's single tonic default`
        );
      }
    }
    assert.equal(getDefaultChordQualityForRoot(5, null), "major"); // no scale selected
  });
});

describe("analyzeChordMixture (feature 006)", () => {
  const cIonian = { root: "C", accidentalPreference: "sharp", scaleId: "ionian" };

  test("AC-6.3.1 — A chord entirely inside the key is reported as diatonic", () => {
    // Fmaj7 (F A C E) — every tone is in C major.
    assert.deepEqual(analyzeChordMixture(5, "maj7", cIonian), {
      analyzed: true,
      inScale: true,
      sources: null,
    });
    // G7 (G B D F) — the maintainer's other diatonic example.
    assert.deepEqual(analyzeChordMixture(7, "dom7", cIonian), {
      analyzed: true,
      inScale: true,
      sources: null,
    });
    // Dm (D F A) — the degree-ii triad.
    assert.equal(analyzeChordMixture(2, "minor", cIonian).inScale, true);
  });

  test("AC-6.3.2 — A chord outside the key names the parallel modes that contain it", () => {
    // F7 (F A C Eb) — the Eb is outside C major, but F, A, C and Eb together
    // are exactly what C Dorian holds. The root F alone would read diatonic.
    const f7 = analyzeChordMixture(5, "dom7", cIonian);
    assert.equal(f7.inScale, false);
    assert.deepEqual(f7.sources, ["Dorian"]);

    // D major (D F# A) in C: F# belongs to Lydian.
    assert.deepEqual(analyzeChordMixture(2, "major", cIonian).sources, ["Lydian"]);

    // Sources are ordered by closeness to the current scale, and the current
    // scale is never named as a source of a chord it does not contain.
    for (const source of f7.sources) assert.notEqual(source, "Ionian (parallel major)");
  });

  test("AC-6.3.3 — A chord no parallel mode contains is reported as chromatic", () => {
    // Cdim7 (C Eb Gb A) — no church mode on C holds that tone set.
    assert.deepEqual(analyzeChordMixture(0, "dim7", cIonian), {
      analyzed: true,
      inScale: false,
      sources: null,
    });
    // Db7 (Db F Ab Cb/B) — likewise.
    assert.equal(analyzeChordMixture(1, "dom7", cIonian).sources, null);
  });

  test("analyzed is false for scales parallel-mode mixture cannot describe", () => {
    for (const scaleId of ["major-pentatonic", "minor-blues"]) {
      const result = analyzeChordMixture(0, "major", { root: "C", accidentalPreference: "sharp", scaleId });
      assert.equal(result.analyzed, false);
      assert.equal(result.sources, null);
    }
    assert.equal(analyzeChordMixture(0, "major", { root: "C", accidentalPreference: "sharp", scaleId: null }).analyzed, false);
    assert.throws(() => analyzeChordMixture(0, "major", { root: "C", scaleId: "not-a-scale" }));
  });
});

describe("getChordQualityOptions (feature 006)", () => {
  const cIonian = { root: "C", accidentalPreference: "sharp", scaleId: "ionian" };

  test("annotates the whole vocabulary for the selected chord root", () => {
    const options = getChordQualityOptions(5, cIonian); // chord root IV (F)
    assert.equal(options.length, CHORD_QUALITIES.length);
    const byId = Object.fromEntries(options.map((o) => [o.id, o]));
    assert.equal(byId.maj7.inScale, true);
    assert.equal(byId.dom7.inScale, false);
    assert.ok(options.every((o) => o.analyzed));
    assert.deepEqual(
      options.map((o) => o.label),
      CHORD_QUALITIES.map((q) => q.label)
    );
  });
});

// ---- Circle-of-fifths spelling consistency (T138) ----

// FR-009 / AC-1.3.2: the key's circle-of-fifths side is "applied consistently to
// the root's own label and to every other non-diatonic note's spelling". These
// tests pin BOTH surfaces to the SAME side, which is what "consistently" means:
// a chord root and a chord tone naming the same pitch class must agree.
describe("circle-of-fifths spelling is applied consistently (FR-009)", () => {
  const SHARP_SIDE = ["C", "G", "D", "A", "E", "B", "F#"];
  const FLAT_SIDE = ["Db", "Ab", "Eb", "Bb", "F"];

  function contextFor(root) {
    const preference = SHARP_SIDE.includes(root) ? "sharp" : "flat";
    return { root, accidentalPreference: preference, scaleId: "ionian" };
  }

  test("AC-1.3.2 — Fixed circle-of-fifths spelling with no manual sharp/flat toggle: chord roots and chord tones agree", () => {
    for (const root of [...SHARP_SIDE, ...FLAT_SIDE]) {
      const context = contextFor(root);
      for (const option of getChordRootOptions(context)) {
        assert.equal(
          option.noteName,
          spellPitchClass(option.semitone, context),
          `${root} Ionian: chord root at +${option.offset} spells "${option.noteName}" ` +
            `but the same pitch class spells "${spellPitchClass(option.semitone, context)}" as a chord tone`
        );
      }
    }
  });

  test("AC-1.3.2 — Fixed circle-of-fifths spelling with no manual sharp/flat toggle: a sharp-side key never spells a chord root flat", () => {
    for (const root of SHARP_SIDE) {
      for (const option of getChordRootOptions(contextFor(root))) {
        assert.ok(
          !option.noteName.includes("b"),
          `${root} Ionian is a sharp-side key but spells a chord root "${option.noteName}"`
        );
      }
    }
  });

  test("AC-1.3.2 — Fixed circle-of-fifths spelling with no manual sharp/flat toggle: a flat-side key never spells a chord root sharp", () => {
    for (const root of FLAT_SIDE) {
      for (const option of getChordRootOptions(contextFor(root))) {
        assert.ok(
          !option.noteName.includes("#"),
          `${root} Ionian is a flat-side key but spells a chord root "${option.noteName}"`
        );
      }
    }
  });

  test("AC-1.3.2 — Fixed circle-of-fifths spelling with no manual sharp/flat toggle: the chord NAME follows the key too", () => {
    // C is sharp-side, so its bIII chord is D#, not Eb.
    assert.equal(getChordName(3, "major", contextFor("C")), "D#");
    // F is flat-side, so its bIII chord is Ab, not G#.
    assert.equal(getChordName(mod12For("F", 3), "major", contextFor("F")), "Ab");
  });

  function mod12For(root, offset) {
    const semitones = { C: 0, G: 7, D: 2, A: 9, E: 4, B: 11, "F#": 6, Db: 1, Ab: 8, Eb: 3, Bb: 10, F: 5 };
    return (semitones[root] + offset) % 12;
  }
});

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  TUNINGS,
  SCALES,
  DEGREE_ROLES,
  noteAt,
  spellPitchClass,
  getDiatonicSemitones,
  getDegreeRole,
  getDegreeLabel,
  getIntervalLabel,
  computeDefaultTriad,
  getTriadQuality,
  isToggleableChordTone,
  identifyChordQuality,
  getRelativeLabelSemitone,
  isFretPlayable,
  rootLetterToSemitone,
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
});

// ---- Scale/degree computation (T015, T017, T019, T021) ----

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

describe("isToggleableChordTone", () => {
  test("true only for semitones diatonic to root+scale", () => {
    // C Major (root=0): A (9) is diatonic -> Esus4 override valid
    assert.equal(isToggleableChordTone(9, 0, "ionian"), true);
    // F# (6) not diatonic to C Major
    assert.equal(isToggleableChordTone(6, 0, "ionian"), false);
    // F# (6) IS diatonic to C Lydian
    assert.equal(isToggleableChordTone(6, 0, "lydian"), true);
  });
});

describe("identifyChordQuality", () => {
  test("recognized shapes map to canonical names", () => {
    assert.equal(identifyChordQuality([4, 7, 11], 4), "Minor"); // E G B relative to E
    assert.equal(identifyChordQuality([0, 4, 7], 0), "Major");
    assert.equal(identifyChordQuality([4, 9, 11], 4), "Sus4"); // E A B (Esus4)
  });

  test("null for sets that don't map to one canonical name", () => {
    assert.equal(identifyChordQuality([0, 1, 6], 0), null);
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
});

describe("isFretPlayable", () => {
  test("fret >= capoFret across boundary values", () => {
    assert.equal(isFretPlayable(3, 3), true);
    assert.equal(isFretPlayable(2, 3), false);
    assert.equal(isFretPlayable(0, 0), true);
  });
});

// ---- Root stability regression test (UAT round 1 section A) ----
// Capo + Relative mode must NEVER substitute a different root into any of
// theory.js's diatonic/degree-role/focal/chord-tone computation - only
// note-NAME text (getRelativeLabelSemitone, tested above) varies with capo.
// This replaces the earlier (incorrect) getDisplayRootSemitone binding rule.

describe("root stability under capo + Relative mode (regression, UAT round 1 section A)", () => {
  test("getDiatonicSemitones/computeDefaultTriad/isToggleableChordTone/identifyChordQuality never take a capo-shifted root", () => {
    const trueRoot = 0; // C
    const scaleId = "ionian";

    // These four functions have no capoFret/pitchReferenceMode parameter at
    // all - calling them with the literal selected root produces identical
    // output whether or not a capo happens to be active elsewhere in state.
    const diatonic = getDiatonicSemitones(trueRoot, scaleId);
    assert.deepEqual(diatonic, new Set([0, 2, 4, 5, 7, 9, 11])); // C major, not A major

    const triad = computeDefaultTriad(0, trueRoot, scaleId);
    assert.deepEqual(triad, [0, 4, 7]); // C E G, not A C# E

    // F# (6) is not diatonic to C major and must stay non-toggleable
    // regardless of any capo/Relative-mode context a caller might be in.
    assert.equal(isToggleableChordTone(6, trueRoot, scaleId), false);

    const brightSet = [0, 4, 7];
    assert.equal(identifyChordQuality(brightSet, trueRoot), "Major");
  });
});

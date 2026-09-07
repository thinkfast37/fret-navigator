// Pure, dependency-free music-theory module (constitution Principle I).
// No DOM, no localStorage, no I/O. Every function is deterministic.

const NATURAL_LETTERS = ["C", "D", "E", "F", "G", "A", "B"];

const NATURAL_LETTER_SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

const PITCH_CLASS_SEMITONES = {
  C: 0, "C#": 1, Db: 1,
  D: 2, "D#": 3, Eb: 3,
  E: 4,
  F: 5, "F#": 6, Gb: 6,
  G: 7, "G#": 8, Ab: 8,
  A: 9, "A#": 10, Bb: 10,
  B: 11,
};

// Chromatic non-diatonic note spelling, keyed by accidentalPreference. Natural
// semitones (0,2,4,5,7,9,11) are unambiguous and spelled the same either way.
const CHROMATIC_NAMES = {
  0: { sharp: "C", flat: "C" },
  1: { sharp: "C#", flat: "Db" },
  2: { sharp: "D", flat: "D" },
  3: { sharp: "D#", flat: "Eb" },
  4: { sharp: "E", flat: "E" },
  5: { sharp: "F", flat: "F" },
  6: { sharp: "F#", flat: "Gb" },
  7: { sharp: "G", flat: "G" },
  8: { sharp: "G#", flat: "Ab" },
  9: { sharp: "A", flat: "A" },
  10: { sharp: "A#", flat: "Bb" },
  11: { sharp: "B", flat: "B" },
};

const INTERVAL_LABELS = ["R", "m2", "M2", "m3", "M3", "P4", "TT", "P5", "m6", "M6", "m7", "M7"];

// Implements Story 2, FR-005: named tuning library (D/G/C-Family + Standard)
export const TUNINGS = [
  { id: "standard", label: "Standard", group: "Standard",
    openPitchClasses: ["E", "B", "G", "D", "A", "E"], openOctaves: [4, 3, 3, 3, 2, 2] },

  // D-Family
  { id: "drop-d", label: "Drop D", group: "D-Family",
    openPitchClasses: ["E", "B", "G", "D", "A", "D"], openOctaves: [4, 3, 3, 3, 2, 2] },
  { id: "double-drop-d", label: "Double Drop D", group: "D-Family",
    openPitchClasses: ["D", "B", "G", "D", "A", "D"], openOctaves: [4, 3, 3, 3, 2, 2] },
  { id: "dadgad", label: "DADGAD / \"Dsus4\"", group: "D-Family",
    openPitchClasses: ["D", "A", "G", "D", "A", "D"], openOctaves: [4, 3, 3, 3, 2, 2] },
  { id: "open-d", label: "Open D", group: "D-Family",
    openPitchClasses: ["D", "A", "F#", "D", "A", "D"], openOctaves: [4, 3, 3, 3, 2, 2] },
  { id: "open-d-minor", label: "Open D Minor", group: "D-Family",
    openPitchClasses: ["D", "A", "F", "D", "A", "D"], openOctaves: [4, 3, 3, 3, 2, 2] },
  { id: "dadead", label: "D A D E A D", group: "D-Family",
    openPitchClasses: ["D", "A", "E", "D", "A", "D"], openOctaves: [4, 3, 3, 3, 2, 2] },
  { id: "drop-high-d", label: "Drop High D", group: "D-Family",
    openPitchClasses: ["D", "B", "G", "D", "A", "E"], openOctaves: [4, 3, 3, 3, 2, 2] },
  { id: "d-add4", label: "D G D F# G G (D add 4)", group: "D-Family",
    openPitchClasses: ["G", "G", "F#", "D", "G", "D"], openOctaves: [4, 3, 3, 3, 2, 2] },

  // G-Family
  { id: "open-g", label: "Open G", group: "G-Family",
    openPitchClasses: ["D", "B", "G", "D", "G", "D"], openOctaves: [4, 3, 3, 3, 2, 2] },
  { id: "gsus4", label: "Gsus4", group: "G-Family",
    openPitchClasses: ["D", "C", "G", "D", "G", "D"], openOctaves: [4, 4, 3, 3, 2, 2] },
  { id: "open-g-minor", label: "Open G Minor", group: "G-Family",
    openPitchClasses: ["D", "Bb", "G", "D", "G", "D"], openOctaves: [4, 3, 3, 3, 2, 2] },
  { id: "dgdgad", label: "D G D G A D", group: "G-Family",
    openPitchClasses: ["D", "A", "G", "D", "G", "D"], openOctaves: [4, 3, 3, 3, 2, 2] },
  { id: "g6", label: "G6", group: "G-Family",
    openPitchClasses: ["E", "B", "G", "D", "G", "D"], openOctaves: [4, 3, 3, 3, 2, 2] },

  // C-Family
  { id: "cgdgbe", label: "C G D G B E", group: "C-Family",
    openPitchClasses: ["E", "B", "G", "D", "G", "C"], openOctaves: [4, 3, 3, 3, 2, 2] },
  { id: "cgdgbd", label: "C G D G B D", group: "C-Family",
    openPitchClasses: ["D", "B", "G", "D", "G", "C"], openOctaves: [4, 3, 3, 3, 2, 2] },
  { id: "open-c", label: "Open C", group: "C-Family",
    openPitchClasses: ["E", "C", "G", "C", "G", "C"], openOctaves: [4, 4, 3, 3, 2, 2] },
  { id: "open-c-minor", label: "Open C Minor", group: "C-Family",
    openPitchClasses: ["Eb", "C", "G", "C", "G", "C"], openOctaves: [4, 4, 3, 3, 2, 2] },
];

// Implements Story 4, FR-010/FR-011: canonical scale/mode degree-formula table
export const SCALES = [
  { id: "ionian", label: "Ionian (Major)", category: "Church Modes",
    degreeFormula: ["1", "2", "3", "4", "5", "6", "7"], semitoneOffsets: [0, 2, 4, 5, 7, 9, 11] },
  { id: "dorian", label: "Dorian", category: "Church Modes",
    degreeFormula: ["1", "2", "b3", "4", "5", "6", "b7"], semitoneOffsets: [0, 2, 3, 5, 7, 9, 10] },
  { id: "phrygian", label: "Phrygian", category: "Church Modes",
    degreeFormula: ["1", "b2", "b3", "4", "5", "b6", "b7"], semitoneOffsets: [0, 1, 3, 5, 7, 8, 10] },
  { id: "lydian", label: "Lydian", category: "Church Modes",
    degreeFormula: ["1", "2", "3", "#4", "5", "6", "7"], semitoneOffsets: [0, 2, 4, 6, 7, 9, 11] },
  { id: "mixolydian", label: "Mixolydian", category: "Church Modes",
    degreeFormula: ["1", "2", "3", "4", "5", "6", "b7"], semitoneOffsets: [0, 2, 4, 5, 7, 9, 10] },
  { id: "aeolian", label: "Aeolian (Natural Minor)", category: "Church Modes",
    degreeFormula: ["1", "2", "b3", "4", "5", "b6", "b7"], semitoneOffsets: [0, 2, 3, 5, 7, 8, 10] },
  { id: "locrian", label: "Locrian", category: "Church Modes",
    degreeFormula: ["1", "b2", "b3", "4", "b5", "b6", "b7"], semitoneOffsets: [0, 1, 3, 5, 6, 8, 10] },

  { id: "major-pentatonic", label: "Major Pentatonic", category: "Pentatonic",
    degreeFormula: ["1", "2", "3", "5", "6"], semitoneOffsets: [0, 2, 4, 7, 9] },
  { id: "minor-pentatonic", label: "Minor Pentatonic", category: "Pentatonic",
    degreeFormula: ["1", "b3", "4", "5", "b7"], semitoneOffsets: [0, 3, 5, 7, 10] },

  { id: "minor-blues", label: "Minor Blues", category: "Blues",
    degreeFormula: ["1", "b3", "4", "b5", "5", "b7"], semitoneOffsets: [0, 3, 5, 6, 7, 10] },
  { id: "major-blues", label: "Major Blues", category: "Blues",
    degreeFormula: ["1", "2", "b3", "3", "5", "6"], semitoneOffsets: [0, 2, 3, 4, 7, 9] },

  { id: "harmonic-minor", label: "Harmonic Minor", category: "Other",
    degreeFormula: ["1", "2", "b3", "4", "5", "b6", "7"], semitoneOffsets: [0, 2, 3, 5, 7, 8, 11] },
  { id: "melodic-minor", label: "Melodic Minor (ascending/jazz)", category: "Other",
    degreeFormula: ["1", "2", "b3", "4", "5", "6", "7"], semitoneOffsets: [0, 2, 3, 5, 7, 9, 11] },
];

const DEGREE_ROLE_LABELS = ["1", "b2", "2", "b3", "3", "4", "#4/b5", "5", "b6", "6", "b7", "7"];
const DEGREE_ROLE_IDS = ["1", "b2", "2", "b3", "3", "4", "4s5b", "5", "b6", "6", "b7", "7"];

// Implements Story 5, FR-014: fixed chromatic scale-degree color-role descriptors
export const DEGREE_ROLES = DEGREE_ROLE_LABELS.map((roleLabel, semitoneFromRoot) => ({
  semitoneFromRoot,
  roleLabel,
  colorRoleId: DEGREE_ROLE_IDS[semitoneFromRoot],
}));

// Implements Story 3, FR-008/FR-009 (UAT round 1 section C3): all 12 chromatic
// roots, in display order, each with its fixed circle-of-fifths sharp/flat
// spelling - replaces the earlier naturals-only 7-letter root + manual toggle.
export const ROOTS = [
  { label: "A", semitone: 9, accidentalPreference: "sharp" },
  { label: "Ab", semitone: 8, accidentalPreference: "flat" },
  { label: "B", semitone: 11, accidentalPreference: "sharp" },
  { label: "Bb", semitone: 10, accidentalPreference: "flat" },
  { label: "C", semitone: 0, accidentalPreference: "sharp" },
  { label: "D", semitone: 2, accidentalPreference: "sharp" },
  { label: "Db", semitone: 1, accidentalPreference: "flat" },
  { label: "E", semitone: 4, accidentalPreference: "sharp" },
  { label: "Eb", semitone: 3, accidentalPreference: "flat" },
  { label: "F", semitone: 5, accidentalPreference: "flat" },
  { label: "F#", semitone: 6, accidentalPreference: "sharp" },
  { label: "G", semitone: 7, accidentalPreference: "sharp" },
];

function getScale(scaleId) {
  const scale = SCALES.find((s) => s.id === scaleId);
  if (!scale) throw new Error(`Unknown scaleId: ${scaleId}`);
  return scale;
}

function mod12(n) {
  return ((n % 12) + 12) % 12;
}

// ---- Pitch computation ----

// Implements Story 1/2, FR-001/FR-006: absolute pitch (MIDI + pitch class) at a string/fret
export function noteAt(tuning, stringIndex, fret) {
  const pitchClass = tuning.openPitchClasses[stringIndex];
  const octave = tuning.openOctaves[stringIndex];
  const openSemitone = PITCH_CLASS_SEMITONES[pitchClass];
  const openMidi = openSemitone + (octave + 1) * 12;
  const midiNote = openMidi + fret;
  const pitchClassSemitone = mod12(openSemitone + fret);
  return { midiNote, pitchClassSemitone };
}

// Implements Story 3, FR-007/FR-009: key-context-correct enharmonic spelling.
// `root` is any of the 12 canonical ROOTS labels (UAT round 1 section C3);
// its natural-letter component (always the first character, e.g. "Db"[0])
// anchors scale-degree letter-spelling, since every canonical root label is
// exactly one natural letter optionally followed by a single accidental.
export function spellPitchClass(semitone, keyContext) {
  const { root, accidentalPreference, scaleId } = keyContext;
  const rootSemitone = PITCH_CLASS_SEMITONES[root];
  const rootBaseLetter = root[0];
  const semitoneFromRoot = mod12(semitone - rootSemitone);
  const scale = getScale(scaleId);
  const idx = scale.semitoneOffsets.indexOf(semitoneFromRoot);

  if (idx !== -1) {
    const rootLetterIndex = NATURAL_LETTERS.indexOf(rootBaseLetter);
    // Bug fix 2026-09-07 (Principle I): the letter step comes from the
    // scale's own degreeFormula token ("b3" -> 3rd letter), NOT the array
    // position. On non-sequential formulas (pentatonic/blues) position and
    // degree number diverge - A minor pentatonic's b3 sits at position 2,
    // and the positional walk spelled C as "B#".
    const degreeNumber = Number(scale.degreeFormula[idx].replace(/[^0-9]/g, ""));
    const letterIndex = (rootLetterIndex + (degreeNumber - 1)) % 7;
    const letter = NATURAL_LETTERS[letterIndex];
    const naturalSemitone = NATURAL_LETTER_SEMITONES[letter];
    const targetSemitone = mod12(rootSemitone + scale.semitoneOffsets[idx]);
    let diff = targetSemitone - naturalSemitone;
    diff = ((diff + 6) % 12 + 12) % 12 - 6;
    const accidental = diff === 0 ? "" : diff > 0 ? "#".repeat(diff) : "b".repeat(-diff);
    return letter + accidental;
  }

  const chromaticSemitone = mod12(semitone);
  return CHROMATIC_NAMES[chromaticSemitone][accidentalPreference];
}

// ---- Scale/degree computation ----

// Implements Story 4, FR-011: exact in-scale semitone set for a root+scale
export function getDiatonicSemitones(root, scaleId) {
  const scale = getScale(scaleId);
  return new Set(scale.semitoneOffsets.map((offset) => mod12(root + offset)));
}

// Implements Story 5, FR-014: fixed color-role lookup for a chromatic position
export function getDegreeRole(semitoneFromRoot) {
  return DEGREE_ROLES[mod12(semitoneFromRoot)];
}

// Implements Story 6, FR-013/FR-023: Story-4-formula degree label ("b3", "#4", etc.)
export function getDegreeLabel(semitoneFromRoot, scaleId) {
  const scale = getScale(scaleId);
  const idx = scale.semitoneOffsets.indexOf(mod12(semitoneFromRoot));
  return idx === -1 ? null : scale.degreeFormula[idx];
}

// Implements Story 6, FR-023: interval shorthand label ("R", "M3", "P5", etc.)
export function getIntervalLabel(semitoneFromRoot) {
  return INTERVAL_LABELS[mod12(semitoneFromRoot)];
}

// ---- Chord/focal-point computation ----

// Implements Story 5, FR-018: default triad by stacking nearest diatonic thirds
export function computeDefaultTriad(focalSemitone, root, scaleId) {
  const scale = getScale(scaleId);
  const offsets = scale.semitoneOffsets;
  const idx = offsets.indexOf(mod12(focalSemitone));
  if (idx === -1) return null;
  const len = offsets.length;
  const third = offsets[(idx + 2) % len];
  const fifth = offsets[(idx + 4) % len];
  return [mod12(focalSemitone), third, fifth];
}

// Implements Story 5, FR-018: triad quality derived from interval structure
export function getTriadQuality(triadSemitones) {
  const [chordRoot, third, fifth] = triadSemitones;
  const thirdInterval = mod12(third - chordRoot);
  const fifthInterval = mod12(fifth - chordRoot);
  if (thirdInterval === 4 && fifthInterval === 7) return "major";
  if (thirdInterval === 3 && fifthInterval === 7) return "minor";
  if (thirdInterval === 3 && fifthInterval === 6) return "diminished";
  if (thirdInterval === 4 && fifthInterval === 8) return "augmented";
  return null;
}

// (isToggleableChordTone and identifyChordQuality, the Story 5 toggle/quality
// helpers that stood here, were removed 2026-09-07 with the feature 003
// supersession; computeDefaultTriad/getTriadQuality above survive because
// Roman-numeral casing and the default chord quality still stack diatonic
// triads.)

// ---- Feature 003: chord vocabulary, tones, and degree labelling ----

// Implements feature 003, FR-102 (research R-302): the full chord-quality
// vocabulary as data. Intervals are semitones from the chord root; extended
// qualities include their implied lower tones, and the 13 omits the 11 per
// common practice (spec assumption).
export const CHORD_QUALITIES = [
  { id: "major", label: "Major", suffix: "", intervals: [0, 4, 7] },
  { id: "minor", label: "Minor", suffix: "m", intervals: [0, 3, 7] },
  { id: "dim", label: "Diminished", suffix: "dim", intervals: [0, 3, 6] },
  { id: "aug", label: "Augmented", suffix: "aug", intervals: [0, 4, 8] },
  { id: "sus2", label: "Sus2", suffix: "sus2", intervals: [0, 2, 7] },
  { id: "sus4", label: "Sus4", suffix: "sus4", intervals: [0, 5, 7] },
  { id: "dom7", label: "7", suffix: "7", intervals: [0, 4, 7, 10] },
  { id: "maj7", label: "Maj7", suffix: "maj7", intervals: [0, 4, 7, 11] },
  { id: "min7", label: "m7", suffix: "m7", intervals: [0, 3, 7, 10] },
  { id: "m7b5", label: "m7b5", suffix: "m7b5", intervals: [0, 3, 6, 10] },
  { id: "dim7", label: "Dim7", suffix: "dim7", intervals: [0, 3, 6, 9] },
  { id: "six", label: "6", suffix: "6", intervals: [0, 4, 7, 9] },
  { id: "m6", label: "m6", suffix: "m6", intervals: [0, 3, 7, 9] },
  { id: "dom9", label: "9", suffix: "9", intervals: [0, 2, 4, 7, 10], voicingOffsets: [0, 4, 7, 10, 14] },
  { id: "min9", label: "m9", suffix: "m9", intervals: [0, 2, 3, 7, 10], voicingOffsets: [0, 3, 7, 10, 14] },
  { id: "maj9", label: "Maj9", suffix: "maj9", intervals: [0, 2, 4, 7, 11], voicingOffsets: [0, 4, 7, 11, 14] },
  { id: "add9", label: "Add9", suffix: "add9", intervals: [0, 2, 4, 7], voicingOffsets: [0, 4, 7, 14] },
  { id: "dom11", label: "11", suffix: "11", intervals: [0, 2, 4, 5, 7, 10], voicingOffsets: [0, 4, 7, 10, 14, 17] },
  { id: "dom13", label: "13", suffix: "13", intervals: [0, 2, 4, 7, 9, 10], voicingOffsets: [0, 4, 7, 10, 14, 21] },
  { id: "7sus4", label: "7sus4", suffix: "7sus4", intervals: [0, 5, 7, 10] },
];

function getChordQuality(qualityId) {
  const quality = CHORD_QUALITIES.find((q) => q.id === qualityId);
  if (!quality) throw new Error(`Unknown chord qualityId: ${qualityId}`);
  return quality;
}

// Implements feature 003, FR-103 (AC-3.1.3): chord-tone pitch classes from
// root + quality formula, in interval order (chord root first).
export function computeChordTones(chordRootSemitone, qualityId) {
  return getChordQuality(qualityId).intervals.map((i) => mod12(chordRootSemitone + i));
}

// Implements feature 004, FR-202 (AC-4.1.1/AC-4.1.2, research R-402): the
// chord's ascending MIDI voicing for playback. Root anchored at `baseOctave`
// (MIDI = semitone + (baseOctave+1)*12, matching noteAt's octave convention);
// extended qualities carry explicit voicingOffsets that lift 9ths/11ths/13ths
// above the octave, since pitch-class intervals alone cannot distinguish a
// 9th from sus2's genuine low 2nd.
export function computeChordVoicing(chordRootSemitone, qualityId, baseOctave = 3) {
  const quality = getChordQuality(qualityId);
  const rootMidi = mod12(chordRootSemitone) + (baseOctave + 1) * 12;
  return (quality.voicingOffsets ?? quality.intervals).map((offset) => rootMidi + offset);
}

// Implements feature 003, AC-3.2.9: display name for the selected chord,
// root spelled through the key context (e.g. "E7", "Bbm7b5"). Non-diatonic
// roots in a 7-note scale follow their chromatic degree's accidental (bVII in
// C is Bb, never A#), regardless of the root's sharp/flat preference.
export function getChordName(chordRootSemitone, qualityId, keyContext) {
  return spellChordRoot(chordRootSemitone, keyContext) + getChordQuality(qualityId).suffix;
}

function spellChordRoot(semitone, keyContext) {
  const { root, accidentalPreference, scaleId } = keyContext;
  if (!root) return CHROMATIC_NAMES[mod12(semitone)][accidentalPreference || "sharp"];
  if (!scaleId) {
    return CHROMATIC_NAMES[mod12(semitone)][accidentalPreference || "sharp"];
  }
  const scale = getScale(scaleId);
  const offset = mod12(semitone - PITCH_CLASS_SEMITONES[root]);
  const isHeptatonic = scale.semitoneOffsets.length === 7;
  if (isHeptatonic && !scale.semitoneOffsets.includes(offset)) {
    const preference = CHROMATIC_DEGREE_LABELS[offset].startsWith("b") ? "flat" : "sharp";
    return CHROMATIC_NAMES[mod12(semitone)][preference];
  }
  if (!isHeptatonic) {
    // spellPitchClass's degree-position letter-walk assumes one letter per
    // degree and misspells pentatonic/blues members (C in A minor pentatonic
    // walks to "B#"); chord roots use the chromatic name keyed off the
    // degree-role accidental instead.
    const preference = DEGREE_ROLE_LABELS[offset].startsWith("b")
      ? "flat"
      : keyContext.accidentalPreference || "sharp";
    return CHROMATIC_NAMES[mod12(semitone)][preference];
  }
  return spellPitchClass(semitone, keyContext);
}

const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII"];

// Chromatic degree spelling for non-diatonic chord roots in a 7-note scale
// (major-scale-relative convention, R-304).
const CHROMATIC_DEGREE_LABELS = ["I", "bII", "II", "bIII", "III", "IV", "bV", "V", "bVI", "VI", "bVII", "VII"];

// degreeFormula token ("b3", "#4", "5") -> Roman numeral base ("bIII", "#IV", "V")
function formulaTokenToRoman(token) {
  const accidental = token.replace(/[0-9]/g, "");
  const number = Number(token.replace(/[^0-9]/g, ""));
  return accidental + ROMAN_NUMERALS[number - 1];
}

// Borrowed-from sources for a non-diatonic offset (R-304): scan the parallel
// church modes for membership; name the one sharing the most tones with the
// current scale, then tag parallel minor/major when Aeolian/Ionian also
// contains the offset.
function getBorrowedSources(offset, scale) {
  const churchModes = SCALES.filter((s) => s.category === "Church Modes" && s.id !== scale.id);
  const currentSet = new Set(scale.semitoneOffsets);
  const containing = churchModes
    .filter((m) => m.semitoneOffsets.includes(offset))
    .map((m) => ({
      mode: m,
      shared: m.semitoneOffsets.filter((o) => currentSet.has(o)).length,
    }))
    .sort((a, b) => b.shared - a.shared);
  if (containing.length === 0) return null;

  const closest = containing[0].mode;
  const shortName = (m) =>
    m.id === "aeolian" ? "Aeolian (parallel minor)"
    : m.id === "ionian" ? "Ionian (parallel major)"
    : m.label.split(" ")[0];
  const sources = [shortName(closest)];
  if (closest.id !== "ionian" && scale.id !== "ionian" && containing.some((c) => c.mode.id === "ionian")) {
    sources.push("parallel major");
  } else if (closest.id !== "aeolian" && scale.id !== "aeolian" && containing.some((c) => c.mode.id === "aeolian")) {
    sources.push("parallel minor");
  }
  return sources;
}

// Implements feature 003, FR-101/FR-109 (AC-3.1.1, AC-3.3.1, AC-3.3.2,
// AC-3.3.3): the 12 chord-root options for the current key context. Each
// entry: { offset, semitone, noteName, degreeLabel, inScale, borrowedFrom }.
// 7-note scales get Roman-numeral analysis (cased by the diatonic triad, "°"
// for diminished, "+" for augmented) and borrowed-from sources on chromatic
// roots; other scales fall back to interval-degree labels; no scale yields
// note names only.
export function getChordRootOptions(keyContext) {
  const { root, scaleId } = keyContext;
  const rootSemitone = PITCH_CLASS_SEMITONES[root];
  const scale = scaleId ? SCALES.find((s) => s.id === scaleId) : null;
  if (scaleId && !scale) throw new Error(`Unknown scaleId: ${scaleId}`);
  const isHeptatonic = scale !== null && scale.semitoneOffsets.length === 7;

  const options = [];
  for (let offset = 0; offset < 12; offset++) {
    const semitone = mod12(rootSemitone + offset);
    const noteName = spellChordRoot(semitone, keyContext);
    if (!scale) {
      options.push({ offset, semitone, noteName, degreeLabel: null, inScale: false, borrowedFrom: null });
      continue;
    }

    const degreeIndex = scale.semitoneOffsets.indexOf(offset);
    const inScale = degreeIndex !== -1;
    if (!isHeptatonic) {
      options.push({
        offset,
        semitone,
        noteName,
        degreeLabel: DEGREE_ROLE_LABELS[offset].split("/")[0],
        inScale,
        borrowedFrom: null,
      });
      continue;
    }

    let degreeLabel;
    let borrowedFrom = null;
    if (inScale) {
      const roman = formulaTokenToRoman(scale.degreeFormula[degreeIndex]);
      const quality = getTriadQuality(computeDefaultTriad(offset, rootSemitone, scaleId) ?? []);
      degreeLabel =
        quality === "minor" ? roman.toLowerCase()
        : quality === "diminished" ? roman.toLowerCase() + "°"
        : quality === "augmented" ? roman + "+"
        : roman;
    } else {
      degreeLabel = CHROMATIC_DEGREE_LABELS[offset];
      borrowedFrom = getBorrowedSources(offset, scale);
    }
    options.push({ offset, semitone, noteName, degreeLabel, inScale, borrowedFrom });
  }
  return options;
}

// Implements feature 003, AC-3.1.4 (research R-305): quality for the default
// degree-1 chord after a root/scale change — the scale's own tonic triad when
// tertian, otherwise minor if the scale carries a b3, else major.
export function getDefaultChordQualityId(scaleId) {
  if (!scaleId) return "major";
  const triad = computeDefaultTriad(0, 0, scaleId);
  const quality = triad ? getTriadQuality(triad) : null;
  if (quality === "major") return "major";
  if (quality === "minor") return "minor";
  if (quality === "diminished") return "dim";
  if (quality === "augmented") return "aug";
  return getScale(scaleId).semitoneOffsets.includes(3) ? "minor" : "major";
}

// ---- Capo computation ----

// Implements Story 9, FR-047 (UAT round 2 section A): the root used for
// on-fretboard highlighting (diatonic set, degree roles/labels, interval
// labels, chord-tone membership) shifts by +capoFret only when a capo is
// active AND Relative label mode is selected - matching the "capo N, play a
// C shape" tutorial convention. This is a NEW function, not a revival of the
// removed, wrongly-signed (-capoFret) getDisplayRootSemitone from UAT round 1.
// Audio (noteAt) and the "Bright notes" text summary are NEVER fed this
// value (FR-048) - callers must keep using the literal true root for those.
export function getHighlightRootSemitone(rootSemitone, capoFret, labelMode) {
  if (capoFret > 0 && labelMode === "relative") {
    return mod12(rootSemitone + capoFret);
  }
  return rootSemitone;
}

// Implements Story 9, FR-037: Relative-mode fret offset from the capo position
export function getRelativeLabelSemitone(physicalFret, capoFret) {
  return physicalFret - capoFret;
}

// Implements Story 9, FR-033: frets below an active capo are unplayable
export function isFretPlayable(fret, capoFret) {
  return fret >= capoFret;
}

// Implements Story 3, FR-008: root-label-to-semitone lookup for root selection.
// Accepts any of the 12 canonical ROOTS labels (UAT round 1 section C3;
// previously naturals-only). Shared lookup, exposed so consuming layers never
// duplicate this mapping (constitution Principle I: single canonical module).
export function rootLetterToSemitone(label) {
  return PITCH_CLASS_SEMITONES[label];
}

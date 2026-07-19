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

// Implements Story 3, FR-007/FR-009: key-context-correct enharmonic spelling
export function spellPitchClass(semitone, keyContext) {
  const { root, accidentalPreference, scaleId } = keyContext;
  const rootSemitone = NATURAL_LETTER_SEMITONES[root];
  const semitoneFromRoot = mod12(semitone - rootSemitone);
  const scale = getScale(scaleId);
  const idx = scale.semitoneOffsets.indexOf(semitoneFromRoot);

  if (idx !== -1) {
    const rootLetterIndex = NATURAL_LETTERS.indexOf(root);
    const degreeNumber = idx + 1; // 1-based scale-degree position
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

// Implements Story 5, FR-020: gates chord-tone toggles to diatonic-only positions
export function isToggleableChordTone(semitoneFromRoot, root, scaleId) {
  const absolute = mod12(root + semitoneFromRoot);
  return getDiatonicSemitones(root, scaleId).has(absolute);
}

const CHORD_SHAPES = [
  { intervals: [0, 4, 7], name: "Major" },
  { intervals: [0, 3, 7], name: "Minor" },
  { intervals: [0, 3, 6], name: "Diminished" },
  { intervals: [0, 4, 8], name: "Augmented" },
  { intervals: [0, 5, 7], name: "Sus4" },
  { intervals: [0, 2, 7], name: "Sus2" },
];

// Implements Story 5, FR-021: recognized chord-quality label for a bright note set
export function identifyChordQuality(brightSetSemitones, root) {
  const intervals = [...new Set(brightSetSemitones.map((s) => mod12(s - root)))].sort((a, b) => a - b);
  const match = CHORD_SHAPES.find(
    (shape) =>
      shape.intervals.length === intervals.length &&
      shape.intervals.every((v, i) => v === intervals[i])
  );
  return match ? match.name : null;
}

// ---- Capo computation ----

// Implements Story 9, FR-037: Relative-mode fret offset from the capo position
export function getRelativeLabelSemitone(physicalFret, capoFret) {
  return physicalFret - capoFret;
}

// Implements Story 9, FR-033: frets below an active capo are unplayable
export function isFretPlayable(fret, capoFret) {
  return fret >= capoFret;
}

// Implements Story 3, FR-008: natural-letter-to-semitone lookup for root selection
// Shared natural-letter-to-semitone lookup, exposed so consuming layers never
// duplicate this mapping (constitution Principle I: single canonical module).
export function rootLetterToSemitone(letter) {
  return NATURAL_LETTER_SEMITONES[letter];
}

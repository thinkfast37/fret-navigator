// App state shape, defaults, and localStorage load/save/migrate.
// Owns the `fret-navigator-settings` localStorage key exclusively (FR-039, FR-040).

import { getDiatonicSemitones, rootLetterToSemitone, ROOTS } from "./theory.js";

const STORAGE_KEY = "fret-navigator-settings";
const SCHEMA_VERSION = 1;

// UAT round 1 section C3: all 12 canonical roots, not naturals-only.
const VALID_ROOTS = ROOTS.map((r) => r.label);
const ROOT_ACCIDENTAL_PREFERENCE = Object.fromEntries(ROOTS.map((r) => [r.label, r.accidentalPreference]));
const LABEL_MODES = ["notes", "degrees", "intervals"];
const ACCIDENTAL_PREFERENCES = ["sharp", "flat"];
const CAPO_LABEL_MODES = ["absolute", "relative"];

function defaultState() {
  return {
    tuning: { presetId: "standard", customOpenPitchClasses: null, customOpenOctaves: null },
    // Feature 002-default-root-scale: default to C Ionian so a first-time
    // visitor sees the fretboard highlighted immediately instead of blank.
    root: "C",
    accidentalPreference: "sharp",
    scaleId: "ionian",
    focalDegreeSemitone: 0,
    chordToneOverrides: [],
    labelMode: "notes",
    capoFret: 0,
    capoLabelMode: "absolute",
    fretRange: { lowerBound: 0, upperBound: 24 },
  };
}

let state = defaultState();

// Implements Story 1 foundational state shape: single source-of-truth app state tuple
export function getState() {
  return state;
}

// ---- Setters (each mutates in-memory state and persists) ----

// Implements Story 2, FR-006: tuning change triggers full recalculation
export function setTuning(presetId, customOpenPitchClasses = null, customOpenOctaves = null) {
  state.tuning = { presetId, customOpenPitchClasses, customOpenOctaves };
  save();
}

// Edge Case: switching root or scale/mode resets focal point to the new root
// (degree 1) and clears any custom chord-tone override, since degree-role
// assignment is fully recalculated from scratch (Story 5).
function resetFocalPointAndOverrides() {
  state.focalDegreeSemitone = 0;
  state.chordToneOverrides = [];
}

// Implements Story 3, FR-008/FR-009; Edge Case (focal/override reset on root change)
// accidentalPreference is derived automatically from the selected root's
// circle-of-fifths convention (UAT round 1 section C3) - there is no
// independent user-facing sharp/flat toggle anymore.
export function setRoot(root) {
  state.root = root;
  state.accidentalPreference = ROOT_ACCIDENTAL_PREFERENCE[root];
  resetFocalPointAndOverrides();
  save();
}

// Implements Story 4, FR-012; Edge Case (focal/override reset on scale change)
export function setScaleId(scaleId) {
  state.scaleId = scaleId;
  resetFocalPointAndOverrides();
  save();
}

// Implements Story 5, FR-017: focal-point selection
export function setFocalDegreeSemitone(semitone) {
  state.focalDegreeSemitone = semitone;
  save();
}

// Implements Story 5, FR-020: custom chord-tone bright-set override
export function setChordToneOverride(semitone, on) {
  const existing = state.chordToneOverrides.find((o) => o.semitone === semitone);
  if (existing) {
    existing.on = on;
  } else {
    state.chordToneOverrides.push({ semitone, on });
  }
  save();
}

// Implements Story 6, FR-023: Notes/Degrees/Intervals label-mode selection
export function setLabelMode(labelMode) {
  state.labelMode = labelMode;
  save();
}

// Implements Story 9, FR-033/FR-035/FR-036, FR-044 (UAT round 1 section C2):
// capo position + fret-range handle lock. The left handle snaps to the new
// capo fret; the right handle shifts by that same delta so the previously
// -visible WIDTH is preserved, clamped to a maximum of 24 (capoFret's own
// 0-12 range guarantees the clamped value never falls below the new left
// handle, so no separate floor is needed).
export function setCapoFret(capoFret) {
  const { lowerBound, upperBound } = state.fretRange;
  const delta = capoFret - lowerBound;
  state.capoFret = capoFret;
  state.fretRange = {
    lowerBound: capoFret,
    upperBound: Math.min(24, upperBound + delta),
  };
  save();
}

// Implements Story 9, FR-037: Absolute/Relative label-mode selection
export function setCapoLabelMode(mode) {
  state.capoLabelMode = mode;
  save();
}

// Implements Story 7, FR-025/FR-026: fret-range slider bounds
export function setFretRange(lowerBound, upperBound) {
  let lower = Math.max(0, Math.min(24, lowerBound));
  let upper = Math.max(0, Math.min(24, upperBound));
  if (lower > upper) [lower, upper] = [upper, lower];
  if (state.capoFret > 0) lower = state.capoFret;
  state.fretRange = { lowerBound: lower, upperBound: upper };
  save();
}

// ---- Chord-tone override pruning (Edge Case: non-diatonic overrides dropped) ----

function pruneChordToneOverrides() {
  if (!state.root || !state.scaleId) {
    state.chordToneOverrides = [];
    return;
  }
  const rootSemitone = rootLetterToSemitone(state.root);
  const diatonic = getDiatonicSemitones(rootSemitone, state.scaleId);
  state.chordToneOverrides = state.chordToneOverrides.filter((o) =>
    diatonic.has(((rootSemitone + o.semitone) % 12 + 12) % 12)
  );
}

// ---- Validation ----

function isValidTuning(tuning) {
  if (typeof tuning !== "object" || tuning === null) return false;
  if (typeof tuning.presetId !== "string") return false;
  if (tuning.presetId === "custom") {
    if (!Array.isArray(tuning.customOpenPitchClasses) || tuning.customOpenPitchClasses.length !== 6) return false;
    if (!Array.isArray(tuning.customOpenOctaves) || tuning.customOpenOctaves.length !== 6) return false;
  }
  return true;
}

function isValidFretRange(range) {
  if (typeof range !== "object" || range === null) return false;
  const { lowerBound, upperBound } = range;
  if (!Number.isInteger(lowerBound) || lowerBound < 0 || lowerBound > 24) return false;
  if (!Number.isInteger(upperBound) || upperBound < 0 || upperBound > 24) return false;
  if (lowerBound > upperBound) return false;
  return true;
}

function isValidChordToneOverrides(overrides) {
  if (!Array.isArray(overrides)) return false;
  return overrides.every(
    (o) =>
      typeof o === "object" &&
      o !== null &&
      Number.isInteger(o.semitone) &&
      o.semitone >= 0 &&
      o.semitone <= 11 &&
      typeof o.on === "boolean"
  );
}

function isValidStoredState(data) {
  if (typeof data !== "object" || data === null) return false;
  if (data.schemaVersion !== SCHEMA_VERSION) return false;
  if (!isValidTuning(data.tuning)) return false;
  if (data.root !== null && !VALID_ROOTS.includes(data.root)) return false;
  if (!ACCIDENTAL_PREFERENCES.includes(data.accidentalPreference)) return false;
  if (data.scaleId !== null && typeof data.scaleId !== "string") return false;
  if (!Number.isInteger(data.focalDegreeSemitone) || data.focalDegreeSemitone < 0 || data.focalDegreeSemitone > 11) return false;
  if (!isValidChordToneOverrides(data.chordToneOverrides)) return false;
  if (!LABEL_MODES.includes(data.labelMode)) return false;
  if (!Number.isInteger(data.capoFret) || data.capoFret < 0 || data.capoFret > 12) return false;
  if (!CAPO_LABEL_MODES.includes(data.capoLabelMode)) return false;
  if (!isValidFretRange(data.fretRange)) return false;
  if (data.capoFret > 0 && data.fretRange.lowerBound !== data.capoFret) return false;
  return true;
}

// ---- Migration (append-only, idempotent; no prior versions exist yet) ----

function migrate(data) {
  return data;
}

// ---- Persistence ----

// Implements FR-039/FR-040: persist settings to localStorage with schemaVersion
export function save() {
  const payload = { schemaVersion: SCHEMA_VERSION, ...state };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

// Implements FR-039/FR-040: restore + validate + migrate persisted settings on load
export function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    state = defaultState();
    return state;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    state = defaultState();
    return state;
  }

  if (typeof parsed.schemaVersion !== "number" || parsed.schemaVersion < SCHEMA_VERSION) {
    parsed = migrate(parsed);
  }

  if (!isValidStoredState(parsed)) {
    state = defaultState();
    return state;
  }

  const { schemaVersion, ...rest } = parsed;
  state = rest;
  pruneChordToneOverrides();
  return state;
}

// App state shape, defaults, and localStorage load/save/migrate.
// Owns the `fret-navigator-settings` localStorage key exclusively (FR-039, FR-040).

import { ROOTS, CHORD_QUALITIES, getDefaultChordQualityId, getDefaultChordQualityForRoot } from "./theory.js";

const STORAGE_KEY = "fret-navigator-settings";
const SCHEMA_VERSION = 2;

// UAT round 1 section C3: all 12 canonical roots, not naturals-only.
const VALID_ROOTS = ROOTS.map((r) => r.label);
const ROOT_ACCIDENTAL_PREFERENCE = Object.fromEntries(ROOTS.map((r) => [r.label, r.accidentalPreference]));
const LABEL_MODES = ["notes", "degrees", "intervals"];
const ACCIDENTAL_PREFERENCES = ["sharp", "flat"];
const CAPO_LABEL_MODES = ["absolute", "relative"];
const VIEW_MODES = ["scale", "chord"];
const VALID_CHORD_QUALITY_IDS = CHORD_QUALITIES.map((q) => q.id);

function defaultState() {
  return {
    tuning: { presetId: "standard", customOpenPitchClasses: null, customOpenOctaves: null },
    // Feature 002-default-root-scale: default to C Ionian so a first-time
    // visitor sees the fretboard highlighted immediately instead of blank.
    root: "C",
    accidentalPreference: "sharp",
    scaleId: "ionian",
    // Feature 003 (AC-3.1.4): chord selection defaults to the scale root with
    // the scale's own tonic-triad quality; the fretboard starts in Scale view.
    chordRootOffset: 0,
    chordQualityId: getDefaultChordQualityId("ionian"),
    viewMode: "scale",
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

// Feature 003 (AC-3.1.4, mirrors the old focal-point reset rule): switching
// root or scale/mode resets the chord selection to degree I with the new
// scale's own tonic-triad quality.
function resetChordSelection() {
  state.chordRootOffset = 0;
  state.chordQualityId = getDefaultChordQualityId(state.scaleId);
}

// Implements Story 3, FR-008/FR-009; Edge Case (focal/override reset on root change)
// accidentalPreference is derived automatically from the selected root's
// circle-of-fifths convention (UAT round 1 section C3) - there is no
// independent user-facing sharp/flat toggle anymore.
export function setRoot(root) {
  state.root = root;
  state.accidentalPreference = ROOT_ACCIDENTAL_PREFERENCE[root];
  resetChordSelection();
  save();
}

// Implements Story 4, FR-012; feature 003 AC-3.1.4 (chord reset on scale change)
export function setScaleId(scaleId) {
  state.scaleId = scaleId;
  resetChordSelection();
  save();
}

// Implements feature 003, FR-101 (AC-3.1.1) + feature 006, FR-401 (AC-6.1.1,
// AC-6.1.2): chord root as a degree offset (semitones above the scale root,
// 0-11). Choosing a root now also snaps the quality to the one that root
// carries in the current key — the diatonic triad for a scale degree, the
// borrowed parallel mode's triad for a chromatic one. Picking degree ii in C
// Ionian gives D minor, not the D major that a stale quality left behind. The
// quality selector still overrides it freely (AC-3.1.2), and that override
// survives until the root, scale or key changes (AC-6.1.3).
export function setChordRootOffset(offset) {
  state.chordRootOffset = offset;
  state.chordQualityId = getDefaultChordQualityForRoot(offset, state.scaleId);
  save();
}

// Implements feature 003, FR-102 (AC-3.1.2): chord quality selection
export function setChordQualityId(qualityId) {
  state.chordQualityId = qualityId;
  save();
}

// Implements feature 003, FR-104 (AC-3.2.1): Scale/Chord view mode
export function setViewMode(viewMode) {
  state.viewMode = viewMode;
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

function isValidStoredState(data) {
  if (typeof data !== "object" || data === null) return false;
  if (data.schemaVersion !== SCHEMA_VERSION) return false;
  if (!isValidTuning(data.tuning)) return false;
  if (data.root !== null && !VALID_ROOTS.includes(data.root)) return false;
  if (!ACCIDENTAL_PREFERENCES.includes(data.accidentalPreference)) return false;
  if (data.scaleId !== null && typeof data.scaleId !== "string") return false;
  if (!Number.isInteger(data.chordRootOffset) || data.chordRootOffset < 0 || data.chordRootOffset > 11) return false;
  if (!VALID_CHORD_QUALITY_IDS.includes(data.chordQualityId)) return false;
  if (!VIEW_MODES.includes(data.viewMode)) return false;
  if (!LABEL_MODES.includes(data.labelMode)) return false;
  if (!Number.isInteger(data.capoFret) || data.capoFret < 0 || data.capoFret > 12) return false;
  if (!CAPO_LABEL_MODES.includes(data.capoLabelMode)) return false;
  if (!isValidFretRange(data.fretRange)) return false;
  if (data.capoFret > 0 && data.fretRange.lowerBound !== data.capoFret) return false;
  return true;
}

// ---- Migration (append-only, idempotent) ----

// v1 -> v2 (feature 003, AC-3.1.6 / research R-307): the focal-point fields
// describe UI that no longer exists and cannot be mapped onto a named chord
// reliably, so they are dropped; the chord selection starts at the degree-I
// default for the stored scale. Every surviving v1 field passes through.
function migrateV1ToV2(data) {
  const { focalDegreeSemitone, chordToneOverrides, ...rest } = data;
  let chordQualityId;
  try {
    chordQualityId = getDefaultChordQualityId(typeof rest.scaleId === "string" ? rest.scaleId : null);
  } catch {
    chordQualityId = "major"; // unknown scaleId: post-migration validation rejects the payload anyway
  }
  return {
    ...rest,
    schemaVersion: 2,
    chordRootOffset: 0,
    chordQualityId,
    viewMode: "scale",
  };
}

function migrate(data) {
  if (data.schemaVersion === 1) data = migrateV1ToV2(data);
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
  return state;
}

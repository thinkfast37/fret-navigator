// Inline SVG construction + per-note attribute/class updates driven by state.
// Visual state is a pure function of the current app state (constitution Principle II).

import * as theory from "./theory.js";
import * as state from "./state.js";
import * as audio from "./audio.js";

const ALL_ROLE_IDS = ["1", "b2", "2", "b3", "3", "4", "4s5b", "5", "b6", "6", "b7", "7"];

const STRING_COUNT = 6;
const FRET_COUNT = 24; // frets 1-24; fret 0 is the open string
const MARGIN = 24;
const OPEN_COL_WIDTH = 56;
const FRET_COL_WIDTH = 44;
const ROW_HEIGHT = 40;
const NOTE_RADIUS = 14;

const SINGLE_DOT_FRETS = new Set([3, 5, 7, 9, 15, 17, 19, 21]);
const DOUBLE_DOT_FRETS = new Set([12, 24]);

const svgWidth = MARGIN * 2 + OPEN_COL_WIDTH + FRET_COUNT * FRET_COL_WIDTH;
const svgHeight = MARGIN * 2 + STRING_COUNT * ROW_HEIGHT;

let initialized = false;
const noteElements = new Map(); // "s{stringIndex}-f{fret}" -> { g, circle, text }

function fretX(fret) {
  if (fret === 0) return MARGIN + OPEN_COL_WIDTH / 2;
  return MARGIN + OPEN_COL_WIDTH + (fret - 0.5) * FRET_COL_WIDTH;
}

function stringY(stringIndex) {
  return MARGIN + stringIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
}

function mod12(n) {
  return ((n % 12) + 12) % 12;
}

// Default focal triad merged with user chord-tone overrides -> Set of
// root-relative semitones (0=key root) currently in the "bright" set.
export function computeActiveBrightSet(appState) {
  const rootSemitone = appState.root ? theory.rootLetterToSemitone(appState.root) : null;
  if (rootSemitone === null || !appState.scaleId) return new Set();

  const defaultTriad = theory.computeDefaultTriad(
    appState.focalDegreeSemitone,
    rootSemitone,
    appState.scaleId
  );
  const brightSet = new Set(defaultTriad || []);
  for (const override of appState.chordToneOverrides) {
    if (override.on) brightSet.add(override.semitone);
    else brightSet.delete(override.semitone);
  }
  return brightSet;
}

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value);
  }
  return el;
}

// Every fret click/tap plays its true sounding pitch (FR-028). Only
// diatonically-colored notes additionally become the new focal point
// (FR-017) - non-diatonic notes still play audio, just don't affect focus.
function onNoteActivated(g) {
  audio.play(Number(g.dataset.midiNote));

  if (!g.classList.contains("is-diatonic")) return;
  const appState = state.getState();
  const rootSemitone = theory.rootLetterToSemitone(appState.root);
  const pitchClassSemitone = Number(g.dataset.pitchClassSemitone);
  const semitoneFromRoot = mod12(pitchClassSemitone - rootSemitone);
  state.setFocalDegreeSemitone(semitoneFromRoot);
  render(state.getState());
}

function resolveTuning(state) {
  if (state.tuning.presetId === "custom") {
    return {
      id: "custom",
      openPitchClasses: state.tuning.customOpenPitchClasses,
      openOctaves: state.tuning.customOpenOctaves,
    };
  }
  return theory.TUNINGS.find((t) => t.id === state.tuning.presetId);
}

function buildSkeleton() {
  const svg = document.getElementById("fretboard");
  svg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
  svg.textContent = "";

  const background = svgEl("g", { class: "fretboard-background" });
  svg.appendChild(background);

  // String lines
  for (let s = 0; s < STRING_COUNT; s++) {
    const y = stringY(s);
    background.appendChild(
      svgEl("line", {
        class: "string-line",
        x1: MARGIN + OPEN_COL_WIDTH,
        y1: y,
        x2: svgWidth - MARGIN,
        y2: y,
      })
    );
  }

  // Nut line (boundary between open-string column and fret 1)
  background.appendChild(
    svgEl("line", {
      class: "nut-line",
      x1: MARGIN + OPEN_COL_WIDTH,
      y1: MARGIN,
      x2: MARGIN + OPEN_COL_WIDTH,
      y2: svgHeight - MARGIN,
    })
  );

  // Fret lines
  for (let f = 1; f <= FRET_COUNT; f++) {
    const x = MARGIN + OPEN_COL_WIDTH + f * FRET_COL_WIDTH;
    background.appendChild(
      svgEl("line", { class: "fret-line", x1: x, y1: MARGIN, x2: x, y2: svgHeight - MARGIN })
    );
  }

  // Inlay markers, centered vertically between string rows
  const midY = MARGIN + (STRING_COUNT * ROW_HEIGHT) / 2;
  const thirdY1 = MARGIN + (STRING_COUNT * ROW_HEIGHT) / 3;
  const thirdY2 = MARGIN + (2 * STRING_COUNT * ROW_HEIGHT) / 3;
  for (let f = 1; f <= FRET_COUNT; f++) {
    const cx = fretX(f);
    if (DOUBLE_DOT_FRETS.has(f)) {
      background.appendChild(svgEl("circle", { class: "inlay-dot", cx, cy: thirdY1, r: 5 }));
      background.appendChild(svgEl("circle", { class: "inlay-dot", cx, cy: thirdY2, r: 5 }));
    } else if (SINGLE_DOT_FRETS.has(f)) {
      background.appendChild(svgEl("circle", { class: "inlay-dot", cx, cy: midY, r: 5 }));
    }
  }

  // Note groups: one per string x fret (0-24)
  const notesLayer = svgEl("g", { class: "notes-layer" });
  svg.appendChild(notesLayer);

  for (let s = 0; s < STRING_COUNT; s++) {
    for (let f = 0; f <= FRET_COUNT; f++) {
      const key = `s${s}-f${f}`;
      const g = svgEl("g", {
        class: f === 0 ? "note open-string" : "note",
        id: `note-${key}`,
        "data-string": s,
        "data-fret": f,
        tabindex: "0",
        role: "button",
      });
      const circle = svgEl("circle", {
        class: "note-marker",
        cx: fretX(f),
        cy: stringY(s),
        r: NOTE_RADIUS,
      });
      const text = svgEl("text", {
        class: "note-label",
        x: fretX(f),
        y: stringY(s),
      });
      g.appendChild(circle);
      g.appendChild(text);
      notesLayer.appendChild(g);
      noteElements.set(key, { g, circle, text });

      const activate = () => onNoteActivated(g);
      g.addEventListener("click", activate);
      g.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate();
        }
      });
    }
  }
}

function effectiveKeyContext(state) {
  return {
    root: state.root || "C",
    accidentalPreference: state.accidentalPreference,
    scaleId: state.scaleId || "ionian",
  };
}

function updateNotes(state) {
  const tuning = resolveTuning(state);
  const keyContext = effectiveKeyContext(state);

  const rootSemitone = state.root ? theory.rootLetterToSemitone(state.root) : null;
  const diatonicSemitones =
    rootSemitone !== null && state.scaleId
      ? theory.getDiatonicSemitones(rootSemitone, state.scaleId)
      : new Set();
  const activeBrightSet = computeActiveBrightSet(state);

  for (let s = 0; s < STRING_COUNT; s++) {
    for (let f = 0; f <= FRET_COUNT; f++) {
      const key = `s${s}-f${f}`;
      const { g, text } = noteElements.get(key);
      const { midiNote, pitchClassSemitone } = theory.noteAt(tuning, s, f);

      const isRoot = rootSemitone !== null && pitchClassSemitone === rootSemitone;
      const isDiatonic = diatonicSemitones.has(pitchClassSemitone);
      const semitoneFromRoot = rootSemitone !== null ? mod12(pitchClassSemitone - rootSemitone) : null;
      const isFocalChordTone = isDiatonic && activeBrightSet.has(semitoneFromRoot);

      const noteName = theory.spellPitchClass(pitchClassSemitone, keyContext);
      let label = noteName; // base layer: note name, always shown for non-diatonic notes
      if (isDiatonic && state.labelMode === "degrees") {
        label = theory.getDegreeLabel(semitoneFromRoot, state.scaleId);
      } else if (isDiatonic && state.labelMode === "intervals") {
        label = theory.getIntervalLabel(semitoneFromRoot);
      }

      const isVisibleInRange = f >= state.fretRange.lowerBound && f <= state.fretRange.upperBound;

      g.classList.toggle("is-root", isRoot);
      g.classList.toggle("is-diatonic", isDiatonic);
      g.classList.toggle("is-bright", isFocalChordTone);
      g.classList.toggle("fret-hidden", !isVisibleInRange);
      g.setAttribute("tabindex", isVisibleInRange ? "0" : "-1");

      for (const roleId of ALL_ROLE_IDS) g.classList.remove(`role-${roleId}`);
      if (isDiatonic) {
        const role = theory.getDegreeRole(semitoneFromRoot);
        g.classList.add(`role-${role.colorRoleId}`);
      }

      text.textContent = label;
      g.setAttribute(
        "aria-label",
        `${label}${isRoot ? ", root" : ""}${isFocalChordTone ? ", chord tone" : isDiatonic ? ", in scale" : ""}, fret ${f === 0 ? "open" : f}, string ${s + 1}`
      );
      g.dataset.midiNote = midiNote;
      g.dataset.pitchClassSemitone = pitchClassSemitone;
    }
  }
}

const afterRenderHooks = [];

// Lets controls.js keep dependent UI (e.g. the chord-info panel) in sync with
// every render, including ones triggered by fretboard.js's own note clicks,
// without fretboard.js importing controls.js (avoids a circular import).
export function onAfterRender(fn) {
  afterRenderHooks.push(fn);
}

export function render(appState) {
  if (!initialized) {
    buildSkeleton();
    initialized = true;
  }
  updateNotes(appState);
  for (const fn of afterRenderHooks) fn(appState);
}

// Inline SVG construction + per-note attribute/class updates driven by state.
// Visual state is a pure function of the current app state (constitution Principle II).

import * as theory from "./theory.js";

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

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value);
  }
  return el;
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

  for (let s = 0; s < STRING_COUNT; s++) {
    for (let f = 0; f <= FRET_COUNT; f++) {
      const key = `s${s}-f${f}`;
      const { g, text } = noteElements.get(key);
      const { midiNote, pitchClassSemitone } = theory.noteAt(tuning, s, f);
      const label = theory.spellPitchClass(pitchClassSemitone, keyContext);

      const rootSemitone = state.root ? theory.rootLetterToSemitone(state.root) : null;
      const isRoot = rootSemitone !== null && pitchClassSemitone === rootSemitone;
      g.classList.toggle("is-root", isRoot);

      text.textContent = label;
      g.setAttribute(
        "aria-label",
        `${label}${isRoot ? ", root" : ""}, fret ${f === 0 ? "open" : f}, string ${s + 1}`
      );
      g.dataset.midiNote = midiNote;
    }
  }
}

export function render(state) {
  if (!initialized) {
    buildSkeleton();
    initialized = true;
  }
  updateNotes(state);
}

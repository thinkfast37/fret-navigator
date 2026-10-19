// Feature 008: the piano keyboard, drawn into the same single board view as the fretboard
// (constitution Principle II — the keyboard replaces the fretboard, never sits beside
// it). fretboard.render() dispatches here when the selected instrument is a keyboard and
// hands over the highlight rules it shares with the fretboard (FR-604), so this module
// never re-derives a root, scale or chord membership.

import * as theory from "./theory.js";
import * as audio from "./audio.js";

const WHITE_KEY_WIDTH = 28;
const WHITE_KEY_HEIGHT = 140;
const BLACK_KEY_WIDTH = 16;
const BLACK_KEY_HEIGHT = 88;
const MARGIN = 12;
const ROW_GAP = 24;
// Feature 008, AC-8.2.4 (revised, R-903): the black band across middle C's tip.
const MIDDLE_C_TIP_HEIGHT = 6;
const WHITE_MARKER_RADIUS = 11;
const BLACK_MARKER_RADIUS = 7.5;

// Implements feature 008, AC-8.2.4: middle C (C4) in this app's MIDI convention, the key
// every size includes and the one marked.
export const MIDDLE_C_MIDI = 60;

// Implements feature 008, FR-606 (AC-8.3.1, AC-8.3.2): the narrowest on-screen white key
// still comfortable to tap (research R-803). Below it, the keyboard wraps to two rows.
export const MIN_WHITE_KEY_PX = 22;

let renderedLayout = null; // "keyCount:rowCount" of the keys currently in the SVG
let renderedRowCount = 0;
const keyElements = new Map(); // midiNote -> { key, note, marker, label }

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}

function availableWidth() {
  return document.getElementById("fretboard-container")?.clientWidth || 0;
}

// Implements feature 008, FR-606 (AC-8.3.1, AC-8.3.2): one row when every white key gets
// at least MIN_WHITE_KEY_PX of the board's width, otherwise two. An unmeasurable width
// (zero, before layout) keeps one row.
export function chooseRowCount(whiteKeyCount, widthPx) {
  if (!widthPx) return 1;
  return widthPx / whiteKeyCount >= MIN_WHITE_KEY_PX ? 1 : 2;
}

function rowCountFor(keys) {
  return chooseRowCount(keys.filter((k) => !k.isBlack).length, availableWidth());
}

// Implements feature 008, AC-8.3.4: whether a resize has crossed the one-row threshold
// for the keyboard currently shown, so main.js redraws only when the fit changes.
export function needsRefit(appState) {
  if (theory.getInstrument(appState.instrument).kind !== "keyboard") return false;
  return rowCountFor(theory.keyboardKeys(appState.keyCount)) !== renderedRowCount;
}

function onKeyActivated(midiNote) {
  audio.play(midiNote, theory.getInstrument("piano").voice);
}

// Implements feature 008, FR-605/FR-606 (AC-8.2.x, AC-8.3.2, AC-8.3.3): builds every key
// of every row. White keys first so the black keys draw over the boundaries between them.
function buildKeys(svg, rows) {
  svg.textContent = "";
  keyElements.clear();

  const maxWhite = Math.max(...rows.map((row) => row.filter((k) => !k.isBlack).length));
  const width = MARGIN * 2 + maxWhite * WHITE_KEY_WIDTH;
  const height = MARGIN * 2 + rows.length * WHITE_KEY_HEIGHT + (rows.length - 1) * ROW_GAP;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  rows.forEach((row, rowIndex) => {
    const rowGroup = svgEl("g", { class: "piano-row", "data-row": rowIndex });
    const whiteLayer = svgEl("g", { class: "piano-white-keys" });
    const blackLayer = svgEl("g", { class: "piano-black-keys" });
    rowGroup.appendChild(whiteLayer);
    rowGroup.appendChild(blackLayer);
    svg.appendChild(rowGroup);

    const top = MARGIN + rowIndex * (WHITE_KEY_HEIGHT + ROW_GAP);
    let whiteIndex = 0;
    for (const k of row) {
      let x, w, h, cy, r;
      if (k.isBlack) {
        // Centred on the boundary after the white key a semitone below.
        x = MARGIN + whiteIndex * WHITE_KEY_WIDTH - BLACK_KEY_WIDTH / 2;
        w = BLACK_KEY_WIDTH;
        h = BLACK_KEY_HEIGHT;
        cy = top + BLACK_KEY_HEIGHT - 14;
        r = BLACK_MARKER_RADIUS;
      } else {
        x = MARGIN + whiteIndex * WHITE_KEY_WIDTH;
        w = WHITE_KEY_WIDTH;
        h = WHITE_KEY_HEIGHT;
        cy = top + WHITE_KEY_HEIGHT - 18;
        r = WHITE_MARKER_RADIUS;
        whiteIndex++;
      }

      const isMiddleC = k.midiNote === MIDDLE_C_MIDI;
      const key = svgEl("g", {
        class: `piano-key ${k.isBlack ? "piano-key-black" : "piano-key-white"}${isMiddleC ? " is-middle-c" : ""}`,
        id: `key-${k.midiNote}`,
        "data-midi-note": k.midiNote,
        tabindex: "0",
        role: "button",
      });
      key.appendChild(svgEl("rect", { class: "piano-key-body", x, y: top, width: w, height: h, rx: 3 }));
      // AC-8.2.4: middle C's tip, drawn before the note so the marker sits over it.
      if (isMiddleC) {
        key.appendChild(
          svgEl("rect", {
            class: "middle-c-tip",
            x: x + 1,
            y: top + h - MIDDLE_C_TIP_HEIGHT - 1,
            width: w - 2,
            height: MIDDLE_C_TIP_HEIGHT,
            rx: 2,
          })
        );
      }
      const note = svgEl("g", { class: "note" });
      const marker = svgEl("circle", { class: "note-marker", cx: x + w / 2, cy, r });
      const label = svgEl("text", { class: "note-label", x: x + w / 2, y: cy });
      note.appendChild(marker);
      note.appendChild(label);
      key.appendChild(note);
      (k.isBlack ? blackLayer : whiteLayer).appendChild(key);
      keyElements.set(k.midiNote, { key, note, label });

      const activate = () => onKeyActivated(k.midiNote);
      key.addEventListener("click", activate);
      key.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate();
        }
      });
    }
  });
}

// Scientific pitch name. The octave number follows the letter, so a B# sounding as C4 is
// B#3 and a Cb sounding as B4 is Cb5.
function octaveName(midiNote, name) {
  let octave = Math.floor(midiNote / 12) - 1;
  const pitchClass = midiNote % 12;
  if (name[0] === "B" && pitchClass < 2) octave -= 1;
  if (name[0] === "C" && pitchClass > 9) octave += 1;
  return `${name}${octave}`;
}

// Implements feature 009, FR-701/FR-702 (AC-9.1.1, AC-9.1.3, AC-9.1.4): how a key is
// tinted, read from the same description its marker is drawn from — full for a scale
// note or chord tone, faint for a ghost, none for a note with no degree-role colour
// (outside the scale, hidden in Chord view, or key colours off). styles.css mixes the
// colour (research R-901).
function applyKeyHue(key, d, keyHue) {
  const hue = keyHue && d.roleId && !d.isChordHidden ? (d.isGhost ? "faint" : "full") : null;
  if (hue) {
    key.dataset.hue = hue;
    key.dataset.hueRole = d.roleId;
  } else {
    delete key.dataset.hue;
    delete key.dataset.hueRole;
  }
}

// Implements feature 008, FR-601/FR-604/FR-606 (AC-8.1.1, AC-8.1.5, AC-8.3.x): draws the
// piano for the current state. `describe(pitchClassSemitone)` and `applyNoteState` are
// fretboard.js's own highlight rules, so a key and a fret of the same pitch class can
// never disagree.
export function render(appState, { describe, applyNoteState }) {
  const svg = document.getElementById("fretboard");
  svg.setAttribute("aria-label", "Piano keyboard");

  const keys = theory.keyboardKeys(appState.keyCount);
  const rowCount = rowCountFor(keys);
  const layout = `${keys.length}:${rowCount}`;
  if (renderedLayout !== layout || svg.dataset.layout !== layout) {
    buildKeys(svg, theory.splitKeyboardRows(keys, rowCount));
    svg.dataset.layout = layout;
    renderedLayout = layout;
    renderedRowCount = rowCount;
  }

  for (const k of keys) {
    const { key, note, label } = keyElements.get(k.midiNote);
    const d = describe(k.pitchClassSemitone);
    applyNoteState(note, label, d);
    applyKeyHue(key, d, appState.keyHue);
    key.setAttribute(
      "aria-label",
      `${octaveName(k.midiNote, d.noteName)}${k.midiNote === MIDDLE_C_MIDI ? ", middle C" : ""}${d.label !== d.noteName ? ` (${d.label})` : ""}${d.isRoot ? ", root" : ""}${d.isChordTone ? ", chord tone" : d.isDiatonic ? ", in scale" : ""}`
    );
  }
}

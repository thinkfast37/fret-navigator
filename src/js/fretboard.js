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
const MARKER_FRETS = new Set([...SINGLE_DOT_FRETS, ...DOUBLE_DOT_FRETS]);

// Total rendered size stays fixed regardless of the visible fret range
// (FR-043, UAT round 1 section C1).
const svgWidth = MARGIN * 2 + OPEN_COL_WIDTH + FRET_COUNT * FRET_COL_WIDTH;
const svgHeight = MARGIN * 2 + STRING_COUNT * ROW_HEIGHT;

let initialized = false;
let backgroundGroup = null;
let fretNumbersTopGroup = null;
let fretNumbersBottomGroup = null;
const noteElements = new Map(); // "s{stringIndex}-f{fret}" -> { g, circle, text }

function stringY(stringIndex) {
  return MARGIN + stringIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
}

// Implements FR-043 (UAT round 1 section C1): recompute fret-wire/note x
// positions from the CURRENT visible fret range on every render, so fret
// spacing scales inversely with the number of visible frets while total
// width stays fixed - overrides the original "visibility only" simplification.
function computeLayout(fretRange) {
  const { lowerBound, upperBound } = fretRange;
  const showOpenColumn = lowerBound === 0;
  const firstFret = showOpenColumn ? 1 : lowerBound;
  const lastFret = Math.max(upperBound, firstFret - 1);
  const visibleFrettedCount = Math.max(0, lastFret - firstFret + 1);
  const openWidth = showOpenColumn ? OPEN_COL_WIDTH : 0;
  const availableWidth = svgWidth - MARGIN * 2 - openWidth;
  const colWidth = visibleFrettedCount > 0 ? availableWidth / visibleFrettedCount : availableWidth;

  // wireX(f): x position of the fret-wire marking the END of fret f (f=0 is
  // the nut when the open column is shown, or the boundary before the first
  // visible fret otherwise). noteX(f): center of fret f's cell.
  function wireX(f) {
    return MARGIN + openWidth + (f - (firstFret - 1)) * colWidth;
  }
  function noteX(fret) {
    if (fret === 0) return MARGIN + OPEN_COL_WIDTH / 2;
    return wireX(fret - 1) + colWidth / 2;
  }

  return { showOpenColumn, firstFret, lastFret, wireX, noteX };
}

function mod12(n) {
  return ((n % 12) + 12) % 12;
}

// The literal Story-3-selected root's semitone - the TRUE root, always
// unshifted regardless of capo position or Absolute/Relative mode. Audio
// (noteAt) and the "Bright notes" text summary MUST use this value, never
// getHighlightRootSemitone below (FR-048). Returns null when no root is
// selected yet.
export function getEffectiveRootSemitone(appState) {
  if (!appState.root) return null;
  return theory.rootLetterToSemitone(appState.root);
}

// Implements Story 9, FR-047 (UAT round 2 section A, corrects the earlier
// "never shifts" rule from UAT round 1 section A): the root used for
// ON-FRETBOARD highlighting only - the root marker, diatonic set, degree
// roles/labels, interval labels, and chord-tone/bright-set membership. Shifts
// by +capoFret only when a capo is active AND Relative label mode is
// selected. Audio and the "Bright notes" text summary must keep using
// getEffectiveRootSemitone (true root) instead - see FR-048.
export function getHighlightRootSemitone(appState) {
  const trueRoot = getEffectiveRootSemitone(appState);
  if (trueRoot === null) return null;
  return theory.getHighlightRootSemitone(trueRoot, appState.capoFret, appState.capoLabelMode);
}

// Default focal triad merged with user chord-tone overrides -> Set of
// root-relative semitones (0=root) currently in the "bright" set. Note:
// theory.computeDefaultTriad's own math is root-agnostic (it operates
// entirely in offset space via focalSemitone), so this Set of offsets is
// identical whichever root variant is passed in below - the true root vs.
// getHighlightRootSemitone divergence (UAT round 2 section A) only shows up
// downstream, when a caller converts these offsets to absolute pitches
// (fretboard rendering uses getHighlightRootSemitone; the "Bright notes"
// text summary must use getEffectiveRootSemitone/true root instead, FR-048).
// Implements Story 5, FR-018/FR-020: default triad merged with chord-tone overrides
export function computeActiveBrightSet(appState) {
  const rootSemitone = getEffectiveRootSemitone(appState);
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
// Frets muted by an active capo (below it) are fully inert (FR-033).
function onNoteActivated(g) {
  if (g.dataset.isPlayable === "false") return;

  audio.play(Number(g.dataset.midiNote));

  if (!g.classList.contains("is-diatonic")) return;
  const appState = state.getState();
  // Uses the HIGHLIGHT root (UAT round 2 section A), not the true root: a
  // clicked note's "is-diatonic" class was itself assigned on the highlight
  // basis in updateNotes() below, so the resulting focal offset must be
  // computed relative to that same basis to stay consistent.
  const highlightRootSemitone = getHighlightRootSemitone(appState);
  const pitchClassSemitone = Number(g.dataset.pitchClassSemitone);
  const semitoneFromRoot = mod12(pitchClassSemitone - highlightRootSemitone);
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

// Runs once: static structure only (viewBox, empty background/fret-number
// groups, and the 150 note elements + their event handlers). Geometry
// (positions, wires, dots, fret numbers) is filled in per-render by
// renderBackground()/renderFretNumbers()/updateNotes() since it now depends
// on the current fret range (FR-043).
function buildSkeleton() {
  const svg = document.getElementById("fretboard");
  svg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
  svg.textContent = "";

  backgroundGroup = svgEl("g", { class: "fretboard-background" });
  svg.appendChild(backgroundGroup);

  fretNumbersTopGroup = svgEl("g", { class: "fret-numbers fret-numbers-top" });
  fretNumbersBottomGroup = svgEl("g", { class: "fret-numbers fret-numbers-bottom" });
  svg.appendChild(fretNumbersTopGroup);
  svg.appendChild(fretNumbersBottomGroup);

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
      const circle = svgEl("circle", { class: "note-marker", cx: 0, cy: 0, r: NOTE_RADIUS });
      const text = svgEl("text", { class: "note-label", x: 0, y: 0 });
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

// Implements FR-043 (UAT round 1 section C1): rebuilds string lines, the
// nut/fret wires, and inlay dots for the current visible range on every
// render (their count and position change with the range).
function renderBackground(appState, layout) {
  backgroundGroup.textContent = "";
  const { showOpenColumn, firstFret, lastFret, wireX, noteX } = layout;

  for (let s = 0; s < STRING_COUNT; s++) {
    const y = stringY(s);
    backgroundGroup.appendChild(
      svgEl("line", {
        class: "string-line",
        x1: MARGIN + (showOpenColumn ? OPEN_COL_WIDTH : 0),
        y1: y,
        x2: svgWidth - MARGIN,
        y2: y,
      })
    );
  }

  // Wires from the boundary before firstFret through lastFret. When the
  // open column is shown, the boundary wire (f=0) is the thick nut line;
  // when a capo has replaced the nut as the left visible boundary (FR-035),
  // that same boundary wire renders as a distinct capo-position indicator
  // instead (FR-050, UAT round 2 section C) - never both, and never
  // confusable with the true nut. Otherwise it's a plain fret-line marking
  // the edge of the visible range.
  for (let f = firstFret - 1; f <= lastFret; f++) {
    const x = wireX(f);
    const isNut = showOpenColumn && f === 0;
    const isCapoLine = !isNut && appState.capoFret > 0 && f === appState.capoFret - 1;
    backgroundGroup.appendChild(
      svgEl("line", {
        class: isNut ? "nut-line" : isCapoLine ? "capo-line" : "fret-line",
        x1: x,
        y1: MARGIN,
        x2: x,
        y2: svgHeight - MARGIN,
      })
    );
  }

  // Inlay markers, centered vertically between string rows, only for
  // standard marker frets currently within the visible range.
  const midY = MARGIN + (STRING_COUNT * ROW_HEIGHT) / 2;
  const thirdY1 = MARGIN + (STRING_COUNT * ROW_HEIGHT) / 3;
  const thirdY2 = MARGIN + (2 * STRING_COUNT * ROW_HEIGHT) / 3;
  for (let f = firstFret; f <= lastFret; f++) {
    if (!MARKER_FRETS.has(f)) continue;
    const cx = noteX(f);
    if (DOUBLE_DOT_FRETS.has(f)) {
      backgroundGroup.appendChild(svgEl("circle", { class: "inlay-dot", cx, cy: thirdY1, r: 5 }));
      backgroundGroup.appendChild(svgEl("circle", { class: "inlay-dot", cx, cy: thirdY2, r: 5 }));
    } else {
      backgroundGroup.appendChild(svgEl("circle", { class: "inlay-dot", cx, cy: midY, r: 5 }));
    }
  }
}

// Implements FR-046 (UAT round 1 sections C5/E): fret-position-number labels
// at standard marker positions, top and bottom, following the same
// Absolute/Relative convention as note names (physicalFret - capoFret in
// Relative mode, via the same arithmetic as getRelativeLabelSemitone, with
// no note-name conversion step).
function renderFretNumbers(appState, layout) {
  fretNumbersTopGroup.textContent = "";
  fretNumbersBottomGroup.textContent = "";
  const { firstFret, lastFret, noteX } = layout;
  const isRelative = appState.capoFret > 0 && appState.capoLabelMode === "relative";
  const topY = MARGIN - 10;
  const bottomY = svgHeight - MARGIN + 12;

  for (let f = firstFret; f <= lastFret; f++) {
    if (!MARKER_FRETS.has(f)) continue;
    const displayNumber = isRelative ? theory.getRelativeLabelSemitone(f, appState.capoFret) : f;
    const cx = noteX(f);

    const topText = svgEl("text", { class: "fret-number", x: cx, y: topY });
    topText.textContent = String(displayNumber);
    fretNumbersTopGroup.appendChild(topText);

    const bottomText = svgEl("text", { class: "fret-number", x: cx, y: bottomY });
    bottomText.textContent = String(displayNumber);
    fretNumbersBottomGroup.appendChild(bottomText);
  }
}

function effectiveKeyContext(state) {
  return {
    root: state.root || "C",
    accidentalPreference: state.accidentalPreference,
    scaleId: state.scaleId || "ionian",
  };
}

function updateNotes(state, layout) {
  const tuning = resolveTuning(state);
  const keyContext = effectiveKeyContext(state);

  // Diatonic set, degree-role assignment, and chord-tone/focal membership
  // for ON-FRETBOARD rendering all key off the HIGHLIGHT root (UAT round 2
  // section A, FR-047) - which shifts by +capoFret only when a capo is
  // active AND Relative label mode is selected. Audio (below, via
  // dataset.midiNote from theory.noteAt) and the "Bright notes" text summary
  // (controls.js) never use this value - they stay anchored to the true
  // root (FR-048).
  const rootSemitone = getHighlightRootSemitone(state);
  const diatonicSemitones =
    rootSemitone !== null && state.scaleId
      ? theory.getDiatonicSemitones(rootSemitone, state.scaleId)
      : new Set();
  const activeBrightSet = computeActiveBrightSet(state);
  const isRelativeLabelMode = state.capoFret > 0 && state.capoLabelMode === "relative";

  for (let s = 0; s < STRING_COUNT; s++) {
    for (let f = 0; f <= FRET_COUNT; f++) {
      const key = `s${s}-f${f}`;
      const { g, circle, text } = noteElements.get(key);
      const { midiNote, pitchClassSemitone } = theory.noteAt(tuning, s, f);
      const isPlayable = theory.isFretPlayable(f, state.capoFret);

      // Implements FR-043 (UAT round 1 section C1): reposition per render
      // from the current range's layout, since fret spacing is now dynamic.
      const cx = layout.noteX(f);
      const cy = stringY(s);
      circle.setAttribute("cx", cx);
      circle.setAttribute("cy", cy);
      text.setAttribute("x", cx);
      text.setAttribute("y", cy);

      const isRoot = rootSemitone !== null && pitchClassSemitone === rootSemitone;
      const isDiatonic = diatonicSemitones.has(pitchClassSemitone);
      const semitoneFromRoot = rootSemitone !== null ? mod12(pitchClassSemitone - rootSemitone) : null;
      const isFocalChordTone = isDiatonic && activeBrightSet.has(semitoneFromRoot);

      // Relative-mode note NAMES are a distinct computation from the
      // diatonic/degree-role layer above: the string's own static open
      // pitch class + (fret - capoFret), never a capo-raised pitch.
      let noteName;
      if (isRelativeLabelMode) {
        const openSemitone = theory.noteAt(tuning, s, 0).pitchClassSemitone;
        const relativeSemitone = mod12(openSemitone + theory.getRelativeLabelSemitone(f, state.capoFret));
        noteName = theory.spellPitchClass(relativeSemitone, keyContext);
      } else {
        noteName = theory.spellPitchClass(pitchClassSemitone, keyContext);
      }

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
      g.classList.toggle("is-muted", !isPlayable);
      g.classList.toggle("fret-hidden", !isVisibleInRange);
      g.setAttribute("tabindex", isVisibleInRange && isPlayable ? "0" : "-1");

      for (const roleId of ALL_ROLE_IDS) g.classList.remove(`role-${roleId}`);
      if (isDiatonic) {
        const role = theory.getDegreeRole(semitoneFromRoot);
        g.classList.add(`role-${role.colorRoleId}`);
      }

      text.textContent = label;
      g.setAttribute(
        "aria-label",
        `${label}${isRoot ? ", root" : ""}${isFocalChordTone ? ", chord tone" : isDiatonic ? ", in scale" : ""}${isPlayable ? "" : ", muted"}, fret ${f === 0 ? "open" : f}, string ${s + 1}`
      );
      g.dataset.midiNote = midiNote;
      g.dataset.pitchClassSemitone = pitchClassSemitone;
      g.dataset.isPlayable = isPlayable;
    }
  }
}

const afterRenderHooks = [];

// Implements Story 5/7, FR-021/FR-025: post-render hook so dependent UI stays in sync
// Lets controls.js keep dependent UI (e.g. the chord-info panel) in sync with
// every render, including ones triggered by fretboard.js's own note clicks,
// without fretboard.js importing controls.js (avoids a circular import).
export function onAfterRender(fn) {
  afterRenderHooks.push(fn);
}

// Implements Story 1, FR-001/FR-002/FR-003/FR-004, FR-043, FR-046: pure state -> fretboard render
export function render(appState) {
  if (!initialized) {
    buildSkeleton();
    initialized = true;
  }
  const layout = computeLayout(appState.fretRange);
  renderBackground(appState, layout);
  renderFretNumbers(appState, layout);
  updateNotes(appState, layout);
  for (const fn of afterRenderHooks) fn(appState);
}

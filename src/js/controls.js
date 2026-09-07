// UI event wiring: selectors, slider, capo control, label-mode toggle, focal-point clicks.

import * as theory from "./theory.js";
import * as state from "./state.js";
import * as fretboard from "./fretboard.js";
import * as audio from "./audio.js";

const GROUP_ORDER = ["Standard", "D-Family", "G-Family", "C-Family"];
const CHROMATIC_PITCH_CLASSES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function rerender() {
  fretboard.render(state.getState());
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "text") node.textContent = value;
    else node.setAttribute(key, value);
  }
  for (const child of children) node.appendChild(child);
  return node;
}

// Implements E1 (UAT round 1): a visible label heading every control, on top
// of whatever aria-label already exists on the interactive element itself.
function controlLabel(text) {
  return el("span", { class: "control-label", text });
}

function buildTuningSelect() {
  const select = el("select", { id: "tuning-select", "aria-label": "Tuning" });

  for (const group of GROUP_ORDER) {
    const optgroup = el("optgroup", { label: group });
    for (const tuning of theory.TUNINGS.filter((t) => t.group === group)) {
      optgroup.appendChild(el("option", { value: tuning.id, text: tuning.label }));
    }
    select.appendChild(optgroup);
  }

  const customGroup = el("optgroup", { label: "Custom" });
  customGroup.appendChild(el("option", { value: "custom", text: "Custom Tuning" }));
  select.appendChild(customGroup);

  return select;
}

const CUSTOM_TUNING_STRING_LABELS = [
  "String 1 (high E)",
  "String 2",
  "String 3",
  "String 4",
  "String 5",
  "String 6 (low E)",
];

// Implements Story 2, FR-005/FR-006 + UAT round 1 section D1: the previously
// always-visible custom-tuning panel is now a modal, opened by selecting
// "Custom Tuning" or clicking the "Edit" button shown only in custom mode.
function buildCustomTuningModal() {
  const overlay = el("div", { id: "custom-tuning-modal-overlay", class: "modal-overlay", hidden: "true" });
  const modal = el("div", {
    id: "custom-tuning-modal",
    class: "modal",
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "custom-tuning-modal-heading",
  });

  modal.appendChild(el("h2", { id: "custom-tuning-modal-heading", text: "Custom Tuning" }));

  for (let i = 0; i < 6; i++) {
    const row = el("div", { class: "custom-tuning-row" });
    row.appendChild(el("label", { for: `custom-pitch-${i}`, text: CUSTOM_TUNING_STRING_LABELS[i] }));

    const pitchSelect = el("select", { id: `custom-pitch-${i}`, "data-string-index": i });
    for (const pc of CHROMATIC_PITCH_CLASSES) {
      pitchSelect.appendChild(el("option", { value: pc, text: pc }));
    }

    const octaveLabel = el("label", {
      for: `custom-octave-${i}`,
      class: "custom-octave-label",
      text: "Octave",
    });
    const octaveInput = el("input", {
      type: "number",
      id: `custom-octave-${i}`,
      "data-string-index": i,
      min: "0",
      max: "8",
      value: "3",
      "aria-label": `${CUSTOM_TUNING_STRING_LABELS[i]} octave`,
    });

    row.appendChild(pitchSelect);
    row.appendChild(octaveLabel);
    row.appendChild(octaveInput);
    modal.appendChild(row);
  }

  const closeButton = el("button", { type: "button", id: "custom-tuning-modal-close", text: "Close" });
  modal.appendChild(closeButton);
  overlay.appendChild(modal);

  return { overlay, closeButton };
}

function readCustomTuningFromInputs() {
  const pitchClasses = [];
  const octaves = [];
  for (let i = 0; i < 6; i++) {
    pitchClasses.push(document.getElementById(`custom-pitch-${i}`).value);
    octaves.push(Number(document.getElementById(`custom-octave-${i}`).value));
  }
  return { pitchClasses, octaves };
}

function applyStateToCustomInputs() {
  const { tuning } = state.getState();
  if (tuning.presetId !== "custom" || !tuning.customOpenPitchClasses) return;
  for (let i = 0; i < 6; i++) {
    document.getElementById(`custom-pitch-${i}`).value = tuning.customOpenPitchClasses[i];
    document.getElementById(`custom-octave-${i}`).value = tuning.customOpenOctaves[i];
  }
}

// Prepopulate the modal from whatever tuning was active just before switching
// to Custom: existing custom values if there are any, otherwise a copy of
// the previously-selected named preset's own pitches (UAT round 1 section D1).
function resolveInitialCustomTuning() {
  const { tuning } = state.getState();
  if (tuning.presetId === "custom" && tuning.customOpenPitchClasses) {
    return { pitchClasses: [...tuning.customOpenPitchClasses], octaves: [...tuning.customOpenOctaves] };
  }
  const preset = theory.TUNINGS.find((t) => t.id === tuning.presetId) || theory.TUNINGS[0];
  return { pitchClasses: [...preset.openPitchClasses], octaves: [...preset.openOctaves] };
}

// Implements Story 2, FR-005/FR-006: tuning selector + custom-tuning modal
export function initTuningControls() {
  const container = document.getElementById("tuning-controls");
  container.textContent = "";

  const select = buildTuningSelect();
  const editButton = el("button", { type: "button", id: "custom-tuning-edit", text: "Edit" });
  container.appendChild(controlLabel("Tuning"));
  container.appendChild(select);
  container.appendChild(editButton);

  const modalRoot = document.getElementById("custom-tuning-modal-root");
  modalRoot.textContent = "";
  const { overlay, closeButton } = buildCustomTuningModal();
  modalRoot.appendChild(overlay);

  select.value = state.getState().tuning.presetId;
  editButton.hidden = select.value !== "custom";

  function openModal() {
    applyStateToCustomInputs();
    overlay.hidden = false;
  }
  function closeModal() {
    overlay.hidden = true;
  }

  select.addEventListener("change", () => {
    const presetId = select.value;
    if (presetId === "custom") {
      const { pitchClasses, octaves } = resolveInitialCustomTuning();
      state.setTuning("custom", pitchClasses, octaves);
      editButton.hidden = false;
      rerender();
      openModal();
    } else {
      state.setTuning(presetId);
      editButton.hidden = true;
      rerender();
    }
  });

  editButton.addEventListener("click", openModal);
  closeButton.addEventListener("click", closeModal);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeModal();
  });
  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });

  overlay.addEventListener("change", (event) => {
    if (!event.target.matches("select, input")) return;
    const { pitchClasses, octaves } = readCustomTuningFromInputs();
    state.setTuning("custom", pitchClasses, octaves);
    rerender();
  });
}

// Implements Story 3, FR-008/FR-009 (UAT round 1 section C3): 12-root buttons,
// each with one fixed circle-of-fifths spelling - no sharp/flat toggle.
export function initRootControls() {
  const container = document.getElementById("root-controls");
  container.textContent = "";
  // Feature 003 (AC-3.4.1): "Scale Root", to distinguish it from the chord
  // picker's "Chord Root".
  container.appendChild(controlLabel("Scale Root"));

  const buttonRow = el("div", { class: "root-buttons", role: "group", "aria-label": "Root note" });
  for (const root of theory.ROOTS) {
    const button = el("button", {
      type: "button",
      "data-root": root.label,
      text: root.label,
      "aria-pressed": String(state.getState().root === root.label),
    });
    button.addEventListener("click", () => {
      state.setRoot(root.label);
      syncRootButtons();
      rerender();
    });
    buttonRow.appendChild(button);
  }
  container.appendChild(buttonRow);
}

function syncRootButtons() {
  const current = state.getState().root;
  for (const button of document.querySelectorAll(".root-buttons button")) {
    button.setAttribute("aria-pressed", String(button.dataset.root === current));
  }
}

const SCALE_CATEGORY_ORDER = ["Church Modes", "Pentatonic", "Blues", "Other"];

// Implements Story 4, FR-010: scale/mode selector grouped by category
export function initScaleControls() {
  const container = document.getElementById("scale-controls");
  container.textContent = "";
  container.appendChild(controlLabel("Scale / Mode"));

  const select = el("select", { id: "scale-select", "aria-label": "Scale or mode" });
  select.appendChild(el("option", { value: "", text: "(No scale)" }));
  for (const category of SCALE_CATEGORY_ORDER) {
    const optgroup = el("optgroup", { label: category });
    for (const scale of theory.SCALES.filter((s) => s.category === category)) {
      optgroup.appendChild(el("option", { value: scale.id, text: scale.label }));
    }
    select.appendChild(optgroup);
  }
  select.value = state.getState().scaleId || "";

  select.addEventListener("change", () => {
    state.setScaleId(select.value || null);
    rerender();
  });

  container.appendChild(select);
}

const LABEL_MODES = [
  { value: "notes", label: "Notes" },
  { value: "degrees", label: "Degrees" },
  { value: "intervals", label: "Intervals" },
];

// Implements Story 6, FR-023: Notes/Degrees/Intervals label-mode buttons
export function initLabelModeControls() {
  const container = document.getElementById("label-mode-controls");
  container.textContent = "";
  container.appendChild(controlLabel("Label Mode"));

  const row = el("div", { class: "label-mode-buttons", role: "group", "aria-label": "Label mode" });
  for (const mode of LABEL_MODES) {
    const button = el("button", {
      type: "button",
      "data-mode": mode.value,
      text: mode.label,
      "aria-pressed": String(state.getState().labelMode === mode.value),
    });
    button.addEventListener("click", () => {
      state.setLabelMode(mode.value);
      syncLabelModeButtons();
      rerender();
    });
    row.appendChild(button);
  }
  container.appendChild(row);
}

function syncLabelModeButtons() {
  const current = state.getState().labelMode;
  for (const button of document.querySelectorAll(".label-mode-buttons button")) {
    button.setAttribute("aria-pressed", String(button.dataset.mode === current));
  }
}

function clampFret(v) {
  return Math.max(0, Math.min(24, Math.round(v)));
}

// Implements Story 7/9, FR-025/FR-035/FR-036: slider DOM sync incl. capo lock/release
// Keeps the single dual-handle slider's DOM in sync with state on every
// render, including renders triggered by the capo control's lock/release
// rather than by the slider itself.
export function syncFretRangeControls() {
  const leftHandle = document.getElementById("fret-range-left");
  if (!leftHandle) return; // not built yet
  const rightHandle = document.getElementById("fret-range-right");
  const fill = document.getElementById("fret-range-fill");

  const appState = state.getState();
  const { lowerBound, upperBound } = appState.fretRange;
  const capoLocked = appState.capoFret > 0;

  const leftPct = (lowerBound / 24) * 100;
  const rightPct = (upperBound / 24) * 100;
  const leftText = capoLocked ? "Capo" : lowerBound === 0 ? "N" : String(lowerBound);
  const rightText = String(upperBound);

  leftHandle.style.left = `${leftPct}%`;
  rightHandle.style.left = `${rightPct}%`;
  fill.style.left = `${leftPct}%`;
  fill.style.width = `${Math.max(0, rightPct - leftPct)}%`;

  leftHandle.textContent = leftText;
  rightHandle.textContent = rightText;

  leftHandle.setAttribute("aria-valuemin", capoLocked ? String(appState.capoFret) : "0");
  leftHandle.setAttribute("aria-valuemax", String(upperBound));
  leftHandle.setAttribute("aria-valuenow", String(lowerBound));
  leftHandle.setAttribute("aria-valuetext", leftText);
  leftHandle.setAttribute("aria-disabled", String(capoLocked));
  leftHandle.tabIndex = capoLocked ? -1 : 0;
  leftHandle.classList.toggle("is-locked", capoLocked);

  rightHandle.setAttribute("aria-valuemin", String(lowerBound));
  rightHandle.setAttribute("aria-valuemax", "24");
  rightHandle.setAttribute("aria-valuenow", String(upperBound));
  rightHandle.setAttribute("aria-valuetext", rightText);
}

// Implements Story 7, FR-025/FR-026/FR-027: single dual-handle fret-range slider + reset
// Consolidates what was previously two independent <input type="range">
// controls (UAT round 1 section B1) into one slider with two draggable
// handles, each large enough to display its fret number directly inside it.
export function initFretRangeControls() {
  const container = document.getElementById("fret-range-controls");
  container.textContent = "";
  container.appendChild(controlLabel("Visible Frets"));

  const fill = el("div", { class: "fret-range-fill", id: "fret-range-fill" });
  const leftHandle = el("div", {
    id: "fret-range-left",
    class: "fret-range-thumb",
    role: "slider",
    tabindex: "0",
    "aria-label": "Lower visible fret bound",
    "aria-valuemin": "0",
    "aria-valuemax": "24",
  });
  const rightHandle = el("div", {
    id: "fret-range-right",
    class: "fret-range-thumb",
    role: "slider",
    tabindex: "0",
    "aria-label": "Upper visible fret bound",
    "aria-valuemin": "0",
    "aria-valuemax": "24",
  });

  const track = el("div", { class: "fret-range-track" }, [fill, leftHandle, rightHandle]);
  const slider = el("div", { class: "fret-range-slider" }, [track]);
  const resetButton = el("button", { type: "button", id: "fret-range-reset", text: "Reset range" });

  function applyBounds(lower, upper) {
    state.setFretRange(lower, upper);
    rerender();
  }

  function fractionToFret(clientX) {
    const rect = track.getBoundingClientRect();
    const width = rect.width || 1;
    return clampFret(((clientX - rect.left) / width) * 24);
  }

  function beginDrag(which) {
    const onMove = (event) => {
      const { lowerBound, upperBound } = state.getState().fretRange;
      const value = fractionToFret(event.clientX);
      if (which === "left") {
        if (state.getState().capoFret > 0) return; // locked to capo (FR-035)
        applyBounds(Math.min(value, upperBound), upperBound);
      } else {
        applyBounds(lowerBound, Math.max(value, lowerBound));
      }
    };
    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }

  leftHandle.addEventListener("pointerdown", () => beginDrag("left"));
  rightHandle.addEventListener("pointerdown", () => beginDrag("right"));

  function handleKey(which, event) {
    const appState = state.getState();
    if (which === "left" && appState.capoFret > 0) return; // locked to capo (FR-035)
    const { lowerBound, upperBound } = appState.fretRange;
    const step =
      event.key === "ArrowRight" || event.key === "ArrowUp"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowDown"
        ? -1
        : event.key === "PageUp"
        ? 5
        : event.key === "PageDown"
        ? -5
        : null;

    if (which === "left") {
      let next;
      if (step !== null) next = lowerBound + step;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = upperBound;
      else return;
      event.preventDefault();
      applyBounds(clampFret(Math.min(next, upperBound)), upperBound);
    } else {
      let next;
      if (step !== null) next = upperBound + step;
      else if (event.key === "Home") next = lowerBound;
      else if (event.key === "End") next = 24;
      else return;
      event.preventDefault();
      applyBounds(lowerBound, clampFret(Math.max(next, lowerBound)));
    }
  }

  leftHandle.addEventListener("keydown", (event) => handleKey("left", event));
  rightHandle.addEventListener("keydown", (event) => handleKey("right", event));

  resetButton.addEventListener("click", () => {
    state.setFretRange(0, 24);
    rerender();
  });

  container.appendChild(slider);
  container.appendChild(resetButton);

  syncFretRangeControls();
}

function mod12(n) {
  return ((n % 12) + 12) % 12;
}

// Implements feature 003, FR-101/FR-102/FR-104 (AC-3.1.1, AC-3.1.2,
// AC-3.2.1, AC-3.2.9, AC-3.3.x): chord picker (root-as-degree + quality),
// Scale/Chord view toggle, and the chord summary that replaces the removed
// "Bright notes" text. Rebuilt after every render, like the toggle row it
// replaces.
export function updateChordInfo() {
  const container = document.getElementById("chord-info");
  container.textContent = "";

  const appState = state.getState();
  const trueRootSemitone = fretboard.getEffectiveRootSemitone(appState);
  if (trueRootSemitone === null) return;

  const keyContext = {
    root: appState.root,
    accidentalPreference: appState.accidentalPreference,
    scaleId: appState.scaleId,
  };

  // Chord root dropdown: 12 chromatic roots as degrees of the current scale
  // (AC-3.1.1), non-diatonic ones marked and annotated with their borrowed
  // source (AC-3.3.2) or "(in scale)" flags for non-heptatonic scales
  // (AC-3.3.3). Degree analysis is theory.js's, never re-derived here.
  const rootGroup = el("div", { class: "chord-subcontrol" });
  rootGroup.appendChild(controlLabel("Chord Root"));
  const rootSelect = el("select", { id: "chord-root-select", "aria-label": "Chord root" });
  const scale = appState.scaleId ? theory.SCALES.find((s) => s.id === appState.scaleId) : null;
  const isHeptatonic = scale !== null && scale !== undefined && scale.semitoneOffsets.length === 7;
  for (const option of theory.getChordRootOptions(keyContext)) {
    let text;
    if (option.degreeLabel === null) {
      text = option.noteName;
    } else if (isHeptatonic) {
      text = `${option.degreeLabel} — ${option.noteName}`;
      if (!option.inScale) {
        text += option.borrowedFrom ? ` (borrowed: ${option.borrowedFrom.join(" / ")})` : " (chromatic)";
      }
    } else {
      text = `${option.degreeLabel} — ${option.noteName}${option.inScale ? " (in scale)" : ""}`;
    }
    const optionEl = el("option", { value: String(option.offset), text });
    if (option.degreeLabel !== null && !option.inScale) optionEl.classList.add("non-diatonic");
    rootSelect.appendChild(optionEl);
  }
  rootSelect.value = String(appState.chordRootOffset);
  rootSelect.addEventListener("change", () => {
    state.setChordRootOffset(Number(rootSelect.value));
    rerender();
  });
  rootGroup.appendChild(rootSelect);
  container.appendChild(rootGroup);

  // Chord quality dropdown: the full 20-quality vocabulary (AC-3.1.2).
  const qualityGroup = el("div", { class: "chord-subcontrol" });
  qualityGroup.appendChild(controlLabel("Chord Quality"));
  const qualitySelect = el("select", { id: "chord-quality-select", "aria-label": "Chord quality" });
  for (const quality of theory.CHORD_QUALITIES) {
    qualitySelect.appendChild(el("option", { value: quality.id, text: quality.label }));
  }
  qualitySelect.value = appState.chordQualityId;
  qualitySelect.addEventListener("change", () => {
    state.setChordQualityId(qualitySelect.value);
    rerender();
  });
  qualityGroup.appendChild(qualitySelect);
  container.appendChild(qualityGroup);

  // Scale/Chord view toggle (AC-3.2.1).
  const viewGroup = el("div", { class: "chord-subcontrol" });
  viewGroup.appendChild(controlLabel("View"));
  const viewRow = el("div", { class: "view-mode-buttons", role: "group", "aria-label": "Fretboard view" });
  for (const mode of [
    { value: "scale", label: "Scale" },
    { value: "chord", label: "Chord" },
  ]) {
    const button = el("button", {
      type: "button",
      "data-view": mode.value,
      text: mode.label,
      "aria-pressed": String(appState.viewMode === mode.value),
    });
    button.addEventListener("click", () => {
      state.setViewMode(mode.value);
      rerender();
    });
    viewRow.appendChild(button);
  }
  viewGroup.appendChild(viewRow);
  container.appendChild(viewGroup);

  // Chord summary (AC-3.2.9): name + spelled tones, ALWAYS anchored to the
  // TRUE root (FR-108) - it can legitimately diverge from the fretboard's
  // capo+Relative-shifted highlighting, matching the FR-047/FR-048 split.
  const chordRootSemitone = mod12(trueRootSemitone + appState.chordRootOffset);
  const chordName = theory.getChordName(chordRootSemitone, appState.chordQualityId, keyContext);
  // spellPitchClass needs a concrete scale for letter-walking; with "(No
  // scale)" selected fall back to ionian, mirroring fretboard.js's
  // effectiveKeyContext convention.
  const spellContext = appState.scaleId ? keyContext : { ...keyContext, scaleId: "ionian" };
  const toneNames = theory
    .computeChordTones(chordRootSemitone, appState.chordQualityId)
    .map((semitone) => theory.spellPitchClass(semitone, spellContext));
  const summaryGroup = el("div", { class: "chord-subcontrol" });
  const summary = el("p", { class: "chord-summary" });
  summary.textContent = `${chordName}: ${toneNames.join(", ")}`;
  summaryGroup.appendChild(summary);

  // Feature 004 (FR-201/FR-204, AC-4.1.x): strum the selected chord. Voicing
  // is computed from the TRUE root (like the summary above, never the
  // capo-shifted highlight root) and only inside this gesture handler.
  const playButton = el("button", {
    type: "button",
    id: "play-chord-button",
    text: "▶ Play chord",
    "aria-label": `Play ${chordName} chord`,
  });
  playButton.addEventListener("click", () => {
    audio.playChord(theory.computeChordVoicing(chordRootSemitone, appState.chordQualityId));
  });
  summaryGroup.appendChild(playButton);
  container.appendChild(summaryGroup);
}

// Implements Story 9, FR-033/FR-037: capo fret selector + Absolute/Relative toggle
export function initCapoControls() {
  const container = document.getElementById("capo-controls");
  container.textContent = "";
  container.appendChild(controlLabel("Capo"));

  const select = el("select", { id: "capo-select", "aria-label": "Capo fret" });
  select.appendChild(el("option", { value: "0", text: "No capo" }));
  for (let fret = 1; fret <= 12; fret++) {
    select.appendChild(el("option", { value: String(fret), text: `Fret ${fret}` }));
  }
  select.value = String(state.getState().capoFret);
  select.addEventListener("change", () => {
    state.setCapoFret(Number(select.value));
    rerender();
  });
  container.appendChild(select);

  container.appendChild(controlLabel("Fret Reference"));
  const modeRow = el("div", {
    class: "capo-label-mode-buttons",
    role: "group",
    "aria-label": "Absolute or Relative labeling",
  });
  for (const mode of [
    { value: "absolute", label: "Absolute" },
    { value: "relative", label: "Relative" },
  ]) {
    const button = el("button", {
      type: "button",
      "data-capo-mode": mode.value,
      text: mode.label,
      "aria-pressed": String(state.getState().capoLabelMode === mode.value),
    });
    button.addEventListener("click", () => {
      state.setCapoLabelMode(mode.value);
      syncCapoModeButtons();
      rerender();
    });
    modeRow.appendChild(button);
  }
  container.appendChild(modeRow);
}

function syncCapoModeButtons() {
  const current = state.getState().capoLabelMode;
  for (const button of document.querySelectorAll(".capo-label-mode-buttons button")) {
    button.setAttribute("aria-pressed", String(button.dataset.capoMode === current));
  }
}

// Implements Story 1-9 wiring: bootstraps every control and its render hooks
export function initControls() {
  initTuningControls();
  initRootControls();
  initScaleControls();
  initLabelModeControls();
  initFretRangeControls();
  initCapoControls();
  fretboard.onAfterRender(updateChordInfo);
  fretboard.onAfterRender(syncFretRangeControls);
  updateChordInfo();
}

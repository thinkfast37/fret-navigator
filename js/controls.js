// UI event wiring: selectors, slider, capo control, label-mode toggle, focal-point clicks.

import * as theory from "./theory.js";
import * as state from "./state.js";
import * as fretboard from "./fretboard.js";

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

function buildCustomTuningInputs() {
  const container = el("div", { id: "custom-tuning-inputs", hidden: "true" });
  const stringLabels = [
    "String 1 (high E)",
    "String 2",
    "String 3",
    "String 4",
    "String 5",
    "String 6 (low E)",
  ];

  for (let i = 0; i < 6; i++) {
    const row = el("div", { class: "custom-tuning-row" });
    row.appendChild(el("label", { for: `custom-pitch-${i}`, text: stringLabels[i] }));

    const pitchSelect = el("select", { id: `custom-pitch-${i}`, "data-string-index": i });
    for (const pc of CHROMATIC_PITCH_CLASSES) {
      pitchSelect.appendChild(el("option", { value: pc, text: pc }));
    }

    const octaveInput = el("input", {
      type: "number",
      id: `custom-octave-${i}`,
      "data-string-index": i,
      min: "0",
      max: "8",
      value: "3",
      "aria-label": `${stringLabels[i]} octave`,
    });

    row.appendChild(pitchSelect);
    row.appendChild(octaveInput);
    container.appendChild(row);
  }

  return container;
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

export function initTuningControls() {
  const container = document.getElementById("tuning-controls");
  container.textContent = "";

  const select = buildTuningSelect();
  const customInputs = buildCustomTuningInputs();
  container.appendChild(select);
  container.appendChild(customInputs);

  select.value = state.getState().tuning.presetId;
  customInputs.hidden = select.value !== "custom";
  applyStateToCustomInputs();

  select.addEventListener("change", () => {
    const presetId = select.value;
    customInputs.hidden = presetId !== "custom";
    if (presetId === "custom") {
      const { pitchClasses, octaves } = readCustomTuningFromInputs();
      state.setTuning("custom", pitchClasses, octaves);
    } else {
      state.setTuning(presetId);
    }
    rerender();
  });

  customInputs.addEventListener("change", () => {
    const { pitchClasses, octaves } = readCustomTuningFromInputs();
    state.setTuning("custom", pitchClasses, octaves);
    rerender();
  });
}

const NATURAL_ROOTS = ["C", "D", "E", "F", "G", "A", "B"];

export function initRootControls() {
  const container = document.getElementById("root-controls");
  container.textContent = "";

  const buttonRow = el("div", { class: "root-buttons", role: "group", "aria-label": "Root note" });
  for (const root of NATURAL_ROOTS) {
    const button = el("button", {
      type: "button",
      "data-root": root,
      text: root,
      "aria-pressed": String(state.getState().root === root),
    });
    button.addEventListener("click", () => {
      state.setRoot(root);
      syncRootButtons();
      rerender();
    });
    buttonRow.appendChild(button);
  }
  container.appendChild(buttonRow);

  const toggleLabel = el("label", { class: "accidental-toggle", text: "Prefer flats " });
  const toggleInput = el("input", { type: "checkbox", id: "accidental-toggle" });
  toggleInput.checked = state.getState().accidentalPreference === "flat";
  toggleInput.addEventListener("change", () => {
    state.setAccidentalPreference(toggleInput.checked ? "flat" : "sharp");
    rerender();
  });
  toggleLabel.appendChild(toggleInput);
  container.appendChild(toggleLabel);
}

function syncRootButtons() {
  const current = state.getState().root;
  for (const button of document.querySelectorAll(".root-buttons button")) {
    button.setAttribute("aria-pressed", String(button.dataset.root === current));
  }
}

const SCALE_CATEGORY_ORDER = ["Church Modes", "Pentatonic", "Blues", "Other"];

export function initScaleControls() {
  const container = document.getElementById("scale-controls");
  container.textContent = "";

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

export function initLabelModeControls() {
  const container = document.getElementById("label-mode-controls");
  container.textContent = "";

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

export function initFretRangeControls() {
  const container = document.getElementById("fret-range-controls");
  container.textContent = "";

  const { lowerBound, upperBound } = state.getState().fretRange;

  const leftLabel = el("span", { class: "fret-range-label", id: "fret-range-left-label" });
  const rightLabel = el("span", { class: "fret-range-label", id: "fret-range-right-label" });

  const leftInput = el("input", {
    type: "range",
    id: "fret-range-left",
    min: "0",
    max: "24",
    value: String(lowerBound),
    "aria-label": "Lower visible fret bound",
  });
  const rightInput = el("input", {
    type: "range",
    id: "fret-range-right",
    min: "0",
    max: "24",
    value: String(upperBound),
    "aria-label": "Upper visible fret bound",
  });

  const resetButton = el("button", { type: "button", id: "fret-range-reset", text: "Reset range" });

  function updateLabels() {
    const isCapoLocked = state.getState().capoFret > 0;
    const left = Number(leftInput.value);
    leftLabel.textContent = left === 0 && !isCapoLocked ? "N" : isCapoLocked ? "Capo" : String(left);
    rightLabel.textContent = String(rightInput.value);
  }

  function syncConstraints() {
    // Left cannot be dragged past right, and vice versa (FR-026) - at least one fret stays visible.
    rightInput.min = leftInput.value;
    leftInput.max = state.getState().capoFret > 0 ? String(state.getState().capoFret) : rightInput.value;
  }

  leftInput.addEventListener("input", () => {
    if (state.getState().capoFret > 0) return; // locked to capo, see T089
    syncConstraints();
    state.setFretRange(Number(leftInput.value), Number(rightInput.value));
    updateLabels();
    rerender();
  });

  rightInput.addEventListener("input", () => {
    syncConstraints();
    state.setFretRange(Number(leftInput.value), Number(rightInput.value));
    updateLabels();
    rerender();
  });

  resetButton.addEventListener("click", () => {
    leftInput.value = "0";
    rightInput.value = "24";
    syncConstraints();
    state.setFretRange(0, 24);
    updateLabels();
    rerender();
  });

  syncConstraints();
  updateLabels();

  const leftGroup = el("div", { class: "fret-range-handle" }, [
    el("label", { for: "fret-range-left", text: "Left: " }),
    leftLabel,
    leftInput,
  ]);
  const rightGroup = el("div", { class: "fret-range-handle" }, [
    el("label", { for: "fret-range-right", text: "Right: " }),
    rightLabel,
    rightInput,
  ]);

  container.appendChild(leftGroup);
  container.appendChild(rightGroup);
  container.appendChild(resetButton);
}

function mod12(n) {
  return ((n % 12) + 12) % 12;
}

export function updateChordInfo() {
  const container = document.getElementById("chord-info");
  container.textContent = "";

  const appState = state.getState();
  const rootSemitone = appState.root ? theory.rootLetterToSemitone(appState.root) : null;
  if (rootSemitone === null || !appState.scaleId) return;

  const activeBrightSet = fretboard.computeActiveBrightSet(appState);

  const toggleRow = el("div", { class: "chord-tone-toggles", role: "group", "aria-label": "Chord tones" });
  for (const role of theory.DEGREE_ROLES) {
    const semitone = role.semitoneFromRoot;
    const toggleable = theory.isToggleableChordTone(semitone, rootSemitone, appState.scaleId);
    const button = el("button", {
      type: "button",
      text: role.roleLabel,
      "data-semitone": semitone,
      "aria-pressed": String(activeBrightSet.has(semitone)),
    });
    if (!toggleable) button.setAttribute("disabled", "true");
    button.addEventListener("click", () => {
      const isOn = fretboard.computeActiveBrightSet(state.getState()).has(semitone);
      state.setChordToneOverride(semitone, !isOn);
      rerender();
    });
    toggleRow.appendChild(button);
  }
  container.appendChild(toggleRow);

  const keyContext = {
    root: appState.root,
    accidentalPreference: appState.accidentalPreference,
    scaleId: appState.scaleId,
  };
  const brightNames = [...activeBrightSet]
    .sort((a, b) => a - b)
    .map((semitone) => theory.spellPitchClass(mod12(rootSemitone + semitone), keyContext));
  const quality = theory.identifyChordQuality([...activeBrightSet], appState.focalDegreeSemitone);

  const summary = el("p", { class: "chord-summary" });
  summary.textContent = `Bright notes: ${brightNames.join(", ")}${quality ? ` (${quality})` : ""}`;
  container.appendChild(summary);
}

export function initControls() {
  initTuningControls();
  initRootControls();
  initScaleControls();
  initLabelModeControls();
  initFretRangeControls();
  fretboard.onAfterRender(updateChordInfo);
  updateChordInfo();
}

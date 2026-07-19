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

export function initControls() {
  initTuningControls();
}

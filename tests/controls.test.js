// jsdom-based tests for js/controls.js per constitution Principle IV.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM(
  `<!doctype html><html><body>
    <div id="tuning-controls"></div>
    <div id="root-controls"></div>
    <div id="scale-controls"></div>
    <div id="label-mode-controls"></div>
    <div id="fret-range-controls"></div>
    <div id="capo-controls"></div>
    <div id="chord-info"></div>
    <svg id="fretboard"></svg>
  </body></html>`,
  { url: "http://localhost/" }
);
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;

const state = await import("../src/js/state.js");
const controls = await import("../src/js/controls.js");

function fire(el, type) {
  el.dispatchEvent(new dom.window.Event(type, { bubbles: true }));
}

// Mirrors main.js's bootstrap wiring (minus state.load()) so every control's
// onAfterRender hooks (chord-info, fret-range sync) are live for the tests below.
controls.initControls();

describe("initControls bootstrap", () => {
  test("wires every sub-control container with built DOM", () => {
    for (const id of [
      "tuning-controls",
      "root-controls",
      "scale-controls",
      "label-mode-controls",
      "fret-range-controls",
      "capo-controls",
    ]) {
      assert.ok(document.getElementById(id).children.length > 0, `${id} should be populated`);
    }
  });
});

describe("initTuningControls (Story 2, FR-005/FR-006)", () => {
  test("builds a tuning select grouped Standard/D-Family/G-Family/C-Family + Custom", () => {
    const select = document.getElementById("tuning-select");
    assert.ok(select);
    const groupLabels = [...select.querySelectorAll("optgroup")].map((og) => og.label);
    assert.deepEqual(groupLabels, ["Standard", "D-Family", "G-Family", "C-Family", "Custom"]);
  });

  test("US2 Scenario 1/2: selecting Drop D retunes state and the rendered fretboard", () => {
    const select = document.getElementById("tuning-select");
    select.value = "drop-d";
    fire(select, "change");
    assert.equal(state.getState().tuning.presetId, "drop-d");
    assert.equal(Number(document.getElementById("note-s5-f0").dataset.midiNote), 38);
  });

  test("US2 Scenario 5: selecting Custom Tuning reveals inputs and applies edits", () => {
    const select = document.getElementById("tuning-select");
    select.value = "custom";
    fire(select, "change");
    const customInputs = document.getElementById("custom-tuning-inputs");
    assert.equal(customInputs.hidden, false);

    document.getElementById("custom-pitch-0").value = "D";
    fire(document.getElementById("custom-pitch-0"), "change");
    assert.equal(state.getState().tuning.customOpenPitchClasses[0], "D");
  });
});

describe("initRootControls (Story 3, FR-008/FR-009)", () => {
  test("US3 Scenario 1: clicking a root button sets the root and updates aria-pressed", () => {
    const gButton = document.querySelector('.root-buttons button[data-root="G"]');
    gButton.click();
    assert.equal(state.getState().root, "G");
    assert.equal(gButton.getAttribute("aria-pressed"), "true");
    const cButton = document.querySelector('.root-buttons button[data-root="C"]');
    assert.equal(cButton.getAttribute("aria-pressed"), "false");
  });

  test("US3 Scenario 2: the accidental checkbox toggles sharp/flat preference", () => {
    const toggle = document.getElementById("accidental-toggle");
    toggle.checked = true;
    fire(toggle, "change");
    assert.equal(state.getState().accidentalPreference, "flat");
    toggle.checked = false;
    fire(toggle, "change");
    assert.equal(state.getState().accidentalPreference, "sharp");
  });
});

describe("initScaleControls (Story 4, FR-010)", () => {
  test("builds a scale select grouped Church Modes/Pentatonic/Blues/Other", () => {
    const select = document.getElementById("scale-select");
    const groupLabels = [...select.querySelectorAll("optgroup")].map((og) => og.label);
    assert.deepEqual(groupLabels, ["Church Modes", "Pentatonic", "Blues", "Other"]);
  });

  test("US4 Scenario 1/2: selecting a scale updates state.scaleId", () => {
    const select = document.getElementById("scale-select");
    select.value = "dorian";
    fire(select, "change");
    assert.equal(state.getState().scaleId, "dorian");
  });
});

describe("initLabelModeControls (Story 6, FR-023)", () => {
  test("US6 Scenario 3: clicking Degrees updates state.labelMode and aria-pressed", () => {
    const degreesBtn = document.querySelector('.label-mode-buttons button[data-mode="degrees"]');
    degreesBtn.click();
    assert.equal(state.getState().labelMode, "degrees");
    assert.equal(degreesBtn.getAttribute("aria-pressed"), "true");
    const notesBtn = document.querySelector('.label-mode-buttons button[data-mode="notes"]');
    assert.equal(notesBtn.getAttribute("aria-pressed"), "false");
  });
});

describe("initFretRangeControls / syncFretRangeControls (Story 7, FR-025/FR-026/FR-027)", () => {
  test("US7 Scenario 1: default range renders N / 24", () => {
    document.getElementById("fret-range-reset").click();
    assert.equal(document.getElementById("fret-range-left-label").textContent, "N");
    assert.equal(document.getElementById("fret-range-right-label").textContent, "24");
  });

  test("US7 Scenario 2: dragging the left handle to 5 updates state and its label", () => {
    const left = document.getElementById("fret-range-left");
    left.value = "5";
    fire(left, "input");
    assert.equal(state.getState().fretRange.lowerBound, 5);
    assert.equal(document.getElementById("fret-range-left-label").textContent, "5");
  });

  test("US7 Scenario 3: dragging the right handle to 12 updates state and its label", () => {
    const right = document.getElementById("fret-range-right");
    right.value = "12";
    fire(right, "input");
    assert.equal(state.getState().fretRange.upperBound, 12);
    assert.equal(document.getElementById("fret-range-right-label").textContent, "12");
  });

  test("US7 Scenario 6: the reset control restores N-24 from any adjusted range", () => {
    document.getElementById("fret-range-reset").click();
    assert.deepEqual(state.getState().fretRange, { lowerBound: 0, upperBound: 24 });
    assert.equal(document.getElementById("fret-range-left-label").textContent, "N");
    assert.equal(document.getElementById("fret-range-right-label").textContent, "24");
  });
});

describe("updateChordInfo (Story 5, FR-020/FR-021)", () => {
  test("US5 Scenario 6: gates chord-tone toggles to diatonic-only positions and shows the recognized chord quality", () => {
    document.querySelector('.root-buttons button[data-root="C"]').click();
    const scaleSelect = document.getElementById("scale-select");
    scaleSelect.value = "ionian";
    fire(scaleSelect, "change");

    const toggles = document.querySelectorAll(".chord-tone-toggles button");
    assert.equal(toggles.length, 12);
    const fSharpToggle = [...toggles].find((b) => Number(b.dataset.semitone) === 6);
    assert.equal(fSharpToggle.hasAttribute("disabled"), true); // F# not diatonic to C major

    const summary = document.querySelector(".chord-summary");
    assert.match(summary.textContent, /Bright notes: C, E, G \(Major\)/);
  });

  test("US5 Scenario 7: F# becomes an available toggle once the key changes to C Lydian", () => {
    const scaleSelect = document.getElementById("scale-select");
    scaleSelect.value = "lydian";
    fire(scaleSelect, "change");
    const fSharpToggle = [...document.querySelectorAll(".chord-tone-toggles button")].find(
      (b) => Number(b.dataset.semitone) === 6
    );
    assert.equal(fSharpToggle.hasAttribute("disabled"), false);
  });

  test("US5 Scenario 5: clicking an enabled, off chord-tone toggle adds it to the bright set", () => {
    const scaleSelect = document.getElementById("scale-select");
    scaleSelect.value = "ionian";
    fire(scaleSelect, "change");

    const aToggle = [...document.querySelectorAll(".chord-tone-toggles button")].find(
      (b) => Number(b.dataset.semitone) === 9
    );
    assert.equal(aToggle.getAttribute("aria-pressed"), "false");
    aToggle.click();
    const aToggleAfter = [...document.querySelectorAll(".chord-tone-toggles button")].find(
      (b) => Number(b.dataset.semitone) === 9
    );
    assert.equal(aToggleAfter.getAttribute("aria-pressed"), "true");
  });
});

describe("initCapoControls (Story 9, FR-033/FR-037)", () => {
  test("US9 Scenario 1: selecting a capo fret updates state and locks the fret-range left handle", () => {
    const select = document.getElementById("capo-select");
    select.value = "3";
    fire(select, "change");
    assert.equal(state.getState().capoFret, 3);
    assert.equal(document.getElementById("fret-range-left").disabled, true);
    assert.equal(document.getElementById("fret-range-left-label").textContent, "Capo");
  });

  test("US9 Scenario 6: setting capo back to 0 releases the left handle to N", () => {
    const select = document.getElementById("capo-select");
    select.value = "0";
    fire(select, "change");
    assert.equal(document.getElementById("fret-range-left").disabled, false);
    assert.equal(document.getElementById("fret-range-left-label").textContent, "N");
  });

  test("US9 Scenario 3: the Absolute/Relative buttons toggle capoLabelMode", () => {
    const relativeBtn = document.querySelector('.capo-label-mode-buttons button[data-capo-mode="relative"]');
    relativeBtn.click();
    assert.equal(state.getState().capoLabelMode, "relative");
    assert.equal(relativeBtn.getAttribute("aria-pressed"), "true");
    const absoluteBtn = document.querySelector('.capo-label-mode-buttons button[data-capo-mode="absolute"]');
    assert.equal(absoluteBtn.getAttribute("aria-pressed"), "false");
  });
});

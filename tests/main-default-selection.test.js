// jsdom-based test for js/main.js per constitution Principle IV.
// Verifies the first-load default (feature 002-default-root-scale): with no
// persisted settings, main.js's bootstrap must render C Ionian highlighted,
// not a blank/unselected fretboard (FR-001/FR-002/FR-003, SC-001).
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
    <div id="custom-tuning-modal-root"></div>
    <svg id="fretboard"></svg>
    <div id="audio-error-banner" hidden></div>
  </body></html>`,
  { url: "http://localhost/" }
);
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;

class MockAudioContext {
  constructor() {
    this.state = "suspended";
  }
  resume() {
    this.state = "running";
  }
}
dom.window.AudioContext = MockAudioContext;

dom.window.Soundfont = {
  instrument: () => Promise.resolve({ play: () => {} }),
};

// No localStorage seeding here: this simulates a genuine first-time visitor.

await import("../src/js/main.js");

describe("main.js bootstrap: default selection on first load (feature 002)", () => {
  test("FR-001/FR-003: root selector shows C and scale selector shows Ionian with no prior selection", () => {
    const cButton = document.querySelector('.root-buttons button[data-root="C"]');
    assert.ok(cButton, "expected a root button for C");
    assert.equal(cButton.getAttribute("aria-pressed"), "true");
    const scaleSelect = document.getElementById("scale-select");
    assert.equal(scaleSelect.value, "ionian");
  });

  test("FR-002/SC-001: fretboard renders C Ionian notes highlighted, not blank, on first load", () => {
    const diatonic = document.querySelectorAll(".note.is-diatonic");
    assert.ok(
      diatonic.length > 0,
      "expected at least one diatonic (highlighted) note on first load instead of a blank fretboard"
    );
    const root = document.querySelector(".note.is-root");
    assert.ok(root, "expected at least one root note highlighted on first load");
  });
});

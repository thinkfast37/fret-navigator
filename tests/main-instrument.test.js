// jsdom-based test for js/main.js per constitution Principle IV.
// Feature 007 (AC-7.1.4): a reload restores the instrument the player left the app on,
// with the tuning that instrument was showing. main.js is a side-effect bootstrap, so
// this lives in its own file — the reload IS the module import, against seeded settings.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM(
  `<!doctype html><html><body>
    <div id="instrument-controls"></div>
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
dom.window.Soundfont = { instrument: () => Promise.resolve({ play: () => {} }) };

// The player left the app on a ukulele in Canadian tuning, with the guitar still
// remembering DADGAD.
localStorage.setItem(
  "fret-navigator-settings",
  JSON.stringify({
    schemaVersion: 3,
    instrument: "ukulele",
    tunings: {
      guitar: { presetId: "dadgad", customOpenPitchClasses: null, customOpenOctaves: null },
      ukulele: { presetId: "uke-canadian-d", customOpenPitchClasses: null, customOpenOctaves: null },
    },
    root: "C",
    accidentalPreference: "sharp",
    scaleId: "ionian",
    chordRootOffset: 0,
    chordQualityId: "major",
    viewMode: "scale",
    labelMode: "notes",
    capoFret: 0,
    capoLabelMode: "absolute",
    fretRange: { lowerBound: 0, upperBound: 24 },
  })
);

await import("../src/js/main.js");

describe("main.js bootstrap: the instrument survives a reload (feature 007)", () => {
  test("AC-7.1.4 — The instrument choice survives a reload", () => {
    assert.equal(document.getElementById("instrument-select").value, "ukulele");
    assert.equal(document.getElementById("tuning-select").value, "uke-canadian-d");
    // A four-string board, in the tuning that instrument was left on: string 1 is B4.
    assert.equal(document.querySelectorAll(".string-line").length, 4);
    assert.equal(document.querySelectorAll(".note").length, 4 * 25);
    assert.equal(Number(document.getElementById("note-s0-f0").dataset.midiNote), 71); // B4
    assert.equal(document.getElementById("note-s4-f0"), null);
  });

  test("AC-7.1.4 — The instrument choice survives a reload: the other instrument's tuning came back with it", () => {
    const select = document.getElementById("instrument-select");
    select.value = "guitar";
    select.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    assert.equal(document.getElementById("tuning-select").value, "dadgad");
    assert.equal(document.querySelectorAll(".string-line").length, 6);
  });
});

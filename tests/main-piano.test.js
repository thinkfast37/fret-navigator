// jsdom-based test for js/main.js per constitution Principle IV.
// Feature 008: a reload reopens the piano at the key count it was left on (AC-8.5.1), and
// the window's resize listener re-fits it between one and two rows (AC-8.3.4). main.js is
// a side-effect bootstrap, so this lives in its own file — the reload IS the module
// import, against seeded settings.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { RecordingAudioContext } from "./helpers/web-audio-mock.js";

const dom = new JSDOM(
  `<!doctype html><html><body>
    <section id="controls">
      <div id="instrument-controls"></div>
      <div id="tuning-controls"></div>
      <div id="root-controls"></div>
      <div id="scale-controls"></div>
      <div id="label-mode-controls"></div>
      <div id="fret-range-controls"></div>
      <div id="key-count-controls" hidden></div>
      <div id="capo-controls"></div>
      <div id="chord-info"></div>
    </section>
    <section id="fretboard-container"><svg id="fretboard"></svg></section>
    <div id="custom-tuning-modal-root"></div>
    <div id="audio-error-banner" hidden></div>
  </body></html>`,
  { url: "http://localhost/" }
);
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;
dom.window.AudioContext = RecordingAudioContext;
dom.window.Soundfont = { instrument: () => Promise.resolve({ play: () => {} }) };

// A one-row-wide board to start with: 29 white keys of a 49-key piano at 40px each.
let boardWidth = 29 * 40;
Object.defineProperty(document.getElementById("fretboard-container"), "clientWidth", {
  configurable: true,
  get: () => boardWidth,
});

// The player left the app on a 49-key piano, with the guitar still remembering DADGAD.
localStorage.setItem(
  "fret-navigator-settings",
  JSON.stringify({
    schemaVersion: 4,
    instrument: "piano",
    tunings: {
      guitar: { presetId: "dadgad", customOpenPitchClasses: null, customOpenOctaves: null },
      ukulele: { presetId: "uke-standard", customOpenPitchClasses: null, customOpenOctaves: null },
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
    keyCount: 49,
  })
);

await import("../src/js/main.js");

const rows = () => document.querySelectorAll(".piano-row").length;

describe("main.js bootstrap: piano mode (feature 008)", () => {
  test("AC-8.5.1 — The piano and its key count survive a reload", () => {
    assert.equal(document.getElementById("instrument-select").value, "piano");
    assert.equal(document.getElementById("key-count-select").value, "49");
    assert.equal(document.querySelectorAll(".piano-key").length, 49);
    assert.ok(document.getElementById("key-36"), "C2 is the lowest key");
    assert.ok(document.getElementById("key-84"), "C6 is the highest key");
    assert.equal(document.getElementById("key-count-controls").hidden, false);
    assert.equal(document.getElementById("capo-controls").hidden, true);
  });

  test("AC-8.3.4 — The keyboard re-fits when the screen size changes", () => {
    assert.equal(rows(), 1);
    const firstKey = document.getElementById("key-60");

    // Narrower than 29 white keys at the minimum width: two rows, without a reload.
    boardWidth = 400;
    dom.window.dispatchEvent(new dom.window.Event("resize"));
    assert.equal(rows(), 2);

    // A resize that does not cross the threshold leaves the drawn keys alone.
    const twoRowKey = document.getElementById("key-60");
    assert.notEqual(twoRowKey, firstKey);
    boardWidth = 380;
    dom.window.dispatchEvent(new dom.window.Event("resize"));
    assert.equal(document.getElementById("key-60"), twoRowKey);

    boardWidth = 1600;
    dom.window.dispatchEvent(new dom.window.Event("resize"));
    assert.equal(rows(), 1);
  });

  test("AC-8.3.4 — The keyboard re-fits when the screen size changes: a resize on a stringed instrument leaves the fretboard alone", () => {
    const select = document.getElementById("instrument-select");
    select.value = "guitar";
    select.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    const note = document.getElementById("note-s0-f0");
    boardWidth = 300;
    dom.window.dispatchEvent(new dom.window.Event("resize"));
    assert.equal(document.getElementById("note-s0-f0"), note);
    assert.equal(rows(), 0);
  });
});

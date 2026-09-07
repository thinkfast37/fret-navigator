// jsdom-based tests for js/main.js per constitution Principle IV.
// main.js is a side-effect bootstrap module (no exports): importing it runs
// state.load() -> fretboard.render() -> controls.initControls() -> audio
// error-banner wiring, exactly once.
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

const audioContextInstances = [];
class MockAudioContext {
  constructor() {
    this.state = "suspended";
    audioContextInstances.push(this);
  }
  resume() {
    this.state = "running";
  }
}
dom.window.AudioContext = MockAudioContext;

let shouldFail = true;
const playedNotes = [];
dom.window.Soundfont = {
  instrument: () =>
    shouldFail
      ? Promise.reject(new Error("mock failure"))
      : Promise.resolve({ play: (midiNote) => playedNotes.push(midiNote) }),
};

// Pre-seed localStorage so we can verify main.js restores this state BEFORE
// building controls/rendering (FR-039: no default-then-restore flash).
localStorage.setItem(
  "fret-navigator-settings",
  JSON.stringify({
    schemaVersion: 1,
    tuning: { presetId: "standard", customOpenPitchClasses: null, customOpenOctaves: null },
    root: "G",
    accidentalPreference: "sharp",
    scaleId: "ionian",
    focalDegreeSemitone: 0,
    chordToneOverrides: [],
    labelMode: "notes",
    capoFret: 0,
    capoLabelMode: "absolute",
    fretRange: { lowerBound: 0, upperBound: 24 },
  })
);

function flush() {
  return new Promise((resolve) => setTimeout(resolve, 10));
}

await import("../src/js/main.js");
const audio = await import("../src/js/audio.js");

describe("main.js bootstrap (Story 1, FR-039/FR-040/FR-041)", () => {
  test("FR-039/FR-040: restores persisted state before the first render/control build (no default-then-restore flash)", () => {
    const gButton = document.querySelector('.root-buttons button[data-root="G"]');
    assert.equal(gButton.getAttribute("aria-pressed"), "true");
    const scaleSelect = document.getElementById("scale-select");
    assert.equal(scaleSelect.value, "ionian");
  });

  test("renders the fretboard exactly once on load (6 strings x 25 frets)", () => {
    assert.ok(document.getElementById("note-s0-f0"));
    assert.equal(document.querySelectorAll(".note").length, 6 * 25);
  });

  test("wires every control container", () => {
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

  test("FR-041: a sample load failure shows the non-blocking banner, and a later retry clears it", async () => {
    shouldFail = true;
    audio.play(64);
    await flush();
    const banner = document.getElementById("audio-error-banner");
    assert.equal(banner.hidden, false);
    assert.match(banner.textContent, /failed to load/i);

    shouldFail = false;
    audio.play(64);
    await flush();
    assert.equal(banner.hidden, true);
  });

  function tapFret() {
    document
      .getElementById("note-s0-f0")
      .dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  }

  test("AC-1.8.6/1 — A suspended or interrupted context is resumed, and the resume awaited, before the note plays: a fret tap recovers an interrupted context", async () => {
    const ctx = audioContextInstances[0];
    ctx.state = "interrupted"; // iPadOS's non-standard backgrounded state
    let release = null;
    ctx.resume = () =>
      new Promise((resolve) => {
        release = () => {
          ctx.state = "running";
          resolve();
        };
      });
    const before = playedNotes.length;

    tapFret();
    await flush();
    // The resume has not resolved yet, so the note must not have played.
    assert.ok(release, "resume() was never called for the interrupted context");
    assert.equal(playedNotes.length, before);

    release();
    await flush();
    assert.equal(playedNotes.length, before + 1);
    // Recoverable context: resumed in place, never replaced.
    assert.equal(audioContextInstances.length, 1);
  });

  test("AC-1.8.6/2 — A context that stays stuck after resume is replaced, and the instrument reloads on the replacement: a fret tap replaces a dead context and still sounds", async () => {
    const dead = audioContextInstances[0];
    dead.state = "interrupted";
    dead.resume = () => Promise.resolve(); // resolves but never leaves the stuck state
    dead.close = () => {
      dead.state = "closed";
      return Promise.resolve();
    };
    const before = playedNotes.length;

    tapFret();
    await flush();

    assert.equal(dead.state, "closed");
    assert.equal(audioContextInstances.length, 2);
    assert.equal(audioContextInstances[1].state, "running");
    // The instrument reloaded against the replacement and the tap sounded.
    assert.equal(playedNotes.length, before + 1);
  });
});

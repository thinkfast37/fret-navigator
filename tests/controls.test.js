// jsdom-based tests for js/controls.js per constitution Principle IV.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

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
  </body></html>`,
  { url: "http://localhost/" }
);
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;

// Web Audio + soundfont-player mocks (feature 004): the Play-chord button
// routes through audio.js, which needs both on window.
const instrumentPlayCalls = [];
class MockAudioContext {
  constructor() {
    this.state = "suspended";
    this.currentTime = 0;
  }
  resume() {
    this.state = "running";
  }
}
dom.window.AudioContext = MockAudioContext;
dom.window.Soundfont = {
  instrument: () => Promise.resolve({ play: (midiNote) => instrumentPlayCalls.push(midiNote) }),
};

function flushAudio() {
  return new Promise((resolve) => setTimeout(resolve, 10));
}

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

describe("control labels (UAT round 1 section E1)", () => {
  test("every control container shows a visible label above its interactive element", () => {
    const expected = {
      "tuning-controls": "Tuning",
      "root-controls": "Scale Root",
      "scale-controls": "Scale / Mode",
      "label-mode-controls": "Label Mode",
      "fret-range-controls": "Visible Frets",
    };
    for (const [id, text] of Object.entries(expected)) {
      const label = document.querySelector(`#${id} .control-label`);
      assert.ok(label, `${id} should have a .control-label`);
      assert.equal(label.textContent, text);
    }

    const capoLabels = [...document.querySelectorAll("#capo-controls .control-label")].map((l) => l.textContent);
    assert.deepEqual(capoLabels, ["Capo", "Fret Reference"]);
  });

  test('AC-3.4.1 — Root control is labelled "Scale Root" and chord picker "Chord Root"', () => {
    document.querySelector('.root-buttons button[data-root="C"]').click();
    const scaleSelect = document.getElementById("scale-select");
    scaleSelect.value = "ionian";
    fire(scaleSelect, "change");

    assert.equal(document.querySelector("#root-controls .control-label").textContent, "Scale Root");
    const chordLabels = [...document.querySelectorAll("#chord-info .control-label")].map((l) => l.textContent);
    assert.ok(chordLabels.includes("Chord Root"));
    assert.ok(chordLabels.includes("Chord Quality"));
  });

  test("the custom-tuning modal heading reads 'Custom Tuning'", () => {
    assert.equal(document.getElementById("custom-tuning-modal-heading").textContent, "Custom Tuning");
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

  test("US2 Scenario 5 (UAT round 1 section D1): selecting Custom Tuning opens the modal, prepopulated, and applies edits", () => {
    const select = document.getElementById("tuning-select");
    select.value = "custom";
    fire(select, "change");
    const overlay = document.getElementById("custom-tuning-modal-overlay");
    assert.equal(overlay.hidden, false);
    // Prepopulated from the previously-active preset (standard: string 1 = E).
    assert.equal(document.getElementById("custom-pitch-0").value, "E");

    document.getElementById("custom-pitch-0").value = "D";
    fire(document.getElementById("custom-pitch-0"), "change");
    assert.equal(state.getState().tuning.customOpenPitchClasses[0], "D");
  });

  test("D1: the modal closes via its Close button, and the Edit button reopens it prepopulated with the current custom values", () => {
    document.getElementById("custom-tuning-modal-close").click();
    const overlay = document.getElementById("custom-tuning-modal-overlay");
    assert.equal(overlay.hidden, true);

    const editButton = document.getElementById("custom-tuning-edit");
    assert.equal(editButton.hidden, false);
    editButton.click();
    assert.equal(overlay.hidden, false);
    assert.equal(document.getElementById("custom-pitch-0").value, "D"); // edited value from the prior test persisted
  });

  test("D1: the Edit button stays hidden while a named preset (not Custom) is selected", () => {
    const select = document.getElementById("tuning-select");
    select.value = "drop-d";
    fire(select, "change");
    assert.equal(document.getElementById("custom-tuning-edit").hidden, true);
  });
});

describe("initRootControls (Story 3, FR-008/FR-009, UAT round 1 section C3)", () => {
  test("builds all 12 canonical root buttons in alphabetical display order, no sharp/flat toggle", () => {
    const buttons = [...document.querySelectorAll(".root-buttons button")];
    assert.deepEqual(
      buttons.map((b) => b.dataset.root),
      ["A", "Ab", "B", "Bb", "C", "D", "Db", "E", "Eb", "F", "F#", "G"]
    );
    assert.equal(document.getElementById("accidental-toggle"), null);
  });

  test("US3 Scenario 1: clicking a root button sets the root and updates aria-pressed", () => {
    const gButton = document.querySelector('.root-buttons button[data-root="G"]');
    gButton.click();
    assert.equal(state.getState().root, "G");
    assert.equal(gButton.getAttribute("aria-pressed"), "true");
    const cButton = document.querySelector('.root-buttons button[data-root="C"]');
    assert.equal(cButton.getAttribute("aria-pressed"), "false");
  });

  test("US3 Scenario 2: clicking a flat-side root (Db) derives flat accidentalPreference automatically", () => {
    const dbButton = document.querySelector('.root-buttons button[data-root="Db"]');
    dbButton.click();
    assert.equal(state.getState().root, "Db");
    assert.equal(state.getState().accidentalPreference, "flat");
  });

  test("US3 Scenario 3 (UAT round 2 section D, FR-051): the selected root's button color is the same token as the fretboard's root color-role, not a hardcoded/generic accent", () => {
    // jsdom in these tests never loads css/styles.css (only bare DOM is
    // built), so the selected-state color can't be read via computed style
    // here - instead this asserts against the stylesheet SOURCE that the
    // selected-root rule references the shared role-1 token, guarding
    // against a regression back to a separate hardcoded color.
    const cssPath = fileURLToPath(new URL("../src/css/styles.css", import.meta.url));
    const css = readFileSync(cssPath, "utf8");
    const match = css.match(/\.root-buttons button\[aria-pressed="true"\]\s*\{([^}]*)\}/);
    assert.ok(match, "expected a .root-buttons button[aria-pressed=\"true\"] rule in styles.css");
    assert.match(match[1], /var\(--role-1\)/);
    assert.doesNotMatch(match[1], /#ffd54a/);
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

function fireKey(el, key) {
  el.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key, bubbles: true }));
}

describe("initFretRangeControls / syncFretRangeControls (Story 7, FR-025/FR-026/FR-027)", () => {
  test("is a single consolidated slider control with exactly two handles (UAT round 1 section B1)", () => {
    assert.equal(document.querySelectorAll(".fret-range-slider").length, 1);
    assert.equal(document.querySelectorAll(".fret-range-thumb").length, 2);
  });

  test("US7 Scenario 1: default range renders N / 24 inside the handles themselves", () => {
    document.getElementById("fret-range-reset").click();
    assert.equal(document.getElementById("fret-range-left").textContent, "N");
    assert.equal(document.getElementById("fret-range-right").textContent, "24");
  });

  test("US7 Scenario 2: moving the left handle right by 5 (PageUp) updates state and its label", () => {
    const left = document.getElementById("fret-range-left");
    fireKey(left, "PageUp");
    assert.equal(state.getState().fretRange.lowerBound, 5);
    assert.equal(left.textContent, "5");
  });

  test("US7 Scenario 3: moving the right handle down to 12 (ArrowDown x12) updates state and its label", () => {
    const right = document.getElementById("fret-range-right");
    for (let i = 0; i < 12; i++) fireKey(right, "ArrowDown");
    assert.equal(state.getState().fretRange.upperBound, 12);
    assert.equal(right.textContent, "12");
  });

  test("the left handle cannot be moved past the right handle's position", () => {
    document.getElementById("fret-range-reset").click();
    const right = document.getElementById("fret-range-right");
    for (let i = 0; i < 22; i++) fireKey(right, "ArrowDown"); // right -> 2
    const left = document.getElementById("fret-range-left");
    for (let i = 0; i < 10; i++) fireKey(left, "ArrowRight"); // would overshoot past 2
    assert.ok(state.getState().fretRange.lowerBound <= state.getState().fretRange.upperBound);
    assert.equal(state.getState().fretRange.lowerBound, 2);
  });

  test("US7 Scenario 6: the reset control restores N-24 from any adjusted range", () => {
    document.getElementById("fret-range-reset").click();
    assert.deepEqual(state.getState().fretRange, { lowerBound: 0, upperBound: 24 });
    assert.equal(document.getElementById("fret-range-left").textContent, "N");
    assert.equal(document.getElementById("fret-range-right").textContent, "24");
  });
});

// (The Story 5 updateChordInfo describe that stood here — chord-tone toggles,
// bright set, "Bright notes" summary — was removed 2026-09-07: its criteria were
// superseded by feature 003's chord picker, tested below.)

describe("chord picker + view toggle (feature 003)", () => {
  function selectCIonian() {
    document.querySelector('.root-buttons button[data-root="C"]').click();
    const scaleSelect = document.getElementById("scale-select");
    scaleSelect.value = "ionian";
    fire(scaleSelect, "change");
  }

  test("AC-3.1.1 — Chord root dropdown lists all 12 chromatic roots as degrees of the current scale: controls", () => {
    selectCIonian();
    const rootSelect = document.getElementById("chord-root-select");
    const options = [...rootSelect.querySelectorAll("option")];
    assert.equal(options.length, 12);
    assert.equal(options[0].textContent, "I — C");
    assert.equal(options[2].textContent, "ii — D");
    assert.match(options[10].textContent, /^bVII — Bb/);
  });

  test("AC-3.1.2 — Chord quality dropdown offers the full vocabulary: controls", () => {
    selectCIonian();
    const qualitySelect = document.getElementById("chord-quality-select");
    const values = [...qualitySelect.querySelectorAll("option")].map((o) => o.value);
    assert.equal(values.length, 20);
    for (const id of ["major", "minor", "dim", "aug", "sus2", "sus4", "dom7", "maj7", "min7", "m7b5", "dim7", "six", "m6", "dom9", "min9", "maj9", "add9", "dom11", "dom13", "7sus4"]) {
      assert.ok(values.includes(id), `quality ${id} offered`);
    }
  });

  test("AC-3.3.1 — Diatonic chord roots are labelled with case-correct Roman numerals: controls", () => {
    selectCIonian();
    const options = [...document.querySelectorAll("#chord-root-select option")];
    const diatonicTexts = options.filter((o) => !o.classList.contains("non-diatonic")).map((o) => o.textContent);
    assert.deepEqual(diatonicTexts, ["I — C", "ii — D", "iii — E", "IV — F", "V — G", "vi — A", "vii° — B"]);
  });

  test("AC-3.3.2 — Non-diatonic chord roots are labelled as borrowed with a source when one is common: controls", () => {
    selectCIonian();
    const options = [...document.querySelectorAll("#chord-root-select option")];
    assert.equal(options[10].textContent, "bVII — Bb (borrowed: Mixolydian / parallel minor)");
    assert.ok(options[10].classList.contains("non-diatonic"));
    assert.ok(!options[0].classList.contains("non-diatonic"));
  });

  test("picking a chord root and quality updates state and the summary", () => {
    selectCIonian();
    const rootSelect = document.getElementById("chord-root-select");
    rootSelect.value = "7"; // V — G
    fire(rootSelect, "change");
    const qualitySelect = document.getElementById("chord-quality-select");
    qualitySelect.value = "dom7";
    fire(qualitySelect, "change");
    assert.equal(state.getState().chordRootOffset, 7);
    assert.equal(state.getState().chordQualityId, "dom7");
    assert.match(document.querySelector(".chord-summary").textContent, /G7: G, B, D, F/);
  });

  test("AC-3.2.1 — View toggle switches between Scale and Chord views", () => {
    selectCIonian();
    const chordBtn = document.querySelector('.view-mode-buttons button[data-view="chord"]');
    const scaleBtn = document.querySelector('.view-mode-buttons button[data-view="scale"]');
    assert.equal(scaleBtn.getAttribute("aria-pressed"), "true");
    chordBtn.click();
    assert.equal(state.getState().viewMode, "chord");
    assert.equal(
      document.querySelector('.view-mode-buttons button[data-view="chord"]').getAttribute("aria-pressed"),
      "true"
    );
    document.querySelector('.view-mode-buttons button[data-view="scale"]').click();
    assert.equal(state.getState().viewMode, "scale");
  });

  test("AC-3.2.9 — Chord summary line names the chord and its tones", () => {
    selectCIonian();
    const rootSelect = document.getElementById("chord-root-select");
    rootSelect.value = "4"; // iii — E
    fire(rootSelect, "change");
    const qualitySelect = document.getElementById("chord-quality-select");
    qualitySelect.value = "dom7";
    fire(qualitySelect, "change");
    assert.match(document.querySelector(".chord-summary").textContent, /E7: E, G#, B, D/);
  });

  test("AC-3.1.4 — Chord selection defaults to the scale root with a diatonic quality: picker resets with the scale", () => {
    selectCIonian();
    const rootSelect = document.getElementById("chord-root-select");
    rootSelect.value = "9";
    fire(rootSelect, "change");
    const scaleSelect = document.getElementById("scale-select");
    scaleSelect.value = "aeolian";
    fire(scaleSelect, "change");
    assert.equal(state.getState().chordRootOffset, 0);
    assert.equal(state.getState().chordQualityId, "minor");
    assert.equal(document.getElementById("chord-root-select").value, "0");
    assert.equal(document.getElementById("chord-quality-select").value, "minor");
  });

  test("AC-3.3.3 — Non-seven-note scales fall back to degree-only labels: controls", () => {
    document.querySelector('.root-buttons button[data-root="A"]').click();
    const scaleSelect = document.getElementById("scale-select");
    scaleSelect.value = "minor-pentatonic";
    fire(scaleSelect, "change");
    const options = [...document.querySelectorAll("#chord-root-select option")];
    assert.equal(options.length, 12);
    assert.match(options[3].textContent, /^b3 — C \(in scale\)/);
    assert.ok(!options[3].classList.contains("non-diatonic"));
    assert.ok(options[2].classList.contains("non-diatonic"));
  });
});

describe("initCapoControls (Story 9, FR-033/FR-037)", () => {
  test("US9 Scenario 1: selecting a capo fret updates state and locks the fret-range left handle", () => {
    const select = document.getElementById("capo-select");
    select.value = "3";
    fire(select, "change");
    assert.equal(state.getState().capoFret, 3);
    assert.equal(document.getElementById("fret-range-left").getAttribute("aria-disabled"), "true");
    assert.equal(document.getElementById("fret-range-left").textContent, "Capo");
  });

  test("US9 Scenario 6: setting capo back to 0 releases the left handle to N", () => {
    const select = document.getElementById("capo-select");
    select.value = "0";
    fire(select, "change");
    assert.equal(document.getElementById("fret-range-left").getAttribute("aria-disabled"), "false");
    assert.equal(document.getElementById("fret-range-left").textContent, "N");
  });

  test("US9 Scenario 3: the Absolute/Relative buttons toggle capoLabelMode", () => {
    const relativeBtn = document.querySelector('.capo-label-mode-buttons button[data-capo-mode="relative"]');
    relativeBtn.click();
    assert.equal(state.getState().capoLabelMode, "relative");
    assert.equal(relativeBtn.getAttribute("aria-pressed"), "true");
    const absoluteBtn = document.querySelector('.capo-label-mode-buttons button[data-capo-mode="absolute"]');
    assert.equal(absoluteBtn.getAttribute("aria-pressed"), "false");
  });

  test("Scenario 12 (UAT round 2 section A, FR-048/FR-108): with capo=3 + Relative mode active, the chord summary still always names the TRUE root's own chord tones", () => {
    document.querySelector('.root-buttons button[data-root="C"]').click();
    const scaleSelect = document.getElementById("scale-select");
    scaleSelect.value = "ionian";
    fire(scaleSelect, "change");

    const capoSelect = document.getElementById("capo-select");
    capoSelect.value = "3";
    fire(capoSelect, "change");
    assert.equal(state.getState().capoLabelMode, "relative"); // set by the earlier test in this block

    const summary = document.querySelector(".chord-summary");
    assert.match(summary.textContent, /C: C, E, G/); // true-root C major, never the shifted Eb
  });
});


describe("play chord button (feature 004)", () => {
  function selectCIonian() {
    document.querySelector('.root-buttons button[data-root="C"]').click();
    const scaleSelect = document.getElementById("scale-select");
    scaleSelect.value = "ionian";
    fire(scaleSelect, "change");
  }

  test("AC-4.1.4 — Chord playback only ever fires on the Play gesture", async () => {
    selectCIonian();
    const before = instrumentPlayCalls.length;

    // Every kind of selection change: none may make a sound.
    document.querySelector('.root-buttons button[data-root="G"]').click();
    const scaleSelect = document.getElementById("scale-select");
    scaleSelect.value = "aeolian";
    fire(scaleSelect, "change");
    const rootSelect = document.getElementById("chord-root-select");
    rootSelect.value = "7";
    fire(rootSelect, "change");
    const qualitySelect = document.getElementById("chord-quality-select");
    qualitySelect.value = "dom7";
    fire(qualitySelect, "change");
    document.querySelector('.view-mode-buttons button[data-view="chord"]').click();
    document.querySelector('.view-mode-buttons button[data-view="scale"]').click();
    await flushAudio();
    assert.equal(instrumentPlayCalls.length, before, "no state change may trigger playback");

    // The Play gesture does.
    const playButton = document.getElementById("play-chord-button");
    assert.ok(playButton, "play button exists in the chord panel");
    assert.ok(playButton.getAttribute("aria-label").length > 0, "play button has an accessible name");
    playButton.click();
    await flushAudio();
    assert.ok(instrumentPlayCalls.length > before, "Play click triggers playback");
  });

  test("AC-4.1.1 — Play button strums the selected chord's tones ascending from its root: button plays the voicing", async () => {
    selectCIonian();
    const rootSelect = document.getElementById("chord-root-select");
    rootSelect.value = "4"; // iii — E
    fire(rootSelect, "change");
    const qualitySelect = document.getElementById("chord-quality-select");
    qualitySelect.value = "dom7";
    fire(qualitySelect, "change");

    const before = instrumentPlayCalls.length;
    document.getElementById("play-chord-button").click();
    await flushAudio();
    assert.deepEqual(instrumentPlayCalls.slice(before), [52, 56, 59, 62]); // E3 G#3 B3 D4
  });

  test("AC-4.1.3 — Playback is anchored to the true root, unaffected by capo Relative mode", async () => {
    selectCIonian(); // resets chord to I — C major
    const before = instrumentPlayCalls.length;
    document.getElementById("play-chord-button").click();
    await flushAudio();
    const uncapoed = instrumentPlayCalls.slice(before);
    assert.deepEqual(uncapoed, [48, 52, 55]); // C3 E3 G3

    const capoSelect = document.getElementById("capo-select");
    capoSelect.value = "3";
    fire(capoSelect, "change");
    const relativeBtn = document.querySelector('.capo-label-mode-buttons button[data-capo-mode="relative"]');
    relativeBtn.click();

    const mid = instrumentPlayCalls.length;
    document.getElementById("play-chord-button").click();
    await flushAudio();
    assert.deepEqual(instrumentPlayCalls.slice(mid), uncapoed, "capo+Relative never shifts what Play sounds");
  });
});

// ---- Feature 006: key-aware chord picker + tappable fret range (T603, T604, T605) ----

describe("key-aware chord picker (feature 006)", () => {
  function selectScale(root, scaleId) {
    document.querySelector(`.root-buttons button[data-root="${root}"]`).click();
    const scaleSelect = document.getElementById("scale-select");
    scaleSelect.value = scaleId;
    fire(scaleSelect, "change");
  }

  function pickChordRoot(offset) {
    const rootSelect = document.getElementById("chord-root-select");
    rootSelect.value = String(offset);
    fire(rootSelect, "change");
  }

  function qualityOption(id) {
    return document.querySelector(`#chord-quality-select option[value="${id}"]`);
  }

  test("AC-6.2.1 — Quality options are marked diatonic or not for the selected chord root", () => {
    selectScale("C", "ionian");

    pickChordRoot(5); // chord root IV — F
    assert.ok(qualityOption("maj7").classList.contains("diatonic"), "Fmaj7 is in C major");
    assert.ok(qualityOption("dom7").classList.contains("non-diatonic"), "F7 is not");
    assert.ok(qualityOption("major").classList.contains("diatonic"));
    assert.ok(qualityOption("minor").classList.contains("non-diatonic"));

    pickChordRoot(7); // chord root V — G
    assert.ok(qualityOption("dom7").classList.contains("diatonic"), "G7 is in C major");
    assert.ok(qualityOption("maj7").classList.contains("non-diatonic"), "Gmaj7 is not");

    // The marking is never colour alone: the classes carry italic/weight too.
    assert.equal(qualityOption("dom7").title, "Diatonic to the key");
    assert.equal(qualityOption("maj7").title, "Outside the key");
  });

  test("AC-6.2.2 — Scales that support no diatonic verdict leave every quality unmarked", () => {
    selectScale("C", "major-pentatonic");
    const options = [...document.querySelectorAll("#chord-quality-select option")];
    assert.equal(options.length, 20);
    for (const option of options) {
      assert.equal(option.classList.contains("diatonic"), false, option.value);
      assert.equal(option.classList.contains("non-diatonic"), false, option.value);
    }
  });

  test("AC-6.1.1 — A diatonic chord root defaults to the scale's own triad on that degree: the picker follows", () => {
    selectScale("C", "ionian");
    pickChordRoot(2); // degree ii
    assert.equal(document.getElementById("chord-quality-select").value, "minor");
    assert.match(document.querySelector(".chord-summary").textContent, /^Dm: D, F, A$/);
  });

  test("AC-6.1.3 — An explicitly chosen quality survives until the root or key changes: the quality dropdown", () => {
    selectScale("C", "ionian");
    pickChordRoot(2); // degree ii — snaps to Minor
    const qualitySelect = document.getElementById("chord-quality-select");
    assert.equal(qualitySelect.value, "minor");

    // An override made in the dropdown holds through unrelated interactions.
    qualitySelect.value = "min9";
    fire(qualitySelect, "change");
    document.querySelector('.view-mode-buttons button[data-view="chord"]').click();
    assert.equal(document.getElementById("chord-quality-select").value, "min9");

    // The next chord-root change replaces it with that root's key default.
    pickChordRoot(7); // degree V in C Ionian
    assert.equal(document.getElementById("chord-quality-select").value, "major");

    // As does a scale change.
    document.getElementById("chord-quality-select").value = "maj9";
    fire(document.getElementById("chord-quality-select"), "change");
    selectScale("C", "aeolian");
    assert.equal(document.getElementById("chord-quality-select").value, "minor");
  });

  test("AC-6.3.1 — A chord entirely inside the key is reported as diatonic: the chord panel", () => {
    selectScale("C", "ionian");
    pickChordRoot(5);
    const qualitySelect = document.getElementById("chord-quality-select");
    qualitySelect.value = "maj7";
    fire(qualitySelect, "change");

    const line = document.getElementById("chord-mixture");
    assert.ok(line.classList.contains("is-diatonic"));
    assert.equal(line.textContent, "Diatonic to C Ionian (Major)");
  });

  test("AC-6.3.2 — A chord outside the key names the parallel modes that contain it: the chord panel", () => {
    selectScale("C", "ionian");
    pickChordRoot(5);
    const qualitySelect = document.getElementById("chord-quality-select");
    qualitySelect.value = "dom7";
    fire(qualitySelect, "change");

    const line = document.getElementById("chord-mixture");
    assert.ok(line.classList.contains("is-borrowed"));
    assert.equal(line.textContent, "Modal mixture — borrowed from C Dorian");
    // The root alone is diatonic — only the whole chord reveals the mixture.
    assert.equal(document.querySelector('#chord-root-select option[value="5"]').textContent, "IV — F");
  });

  test("AC-6.3.3 — A chord no parallel mode contains is reported as chromatic: the chord panel", () => {
    selectScale("C", "ionian");
    pickChordRoot(0);
    const qualitySelect = document.getElementById("chord-quality-select");
    qualitySelect.value = "dim7";
    fire(qualitySelect, "change");

    const line = document.getElementById("chord-mixture");
    assert.ok(line.classList.contains("is-chromatic"));
    assert.equal(line.textContent, "Chromatic — no parallel church mode contains every tone");
  });

  test("AC-6.2.2 — Scales that support no diatonic verdict leave every quality unmarked: no mixture line either", () => {
    selectScale("C", "minor-pentatonic");
    assert.equal(document.getElementById("chord-mixture"), null);
  });
});

describe("tap-to-set fret range (feature 006)", () => {
  // jsdom performs no layout, so the track reports a zero-width rect. Stub it
  // with a real 240px geometry: clientX 10 -> fret 1, 120 -> fret 12, 240 -> 24.
  function stubTrackGeometry() {
    const track = document.querySelector(".fret-range-track");
    track.getBoundingClientRect = () => ({ left: 0, width: 240, right: 240, top: 0, bottom: 4, height: 4 });
    return track;
  }

  function tapSlider(clientX) {
    const slider = document.querySelector(".fret-range-slider");
    slider.dispatchEvent(new dom.window.MouseEvent("pointerdown", { bubbles: true, clientX, clientY: 0 }));
    // Release so no drag listener outlives the tap.
    document.dispatchEvent(new dom.window.MouseEvent("pointerup", { bubbles: true }));
  }

  test("AC-6.4.1 — Tapping the slider moves the nearer handle to the tapped fret", () => {
    document.getElementById("capo-select").value = "0";
    fire(document.getElementById("capo-select"), "change");
    document.getElementById("fret-range-reset").click();
    stubTrackGeometry();
    assert.deepEqual(state.getState().fretRange, { lowerBound: 0, upperBound: 24 });

    // Fret 20 is nearer the upper handle (24) than the lower (0).
    tapSlider(200);
    assert.deepEqual(state.getState().fretRange, { lowerBound: 0, upperBound: 20 });
    assert.equal(document.getElementById("fret-range-right").textContent, "20");

    // Fret 4 is now nearer the lower handle (0) than the upper (20).
    tapSlider(40);
    assert.deepEqual(state.getState().fretRange, { lowerBound: 4, upperBound: 20 });
    assert.equal(document.getElementById("fret-range-left").textContent, "4");

    // No drag was required for either move.
    document.getElementById("fret-range-reset").click();
  });

  test("AC-6.4.2 — A capo-locked left handle is never the one a tap moves", () => {
    document.getElementById("fret-range-reset").click();
    const capoSelect = document.getElementById("capo-select");
    capoSelect.value = "5";
    fire(capoSelect, "change");
    stubTrackGeometry();
    assert.equal(state.getState().fretRange.lowerBound, 5, "capo locks the lower bound (FR-035)");

    // Tapping at fret 2 — below the capo, and nearest the locked left handle.
    tapSlider(20);
    assert.equal(state.getState().fretRange.lowerBound, 5, "the locked lower bound must not move");
    assert.equal(state.getState().fretRange.upperBound, 5, "the right handle moved instead, clamped by FR-026");
    assert.equal(document.getElementById("fret-range-left").textContent, "Capo");

    capoSelect.value = "0";
    fire(capoSelect, "change");
    document.getElementById("fret-range-reset").click();
  });
});

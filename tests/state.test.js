// jsdom-based tests for js/state.js per constitution Principle IV.
import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;

const state = await import("../src/js/state.js");

beforeEach(() => {
  localStorage.clear();
  state.load();
});

describe("getState", () => {
  test("returns the current in-memory state tuple with documented defaults", () => {
    const s = state.getState();
    assert.equal(s.tuning.presetId, "standard");
    assert.equal(s.root, null);
    assert.equal(s.labelMode, "notes");
    assert.equal(s.capoFret, 0);
    assert.equal(s.capoLabelMode, "absolute");
    assert.deepEqual(s.fretRange, { lowerBound: 0, upperBound: 24 });
  });
});

describe("setTuning", () => {
  test("US2 Scenario 1: selecting a named tuning updates state.tuning", () => {
    state.setTuning("drop-d");
    assert.deepEqual(state.getState().tuning, {
      presetId: "drop-d",
      customOpenPitchClasses: null,
      customOpenOctaves: null,
    });
  });

  test("US2 Scenario 5: custom tuning stores independent per-string pitches", () => {
    const pcs = ["E", "B", "G", "D", "A", "D"];
    const octs = [4, 3, 3, 3, 2, 1];
    state.setTuning("custom", pcs, octs);
    const t = state.getState().tuning;
    assert.equal(t.presetId, "custom");
    assert.deepEqual(t.customOpenPitchClasses, pcs);
    assert.deepEqual(t.customOpenOctaves, octs);
  });
});

describe("setRoot", () => {
  test("US3 Scenario 1: sets the selected root note (all 12 canonical roots, UAT round 1 section C3)", () => {
    for (const root of ["A", "Ab", "B", "Bb", "C", "D", "Db", "E", "Eb", "F", "F#", "G"]) {
      state.setRoot(root);
      assert.equal(state.getState().root, root);
    }
  });

  test("Edge Case: changing root resets focal point to root and clears chord-tone overrides", () => {
    state.setRoot("C");
    state.setScaleId("ionian");
    state.setFocalDegreeSemitone(4);
    state.setChordToneOverride(9, true);
    assert.equal(state.getState().focalDegreeSemitone, 4);
    assert.equal(state.getState().chordToneOverrides.length, 1);

    state.setRoot("D");
    assert.equal(state.getState().focalDegreeSemitone, 0);
    assert.deepEqual(state.getState().chordToneOverrides, []);
  });

  test("US3 Scenario 2 (UAT round 1 section C3): accidentalPreference is derived automatically from the root's circle-of-fifths side, not user-toggled", () => {
    for (const root of ["C", "G", "D", "A", "E", "B", "F#"]) {
      state.setRoot(root);
      assert.equal(state.getState().accidentalPreference, "sharp", `${root} should be sharp-side`);
    }
    for (const root of ["Db", "Ab", "Eb", "Bb", "F"]) {
      state.setRoot(root);
      assert.equal(state.getState().accidentalPreference, "flat", `${root} should be flat-side`);
    }
  });
});

describe("setScaleId", () => {
  test("US4 Scenario 2: switching scale updates scaleId with no stale focal/override state", () => {
    state.setRoot("C");
    state.setScaleId("ionian");
    state.setFocalDegreeSemitone(7);
    state.setChordToneOverride(2, true);

    state.setScaleId("dorian");
    assert.equal(state.getState().scaleId, "dorian");
    assert.equal(state.getState().focalDegreeSemitone, 0);
    assert.deepEqual(state.getState().chordToneOverrides, []);
  });
});

describe("setFocalDegreeSemitone", () => {
  test("US5 Scenario 3: clicking a diatonic note updates the focal point", () => {
    state.setFocalDegreeSemitone(4);
    assert.equal(state.getState().focalDegreeSemitone, 4);
  });
});

describe("setChordToneOverride", () => {
  test("US5 Scenario 5: toggling a chord tone on adds an override entry", () => {
    state.setChordToneOverride(9, true);
    assert.deepEqual(state.getState().chordToneOverrides, [{ semitone: 9, on: true }]);
  });

  test("toggling the same semitone again updates the existing entry rather than duplicating", () => {
    state.setChordToneOverride(9, true);
    state.setChordToneOverride(9, false);
    assert.deepEqual(state.getState().chordToneOverrides, [{ semitone: 9, on: false }]);
  });
});

describe("setLabelMode", () => {
  test("US6 Scenarios 2-4: switches between notes/degrees/intervals", () => {
    for (const mode of ["degrees", "intervals", "notes"]) {
      state.setLabelMode(mode);
      assert.equal(state.getState().labelMode, mode);
    }
  });
});

describe("setCapoFret", () => {
  test("US9 Scenario 1: placing a capo locks the fret-range lower bound to the capo fret", () => {
    state.setCapoFret(3);
    assert.equal(state.getState().capoFret, 3);
    assert.equal(state.getState().fretRange.lowerBound, 3);
  });

  test("FR-044 (UAT round 1 section C2): right handle shifts by the same delta as the left handle's snap, preserving the previously-visible width", () => {
    state.setFretRange(0, 2); // width 2
    state.setCapoFret(5); // left snaps 0 -> 5 (delta +5); right shifts 2 -> 7
    assert.equal(state.getState().fretRange.lowerBound, 5);
    assert.equal(state.getState().fretRange.upperBound, 7);
  });

  test("FR-044: the shifted right handle is clamped to a maximum of 24 regardless of the computed delta", () => {
    state.setFretRange(10, 24); // width 14
    state.setCapoFret(12); // delta +2 -> 24+2=26, clamped to 24
    assert.equal(state.getState().fretRange.lowerBound, 12);
    assert.equal(state.getState().fretRange.upperBound, 24);
  });

  test("US9 Scenario 6: releasing capo to 0 restores the lower bound to the nut", () => {
    state.setCapoFret(4);
    state.setCapoFret(0);
    assert.equal(state.getState().fretRange.lowerBound, 0);
  });
});

describe("setCapoLabelMode", () => {
  test("US9 Scenario 3: switches between absolute and relative labeling", () => {
    state.setCapoLabelMode("relative");
    assert.equal(state.getState().capoLabelMode, "relative");
    state.setCapoLabelMode("absolute");
    assert.equal(state.getState().capoLabelMode, "absolute");
  });
});

describe("setFretRange", () => {
  test("US7 Scenario 2: dragging left handle updates the lower bound", () => {
    state.setFretRange(5, 24);
    assert.deepEqual(state.getState().fretRange, { lowerBound: 5, upperBound: 24 });
  });

  test("US7 Scenario 3: dragging right handle updates the upper bound", () => {
    state.setFretRange(0, 12);
    assert.deepEqual(state.getState().fretRange, { lowerBound: 0, upperBound: 12 });
  });

  test("US7 Scenario 4: both handles combined", () => {
    state.setFretRange(3, 15);
    assert.deepEqual(state.getState().fretRange, { lowerBound: 3, upperBound: 15 });
  });

  test("US7 Scenario 5: inverted input is swapped rather than allowed to collapse/invert", () => {
    state.setFretRange(20, 10);
    assert.deepEqual(state.getState().fretRange, { lowerBound: 10, upperBound: 20 });
  });

  test("clamps out-of-bounds values to 0-24", () => {
    state.setFretRange(-5, 30);
    assert.deepEqual(state.getState().fretRange, { lowerBound: 0, upperBound: 24 });
  });

  test("while a capo is active, the lower bound stays pinned to the capo fret", () => {
    state.setCapoFret(4);
    state.setFretRange(0, 24);
    assert.equal(state.getState().fretRange.lowerBound, 4);
  });
});

describe("save/load persistence", () => {
  test("FR-039/FR-040: save() writes a schemaVersion'd payload that load() restores", () => {
    state.setRoot("A");
    state.setScaleId("mixolydian");
    state.setCapoFret(2);

    const raw = localStorage.getItem("fret-navigator-settings");
    const parsed = JSON.parse(raw);
    assert.equal(parsed.schemaVersion, 1);
    assert.equal(parsed.root, "A");

    const restored = state.load();
    assert.equal(restored.root, "A");
    assert.equal(restored.scaleId, "mixolydian");
    assert.equal(restored.capoFret, 2);
  });

  test("load() falls back to defaults when localStorage is empty", () => {
    localStorage.clear();
    const restored = state.load();
    assert.equal(restored.root, null);
    assert.equal(restored.capoFret, 0);
  });

  test("load() falls back to defaults on corrupt JSON", () => {
    localStorage.setItem("fret-navigator-settings", "{not valid json");
    const restored = state.load();
    assert.equal(restored.root, null);
  });

  test("load() falls back to defaults when stored data fails validation", () => {
    localStorage.setItem(
      "fret-navigator-settings",
      JSON.stringify({ schemaVersion: 1, root: "not-a-root", tuning: { presetId: "standard" } })
    );
    const restored = state.load();
    assert.equal(restored.root, null);
    assert.equal(restored.tuning.presetId, "standard");
  });

  test("Edge Case: chord-tone overrides that become non-diatonic on reload are pruned", () => {
    state.setRoot("C");
    state.setScaleId("ionian");
    state.setChordToneOverride(9, true); // A: diatonic to C major

    const raw = JSON.parse(localStorage.getItem("fret-navigator-settings"));
    raw.scaleId = "major-pentatonic"; // A (9) is still diatonic; use a scale where it's not
    raw.chordToneOverrides = [{ semitone: 1, on: true }]; // C# is not diatonic to any scale relative to C
    localStorage.setItem("fret-navigator-settings", JSON.stringify(raw));

    const restored = state.load();
    assert.deepEqual(restored.chordToneOverrides, []);
  });
});

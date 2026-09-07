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
    // Feature 002-default-root-scale: first load defaults to C Ionian so the
    // fretboard is highlighted immediately instead of starting blank.
    assert.equal(s.root, "C");
    assert.equal(s.scaleId, "ionian");
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

  // (The focal-point/override reset test that stood here was removed 2026-09-07:
  // the focal-point criteria were superseded by feature 003 — the chord-selection reset is covered by
  // the AC-3.1.4 tests below.)

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
  test("US4 Scenario 2: switching scale updates scaleId", () => {
    state.setRoot("C");
    state.setScaleId("ionian");
    state.setScaleId("dorian");
    assert.equal(state.getState().scaleId, "dorian");
  });
});

// (setFocalDegreeSemitone/setChordToneOverride describes removed 2026-09-07:
// the focal-point/toggle criteria were superseded by feature 003's chord selection, below.)

describe("chord selection (feature 003)", () => {
  test("AC-3.1.4 — Chord selection defaults to the scale root with a diatonic quality", () => {
    const s = state.getState(); // fresh C Ionian defaults
    assert.equal(s.chordRootOffset, 0);
    assert.equal(s.chordQualityId, "major");
    assert.equal(s.viewMode, "scale");
  });

  test("AC-3.1.4 — Chord selection defaults to the scale root with a diatonic quality: reset on root change", () => {
    state.setChordRootOffset(7);
    state.setChordQualityId("dom7");
    state.setRoot("D");
    assert.equal(state.getState().chordRootOffset, 0);
    assert.equal(state.getState().chordQualityId, "major");
  });

  test("AC-3.1.4 — Chord selection defaults to the scale root with a diatonic quality: reset on scale change picks that scale's tonic quality", () => {
    state.setChordRootOffset(7);
    state.setChordQualityId("maj9");
    state.setScaleId("aeolian");
    assert.equal(state.getState().chordRootOffset, 0);
    assert.equal(state.getState().chordQualityId, "minor");
    state.setScaleId("locrian");
    assert.equal(state.getState().chordQualityId, "dim");
  });

  test("setters store chord root offset, quality, and view mode", () => {
    state.setChordRootOffset(10);
    state.setChordQualityId("m7b5");
    state.setViewMode("chord");
    const s = state.getState();
    assert.equal(s.chordRootOffset, 10);
    assert.equal(s.chordQualityId, "m7b5");
    assert.equal(s.viewMode, "chord");
  });

  test("view mode survives a root/scale change (only the chord resets)", () => {
    state.setViewMode("chord");
    state.setRoot("E");
    assert.equal(state.getState().viewMode, "chord");
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
    assert.equal(parsed.schemaVersion, 2);
    assert.equal(parsed.root, "A");

    const restored = state.load();
    assert.equal(restored.root, "A");
    assert.equal(restored.scaleId, "mixolydian");
    assert.equal(restored.capoFret, 2);
  });

  test("load() falls back to C Ionian defaults when localStorage is empty (feature 002, FR-001)", () => {
    localStorage.clear();
    const restored = state.load();
    assert.equal(restored.root, "C");
    assert.equal(restored.scaleId, "ionian");
    assert.equal(restored.capoFret, 0);
  });

  test("load() falls back to C Ionian defaults on corrupt JSON (feature 002, FR-001)", () => {
    localStorage.setItem("fret-navigator-settings", "{not valid json");
    const restored = state.load();
    assert.equal(restored.root, "C");
    assert.equal(restored.scaleId, "ionian");
  });

  test("load() falls back to C Ionian defaults when stored data fails validation (feature 002, FR-001)", () => {
    localStorage.setItem(
      "fret-navigator-settings",
      JSON.stringify({ schemaVersion: 1, root: "not-a-root", tuning: { presetId: "standard" } })
    );
    const restored = state.load();
    assert.equal(restored.root, "C");
    assert.equal(restored.scaleId, "ionian");
    assert.equal(restored.tuning.presetId, "standard");
  });

  test("feature 002, FR-005: a previously persisted null root/scaleId is honored, not overridden to the new C Ionian default", () => {
    localStorage.setItem(
      "fret-navigator-settings",
      JSON.stringify({
        schemaVersion: 1,
        tuning: { presetId: "standard", customOpenPitchClasses: null, customOpenOctaves: null },
        root: null,
        accidentalPreference: "sharp",
        scaleId: null,
        focalDegreeSemitone: 0,
        chordToneOverrides: [],
        labelMode: "notes",
        capoFret: 0,
        capoLabelMode: "absolute",
        fretRange: { lowerBound: 0, upperBound: 24 },
      })
    );
    const restored = state.load();
    assert.equal(restored.root, null);
    assert.equal(restored.scaleId, null);
  });

  test("AC-3.1.5 — Chord selection persists across reloads", () => {
    state.setChordRootOffset(4);
    state.setChordQualityId("dom7");
    state.setViewMode("chord");
    const restored = state.load();
    assert.equal(restored.chordRootOffset, 4);
    assert.equal(restored.chordQualityId, "dom7");
    assert.equal(restored.viewMode, "chord");
  });

  test("AC-3.1.6 — Saved settings from the previous focal-point system load cleanly", () => {
    localStorage.setItem(
      "fret-navigator-settings",
      JSON.stringify({
        schemaVersion: 1,
        tuning: { presetId: "drop-d", customOpenPitchClasses: null, customOpenOctaves: null },
        root: "A",
        accidentalPreference: "sharp",
        scaleId: "aeolian",
        focalDegreeSemitone: 7,
        chordToneOverrides: [{ semitone: 2, on: true }],
        labelMode: "degrees",
        capoFret: 3,
        capoLabelMode: "relative",
        fretRange: { lowerBound: 3, upperBound: 15 },
      })
    );
    const restored = state.load();
    // Surviving v1 fields preserved
    assert.equal(restored.tuning.presetId, "drop-d");
    assert.equal(restored.root, "A");
    assert.equal(restored.scaleId, "aeolian");
    assert.equal(restored.labelMode, "degrees");
    assert.equal(restored.capoFret, 3);
    assert.equal(restored.capoLabelMode, "relative");
    assert.deepEqual(restored.fretRange, { lowerBound: 3, upperBound: 15 });
    // Removed fields dropped; new fields at their defaults for the stored scale
    assert.equal("focalDegreeSemitone" in restored, false);
    assert.equal("chordToneOverrides" in restored, false);
    assert.equal(restored.chordRootOffset, 0);
    assert.equal(restored.chordQualityId, "minor"); // aeolian tonic triad
    assert.equal(restored.viewMode, "scale");
    // Re-saved payload is schemaVersion 2
    state.save();
    assert.equal(JSON.parse(localStorage.getItem("fret-navigator-settings")).schemaVersion, 2);
  });

  test("AC-3.1.6 — Saved settings from the previous focal-point system load cleanly: v2 validation rejects junk chord fields", () => {
    state.setRoot("A");
    const raw = JSON.parse(localStorage.getItem("fret-navigator-settings"));
    raw.chordQualityId = "power5";
    localStorage.setItem("fret-navigator-settings", JSON.stringify(raw));
    const restored = state.load();
    assert.equal(restored.root, "C"); // fell back to defaults
    assert.equal(restored.chordQualityId, "major");
  });

  test("feature 002, FR-005: a previously persisted non-default root/scaleId is honored, not overridden to C Ionian", () => {
    state.setRoot("A");
    state.setScaleId("mixolydian");
    const restored = state.load();
    assert.equal(restored.root, "A");
    assert.equal(restored.scaleId, "mixolydian");
  });

  // (The chord-tone-override pruning test that stood here was removed 2026-09-07:
  // overrides no longer exist; their criteria were superseded by feature 003.)
});

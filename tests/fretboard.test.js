// jsdom-based tests for js/fretboard.js per constitution Principle IV.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM(
  `<!doctype html><html><body><svg id="fretboard"></svg></body></html>`,
  { url: "http://localhost/" }
);
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;

// audio.js (imported transitively by fretboard.js) needs Web Audio +
// soundfont-player mocks so click-triggered playback doesn't throw.
const soundfontCalls = [];
const instrumentPlayCalls = [];
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
  instrument: (ctx, name, opts) => {
    soundfontCalls.push({ name, opts });
    return Promise.resolve({ play: (note) => instrumentPlayCalls.push(note) });
  },
};

function flush() {
  return new Promise((resolve) => setTimeout(resolve, 10));
}

const state = await import("../src/js/state.js");
const fretboard = await import("../src/js/fretboard.js");

function baseState(overrides = {}) {
  return {
    tuning: { presetId: "standard", customOpenPitchClasses: null, customOpenOctaves: null },
    root: null,
    accidentalPreference: "sharp",
    scaleId: null,
    chordRootOffset: 0,
    chordQualityId: "major",
    viewMode: "scale",
    labelMode: "notes",
    capoFret: 0,
    capoLabelMode: "absolute",
    fretRange: { lowerBound: 0, upperBound: 24 },
    ...overrides,
  };
}

function noteEl(s, f) {
  return document.getElementById(`note-s${s}-f${f}`);
}

// ---- Exported function unit tests ----

describe("getEffectiveRootSemitone", () => {
  test("returns null when no root is selected", () => {
    assert.equal(fretboard.getEffectiveRootSemitone(baseState()), null);
  });

  test("returns the true root when capoFret is 0", () => {
    assert.equal(fretboard.getEffectiveRootSemitone(baseState({ root: "C" })), 0);
  });

  test("stays the TRUE literal selected root under capo + Relative mode, never shifts - this accessor specifically is the true-root one; see getHighlightRootSemitone below for the value that DOES shift (UAT round 2 section A)", () => {
    const s = baseState({ root: "C", capoFret: 3, capoLabelMode: "relative" });
    assert.equal(fretboard.getEffectiveRootSemitone(s), 0); // stays C(0), always
  });

  test("US9 Acceptance Scenario 6: capo 0 makes Absolute/Relative identical", () => {
    const abs = fretboard.getEffectiveRootSemitone(baseState({ root: "E", capoFret: 0, capoLabelMode: "absolute" }));
    const rel = fretboard.getEffectiveRootSemitone(baseState({ root: "E", capoFret: 0, capoLabelMode: "relative" }));
    assert.equal(abs, rel);
  });
});

// UAT round 2 section A: the value on-fretboard highlighting actually uses -
// shifts by +capoFret only when capo>0 AND Relative mode is active.
describe("getHighlightRootSemitone (UAT round 2 section A)", () => {
  test("returns null when no root is selected", () => {
    assert.equal(fretboard.getHighlightRootSemitone(baseState()), null);
  });

  test("Scenario 7: capo=0, unshifted regardless of label mode", () => {
    assert.equal(fretboard.getHighlightRootSemitone(baseState({ root: "C", capoFret: 0, capoLabelMode: "absolute" })), 0);
    assert.equal(fretboard.getHighlightRootSemitone(baseState({ root: "C", capoFret: 0, capoLabelMode: "relative" })), 0);
  });

  test("Scenario 8: capo=3, Absolute mode stays unshifted", () => {
    assert.equal(fretboard.getHighlightRootSemitone(baseState({ root: "C", capoFret: 3, capoLabelMode: "absolute" })), 0);
  });

  test("Scenario 9: capo=3, Relative mode shifts to Eb (3), never A (9, the old -capoFret result), never C (0)", () => {
    const result = fretboard.getHighlightRootSemitone(baseState({ root: "C", capoFret: 3, capoLabelMode: "relative" }));
    assert.equal(result, 3);
  });
});

// (computeActiveBrightSet tests removed 2026-09-07: the focal-triad/override criteria were
// superseded by feature 003's computeChordToneSet below.)

describe("computeChordToneSet (feature 003)", () => {
  test("returns an empty set when no root is selected", () => {
    assert.deepEqual(fretboard.computeChordToneSet(baseState()), new Set());
  });

  test("AC-3.1.3 — Selected chord's tones are computed from root + quality: absolute pitch classes for E7 in A Ionian", () => {
    const s = baseState({ root: "A", scaleId: "ionian", chordRootOffset: 7, chordQualityId: "dom7" });
    assert.deepEqual(fretboard.computeChordToneSet(s), new Set([4, 8, 11, 2])); // E G# B D
  });

  test("AC-3.2.8 — Chord view shifts with the capo highlight root in Relative mode: set computation", () => {
    const s = baseState({
      root: "C", scaleId: "ionian", chordRootOffset: 0, chordQualityId: "major",
      capoFret: 3, capoLabelMode: "relative",
    });
    assert.deepEqual(fretboard.computeChordToneSet(s), new Set([3, 7, 10])); // Eb G Bb
  });
});

describe("onAfterRender", () => {
  test("registered hooks fire with the rendered appState after render()", () => {
    let seen = null;
    fretboard.onAfterRender((appState) => (seen = appState));
    const s = baseState({ root: "G" });
    fretboard.render(s);
    assert.equal(seen, s);
  });
});

// ---- render(): DOM construction + acceptance scenarios ----

describe("render (US1: base fretboard layout)", () => {
  test("US1 Scenario 1: string 1 (high-E) is at the top, string 6 (low-E) at the bottom", () => {
    fretboard.render(baseState());
    assert.match(noteEl(0, 0).getAttribute("aria-label"), /string 1/);
    assert.match(noteEl(5, 0).getAttribute("aria-label"), /E.*string 6|string 6/);
    assert.equal(Number(noteEl(0, 0).dataset.midiNote), 64); // E4, string1 open
    assert.equal(Number(noteEl(5, 0).dataset.midiNote), 40); // E2, string6 open
  });

  test("US1 Scenario 2: inlay markers exist for the 10 standard fret positions (double-dot at 12/24)", () => {
    fretboard.render(baseState());
    const dots = document.querySelectorAll(".inlay-dot");
    assert.equal(dots.length, 12); // 8 single-dot frets + 2 double-dot frets x2
  });

  test("US1 Scenario 3: an active note carries both a color cue (role-*) and a non-color cue (is-root) together", () => {
    fretboard.render(baseState({ root: "C", scaleId: "ionian" }));
    const g = noteEl(0, 0); // open high E string -> pitch class E, not root of C
    const rootNote = [...document.querySelectorAll(".note")].find((el) => el.classList.contains("is-root"));
    assert.ok(rootNote);
    assert.ok([...rootNote.classList].some((c) => c.startsWith("role-")));
  });

  test("US1 Scenario 4: open strings are visually distinct via the open-string class", () => {
    fretboard.render(baseState());
    assert.ok(noteEl(0, 0).classList.contains("open-string"));
    assert.ok(!noteEl(0, 1).classList.contains("open-string"));
  });

  test("US1 Scenario 5 (UAT round 2 section B, Clarification 2026-07-19): marker dots stay at their TRUE PHYSICAL fret columns under an active capo + Relative renumbering, never remapped or missing", () => {
    const markerFrets = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];

    fretboard.render(baseState({ capoFret: 3, capoLabelMode: "relative", fretRange: { lowerBound: 3, upperBound: 24 } }));

    // All 10 marker positions still present (12 dot circles: 8 single + 2 double x2).
    const dots = [...document.querySelectorAll(".inlay-dot")];
    assert.equal(dots.length, 12);

    const dotCxValues = dots.map((el) => Number(el.getAttribute("cx")));
    for (const f of markerFrets) {
      const physicalColumnCx = Number(noteEl(0, f).querySelector(".note-marker").getAttribute("cx"));
      assert.ok(
        dotCxValues.some((cx) => Math.abs(cx - physicalColumnCx) < 0.01),
        `expected an inlay dot at fret ${f}'s true physical column (cx=${physicalColumnCx}), matching the note-marker's own column - dots must never be keyed off the Relative-mode renumbered fret text`
      );
    }
  });
});

describe("render (US2: tuning change recalculation)", () => {
  test("US2 Scenario 1/2: switching to Drop D retunes string 6's open note to D2 (MIDI 38)", () => {
    fretboard.render(baseState({ tuning: { presetId: "drop-d", customOpenPitchClasses: null, customOpenOctaves: null } }));
    assert.equal(Number(noteEl(5, 0).dataset.midiNote), 38);
  });

  test("US2 Scenario 5: a Custom tuning recalculates every string's pitch", () => {
    fretboard.render(
      baseState({
        tuning: {
          presetId: "custom",
          customOpenPitchClasses: ["D", "A", "F", "C", "G", "D"],
          customOpenOctaves: [4, 3, 3, 3, 2, 2],
        },
      })
    );
    assert.equal(noteEl(0, 0).dataset.pitchClassSemitone, "2"); // D
    assert.equal(noteEl(3, 0).dataset.pitchClassSemitone, "0"); // C
  });
});

describe("render (US3: root selection)", () => {
  test("US3 Scenario 1: every occurrence of the selected root is highlighted", () => {
    fretboard.render(baseState({ root: "C", scaleId: "ionian" }));
    for (let s = 0; s < 6; s++) {
      for (let f = 0; f <= 24; f++) {
        const isC = noteEl(s, f).dataset.pitchClassSemitone === "0";
        assert.equal(noteEl(s, f).classList.contains("is-root"), isC);
      }
    }
  });

  test("US3 Scenario 2: sharp/flat toggle changes label spelling without changing pitch/highlight", () => {
    // string 1 (open E, semitone 4) + fret 9 -> semitone 1 (C#/Db), non-diatonic to F major either way.
    fretboard.render(baseState({ root: "F", scaleId: "ionian", accidentalPreference: "sharp" }));
    const sharpLabel = noteEl(0, 9).textContent;
    fretboard.render(baseState({ root: "F", scaleId: "ionian", accidentalPreference: "flat" }));
    const flatLabel = noteEl(0, 9).textContent;
    assert.notEqual(sharpLabel, flatLabel);
    assert.equal(noteEl(0, 9).dataset.pitchClassSemitone, "1"); // pitch unchanged
  });
});

describe("render (US4: scale/mode highlighting)", () => {
  test("US4 Scenario 1: exactly the 7 C-Major semitones are marked diatonic, no more no fewer", () => {
    fretboard.render(baseState({ root: "C", scaleId: "ionian" }));
    const diatonicSemitones = new Set([0, 2, 4, 5, 7, 9, 11]);
    for (let f = 0; f <= 12; f++) {
      const g = noteEl(0, f);
      const expected = diatonicSemitones.has(Number(g.dataset.pitchClassSemitone));
      assert.equal(g.classList.contains("is-diatonic"), expected);
    }
  });

  test("US4 Scenario 2: switching scale leaves no stale role classes from the prior scale", () => {
    // string 1 (open E, semitone 4) + fret 9 -> semitone 1 (C#/Db)
    fretboard.render(baseState({ root: "C", scaleId: "ionian" }));
    const g = noteEl(0, 9); // C#/Db - non-diatonic in C Ionian
    assert.ok(![...g.classList].some((c) => c.startsWith("role-")));

    fretboard.render(baseState({ root: "C", scaleId: "locrian" })); // b2 is diatonic in C Locrian
    assert.ok(g.classList.contains("is-diatonic"));
    assert.equal([...g.classList].filter((c) => c.startsWith("role-")).length, 1);
    assert.ok(g.classList.contains("role-b2"));
  });
});

// (The US5 focal-point render tests that stood here were removed 2026-09-07:
// the focal-point criteria were superseded by feature 003's Chord view, tested below.)

describe("render (feature 003: Chord view filtering)", () => {
  const gMajorInC = { root: "C", scaleId: "ionian", viewMode: "chord", chordRootOffset: 7, chordQualityId: "major" };

  test("AC-3.2.2 — Chord view fully renders only the chord's tones", () => {
    fretboard.render(baseState(gMajorInC)); // G B D
    const chordSemitones = new Set([7, 11, 2]);
    for (let f = 0; f <= 24; f++) {
      const g = noteEl(0, f);
      const semitone = Number(g.dataset.pitchClassSemitone);
      assert.equal(g.classList.contains("is-chord-tone"), chordSemitones.has(semitone));
      if (chordSemitones.has(semitone)) {
        assert.notEqual(g.querySelector(".note-label").textContent, "", "chord tones keep their label");
        assert.ok(!g.classList.contains("is-ghost"));
        assert.ok(!g.classList.contains("chord-hidden"));
      }
    }
  });

  test("AC-3.2.2 — Chord view fully renders only the chord's tones: out-of-scale chord tones render fully too", () => {
    // Bb major (bVII borrowed) in C Ionian: Bb (10) is outside the scale.
    fretboard.render(baseState({ root: "C", scaleId: "ionian", viewMode: "chord", chordRootOffset: 10, chordQualityId: "major" }));
    const bb = [...document.querySelectorAll(".note")].find((el) => el.dataset.pitchClassSemitone === "10");
    assert.ok(bb.classList.contains("is-chord-tone"));
    assert.ok(!bb.classList.contains("chord-hidden"));
    assert.notEqual(bb.querySelector(".note-label").textContent, "");
  });

  test("AC-3.2.3 — Chord view ghosts the remaining scale tones", () => {
    fretboard.render(baseState(gMajorInC));
    const ghostSemitones = new Set([0, 4, 5, 9]); // C E F A: in scale, not in G major
    for (let f = 0; f <= 24; f++) {
      const g = noteEl(0, f);
      const semitone = Number(g.dataset.pitchClassSemitone);
      assert.equal(g.classList.contains("is-ghost"), ghostSemitones.has(semitone));
      if (ghostSemitones.has(semitone)) {
        assert.equal(g.querySelector(".note-label").textContent, "", "ghosts are unlabelled");
      }
    }
  });

  test("AC-3.2.4 — Chord view hides non-scale non-chord notes", () => {
    fretboard.render(baseState(gMajorInC));
    const hiddenSemitones = new Set([1, 3, 6, 8, 10]); // chromatic to C major, not in G major
    for (let f = 0; f <= 24; f++) {
      const g = noteEl(0, f);
      const semitone = Number(g.dataset.pitchClassSemitone);
      assert.equal(g.classList.contains("chord-hidden"), hiddenSemitones.has(semitone));
    }
  });

  test("AC-3.2.7 — Ghost dots remain non-interactive for selection but stay accessible", async () => {
    fretboard.render(baseState(gMajorInC));
    const ghost = [...document.querySelectorAll(".note.is-ghost")].find(
      (el) => !el.classList.contains("fret-hidden") && el.dataset.isPlayable === "true"
    );
    assert.ok(ghost, "expected a visible playable ghost");
    assert.ok(ghost.getAttribute("aria-label").length > 0, "ghost keeps an accessible name");
    const expectedMidi = Number(ghost.dataset.midiNote);
    const before = instrumentPlayCalls.length;
    ghost.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flush();
    assert.equal(instrumentPlayCalls.length, before + 1);
    assert.equal(instrumentPlayCalls[before], expectedMidi);

    const hidden = [...document.querySelectorAll(".note.chord-hidden")];
    assert.ok(hidden.length > 0);
    for (const el of hidden) assert.equal(el.getAttribute("tabindex"), "-1", "hidden notes leave the tab order");
  });

  test("AC-3.2.5 — Scale view is unchanged by chord selection", () => {
    fretboard.render(baseState({ root: "C", scaleId: "ionian", viewMode: "scale", chordRootOffset: 7, chordQualityId: "major" }));
    const withChordA = [...document.querySelectorAll(".note")].map((el) => `${el.className.baseVal || el.getAttribute("class")}|${el.textContent}`);
    fretboard.render(baseState({ root: "C", scaleId: "ionian", viewMode: "scale", chordRootOffset: 2, chordQualityId: "min9" }));
    const withChordB = [...document.querySelectorAll(".note")].map((el) => `${el.className.baseVal || el.getAttribute("class")}|${el.textContent}`);
    assert.deepEqual(withChordA, withChordB);
    // And no chord-view or legacy bright classes leak into Scale view.
    assert.equal(document.querySelectorAll(".is-chord-tone, .is-ghost, .chord-hidden, .is-bright").length, 0);
  });

  test("AC-3.2.6 — Clicking a note plays its pitch in both views", async () => {
    for (const viewMode of ["scale", "chord"]) {
      state.load();
      fretboard.render(baseState({ root: "C", scaleId: "ionian", viewMode }));
      const g = noteEl(0, 5);
      const expectedMidi = Number(g.dataset.midiNote);
      const before = instrumentPlayCalls.length;
      const stateBefore = JSON.stringify(state.getState());
      g.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
      await flush();
      assert.equal(instrumentPlayCalls.length, before + 1, `${viewMode}: audio played`);
      assert.equal(instrumentPlayCalls[before], expectedMidi);
      assert.equal(JSON.stringify(state.getState()), stateBefore, `${viewMode}: click never changes any selection`);
    }
  });

  test("AC-3.2.8 — Chord view shifts with the capo highlight root in Relative mode", () => {
    fretboard.render(baseState({
      root: "C", scaleId: "ionian", viewMode: "chord", chordRootOffset: 0, chordQualityId: "major",
      capoFret: 3, capoLabelMode: "relative", fretRange: { lowerBound: 3, upperBound: 24 },
    }));
    const chordSemitones = new Set([3, 7, 10]); // Eb G Bb — shifted with the highlight root
    for (const el of document.querySelectorAll(".note")) {
      assert.equal(
        el.classList.contains("is-chord-tone"),
        chordSemitones.has(Number(el.dataset.pitchClassSemitone))
      );
    }
  });
});

describe("render (US6: label modes)", () => {
  test("US6 Scenario 1: the base note-name layer is always populated, even with no scale selected", () => {
    fretboard.render(baseState());
    assert.equal(noteEl(0, 0).textContent, "E");
  });

  test("US6 Scenario 3: Degrees mode shows scale-degree tokens for diatonic notes", () => {
    fretboard.render(baseState({ root: "C", scaleId: "dorian", labelMode: "degrees" }));
    const g = noteEl(0, 1); // D on high-E string, degree 2 of C Dorian... use a b3 example instead
    // Eb (semitone 3) is the b3 of C Dorian
    const ebNote = [...document.querySelectorAll(".note")].find(
      (el) => el.dataset.pitchClassSemitone === "3" && el.classList.contains("is-diatonic")
    );
    assert.equal(ebNote.textContent, "b3");
  });

  test("US6 Scenario 4: Intervals mode shows interval shorthand for diatonic notes", () => {
    fretboard.render(baseState({ root: "C", scaleId: "ionian", labelMode: "intervals" }));
    const rootNote = [...document.querySelectorAll(".note")].find((el) => el.classList.contains("is-root"));
    assert.equal(rootNote.textContent, "R");
  });

  test("US6 Scenario 5: the root is distinguished by color-role + a secondary indicator in every label mode", () => {
    for (const labelMode of ["notes", "degrees", "intervals"]) {
      fretboard.render(baseState({ root: "C", scaleId: "ionian", labelMode }));
      const rootNote = [...document.querySelectorAll(".note")].find((el) => el.classList.contains("is-root"));
      assert.ok(rootNote.classList.contains("role-1"));
    }
  });

  test("non-diatonic notes always show their letter name regardless of label mode", () => {
    // string 1 (open E, semitone 4) + fret 9 -> semitone 1 (C#/Db), non-diatonic to C major
    fretboard.render(baseState({ root: "C", scaleId: "ionian", labelMode: "degrees" }));
    const g = noteEl(0, 9);
    assert.equal(g.textContent, "C#");
  });
});

describe("render (US7: fret-range visibility)", () => {
  test("US7 Scenario 2: narrowing the left bound hides frets below it without affecting pitch data", () => {
    fretboard.render(baseState({ fretRange: { lowerBound: 5, upperBound: 24 } }));
    assert.ok(noteEl(0, 4).classList.contains("fret-hidden"));
    assert.ok(!noteEl(0, 5).classList.contains("fret-hidden"));
  });

  test("US7 Scenario 3: narrowing the right bound hides frets above it", () => {
    fretboard.render(baseState({ fretRange: { lowerBound: 0, upperBound: 12 } }));
    assert.ok(!noteEl(0, 12).classList.contains("fret-hidden"));
    assert.ok(noteEl(0, 13).classList.contains("fret-hidden"));
  });

  test("hidden frets are not keyboard-focusable", () => {
    fretboard.render(baseState({ fretRange: { lowerBound: 5, upperBound: 10 } }));
    assert.equal(noteEl(0, 4).getAttribute("tabindex"), "-1");
    assert.equal(noteEl(0, 6).getAttribute("tabindex"), "0");
  });

  function markerCx(s, f) {
    return Number(noteEl(s, f).querySelector(".note-marker").getAttribute("cx"));
  }

  test("FR-043 (UAT round 1 section C1): fret spacing scales inversely with the number of visible frets, total width stays fixed", () => {
    fretboard.render(baseState({ fretRange: { lowerBound: 0, upperBound: 24 } }));
    const fullRangeSvg = document.getElementById("fretboard");
    const fullRangeViewBox = fullRangeSvg.getAttribute("viewBox");
    const wideSpacing = markerCx(0, 2) - markerCx(0, 1);

    fretboard.render(baseState({ fretRange: { lowerBound: 0, upperBound: 5 } }));
    const narrowRangeViewBox = document.getElementById("fretboard").getAttribute("viewBox");
    const narrowSpacing = markerCx(0, 2) - markerCx(0, 1);

    // Total SVG size (viewBox) never changes with the visible range.
    assert.equal(narrowRangeViewBox, fullRangeViewBox);
    // But a narrower visible range spreads its frets out more (section C1).
    assert.ok(narrowSpacing > wideSpacing, `expected narrow spacing (${narrowSpacing}) > wide spacing (${wideSpacing})`);
  });

  test("FR-043: a fully out-of-view fret is still assigned a finite position (never crashes) even though it's hidden", () => {
    fretboard.render(baseState({ fretRange: { lowerBound: 5, upperBound: 10 } }));
    assert.ok(Number.isFinite(markerCx(0, 20)));
  });
});

describe("render (FR-046, UAT round 1 sections C5/E: fret-position numbers)", () => {
  test("shows fret-number labels only at standard marker positions within the visible range, top and bottom", () => {
    fretboard.render(baseState({ fretRange: { lowerBound: 0, upperBound: 24 } }));
    const topTexts = [...document.querySelectorAll(".fret-numbers-top .fret-number")].map((el) => el.textContent);
    const bottomTexts = [...document.querySelectorAll(".fret-numbers-bottom .fret-number")].map((el) => el.textContent);
    assert.deepEqual(topTexts, ["3", "5", "7", "9", "12", "15", "17", "19", "21", "24"]);
    assert.deepEqual(bottomTexts, topTexts);
  });

  test("marker frets outside the visible range are not labeled", () => {
    fretboard.render(baseState({ fretRange: { lowerBound: 0, upperBound: 10 } }));
    const topTexts = [...document.querySelectorAll(".fret-numbers-top .fret-number")].map((el) => el.textContent);
    assert.deepEqual(topTexts, ["3", "5", "7", "9"]);
  });

  test("Absolute mode shows the true physical fret number; Relative mode shows physicalFret - capoFret", () => {
    fretboard.render(baseState({ capoFret: 3, capoLabelMode: "absolute", fretRange: { lowerBound: 3, upperBound: 24 } }));
    const absoluteTexts = [...document.querySelectorAll(".fret-numbers-top .fret-number")].map((el) => el.textContent);
    assert.deepEqual(absoluteTexts, ["3", "5", "7", "9", "12", "15", "17", "19", "21", "24"]);

    fretboard.render(baseState({ capoFret: 3, capoLabelMode: "relative", fretRange: { lowerBound: 3, upperBound: 24 } }));
    const relativeTexts = [...document.querySelectorAll(".fret-numbers-top .fret-number")].map((el) => el.textContent);
    assert.deepEqual(relativeTexts, ["0", "2", "4", "6", "9", "12", "14", "16", "18", "21"]);
  });
});

describe("render (US8: audio playback wiring)", () => {
  test("US8 Scenario 1: clicking a playable fret plays its true sounding MIDI pitch", async () => {
    fretboard.render(baseState());
    const g = noteEl(0, 5);
    const expectedMidi = Number(g.dataset.midiNote);
    g.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flush();
    assert.ok(instrumentPlayCalls.includes(expectedMidi));
  });

  test("US8: Enter/Space keydown also triggers playback (keyboard accessibility)", async () => {
    fretboard.render(baseState());
    const g = noteEl(1, 3);
    const expectedMidi = Number(g.dataset.midiNote);
    const before = instrumentPlayCalls.length;
    g.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await flush();
    assert.equal(instrumentPlayCalls.length, before + 1);
    assert.equal(instrumentPlayCalls[before], expectedMidi);
  });

  test("FR-033: a muted fret below an active capo does not trigger playback", async () => {
    fretboard.render(baseState({ capoFret: 3 }));
    const g = noteEl(0, 1); // below capo -> muted
    assert.equal(g.dataset.isPlayable, "false");
    const before = instrumentPlayCalls.length;
    g.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flush();
    assert.equal(instrumentPlayCalls.length, before);
  });
});

describe("render (US9: capo mechanics)", () => {
  test("US9 Scenario 1: frets below the capo are muted", () => {
    fretboard.render(baseState({ capoFret: 3 }));
    assert.equal(noteEl(0, 0).dataset.isPlayable, "false");
    assert.equal(noteEl(0, 2).dataset.isPlayable, "false");
    assert.equal(noteEl(0, 3).dataset.isPlayable, "true");
  });

  test("US9 Scenarios 2/3: Absolute shows true pitch (C) at capo-3 on the A string; Relative shows the open reference (A)", () => {
    const aStringIndex = 4; // standard tuning string 5 = A
    const absolute = baseState({ tuning: { presetId: "standard", customOpenPitchClasses: null, customOpenOctaves: null }, capoFret: 3, capoLabelMode: "absolute" });
    fretboard.render(absolute);
    assert.equal(noteEl(aStringIndex, 3).textContent, "C");

    const relative = baseState({ tuning: { presetId: "standard", customOpenPitchClasses: null, customOpenOctaves: null }, capoFret: 3, capoLabelMode: "relative" });
    fretboard.render(relative);
    assert.equal(noteEl(aStringIndex, 3).textContent, "A");
  });

  test("US9 Scenario 4: 2 frets above capo-3 on the A string reads B in Relative and D in Absolute", () => {
    const aStringIndex = 4;
    fretboard.render(baseState({ capoFret: 3, capoLabelMode: "relative" }));
    assert.equal(noteEl(aStringIndex, 5).textContent, "B");

    fretboard.render(baseState({ capoFret: 3, capoLabelMode: "absolute" }));
    assert.equal(noteEl(aStringIndex, 5).textContent, "D");
  });

  function snapshotRoles() {
    return [...document.querySelectorAll(".note")].map((el) => ({
      pitchClassSemitone: el.dataset.pitchClassSemitone,
      isDiatonic: el.classList.contains("is-diatonic"),
      isRoot: el.classList.contains("is-root"),
      isChordTone: el.classList.contains("is-chord-tone"),
      role: [...el.classList].find((c) => c.startsWith("role-")) || null,
    }));
  }

  // Scenarios 7-10 (corrected, UAT round 2 section A): highlighting shifts
  // by +capoFret ONLY when capo>0 AND Relative mode is active - this
  // replaces the prior (superseded) test asserting highlighting NEVER
  // shifts at all.

  test("Scenario 7: capo=0, Absolute/Relative highlighting snapshots are identical regardless of label mode", () => {
    fretboard.render(baseState({ root: "C", scaleId: "ionian", capoFret: 0, capoLabelMode: "absolute" }));
    const absoluteSnapshot = snapshotRoles();
    fretboard.render(baseState({ root: "C", scaleId: "ionian", capoFret: 0, capoLabelMode: "relative" }));
    const relativeSnapshot = snapshotRoles();
    assert.deepEqual(absoluteSnapshot, relativeSnapshot);
  });

  test("Scenario 8: capo=3, Absolute mode - highlighting matches the unshifted (capo=0) snapshot", () => {
    fretboard.render(baseState({ root: "C", scaleId: "ionian", capoFret: 0, capoLabelMode: "absolute" }));
    const unshiftedSnapshot = snapshotRoles();
    fretboard.render(baseState({ root: "C", scaleId: "ionian", capoFret: 3, capoLabelMode: "absolute" }));
    const capoAbsoluteSnapshot = snapshotRoles();
    assert.deepEqual(capoAbsoluteSnapshot, unshiftedSnapshot);
  });

  test("Scenarios 9/10: capo=3, Relative mode - root marker/diatonic set/chord-tone set all shift to Eb (3), never stay on C (0) or shift to A (9)", () => {
    fretboard.render(baseState({ root: "C", scaleId: "ionian", capoFret: 3, capoLabelMode: "relative", viewMode: "chord", chordRootOffset: 0, chordQualityId: "major" }));

    const eb = [...document.querySelectorAll(".note")].find((el) => el.dataset.pitchClassSemitone === "3");
    const c = [...document.querySelectorAll(".note")].find((el) => el.dataset.pitchClassSemitone === "0");
    const a = [...document.querySelectorAll(".note")].find((el) => el.dataset.pitchClassSemitone === "9");

    // Eb is now the highlighted root: root marker, role-1, and (chord view,
    // degree-I major chord) part of the chord-tone set.
    assert.ok(eb.classList.contains("is-root"));
    assert.ok(eb.classList.contains("role-1"));
    assert.ok(eb.classList.contains("is-chord-tone"));

    // C (the true root) is no longer marked as root once shifted.
    assert.ok(!c.classList.contains("is-root"));
    // A (9) - the old, superseded -capoFret result - was never correct and
    // still isn't the root here either.
    assert.ok(!a.classList.contains("is-root"));

    // The shifted diatonic set is Eb major (Eb F G Ab Bb C D), NOT C major
    // and NOT A major.
    const diatonicSemitones = [...document.querySelectorAll(".note")]
      .filter((el) => el.classList.contains("is-diatonic"))
      .map((el) => Number(el.dataset.pitchClassSemitone));
    const uniqueDiatonic = new Set(diatonicSemitones);
    assert.deepEqual(uniqueDiatonic, new Set([3, 5, 7, 8, 10, 0, 2]));
  });

  test("regression (UAT round 2 section A): capo 3 + Relative mode with root=C never highlights F# as diatonic (F# is not diatonic to Eb major either)", () => {
    fretboard.render(baseState({ root: "C", scaleId: "ionian", capoFret: 3, capoLabelMode: "relative" }));
    const fSharp = [...document.querySelectorAll(".note")].find(
      (el) => el.dataset.pitchClassSemitone === "6"
    );
    assert.ok(!fSharp.classList.contains("is-diatonic"));
  });

  test("Scenario 9 note-name text still legitimately differs from the shifted highlighting: the A string at the capo (fret 3) is colored/bordered as root (Eb, semitone 3) but its NOTE-NAME text still reads the as-if-uncapoed shape convention", () => {
    fretboard.render(baseState({ root: "C", scaleId: "ionian", capoFret: 3, capoLabelMode: "absolute" }));
    const absoluteLabel = noteEl(4, 3).textContent;
    fretboard.render(baseState({ root: "C", scaleId: "ionian", capoFret: 3, capoLabelMode: "relative" }));
    const relativeLabel = noteEl(4, 3).textContent;
    assert.notEqual(absoluteLabel, relativeLabel);
  });

  test("regression (UAT round 1 section A): audio always plays true physical pitch regardless of label mode", async () => {
    const absolute = baseState({ root: "C", scaleId: "ionian", capoFret: 3, capoLabelMode: "absolute" });
    fretboard.render(absolute);
    const midiAbsolute = Number(noteEl(4, 3).dataset.midiNote);

    const relative = baseState({ root: "C", scaleId: "ionian", capoFret: 3, capoLabelMode: "relative" });
    fretboard.render(relative);
    const midiRelative = Number(noteEl(4, 3).dataset.midiNote);

    // Same physical fret position -> identical true sounding pitch in both
    // label modes, even though the displayed note NAME differs ("C" vs "A").
    assert.equal(midiAbsolute, midiRelative);

    const before = instrumentPlayCalls.length;
    noteEl(4, 3).dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flush();
    assert.equal(instrumentPlayCalls[instrumentPlayCalls.length - 1], midiRelative);
    assert.equal(instrumentPlayCalls.length, before + 1);
  });

  test("US9 Scenario 6: capo 0 makes Absolute and Relative produce identical labels everywhere", () => {
    fretboard.render(baseState({ capoFret: 0, capoLabelMode: "absolute" }));
    const absoluteLabels = [...document.querySelectorAll(".note")].map((el) => el.textContent);
    fretboard.render(baseState({ capoFret: 0, capoLabelMode: "relative" }));
    const relativeLabels = [...document.querySelectorAll(".note")].map((el) => el.textContent);
    assert.deepEqual(absoluteLabels, relativeLabels);
  });

  test("Scenario 13 (UAT round 2 section C, FR-050): an active capo renders its own position indicator, distinct from the true nut", () => {
    fretboard.render(baseState({ capoFret: 0, fretRange: { lowerBound: 0, upperBound: 24 } }));
    assert.equal(document.querySelectorAll(".nut-line").length, 1);
    assert.equal(document.querySelectorAll(".capo-line").length, 0);

    fretboard.render(baseState({ capoFret: 3, fretRange: { lowerBound: 3, upperBound: 24 } }));
    assert.equal(document.querySelectorAll(".capo-line").length, 1);
    // No true-nut line renders while the capo occupies the left boundary -
    // the two indicators are mutually exclusive, never both shown at once.
    assert.equal(document.querySelectorAll(".nut-line").length, 0);

    // UAT round 3: the capo bar sits to the RIGHT of the capo fret's note
    // markers (the notes that now sound as open strings), matching where a
    // physical capo clamps against the fret wire - not at the left edge of
    // that cell, which made the capo look like it was a fret too low.
    const capoLineX = Number(document.querySelector(".capo-line").getAttribute("x1"));
    const capoFretNoteX = Number(noteEl(0, 3).querySelector(".note-marker").getAttribute("cx"));
    const nextFretNoteX = Number(noteEl(0, 4).querySelector(".note-marker").getAttribute("cx"));
    assert.ok(capoLineX > capoFretNoteX, "capo line renders right of the capo fret's notes");
    assert.ok(capoLineX < nextFretNoteX, "capo line renders left of the next fret's notes");
  });
});

// ---- Circle-of-fifths spelling on the rendered board (T138) ----

describe("circle-of-fifths spelling on the fretboard (FR-009)", () => {
  const SIDE_OF = {
    C: "sharp", G: "sharp", D: "sharp", A: "sharp", E: "sharp", B: "sharp", "F#": "sharp",
    Db: "flat", Ab: "flat", Eb: "flat", Bb: "flat", F: "flat",
  };

  test("AC-1.3.2 — Fixed circle-of-fifths spelling with no manual sharp/flat toggle: rendered note labels never mix sides", () => {
    for (const [root, side] of Object.entries(SIDE_OF)) {
      fretboard.render(baseState({ root, accidentalPreference: side, scaleId: "ionian", labelMode: "notes" }));
      const labels = [...document.querySelectorAll(".note .note-label")]
        .map((el) => el.textContent)
        .filter((text) => text.includes("#") || text.includes("b"));
      assert.ok(labels.length > 0, `${root} Ionian rendered no accidental labels at all`);
      const wrongSide = side === "sharp" ? "b" : "#";
      const offenders = [...new Set(labels.filter((text) => text.includes(wrongSide)))];
      assert.deepEqual(offenders, [], `${root} Ionian is ${side}-side but rendered ${offenders.join(", ")}`);
    }
  });

  test("AC-1.3.2 — Fixed circle-of-fifths spelling with no manual sharp/flat toggle: a chord root renders the same spelling as the board", () => {
    // C is sharp-side: bVII renders A# on the board, so the chord must agree.
    fretboard.render(
      baseState({ root: "C", accidentalPreference: "sharp", scaleId: "ionian", viewMode: "chord", chordRootOffset: 10, chordQualityId: "major" })
    );
    const bVII = [...document.querySelectorAll(".note")].find((el) => el.dataset.pitchClassSemitone === "10");
    assert.equal(bVII.querySelector(".note-label").textContent, "A#");

    // F is flat-side: the same interval renders Eb, never D#.
    fretboard.render(
      baseState({ root: "F", accidentalPreference: "flat", scaleId: "ionian", viewMode: "chord", chordRootOffset: 10, chordQualityId: "major" })
    );
    const flatSide = [...document.querySelectorAll(".note")].find((el) => el.dataset.pitchClassSemitone === "3");
    assert.equal(flatSide.querySelector(".note-label").textContent, "Eb");
  });
});

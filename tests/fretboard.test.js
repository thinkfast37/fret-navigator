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
    focalDegreeSemitone: 0,
    chordToneOverrides: [],
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

  test("US9 binding rule: returns the display root under capo + Relative mode", () => {
    const s = baseState({ root: "C", capoFret: 3, capoLabelMode: "relative" });
    assert.equal(fretboard.getEffectiveRootSemitone(s), 9); // C(0) - 3 -> A(9)
  });

  test("US9 Acceptance Scenario 6: capo 0 makes Absolute/Relative identical", () => {
    const abs = fretboard.getEffectiveRootSemitone(baseState({ root: "E", capoFret: 0, capoLabelMode: "absolute" }));
    const rel = fretboard.getEffectiveRootSemitone(baseState({ root: "E", capoFret: 0, capoLabelMode: "relative" }));
    assert.equal(abs, rel);
  });
});

describe("computeActiveBrightSet", () => {
  test("returns an empty set when no root/scale selected", () => {
    assert.deepEqual(fretboard.computeActiveBrightSet(baseState()), new Set());
  });

  test("US5 Scenario 2: default triad for root focal in C Major is {C,E,G}", () => {
    const s = baseState({ root: "C", scaleId: "ionian", focalDegreeSemitone: 0 });
    assert.deepEqual(fretboard.computeActiveBrightSet(s), new Set([0, 4, 7]));
  });

  test("US5 Scenario 5: chord-tone override builds an Esus4-type voicing (E,A,B)", () => {
    const s = baseState({
      root: "C",
      scaleId: "ionian",
      focalDegreeSemitone: 4, // E
      chordToneOverrides: [
        { semitone: 7, on: false }, // remove G (default 5th of E minor triad)
        { semitone: 9, on: true }, // add A
      ],
    });
    assert.deepEqual(fretboard.computeActiveBrightSet(s), new Set([4, 9, 11]));
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

describe("render (US5: focal-point + chord tones)", () => {
  test("US5 Scenario 2: C Major default focal (root) renders C,E,G bright+bordered and D,F,A,B dark only", () => {
    fretboard.render(baseState({ root: "C", scaleId: "ionian", focalDegreeSemitone: 0 }));
    const brightSemitones = new Set([0, 4, 7]);
    for (let f = 0; f <= 11; f++) {
      const g = noteEl(0, f);
      const semitone = Number(g.dataset.pitchClassSemitone);
      if (!g.classList.contains("is-diatonic")) continue;
      assert.equal(g.classList.contains("is-bright"), brightSemitones.has(semitone));
    }
  });

  test("US5 Scenario 3: clicking E (via focal click simulation) makes E,G,B the new bright (minor) triad", () => {
    state.setRoot("C");
    state.setScaleId("ionian");
    fretboard.render(state.getState());

    // Find a diatonic E (semitone 4) note and click it.
    let clicked = null;
    outer: for (let s = 0; s < 6; s++) {
      for (let f = 0; f <= 24; f++) {
        const g = noteEl(s, f);
        if (g.dataset.pitchClassSemitone === "4" && g.classList.contains("is-diatonic")) {
          clicked = g;
          break outer;
        }
      }
    }
    assert.ok(clicked, "expected to find a diatonic E note");
    clicked.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    assert.equal(state.getState().focalDegreeSemitone, 4);
    const brightSemitones = new Set([4, 7, 11]); // E minor triad
    for (let f = 0; f <= 11; f++) {
      const g = noteEl(0, f);
      if (!g.classList.contains("is-diatonic")) continue;
      assert.equal(g.classList.contains("is-bright"), brightSemitones.has(Number(g.dataset.pitchClassSemitone)));
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

  test("US9 Scenario 7: toggling Absolute<->Relative recalculates the diatonic COLOR set, not just labels", () => {
    // C# (semitone 1) is not diatonic to C major (absolute) but IS diatonic
    // to A major (the display root under capo-3 + relative).
    fretboard.render(baseState({ root: "C", scaleId: "ionian", capoFret: 3, capoLabelMode: "absolute" }));
    const absoluteIsDiatonic = noteEl(0, 1).classList.contains("is-diatonic");

    fretboard.render(baseState({ root: "C", scaleId: "ionian", capoFret: 3, capoLabelMode: "relative" }));
    const relativeIsDiatonic = noteEl(0, 1).classList.contains("is-diatonic");

    assert.notEqual(absoluteIsDiatonic, relativeIsDiatonic);
  });

  test("US9 Scenario 6: capo 0 makes Absolute and Relative produce identical labels everywhere", () => {
    fretboard.render(baseState({ capoFret: 0, capoLabelMode: "absolute" }));
    const absoluteLabels = [...document.querySelectorAll(".note")].map((el) => el.textContent);
    fretboard.render(baseState({ capoFret: 0, capoLabelMode: "relative" }));
    const relativeLabels = [...document.querySelectorAll(".note")].map((el) => el.textContent);
    assert.deepEqual(absoluteLabels, relativeLabels);
  });
});

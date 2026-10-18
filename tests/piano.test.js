// jsdom-based tests for feature 008 (piano mode) per constitution Principle IV: the
// Instrument control, the keyboard drawn by js/keyboard.js through fretboard.render(),
// the key-count control, and piano playback through the real audio.js + piano-sampler.js
// against a recording Web Audio mock and a fetch stand-in for the recordings.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { RecordingAudioContext, allOscillators, allBufferSources, sampleFetchMock } from "./helpers/web-audio-mock.js";

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
  </body></html>`,
  { url: "http://localhost/" }
);
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;

dom.window.AudioContext = RecordingAudioContext;
const recordings = sampleFetchMock();
globalThis.fetch = recordings.fetch;
const soundfontLoads = [];
const samplePlays = [];
dom.window.Soundfont = {
  instrument: (ctx, name) => {
    soundfontLoads.push(name);
    return Promise.resolve({ play: (midiNote, when) => samplePlays.push({ midiNote, when }) });
  },
};

const state = await import("../src/js/state.js");
const fretboard = await import("../src/js/fretboard.js");
const controls = await import("../src/js/controls.js");
const keyboard = await import("../src/js/keyboard.js");

fretboard.render(state.getState());
controls.initControls();

function fire(el, type) {
  el.dispatchEvent(new dom.window.Event(type, { bubbles: true }));
}
function flush() {
  return new Promise((resolve) => setTimeout(resolve, 10));
}
function selectValue(id, value) {
  const select = document.getElementById(id);
  select.value = value;
  fire(select, "change");
}
function selectInstrument(id) {
  selectValue("instrument-select", id);
}
let boardWidth = 0;
Object.defineProperty(document.getElementById("fretboard-container"), "clientWidth", {
  configurable: true,
  get: () => boardWidth,
});
function setBoardWidth(px) {
  boardWidth = px;
  fretboard.render(state.getState());
}
const pianoKeys = () => [...document.querySelectorAll(".piano-key")];
const midiOf = (key) => Number(key.dataset.midiNote);
const isHidden = (id) => document.getElementById(id).hidden;
const STRINGED_ONLY = ["tuning-controls", "capo-controls", "fret-range-controls"];

describe("switching to the piano (feature 008, US1)", () => {
  test("AC-8.1.1/1 — Selecting Piano draws piano keys and no fretboard", () => {
    selectInstrument("piano");
    assert.equal(pianoKeys().length, 88);
    for (const selector of [".string-line", ".fret-line", ".nut-line", ".capo-line", ".inlay-dot", ".fret-number"]) {
      assert.equal(document.querySelectorAll(selector).length, 0, `no ${selector} on the piano`);
    }
    assert.equal(document.querySelectorAll("[id^='note-s']").length, 0, "no fret positions");
    assert.equal(document.getElementById("fretboard").getAttribute("aria-label"), "Piano keyboard");
  });

  test("AC-8.1.1/2 — Selecting a stringed instrument after Piano draws the fretboard again", () => {
    selectInstrument("piano");
    selectInstrument("guitar");
    assert.equal(pianoKeys().length, 0);
    assert.equal(document.querySelectorAll(".string-line").length, 6);
    assert.equal(document.querySelectorAll("[id^='note-s']").length, 6 * 25);
    assert.equal(document.getElementById("fretboard").getAttribute("aria-label"), "Fretboard");

    selectInstrument("piano");
    selectInstrument("ukulele");
    assert.equal(pianoKeys().length, 0);
    assert.equal(document.querySelectorAll(".string-line").length, 4);
    selectInstrument("guitar");
  });

  test("AC-8.1.2/1 — On the piano the tuning, capo, Absolute/Relative and fret-range controls are hidden and the key-count control is shown", () => {
    selectInstrument("piano");
    for (const id of STRINGED_ONLY) assert.equal(isHidden(id), true, `${id} hidden`);
    assert.equal(isHidden("key-count-controls"), false);
    // The Absolute/Relative toggle lives in the hidden capo container; the tuning
    // selector and its Edit button are not built for an instrument with no tuning.
    assert.ok(document.getElementById("capo-controls").querySelector(".capo-label-mode-buttons"));
    assert.equal(document.getElementById("tuning-select"), null);
    assert.equal(document.getElementById("custom-tuning-edit"), null);
    assert.ok(document.getElementById("key-count-select"));
  });

  test("AC-8.1.2/2 — On a stringed instrument the key-count control is hidden and the tuning, capo, Absolute/Relative and fret-range controls are shown", () => {
    for (const id of ["guitar", "ukulele"]) {
      selectInstrument("piano");
      selectInstrument(id);
      for (const container of STRINGED_ONLY) assert.equal(isHidden(container), false, `${container} shown on ${id}`);
      assert.equal(isHidden("key-count-controls"), true, `key count hidden on ${id}`);
      assert.ok(document.getElementById("tuning-select"), `tuning selector rebuilt on ${id}`);
    }
    selectInstrument("guitar");
  });

  test("AC-8.1.3 — Stringed-instrument settings survive a trip to the piano", () => {
    selectInstrument("guitar");
    selectValue("tuning-select", "dadgad");
    selectValue("capo-select", "3");
    document.querySelector('[data-capo-mode="relative"]').click();
    state.setFretRange(3, 15);
    fretboard.render(state.getState());
    const before = JSON.stringify({ tunings: state.getState().tunings, capo: state.getState().capoFret, mode: state.getState().capoLabelMode, range: state.getState().fretRange });

    selectInstrument("piano");
    selectInstrument("guitar");

    const after = JSON.stringify({ tunings: state.getState().tunings, capo: state.getState().capoFret, mode: state.getState().capoLabelMode, range: state.getState().fretRange });
    assert.equal(after, before);
    assert.equal(document.getElementById("tuning-select").value, "dadgad");
    assert.equal(document.getElementById("capo-select").value, "3");
    assert.equal(document.querySelector('[data-capo-mode="relative"]').getAttribute("aria-pressed"), "true");
    assert.equal(Number(document.getElementById("note-s0-f0").dataset.midiNote), 62); // DADGAD string 1 is D4
  });

  test("AC-8.1.4 — The capo never shifts the piano's highlighting", () => {
    // Still capo 3, Relative, from the previous test — on the guitar the highlight root
    // moves up three semitones to Eb.
    state.setRoot("C");
    state.setScaleId("ionian");
    fretboard.render(state.getState());
    assert.equal(fretboard.getHighlightRootSemitone(state.getState()), 3);

    selectInstrument("piano");
    assert.equal(fretboard.getHighlightRootSemitone(state.getState()), 0);
    assert.ok(document.querySelector("#key-60 .note").classList.contains("is-root"), "C4 is the root");
    assert.ok(!document.querySelector("#key-63 .note").classList.contains("is-root"), "Eb4 is not");
    assert.ok(!document.querySelector("#key-63 .note").classList.contains("is-diatonic"), "Eb is outside C Ionian");
    assert.ok(document.querySelector("#key-64 .note").classList.contains("role-3"), "E is the major third of C");
    assert.equal(document.querySelector("#key-62 .note-label").textContent, "D");

    selectInstrument("guitar");
    selectValue("capo-select", "0");
    document.querySelector('[data-capo-mode="absolute"]').click();
    state.setFretRange(0, 24);
    selectValue("tuning-select", "standard");
  });

  // Every class and label a note carries, by pitch class, from whichever board is shown.
  function fretboardByPitchClass() {
    const byPc = new Map();
    for (const g of document.querySelectorAll("[id^='note-s']")) {
      const pc = Number(g.dataset.pitchClassSemitone);
      if (!byPc.has(pc)) byPc.set(pc, describeNote(g, g.querySelector(".note-label")));
    }
    return byPc;
  }
  function describeNote(g, label) {
    const classes = [...g.classList].filter((c) => c.startsWith("is-") || c.startsWith("role-") || c === "chord-hidden");
    return { classes: classes.filter((c) => c !== "is-muted").sort(), label: label.textContent };
  }

  function assertParity(setup) {
    selectInstrument("guitar");
    state.setRoot("C");
    state.setScaleId("ionian");
    state.setViewMode("scale");
    state.setLabelMode("notes");
    setup();
    fretboard.render(state.getState());
    const expected = fretboardByPitchClass();
    assert.equal(expected.size, 12);

    selectInstrument("piano");
    for (const key of pianoKeys()) {
      const pc = midiOf(key) % 12;
      assert.deepEqual(
        describeNote(key.querySelector(".note"), key.querySelector(".note-label")),
        expected.get(pc),
        `key ${midiOf(key)} matches pitch class ${pc} on the fretboard`
      );
    }
  }
  test("AC-8.1.5 — The piano highlights exactly the notes the fretboard highlights: Scale view, note names", () => {
    assertParity(() => {});
  });
  test("AC-8.1.5 — The piano highlights exactly the notes the fretboard highlights: Chord view on V, degree labels", () => {
    assertParity(() => {
      state.setViewMode("chord");
      state.setChordRootOffset(7);
      state.setLabelMode("degrees");
    });
  });
  test("AC-8.1.5 — The piano highlights exactly the notes the fretboard highlights: D Dorian, Chord view on a borrowed bVII, interval labels", () => {
    assertParity(() => {
      state.setRoot("D");
      state.setScaleId("dorian");
      state.setViewMode("chord");
      state.setChordRootOffset(10);
      state.setChordQualityId("dom7");
      state.setLabelMode("intervals");
    });
  });
});

describe("the key count (feature 008, US2)", () => {
  test("AC-8.2.1 — The piano defaults to 88 keys from A0 to C8", () => {
    state.setRoot("C");
    state.setScaleId("ionian");
    state.setViewMode("scale");
    state.setLabelMode("notes");
    selectInstrument("piano");
    assert.equal(state.getState().keyCount, 88);
    assert.equal(document.getElementById("key-count-select").value, "88");
    const midi = pianoKeys().map(midiOf);
    assert.equal(midi.length, 88);
    assert.equal(Math.min(...midi), 21); // A0
    assert.equal(Math.max(...midi), 108); // C8
  });

  function assertSizeSelected(keyCount, low, high) {
    selectInstrument("piano");
    selectValue("key-count-select", String(keyCount));
    assert.equal(state.getState().keyCount, keyCount);
    const midi = pianoKeys().map(midiOf);
    assert.equal(midi.length, keyCount);
    assert.equal(Math.min(...midi), low);
    assert.equal(Math.max(...midi), high);
  }
  test("AC-8.2.2/1 — 25 keys span C3 to C5", () => assertSizeSelected(25, 48, 72));
  test("AC-8.2.2/2 — 37 keys span C3 to C6", () => assertSizeSelected(37, 48, 84));
  test("AC-8.2.2/3 — 49 keys span C2 to C6", () => assertSizeSelected(49, 36, 84));
  test("AC-8.2.2/4 — 61 keys span C2 to C7", () => assertSizeSelected(61, 36, 96));
  test("AC-8.2.2/5 — 76 keys span E1 to G7", () => assertSizeSelected(76, 28, 103));
  test("AC-8.2.2/6 — 88 keys span A0 to C8", () => assertSizeSelected(88, 21, 108));

  test("AC-8.2.3 — The key-count control offers only the standard sizes", () => {
    selectInstrument("piano");
    selectValue("key-count-select", "61");
    const select = document.getElementById("key-count-select");
    assert.deepEqual([...select.options].map((o) => o.value), ["25", "37", "49", "61", "76", "88"]);
    assert.deepEqual([...select.options].map((o) => o.textContent), ["25 keys", "37 keys", "49 keys", "61 keys", "76 keys", "88 keys"]);
    assert.equal(select.value, "61");
    assert.equal(select.getAttribute("aria-label"), "Number of keys");
    selectValue("key-count-select", "88");
  });
});

describe("middle C (feature 008, US2)", () => {
  test("AC-8.2.4 — Middle C is marked on every keyboard size", () => {
    selectInstrument("piano");
    for (const keyCount of [25, 37, 49, 61, 76, 88]) {
      for (const width of [0, 300]) { // one row, and two rows on a narrow board
        state.setKeyCount(keyCount);
        setBoardWidth(width);
        const marked = [...document.querySelectorAll(".piano-key.is-middle-c")];
        assert.deepEqual(marked.map(midiOf), [60], `${keyCount} keys, width ${width}: only C4 is marked`);
        assert.match(marked[0].getAttribute("aria-label"), /^C4, middle C/);

        const captions = [...document.querySelectorAll(".middle-c-caption")];
        assert.equal(captions.length, 1, `${keyCount} keys, width ${width}: one caption`);
        assert.equal(captions[0].textContent, "Middle C");
        // Beneath middle C's own key, in the same row, below the key's bottom edge.
        const body = marked[0].querySelector(".piano-key-body");
        const num = (el, attr) => Number(el.getAttribute(attr));
        assert.equal(num(captions[0], "x"), num(body, "x") + num(body, "width") / 2, "centred under the key");
        assert.ok(num(captions[0], "y") > num(body, "y") + num(body, "height"), "below the key");
        assert.equal(captions[0].closest(".piano-row"), marked[0].closest(".piano-row"), "on middle C's row");
      }
    }
    state.setKeyCount(88);
    setBoardWidth(0);
  });
});

describe("fitting the keyboard (feature 008, US3)", () => {
  const rows = () => [...document.querySelectorAll(".piano-row")];
  const rowMidi = (row) => [...row.querySelectorAll(".piano-key")].map(midiOf).sort((a, b) => a - b);

  test("AC-8.3.1 — The keyboard uses one row when every white key fits", () => {
    selectInstrument("piano");
    setBoardWidth(52 * keyboard.MIN_WHITE_KEY_PX); // exactly the minimum for 52 white keys
    assert.equal(rows().length, 1);
    setBoardWidth(1920);
    assert.equal(rows().length, 1);
    assert.equal(rowMidi(rows()[0]).length, 88);
  });

  test("AC-8.3.2/1 — 88 keys split into A0–B3 on the top row and C4–C8 on the bottom row", () => {
    setBoardWidth(52 * keyboard.MIN_WHITE_KEY_PX - 1);
    const [top, bottom] = rows();
    assert.equal(rows().length, 2);
    const topMidi = rowMidi(top);
    const bottomMidi = rowMidi(bottom);
    assert.deepEqual([topMidi[0], topMidi[topMidi.length - 1]], [21, 59]); // A0–B3
    assert.deepEqual([bottomMidi[0], bottomMidi[bottomMidi.length - 1]], [60, 108]); // C4–C8
    // The top row is drawn above the bottom one.
    const topY = Number(top.querySelector(".piano-key-body").getAttribute("y"));
    const bottomY = Number(bottom.querySelector(".piano-key-body").getAttribute("y"));
    assert.ok(topY < bottomY);
  });

  test("AC-8.3.2/2 — The two rows together hold every key exactly once, in ascending order", () => {
    for (const keyCount of ["25", "61", "88"]) {
      selectValue("key-count-select", keyCount);
      setBoardWidth(100); // far too narrow for one row
      assert.equal(rows().length, 2, `${keyCount} keys in two rows`);
      const all = rows().flatMap(rowMidi);
      assert.equal(all.length, Number(keyCount));
      assert.deepEqual(all, [...all].sort((a, b) => a - b));
      assert.equal(new Set(all).size, all.length);
      assert.equal(rowMidi(rows()[1])[0] % 12, 0, "the bottom row begins on a C");
    }
    selectValue("key-count-select", "88");
    setBoardWidth(0);
  });

  test("AC-8.3.3 — Black keys sit between their neighbouring white keys", () => {
    selectInstrument("piano");
    const body = (midi) => document.querySelector(`#key-${midi} .piano-key-body`);
    const num = (el, attr) => Number(el.getAttribute(attr));
    const whiteWidth = num(body(60), "width");
    const whiteHeight = num(body(60), "height");
    const black = pianoKeys().filter((k) => k.classList.contains("piano-key-black"));
    assert.equal(black.length, 36);
    for (const key of black) {
      const midi = midiOf(key);
      assert.ok([1, 3, 6, 8, 10].includes(midi % 12), `${midi} is a sharp/flat`);
      const below = body(midi - 1);
      const above = body(midi + 1);
      assert.ok(document.getElementById(`key-${midi - 1}`).classList.contains("piano-key-white"));
      assert.ok(document.getElementById(`key-${midi + 1}`).classList.contains("piano-key-white"));
      const rect = body(midi);
      const centre = num(rect, "x") + num(rect, "width") / 2;
      const boundary = num(below, "x") + num(below, "width");
      assert.equal(boundary, num(above, "x"), "the neighbours are adjacent white keys");
      assert.equal(centre, boundary, `${midi} is centred on the boundary`);
      assert.ok(num(rect, "width") < whiteWidth && num(rect, "height") < whiteHeight, "shorter and narrower");
      // Drawn over the white keys: the black layer follows the white layer.
      assert.ok(key.closest(".piano-black-keys"));
    }
    // Groups of two and three: within C4–B4, black keys are C#, D# | F#, G#, A#.
    const octave = black.map(midiOf).filter((m) => m >= 60 && m < 72);
    assert.deepEqual(octave, [61, 63, 66, 68, 70]);
  });
});

describe("piano sound (feature 008, US4)", () => {
  const sourcesSince = (n) => allBufferSources().slice(n);
  const near = (a, b) => Math.abs(a - b) < 0.01;
  // The recording a buffer source plays (its URL's note) and the pitch it sounds at.
  const NOTE_MIDI = { C: 0, Cs: 1, D: 2, Ds: 3, E: 4, F: 5, Fs: 6, G: 7, Gs: 8, A: 9, As: 10, B: 11 };
  const recordingMidi = (source) => {
    const [, note, octave] = source.buffer.source.match(/\/audio\/piano\/([A-G]s?)(\d)\.mp3$/);
    return NOTE_MIDI[note] + (Number(octave) + 1) * 12;
  };
  const soundingHz = (source) => 440 * 2 ** ((recordingMidi(source) - 69) / 12) * source.playbackRate.value;

  test("AC-8.4.1 — Tapping a key plays its exact pitch with the piano voice", async () => {
    selectInstrument("piano");
    const loadsBefore = soundfontLoads.length;
    const playsBefore = samplePlays.length;
    const oscillatorsBefore = allOscillators().length;
    let before = allBufferSources().length;

    document.getElementById("key-60").dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    await flush();
    let played = sourcesSince(before);
    assert.equal(played.length, 1, "one piano note");
    assert.equal(recordingMidi(played[0]), 60, "middle C's own recording");
    assert.ok(near(soundingHz(played[0]), 261.63), "middle C");

    before = allBufferSources().length;
    document.getElementById("key-69").dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await flush();
    played = sourcesSince(before);
    assert.equal(played.length, 1);
    assert.equal(soundingHz(played[0]), 440, "A4 from the keyboard");

    // A key between recordings is re-pitched to its own pitch, in its own octave.
    for (const [midi, hz] of [[22, 29.14], [40, 82.41], [61, 277.18], [107, 3951.07], [108, 4186.01]]) {
      before = allBufferSources().length;
      document.getElementById(`key-${midi}`).dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
      await flush();
      played = sourcesSince(before);
      assert.equal(played.length, 1);
      assert.ok(near(soundingHz(played[0]), hz), `key ${midi} sounds at ${hz} Hz, not ${soundingHz(played[0])}`);
    }

    assert.equal(allOscillators().length, oscillatorsBefore, "no synthesised voice");

    assert.equal(soundfontLoads.length, loadsBefore, "the guitar sample is not loaded");
    assert.equal(samplePlays.length, playsBefore, "the guitar sample is not played");
  });

  test("AC-8.4.3 — The chord Play button strikes every chord tone at once on the piano", async () => {
    selectInstrument("piano");
    state.setRoot("C");
    state.setScaleId("ionian");
    fretboard.render(state.getState()); // chord resets to I — C major
    const playsBefore = samplePlays.length;
    const before = allBufferSources().length;

    document.getElementById("play-chord-button").click();
    await flush();
    const played = sourcesSince(before);
    assert.equal(played.length, 3, "three piano notes");
    const frequencies = played.map((s) => Math.round(soundingHz(s) * 100) / 100);
    assert.deepEqual(frequencies, [130.81, 164.81, 196]); // C3 E3 G3
    assert.equal(new Set(played.map((o) => o.startedAt)).size, 1, "every tone starts at the same instant");
    assert.equal(samplePlays.length, playsBefore, "no guitar sample");
  });

  test("AC-8.4.4 — Stringed instruments keep the guitar sample", async () => {
    for (const id of ["guitar", "ukulele"]) {
      selectInstrument("piano");
      selectInstrument(id);
      const sourcesBefore = allBufferSources().length;
      const recordingRequestsBefore = recordings.requests.length;

      let before = samplePlays.length;
      document.getElementById("play-chord-button").click();
      await flush();
      const chord = samplePlays.slice(before);
      assert.deepEqual(chord.map((p) => p.midiNote), [48, 52, 55], `${id}: C major voicing through the sample`);
      assert.ok(near(chord[1].when - chord[0].when, 0.05) && near(chord[2].when - chord[1].when, 0.05), `${id}: strummed`);

      before = samplePlays.length;
      document.getElementById("note-s0-f3").dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
      await flush();
      assert.equal(samplePlays.length, before + 1, `${id}: a fret plays the sample`);
      assert.equal(allBufferSources().length, sourcesBefore, `${id}: never the piano`);
      assert.equal(recordings.requests.length, recordingRequestsBefore, `${id}: no piano recording fetched`);
    }
    assert.ok(soundfontLoads.every((name) => name === "acoustic_guitar_steel"));
    selectInstrument("guitar");
  });
});

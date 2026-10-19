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
      <div id="key-hue-controls" hidden></div>
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
    for (const keyHue of [true, false]) {
      state.setKeyHue(keyHue);
      for (const keyCount of [25, 37, 49, 61, 76, 88]) {
        for (const width of [0, 300]) { // one row, and two rows on a narrow board
          state.setKeyCount(keyCount);
          setBoardWidth(width);
          const where = `${keyCount} keys, width ${width}, key colours ${keyHue ? "on" : "off"}`;
          const tips = [...document.querySelectorAll(".middle-c-tip")];
          assert.equal(tips.length, 1, `${where}: one tip`);
          const key = tips[0].closest(".piano-key");
          assert.equal(midiOf(key), 60, `${where}: on C4`);
          assert.deepEqual([...document.querySelectorAll(".piano-key.is-middle-c")].map(midiOf), [60]);
          assert.match(key.getAttribute("aria-label"), /^C4, middle C/);

          // Across the bottom of the key, inside it, and under the marker.
          const body = key.querySelector(".piano-key-body");
          const num = (el, attr) => Number(el.getAttribute(attr));
          const bottom = num(body, "y") + num(body, "height");
          assert.ok(num(tips[0], "y") + num(tips[0], "height") <= bottom, `${where}: inside the key`);
          assert.ok(num(tips[0], "y") > num(body, "y") + num(body, "height") / 2, `${where}: at the tip`);
          assert.ok(num(tips[0], "x") >= num(body, "x") && num(tips[0], "width") <= num(body, "width"));
          const children = [...key.children];
          assert.ok(children.indexOf(tips[0]) < children.indexOf(key.querySelector(".note")), `${where}: drawn under the marker`);

          assert.equal(document.querySelectorAll(".middle-c-caption").length, 0, `${where}: no caption`);
        }
      }
    }
    state.setKeyHue(true);
    state.setKeyCount(88);
    setBoardWidth(0);
  });
});

describe("piano key colours (feature 009)", () => {
  const roleOf = (key) => [...key.querySelector(".note").classList].find((c) => c.startsWith("role-"))?.slice(5) ?? null;
  const show = ({ root = "C", scaleId = "ionian", viewMode = "scale" } = {}) => {
    selectInstrument("piano");
    state.setKeyHue(true);
    state.setRoot(root);
    state.setScaleId(scaleId);
    state.setViewMode(viewMode);
    fretboard.render(state.getState());
  };
  const reset = () => {
    state.setRoot("C");
    state.setScaleId("ionian");
    state.setViewMode("scale");
    fretboard.render(state.getState());
  };

  test("AC-9.1.1 — A scale note's key takes its marker's colour", () => {
    for (const [root, scaleId] of [["C", "ionian"], ["D", "dorian"], ["Eb", "aeolian"]]) {
      show({ root, scaleId });
      let tinted = 0;
      for (const key of pianoKeys()) {
        const role = roleOf(key);
        if (!role) continue;
        tinted++;
        assert.equal(key.dataset.hue, "full", `${root} ${scaleId}: key ${midiOf(key)} is tinted`);
        assert.equal(key.dataset.hueRole, role, `${root} ${scaleId}: key ${midiOf(key)} takes its marker's role ${role}`);
      }
      assert.ok(tinted > 0);
    }
    // The root's keys carry the root's colour.
    show({ root: "D", scaleId: "dorian" });
    for (const key of pianoKeys().filter((k) => midiOf(k) % 12 === 2)) assert.equal(key.dataset.hueRole, "1");
    reset();
  });

  test("AC-9.1.3 — Keys outside the scale stay plain", () => {
    show();
    const tinted = pianoKeys().filter((k) => k.dataset.hue);
    const plain = pianoKeys().filter((k) => !k.dataset.hue);
    assert.equal(tinted.length, 52, "C Ionian: all 52 white keys");
    assert.ok(tinted.every((k) => k.classList.contains("piano-key-white")));
    assert.equal(plain.length, 36, "and none of the 36 black keys");
    assert.ok(plain.every((k) => k.classList.contains("piano-key-black") && !("hueRole" in k.dataset)));

    // A non-diatonic key is plain whatever the scale.
    show({ root: "D", scaleId: "dorian" });
    for (const key of pianoKeys()) {
      if (!key.querySelector(".note").classList.contains("is-diatonic")) assert.equal(key.dataset.hue, undefined, `key ${midiOf(key)}`);
    }
    reset();
  });

  test("AC-9.1.4/1 — Chord tones carry the full tint in Chord view", () => {
    show({ viewMode: "chord" }); // C Ionian, chord I — C major
    const pcs = (hue) => [...new Set(pianoKeys().filter((k) => k.dataset.hue === hue).map((k) => midiOf(k) % 12))].sort((a, b) => a - b);
    assert.deepEqual(pcs("full"), [0, 4, 7], "C, E and G");
    for (const key of pianoKeys().filter((k) => k.dataset.hue === "full")) assert.equal(key.dataset.hueRole, roleOf(key));

    // A chord tone outside the scale has no role colour, so its key stays plain.
    state.setChordQualityId("minor"); // C minor: Eb is not in C Ionian
    fretboard.render(state.getState());
    const eb = pianoKeys().find((k) => midiOf(k) === 63);
    assert.ok(eb.querySelector(".note").classList.contains("is-chord-tone"));
    assert.equal(eb.dataset.hue, undefined);
    state.setChordQualityId("major");
    reset();
  });

  test("AC-9.1.4/2 — Ghost scale notes carry a fainter tint in Chord view", () => {
    show({ viewMode: "chord" });
    const ghosts = pianoKeys().filter((k) => k.querySelector(".note").classList.contains("is-ghost"));
    assert.deepEqual([...new Set(ghosts.map((k) => midiOf(k) % 12))].sort((a, b) => a - b), [2, 5, 9, 11], "D, F, A and B");
    for (const key of ghosts) {
      assert.equal(key.dataset.hue, "faint", `key ${midiOf(key)}`);
      assert.equal(key.dataset.hueRole, roleOf(key));
    }
    reset();
  });

  test("AC-9.1.4/3 — Keys whose notes Chord view hides stay plain", () => {
    show({ viewMode: "chord" });
    const hidden = pianoKeys().filter((k) => k.querySelector(".note").classList.contains("chord-hidden"));
    assert.equal(hidden.length, 36, "the black keys, outside C Ionian");
    assert.ok(hidden.every((k) => k.dataset.hue === undefined && k.dataset.hueRole === undefined));
    reset();
  });

  test("AC-9.2.3 — Key colours start on: a first visit shows tinted keys and On pressed", () => {
    localStorage.removeItem("fret-navigator-settings");
    state.load(); // a first visit: no saved settings
    controls.initKeyHueControls();
    selectInstrument("piano");
    const buttons = [...document.querySelectorAll(".key-hue-buttons button")];
    assert.deepEqual(buttons.map((b) => [b.textContent, b.getAttribute("aria-pressed")]), [["On", "true"], ["Off", "false"]]);
    assert.equal(pianoKeys().filter((k) => k.dataset.hue === "full").length, 52, "C Ionian's white keys are tinted");
    selectInstrument("guitar");
  });

  test("AC-9.2.1 — A Key colours toggle appears only on the piano", () => {
    selectInstrument("piano");
    assert.equal(isHidden("key-hue-controls"), false);
    const group = document.querySelector("#key-hue-controls .key-hue-buttons");
    assert.equal(group.getAttribute("aria-label"), "Key colours");
    assert.match(document.getElementById("key-hue-controls").textContent, /Key colours/);
    const buttons = [...group.querySelectorAll("button")];
    assert.deepEqual(buttons.map((b) => b.textContent), ["On", "Off"]);
    assert.deepEqual(buttons.map((b) => b.getAttribute("aria-pressed")), ["true", "false"], "the current choice is pressed");

    for (const id of ["guitar", "ukulele"]) {
      selectInstrument(id);
      assert.equal(isHidden("key-hue-controls"), true, `hidden on ${id}`);
    }
    selectInstrument("guitar");
  });

  test("AC-9.2.2 — Turning key colours off restores plain keys", () => {
    show();
    const [on, off] = document.querySelectorAll(".key-hue-buttons button");
    const looks = () => pianoKeys().map((k) => `${k.querySelector(".note").getAttribute("class")}|${k.querySelector(".note-label").textContent}`);
    const before = looks();

    off.click();
    assert.equal(state.getState().keyHue, false);
    assert.equal(pianoKeys().filter((k) => k.dataset.hue || k.dataset.hueRole).length, 0, "no key is tinted");
    assert.deepEqual([on, off].map((b) => b.getAttribute("aria-pressed")), ["false", "true"]);
    assert.deepEqual(looks(), before, "markers and labels unchanged");
    assert.equal(document.querySelectorAll(".middle-c-tip").length, 1, "middle C's tip unchanged");

    on.click();
    assert.equal(pianoKeys().filter((k) => k.dataset.hue === "full").length, 52, "the tints return");
    assert.deepEqual([on, off].map((b) => b.getAttribute("aria-pressed")), ["true", "false"]);
    selectInstrument("guitar");
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

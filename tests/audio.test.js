// jsdom-based tests for js/audio.js per constitution Principle IV.
// jsdom does not implement the Web Audio API or soundfont-player, so both are
// mocked here: tests assert the CORRECT functions are called with the
// CORRECT arguments (MIDI note, instrument voice), never actual sound output.
//
// audio.js caches its loaded instrument + AudioContext at module scope, so
// these tests run as one linear narrative (load failure -> first successful
// load -> cached reuse) rather than independent, order-agnostic cases.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;

const audioContextInstances = [];
class MockAudioContext {
  constructor() {
    this.state = "suspended";
    this.resumeCallCount = 0;
    this.currentTime = 0;
    audioContextInstances.push(this);
  }
  resume() {
    this.resumeCallCount++;
    this.state = "running";
  }
}
dom.window.AudioContext = MockAudioContext;

function flush() {
  return new Promise((resolve) => setTimeout(resolve, 10));
}

function installSoundfontMock({ shouldFail = false } = {}) {
  const instrumentCalls = [];
  const playCalls = [];
  const scheduleCalls = [];
  const instrument = {
    play: (midiNote, when) => {
      playCalls.push(midiNote);
      scheduleCalls.push({ midiNote, when });
    },
  };
  dom.window.Soundfont = {
    instrument: (ctx, name, opts) => {
      instrumentCalls.push({ ctx, name, opts });
      return shouldFail
        ? Promise.reject(new Error("mock network failure"))
        : Promise.resolve(instrument);
    },
  };
  return { instrumentCalls, playCalls, scheduleCalls, instrument };
}

const audio = await import("../src/js/audio.js");

describe("audio.js (Story 8, FR-028/FR-029/FR-030/FR-031/FR-032/FR-041)", () => {
  test("US8 edge case / FR-041: a failed sample load fires onLoadError and permits a later retry", async () => {
    const failing = installSoundfontMock({ shouldFail: true });
    let errorSeen = null;
    audio.onLoadError((err) => (errorSeen = err));

    audio.play(64);
    await flush();

    assert.equal(failing.instrumentCalls.length, 1);
    assert.ok(errorSeen instanceof Error);
  });

  // From here on, this mock becomes the module's CACHED instrument for the
  // rest of the file (loadInstrument() only calls Soundfont.instrument again
  // on a null/failed cache). Installed inside the test body (not at describe
  // registration time) so it overwrites whatever the previous test left on
  // window.Soundfont.
  let cached;

  test("FR-028/FR-032/FR-041: retries after failure, loads acoustic_guitar_steel via FluidR3_GM, plays the exact MIDI note", async () => {
    cached = installSoundfontMock();
    let loadedOk = false;
    audio.onLoadSuccess(() => (loadedOk = true));

    audio.play(64); // E4
    await flush();

    assert.equal(cached.instrumentCalls.length, 1);
    assert.equal(cached.instrumentCalls[0].name, "acoustic_guitar_steel");
    assert.deepEqual(cached.instrumentCalls[0].opts, { soundfont: "FluidR3_GM" });
    assert.deepEqual(cached.playCalls, [64]);
    assert.equal(loadedOk, true);
  });

  test("FR-029: the same pitch class at different octaves plays audibly distinct MIDI notes", async () => {
    audio.play(40); // open low E2
    audio.play(76); // E5
    await flush();
    assert.deepEqual(cached.playCalls.slice(-2), [40, 76]);
  });

  test("FR-030: the instrument is fetched once and reused, not re-fetched per subsequent trigger", async () => {
    const decoy = installSoundfontMock();
    audio.play(62);
    await flush();

    // The decoy mock must never be reached - the cached instrument is reused.
    assert.equal(decoy.instrumentCalls.length, 0);
    assert.equal(cached.instrumentCalls.length, 1);
    assert.deepEqual(cached.playCalls.slice(-1), [62]);
  });

  test("FR-031: rapid sequential triggers each play cleanly with no cutoff of a prior note", async () => {
    const startLen = cached.playCalls.length;
    audio.play(52);
    audio.play(55);
    audio.play(59);
    await flush();
    assert.deepEqual(cached.playCalls.slice(startLen), [52, 55, 59]);
  });

  test("AC-4.1.1 — Play button strums the selected chord's tones ascending from its root: playChord schedules one voice per note at strum offsets", async () => {
    const startPlay = cached.playCalls.length;
    const startSched = cached.scheduleCalls.length;
    audio.playChord([52, 56, 59, 62]); // E7 voicing
    await flush();

    assert.deepEqual(cached.playCalls.slice(startPlay), [52, 56, 59, 62]);
    const scheduled = cached.scheduleCalls.slice(startSched);
    // Mock clock sits at currentTime=0, so `when` IS the per-note offset:
    // 50 ms apart, low to high (R-403).
    assert.deepEqual(
      scheduled.map((c) => ({ midiNote: c.midiNote, when: Number(c.when.toFixed(2)) })),
      [
        { midiNote: 52, when: 0 },
        { midiNote: 56, when: 0.05 },
        { midiNote: 59, when: 0.1 },
        { midiNote: 62, when: 0.15 },
      ]
    );
  });

  test("constitution Principle III: the AudioContext is created lazily and reused, never duplicated", () => {
    // Every play() above (including the failed one) shares one AudioContext.
    assert.equal(audioContextInstances.length, 1);
    assert.ok(audioContextInstances[0].resumeCallCount >= 1);
  });

  test("AC-1.8.6/1 — A suspended or interrupted context is resumed, and the resume awaited, before the note plays", async () => {
    const ctx = audioContextInstances[0];
    const startPlay = cached.playCalls.length;
    ctx.state = "interrupted"; // iPadOS's non-standard backgrounded state
    let release = null;
    ctx.resume = () =>
      new Promise((resolve) => {
        release = () => {
          ctx.state = "running";
          resolve();
        };
      });

    audio.play(45);
    await flush();
    // The resume has not resolved yet, so the note must not have played.
    assert.ok(release, "resume() was never called for the interrupted context");
    assert.equal(cached.playCalls.length, startPlay);

    release();
    await flush();
    assert.deepEqual(cached.playCalls.slice(startPlay), [45]);
    // Recoverable context: resumed in place, never replaced.
    assert.equal(audioContextInstances.length, 1);
  });

  test("AC-1.8.6/2 — A context that stays stuck after resume is replaced, and the instrument reloads on the replacement", async () => {
    const dead = audioContextInstances[0];
    dead.state = "interrupted";
    dead.resume = () => Promise.resolve(); // resolves but never leaves the stuck state
    let closed = false;
    dead.close = () => {
      closed = true;
      dead.state = "closed";
      return Promise.resolve();
    };
    const reloaded = installSoundfontMock();

    audio.play(52);
    await flush();

    assert.equal(closed, true);
    assert.equal(audioContextInstances.length, 2);
    const fresh = audioContextInstances[1];
    // The soundfont instrument was bound to the dead context, so it must
    // reload against the replacement before the note sounds.
    assert.equal(reloaded.instrumentCalls.length, 1);
    assert.equal(reloaded.instrumentCalls[0].ctx, fresh);
    assert.deepEqual(reloaded.playCalls, [52]);
    assert.ok(fresh.resumeCallCount >= 1);
    assert.equal(fresh.state, "running");
  });
});

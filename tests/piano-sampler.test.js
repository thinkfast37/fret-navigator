// Tests for js/piano-sampler.js (feature 008, R-801 reversed 2026-10-18): the piano voice
// as recorded Salamander Grand Piano samples. Asserts which recording each key plays and
// how it is re-pitched — so every key's sounding pitch and octave is checked — plus the
// Web Audio graph each note builds against a recording mock. Never sound.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { RecordingAudioContext, sampleFetchMock } from "./helpers/web-audio-mock.js";

const fetchMock = sampleFetchMock();
globalThis.fetch = fetchMock.fetch;

const sampler = await import("../src/js/piano-sampler.js");
const { midiToFrequency, keyboardKeys } = await import("../src/js/theory.js");

const TITLE = "AC-8.4.2 — The piano voice is a recorded grand piano, re-pitched to the exact note";
const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const nameOf = (midi) => `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
const flush = () => new Promise((resolve) => setTimeout(resolve, 10));

describe("piano-sampler (feature 008, FR-607)", () => {
  test(`${TITLE}: a bundled recording every three semitones from A0 to A7`, () => {
    assert.equal(sampler.SAMPLE_MIDI_NOTES.length, 29);
    assert.equal(sampler.SAMPLE_MIDI_NOTES[0], 21, "A0");
    assert.equal(sampler.SAMPLE_MIDI_NOTES.at(-1), 105, "A7 — C8's recording is a semitone sharp and left out");
    sampler.SAMPLE_MIDI_NOTES.forEach((m, i) => i && assert.equal(m - sampler.SAMPLE_MIDI_NOTES[i - 1], 3));

    // Every URL names a file that is actually in src/audio/piano/, named for its own note.
    for (const m of sampler.SAMPLE_MIDI_NOTES) {
      const url = sampler.sampleUrl(m);
      assert.ok(existsSync(fileURLToPath(url)), `${url} is bundled`);
      const file = url.split("/").at(-1);
      assert.equal(file.replace("s", "#").replace(".mp3", ""), nameOf(m), `${file} is ${nameOf(m)}`);
    }
    assert.ok(sampler.sampleUrl(60).endsWith("/audio/piano/C4.mp3"), "middle C is C4.mp3");
    assert.ok(sampler.sampleUrl(69).endsWith("/audio/piano/A4.mp3"));
  });

  test(`${TITLE}: every one of the 88 keys sounds at its own pitch and octave`, () => {
    for (const { midiNote } of keyboardKeys(88)) {
      const { sampleMidi, playbackRate } = sampler.sampleFor(midiNote);
      // The recording's pitch times the rate is the key's equal-temperament pitch.
      const sounding = midiToFrequency(sampleMidi) * playbackRate;
      const expected = midiToFrequency(midiNote);
      assert.ok(Math.abs(sounding - expected) < 1e-9 * expected, `${nameOf(midiNote)}: ${sounding} Hz ≠ ${expected} Hz`);
      // Never re-pitched across octaves: at most a semitone, three only for A#7–C8.
      const limit = midiNote > 105 ? 3 : 1;
      assert.ok(Math.abs(midiNote - sampleMidi) <= limit, `${nameOf(midiNote)} plays ${nameOf(sampleMidi)}`);
    }
    // Spot checks in Hz, against the reference values.
    const hz = (m) => midiToFrequency(sampler.sampleFor(m).sampleMidi) * sampler.sampleFor(m).playbackRate;
    assert.ok(Math.abs(hz(21) - 27.5) < 1e-9, "A0");
    assert.ok(Math.abs(hz(60) - 261.6256) < 1e-3, "middle C");
    assert.equal(hz(69), 440, "A4");
    assert.ok(Math.abs(hz(108) - 4186.009) < 1e-2, "C8");
    assert.deepEqual(sampler.sampleFor(60), { sampleMidi: 60, playbackRate: 1 }, "a recorded note plays unaltered");
  });

  test(`${TITLE}: the node graph`, async () => {
    const ctx = new RecordingAudioContext();
    await sampler.load(ctx, [61]);
    await sampler.playNote(ctx, 61, 2); // C#4 at t = 2s, from C4's recording

    const [source] = ctx.bufferSources();
    assert.ok(source.buffer.source.endsWith("/audio/piano/C4.mp3"), "the C4 recording");
    assert.ok(Math.abs(source.playbackRate.value - 2 ** (1 / 12)) < 1e-12, "raised one semitone");
    assert.equal(source.startedAt, 2);
    assert.ok(Math.abs(source.stoppedAt - (2 + sampler.RING_SECONDS + sampler.FADE_SECONDS + 0.05)) < 1e-9);

    // Rings at full volume for RING_SECONDS, then fades over FADE_SECONDS.
    const envelope = ctx.nodes.find((n) => n.kind === "gain");
    assert.ok(source.connections.includes(envelope));
    assert.deepEqual(envelope.gain.events, [
      { type: "set", value: sampler.VOLUME, time: 2 },
      { type: "set", value: sampler.VOLUME, time: 2 + sampler.RING_SECONDS },
      { type: "exponential", value: 0.001, time: 2 + sampler.RING_SECONDS + sampler.FADE_SECONDS },
    ]);

    // Through a compressor to the speakers.
    const compressor = ctx.nodes.find((n) => n.kind === "compressor");
    assert.ok(envelope.connections.includes(compressor));
    assert.ok(compressor.connections.includes(ctx.destination));
  });

  test(`${TITLE}: fetched once, decoded and compressed once per context`, async () => {
    const ctx = new RecordingAudioContext();
    await sampler.load(ctx, [60, 64, 67]);
    await flush(); // the background prefetch of the whole set
    for (const m of [60, 64, 67]) await sampler.playNote(ctx, m, 0);
    assert.equal(ctx.bufferSources().length, 3);
    assert.equal(ctx.nodes.filter((n) => n.kind === "compressor").length, 1);
    assert.equal(ctx.decodeCount, 29, "each recording decoded once on this context");

    // A replacement context (AC-1.8.6) re-decodes the kept bytes; nothing is re-fetched
    // and no node crosses contexts.
    const requestsBefore = fetchMock.requests.length;
    const replacement = new RecordingAudioContext();
    await sampler.load(replacement, [60]);
    await sampler.playNote(replacement, 60, 0);
    await flush();
    assert.equal(fetchMock.requests.length, requestsBefore, "no second download");
    assert.equal(replacement.nodes.filter((n) => n.kind === "compressor").length, 1);
    assert.equal(new Set(fetchMock.requests).size, fetchMock.requests.length, "every recording fetched once");
  });

  test(`${TITLE}: a recording that fails to load rejects, and the next try fetches it again`, async () => {
    // A note whose recording no earlier test has fetched cannot exist — the background
    // prefetch fetched all 29 — so a fresh module instance is loaded for this case.
    const fresh = await import(`../src/js/piano-sampler.js?retry`);
    const url = fresh.sampleUrl(fresh.sampleFor(30).sampleMidi);
    fetchMock.failing.add(url);
    const ctx = new RecordingAudioContext();
    await assert.rejects(fresh.load(ctx, [30]));
    await flush();

    fetchMock.failing.delete(url);
    const before = fetchMock.requests.filter((r) => r === url).length;
    await fresh.load(ctx, [30]);
    await fresh.playNote(ctx, 30, 0);
    assert.equal(fetchMock.requests.filter((r) => r === url).length, before + 1, "retried");
    assert.ok(ctx.bufferSources().at(-1).buffer.source.endsWith("/Fs1.mp3"));
  });
});

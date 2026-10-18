// Tests for js/synth.js (feature 008), the piano voice ported from rhythm-master.
// Asserts the Web Audio graph each note builds against a recording mock — the voice is
// specified by its construction (AC-8.4.2), not by how it sounds.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { RecordingAudioContext } from "./helpers/web-audio-mock.js";

const synth = await import("../src/js/synth.js");

function near(actual, expected, tolerance = 0.01) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≈ ${expected}`);
}

describe("synth.playNote (feature 008, FR-607)", () => {
  test("AC-8.4.2 — The piano voice is rhythm-master's melodic voice", () => {
    const ctx = new RecordingAudioContext();
    synth.playNote(ctx, 69, 1); // A4 at t = 1s

    // Three sine oscillators detuned 0, +5 and -5 cents, at the note's frequency,
    // started at `when` and stopped just after the decay.
    const oscillators = ctx.oscillators();
    assert.equal(oscillators.length, 3);
    assert.deepEqual(oscillators.map((o) => o.detune.value), [0, 5, -5]);
    for (const osc of oscillators) {
      assert.equal(osc.type, "sine");
      assert.deepEqual(osc.frequency.events[0], { type: "set", value: 440, time: 1 });
      assert.equal(osc.startedAt, 1);
      near(osc.stoppedAt, 1 + 0.55 + 0.01);
    }

    // One shared gain envelope: 0.88 peak (split across the 3 voices) after 10 ms, then
    // an exponential decay over 0.55 s.
    const gains = ctx.nodes.filter((n) => n.kind === "gain");
    const envelope = gains.find((g) => g.gain.events.length > 0);
    assert.ok(oscillators.every((o) => o.connections.includes(envelope)));
    const [start, attack, decay] = envelope.gain.events;
    assert.deepEqual(start, { type: "set", value: 0.001, time: 1 });
    assert.equal(attack.type, "linear");
    near(attack.value, 0.88 / 3, 1e-9);
    near(attack.time, 1.01, 1e-9);
    assert.equal(decay.type, "exponential");
    near(decay.time, 1.55, 1e-9);

    // Low-pass sweep 2000 Hz -> 600 Hz over the decay.
    const filter = ctx.nodes.find((n) => n.kind === "biquad");
    assert.equal(filter.type, "lowpass");
    assert.deepEqual(filter.frequency.events[0], { type: "set", value: 2000, time: 1 });
    assert.equal(filter.frequency.events[1].type, "exponential");
    assert.equal(filter.frequency.events[1].value, 600);
    near(filter.frequency.events[1].time, 1.55, 1e-9);
    assert.ok(envelope.connections.includes(filter));

    // Dry to the compressor, wet through the reverb at 35%, compressor to the speakers.
    const compressor = ctx.nodes.find((n) => n.kind === "compressor");
    const reverb = ctx.nodes.find((n) => n.kind === "convolver");
    assert.ok(filter.connections.includes(compressor), "dry path");
    assert.ok(filter.connections.includes(reverb), "wet send");
    assert.ok(reverb.buffer, "synthesised impulse response");
    const wet = gains.find((g) => reverb.connections.includes(g));
    assert.equal(wet.gain.value, 0.35);
    assert.ok(wet.connections.includes(compressor));
    assert.ok(compressor.connections.includes(ctx.destination));
  });

  test("AC-8.4.2 — The piano voice is rhythm-master's melodic voice: the compressor and reverb are built once per context", () => {
    const ctx = new RecordingAudioContext();
    synth.playNote(ctx, 60, 0);
    synth.playNote(ctx, 64, 0);
    assert.equal(ctx.nodes.filter((n) => n.kind === "compressor").length, 1);
    assert.equal(ctx.nodes.filter((n) => n.kind === "convolver").length, 1);
    assert.equal(ctx.oscillators().length, 6);

    // A replacement context (AC-1.8.6) gets its own bus — nodes never cross contexts.
    const replacement = new RecordingAudioContext();
    synth.playNote(replacement, 60, 0);
    assert.equal(replacement.nodes.filter((n) => n.kind === "compressor").length, 1);
  });
});

// Feature 008, FR-607 (AC-8.4.2): the piano voice — a port of rhythm-master's melodic
// voice (src/audio/melodic.js + src/audio/nodes.js), which the maintainer chose over a
// sampled piano (research R-801). Raw Web Audio, nothing to download:
//   3x detuned sine oscillators (chorus)
//     -> shared gain envelope
//     -> low-pass filter sweeping 2000 Hz -> 600 Hz over the decay
//     -> dry path (compressor) + wet send (shared reverb -> compressor)
//
// rhythm-master shapes the envelope per Accent Level; a tap here is one played note, so it
// takes the Strong (accent 3) shape. Pitch arrives as a MIDI note and is converted by
// theory.js, never here.

import { midiToFrequency } from "./theory.js";

export const ENVELOPE = { peak: 0.88, attack: 0.01, decay: 0.55 };

// Gain is divided across the chorus voices so 3 oscillators ≈ one in loudness.
export const CHORUS_DETUNE = [0, 5, -5];

export const REVERB_WET = 0.35;

// The compressor and reverb belong to the context that built them, and connecting across
// contexts throws — so they are cached per context and rebuilt for a replacement one
// (audio.js replaces a dead context, AC-1.8.6).
const buses = new WeakMap();

function busFor(ctx) {
  if (!buses.has(ctx)) buses.set(ctx, { compressor: null, reverb: null });
  return buses.get(ctx);
}

// A stereo room impulse response, synthesised rather than loaded: a noise burst with a
// decaying envelope gives a natural-enough tail and keeps the voice asset-free.
function buildReverbImpulse(ctx) {
  const length = Math.floor(ctx.sampleRate * 1.5); // 1.5s tail
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2;
    }
  }
  return impulse;
}

function ensureCompressor(ctx) {
  const bus = busFor(ctx);
  if (bus.compressor) return bus.compressor;

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value = 8;
  compressor.ratio.value = 3;
  compressor.attack.value = 0.005;
  compressor.release.value = 0.25;
  compressor.connect(ctx.destination);

  bus.compressor = compressor;
  return compressor;
}

function ensureReverb(ctx) {
  const bus = busFor(ctx);
  if (bus.reverb) return bus.reverb;

  const destination = ensureCompressor(ctx);
  const reverb = ctx.createConvolver();
  reverb.buffer = buildReverbImpulse(ctx);
  const reverbWet = ctx.createGain();
  reverbWet.gain.value = REVERB_WET;
  reverb.connect(reverbWet);
  reverbWet.connect(destination);

  bus.reverb = reverb;
  return reverb;
}

// Implements feature 008, FR-607 (AC-8.4.1, AC-8.4.2): schedules one piano note at an
// absolute audio-clock time. Each call is an independent voice, so rapid taps and chord
// tones overlap cleanly.
export function playNote(ctx, midiNote, when) {
  const compressor = ensureCompressor(ctx);
  const reverb = ensureReverb(ctx);
  const frequency = midiToFrequency(midiNote);
  const voices = CHORUS_DETUNE.length;

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0.001, when);
  gainNode.gain.linearRampToValueAtTime(ENVELOPE.peak / voices, when + ENVELOPE.attack);
  gainNode.gain.exponentialRampToValueAtTime(0.001, when + ENVELOPE.decay);

  // Bright at the attack, darkening through the decay.
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2000, when);
  filter.frequency.exponentialRampToValueAtTime(600, when + ENVELOPE.decay);
  filter.Q.value = 0.5;

  gainNode.connect(filter);
  filter.connect(compressor); // dry
  filter.connect(reverb); // wet send

  for (const detune of CHORUS_DETUNE) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, when);
    // A slight downward drift over the decay keeps a note from sounding static.
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.97, when + ENVELOPE.decay);
    osc.detune.value = detune;
    osc.connect(gainNode);
    osc.start(when);
    osc.stop(when + ENVELOPE.decay + 0.01);
  }
}

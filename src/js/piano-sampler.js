// Feature 008, FR-607 (AC-8.4.2, research R-801 reversed 2026-10-18): the piano voice —
// recordings of the Salamander Grand Piano (Alexander Holm, CC BY 3.0), bundled in
// src/audio/piano/ every three semitones from A0 to A7. A key plays the nearest
// recording, re-pitched by playbackRate 2^(semitones/12) to its own pitch and octave:
//   AudioBufferSourceNode -> gain (ring, then fade) -> shared compressor -> speakers
//
// Recordings are fetched on the first piano tap (constitution Principle III), each once;
// the raw bytes are kept so a replacement context (AC-1.8.6) only re-decodes them.

export const SAMPLE_BASE_URL = new URL("../audio/piano/", import.meta.url).href;

// A0 (21) to A7 (105) in minor thirds. C8 (108) is left out: its recording is almost a
// semitone sharp (R-801), so A#7–C8 take A7's.
export const SAMPLE_MIDI_NOTES = Array.from({ length: 29 }, (_, i) => 21 + i * 3);

const FILE_NAMES = ["C", "Cs", "D", "Ds", "E", "F", "Fs", "G", "Gs", "A", "As", "B"];

export const VOLUME = 0.8;
export const RING_SECONDS = 3;
export const FADE_SECONDS = 1;

export function sampleUrl(sampleMidi) {
  return `${SAMPLE_BASE_URL}${FILE_NAMES[sampleMidi % 12]}${Math.floor(sampleMidi / 12) - 1}.mp3`;
}

// Implements AC-8.4.2: the recording a key plays and the rate that puts it at the key's
// pitch. The nearest recording wins; a tie (impossible at a three-semitone spacing) goes
// to the lower one.
export function sampleFor(midiNote) {
  let sampleMidi = SAMPLE_MIDI_NOTES[0];
  for (const candidate of SAMPLE_MIDI_NOTES) {
    if (Math.abs(candidate - midiNote) < Math.abs(sampleMidi - midiNote)) sampleMidi = candidate;
  }
  return { sampleMidi, playbackRate: 2 ** ((midiNote - sampleMidi) / 12) };
}

// sampleMidi -> Promise<ArrayBuffer>, shared by every context. A failed fetch is dropped
// so the next tap retries it (FR-041).
const fetched = new Map();

function fetchSample(sampleMidi) {
  if (!fetched.has(sampleMidi)) {
    const request = fetch(sampleUrl(sampleMidi)).then((response) => {
      if (!response.ok) throw new Error(`piano sample ${sampleMidi}: HTTP ${response.status}`);
      return response.arrayBuffer();
    });
    request.catch(() => fetched.delete(sampleMidi));
    fetched.set(sampleMidi, request);
  }
  return fetched.get(sampleMidi);
}

// Decoded buffers and the compressor belong to the context that built them, so both are
// cached per context and rebuilt for a replacement one.
const perContext = new WeakMap();

function cacheFor(ctx) {
  if (!perContext.has(ctx)) perContext.set(ctx, { buffers: new Map(), compressor: null });
  return perContext.get(ctx);
}

function decodedSample(ctx, sampleMidi) {
  const { buffers } = cacheFor(ctx);
  if (!buffers.has(sampleMidi)) {
    // decodeAudioData detaches its input, so each context decodes its own copy.
    const decoding = fetchSample(sampleMidi).then((bytes) => ctx.decodeAudioData(bytes.slice(0)));
    decoding.catch(() => buffers.delete(sampleMidi));
    buffers.set(sampleMidi, decoding);
  }
  return buffers.get(sampleMidi);
}

function ensureCompressor(ctx) {
  const cache = cacheFor(ctx);
  if (!cache.compressor) {
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -12;
    compressor.knee.value = 6;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;
    compressor.connect(ctx.destination);
    cache.compressor = compressor;
  }
  return cache.compressor;
}

// Implements AC-8.4.2: resolves once every recording the given notes need is decoded on
// this context, and starts fetching the rest of the set in the background so later keys
// are ready. Rejects if a needed recording fails to load.
export function load(ctx, midiNotes) {
  const needed = [...new Set(midiNotes.map((m) => sampleFor(m).sampleMidi))];
  const ready = Promise.all(needed.map((s) => decodedSample(ctx, s)));
  for (const s of SAMPLE_MIDI_NOTES) decodedSample(ctx, s).catch(() => {});
  return ready;
}

// Implements AC-8.4.1/AC-8.4.2/AC-8.4.3: schedules one piano note at an absolute
// audio-clock time. Its recording must already be loaded (load()). Each call is an
// independent voice, so rapid taps and chord tones overlap cleanly.
export async function playNote(ctx, midiNote, when) {
  const { sampleMidi, playbackRate } = sampleFor(midiNote);
  const buffer = await decodedSample(ctx, sampleMidi);

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = playbackRate;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(VOLUME, when);
  gain.gain.setValueAtTime(VOLUME, when + RING_SECONDS);
  gain.gain.exponentialRampToValueAtTime(0.001, when + RING_SECONDS + FADE_SECONDS);

  source.connect(gain);
  gain.connect(ensureCompressor(ctx));
  source.start(when);
  source.stop(when + RING_SECONDS + FADE_SECONDS + 0.05);
}

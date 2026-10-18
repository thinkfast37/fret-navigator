// soundfont-player wrapper: instrument load/cache, play(midiNote).
// AudioContext is created/resumed only inside a user-gesture handler
// (constitution Principle III) - never on load or on any state change.
//
// Feature 008, FR-607: every entry point takes a `voice` — "sample" (the guitar
// soundfont, used by stringed instruments) or "synth" (the piano, synth.js). Both share
// the one context and its stuck/frozen recovery (AC-1.8.6).

import * as synth from "./synth.js";

const INSTRUMENT_NAME = "acoustic_guitar_steel";
const SOUNDFONT = "FluidR3_GM";

let audioContext = null;
let instrumentPromise = null;
let loadErrorListener = null;
let loadSuccessListener = null;

// iPadOS Safari parks a backgrounded context in the non-standard 'interrupted'
// state rather than 'suspended'; both must be recovered alike (AC-1.8.6).
const STUCK_STATES = ["suspended", "interrupted"];

// A context can also report 'running' while its clock has stopped — seen on
// macOS when a Safari web app shares the audio device with Logic Pro, where
// only quitting the app brought sound back. The clock reading taken at each
// tap is compared at the next; no movement across this much wall time means
// the context is dead (AC-1.8.6/3).
const FROZEN_CLOCK_WALL_MS = 250;
let lastClockReading = null;

function createContext() {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  return new AudioContextCtor();
}

function clockHasStopped() {
  if (!lastClockReading || lastClockReading.context !== audioContext) return false;
  if (audioContext.state !== "running") return false;
  const wallMs = performance.now() - lastClockReading.wallMs;
  return wallMs >= FROZEN_CLOCK_WALL_MS && audioContext.currentTime <= lastClockReading.audioTime;
}

function recordClockReading() {
  lastClockReading = { context: audioContext, audioTime: audioContext.currentTime, wallMs: performance.now() };
}

// A dead context's promises need not ever settle — a frozen context's close() or
// resume() can hang, which is silence with no error. Waits are bounded by this.
const SETTLE_TIMEOUT_MS = 500;

function settleWithin(promiseLike, ms) {
  return Promise.race([Promise.resolve(promiseLike), new Promise((resolve) => setTimeout(resolve, ms))]);
}

// Resumes a stuck context, giving up after SETTLE_TIMEOUT_MS. The resume() call
// itself is made synchronously, so it lands inside the caller's gesture.
async function resumeIfStuck(ctx) {
  if (!STUCK_STATES.includes(ctx.state)) return;
  try {
    await settleWithin(ctx.resume(), SETTLE_TIMEOUT_MS);
  } catch {
    // A rejecting resume() leaves the context stuck; the caller decides what next.
  }
}

// Starts a fresh context and closes the old one; the cached instrument is bound
// to the old context, so it is dropped to reload. Everything up to the new
// context's resume() runs synchronously, inside the caller's gesture — Safari
// will not start a context created after an await (constitution Principle III) —
// and the old context's close() is never waited on, since a frozen one may never
// finish closing (T145).
function replaceContext() {
  const old = audioContext;
  try {
    old?.close?.()?.catch?.(() => {});
  } catch {
    // A dead context may refuse even close(); replacement proceeds anyway.
  }
  audioContext = createContext();
  instrumentPromise = null;
  lastClockReading = null;
  return resumeIfStuck(audioContext);
}

// A context can refuse to come back — TV browsers and iOS sometimes leave one
// permanently stuck — and scheduling into a dead context is silence with no
// error. So a context still stuck after the resume attempt is closed and
// replaced (AC-1.8.6/2); the cached instrument is bound to the old context and
// must reload against the replacement.
async function ensureRunningContext() {
  if (!audioContext) audioContext = createContext();
  if (clockHasStopped()) {
    await replaceContext();
    recordClockReading();
    return audioContext;
  }
  // A context whose resume() rejects, hangs, or resolves without leaving the
  // stuck state is equally dead, and is replaced below.
  await resumeIfStuck(audioContext);
  if (STUCK_STATES.includes(audioContext.state)) await replaceContext();
  recordClockReading();
  return audioContext;
}

function loadInstrument() {
  if (!instrumentPromise) {
    instrumentPromise = window.Soundfont.instrument(audioContext, INSTRUMENT_NAME, { soundfont: SOUNDFONT })
      .then((instrument) => {
        if (loadSuccessListener) loadSuccessListener();
        return instrument;
      })
      .catch((err) => {
        instrumentPromise = null; // allow a later tap to retry the load (FR-041)
        if (loadErrorListener) loadErrorListener(err);
        throw err;
      });
  }
  return instrumentPromise;
}

// Implements Story 8, FR-041: registers the non-blocking sample-load-failure indicator
// Registers a callback fired whenever the instrument fails to load, so the
// UI layer can surface a non-blocking error indicator (FR-041).
export function onLoadError(listener) {
  loadErrorListener = listener;
}

// Implements Story 8, FR-041: registers the successful-retry indicator-clear callback
// Registers a callback fired once the instrument successfully loads, so a
// previously-shown error indicator can be cleared on a successful retry.
export function onLoadSuccess(listener) {
  loadSuccessListener = listener;
}

// Implements Story 8, FR-028/FR-029/FR-030/FR-031/FR-032: real-guitar-sample playback
// at the correct absolute pitch, fetched once and reused, on user gesture only.
// Must be called from within a user-gesture handler (click/keydown on a fret
// cell). Each call is an independent voice - soundfont-player does not cut
// off prior notes, so rapid sequential triggers play cleanly without
// improper cutoff (FR-031).
export function play(midiNote, voice = "sample") {
  if (voice === "synth") {
    ensureRunningContext().then((ctx) => synth.playNote(ctx, midiNote, ctx.currentTime));
    return;
  }
  ensureRunningContext()
    .then(() => loadInstrument())
    .then((instrument) => instrument.play(midiNote))
    .catch(() => {
      // Load failure already surfaced via onLoadError; nothing further to do.
    });
}

// Implements feature 004, FR-201/FR-203 (AC-4.1.1, research R-403): strummed
// chord playback. Schedules each MIDI note on the shared AudioContext clock,
// low to high, `strumSeconds` apart, through the same lazily-loaded (and
// retryable, FR-041) instrument as single-note play(). Must be called from
// within a user-gesture handler (constitution Principle III).
// Feature 008 (AC-8.4.3): the piano passes a zero strum and the synth voice, so every
// tone starts at the same instant.
export function playChord(midiNotes, strumSeconds = 0.05, voice = "sample") {
  if (voice === "synth") {
    ensureRunningContext().then((ctx) => {
      const start = ctx.currentTime;
      midiNotes.forEach((midiNote, i) => synth.playNote(ctx, midiNote, start + i * strumSeconds));
    });
    return;
  }
  ensureRunningContext()
    .then((ctx) =>
      loadInstrument().then((instrument) => {
        const start = ctx.currentTime;
        midiNotes.forEach((midiNote, i) => instrument.play(midiNote, start + i * strumSeconds));
      })
    )
    .catch(() => {
      // Load failure already surfaced via onLoadError; nothing further to do.
    });
}

// Implements AC-1.8.7: the footer's "Reset audio" button. Unconditionally
// replaces the context and reloads the instrument, then plays a confirmation
// note (E4) so the guitarist hears that sound is back. Must be called from
// within a user-gesture handler (constitution Principle III).
// Feature 008: in piano mode the confirmation is a piano note.
const CONFIRMATION_MIDI_NOTE = 64;

export async function resetAudio(voice = "sample") {
  await replaceContext();
  recordClockReading();
  if (voice === "synth") {
    synth.playNote(audioContext, CONFIRMATION_MIDI_NOTE, audioContext.currentTime);
    return;
  }
  try {
    const instrument = await loadInstrument();
    instrument.play(CONFIRMATION_MIDI_NOTE);
  } catch {
    // Load failure already surfaced via onLoadError; nothing further to do.
  }
}

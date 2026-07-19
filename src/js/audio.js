// soundfont-player wrapper: instrument load/cache, play(midiNote).
// AudioContext is created/resumed only inside a user-gesture handler
// (constitution Principle III) - never on load or on any state change.

const INSTRUMENT_NAME = "acoustic_guitar_steel";
const SOUNDFONT = "FluidR3_GM";

let audioContext = null;
let instrumentPromise = null;
let loadErrorListener = null;
let loadSuccessListener = null;

function ensureAudioContext() {
  if (!audioContext) {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContextCtor();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
  return audioContext;
}

function loadInstrument() {
  if (!instrumentPromise) {
    const ctx = ensureAudioContext();
    instrumentPromise = window.Soundfont.instrument(ctx, INSTRUMENT_NAME, { soundfont: SOUNDFONT })
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
export function play(midiNote) {
  ensureAudioContext();
  loadInstrument()
    .then((instrument) => instrument.play(midiNote))
    .catch(() => {
      // Load failure already surfaced via onLoadError; nothing further to do.
    });
}

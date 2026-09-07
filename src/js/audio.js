// soundfont-player wrapper: instrument load/cache, play(midiNote).
// AudioContext is created/resumed only inside a user-gesture handler
// (constitution Principle III) - never on load or on any state change.

const INSTRUMENT_NAME = "acoustic_guitar_steel";
const SOUNDFONT = "FluidR3_GM";

let audioContext = null;
let instrumentPromise = null;
let loadErrorListener = null;
let loadSuccessListener = null;

// iPadOS Safari parks a backgrounded context in the non-standard 'interrupted'
// state rather than 'suspended'; both must be recovered alike (AC-1.8.6).
const STUCK_STATES = ["suspended", "interrupted"];

function createContext() {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  return new AudioContextCtor();
}

// A context can refuse to come back — TV browsers and iOS sometimes leave one
// permanently stuck — and scheduling into a dead context is silence with no
// error. So a context still stuck after the resume attempt is closed and
// replaced (AC-1.8.6/2); the cached instrument is bound to the old context and
// must reload against the replacement.
async function ensureRunningContext() {
  if (!audioContext) audioContext = createContext();
  if (STUCK_STATES.includes(audioContext.state)) {
    try {
      await audioContext.resume();
    } catch {
      // Replaced below: a context whose resume() rejects is as dead as one
      // that resolves without leaving the stuck state.
    }
  }
  if (STUCK_STATES.includes(audioContext.state)) {
    try {
      await audioContext.close?.();
    } catch {
      // A dead context may refuse even close(); replacement proceeds anyway.
    }
    audioContext = createContext();
    instrumentPromise = null;
    if (audioContext.state === "suspended") {
      try {
        await audioContext.resume();
      } catch {
        // The caller's gesture has done all it can; the next tap retries.
      }
    }
  }
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
export function play(midiNote) {
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
export function playChord(midiNotes, strumSeconds = 0.05) {
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

// Implements Story 1, FR-039/FR-040: load persisted state once, before the first
// render, then wire controls and the audio-load-failure indicator (FR-041).
// Bootstrap: load persisted state -> init audio -> initial render -> wire controls.

import * as state from "./state.js";
import * as fretboard from "./fretboard.js";
import * as controls from "./controls.js";
import * as audio from "./audio.js";
import * as keyboard from "./keyboard.js";
import * as theory from "./theory.js";

const restoredState = state.load();

fretboard.render(restoredState);
controls.initControls();

audio.onLoadError(() => {
  const banner = document.getElementById("audio-error-banner");
  banner.textContent = "Guitar samples failed to load. Tap a fret to retry.";
  banner.hidden = false;
});

audio.onLoadSuccess(() => {
  document.getElementById("audio-error-banner").hidden = true;
});

// AC-1.8.7: manual backup for silent states the automatic recovery cannot see.
// Feature 008: in piano mode the confirmation note is a piano note.
// AC-1.8.7/3: if the replacement's clock still is not running, no page code can
// bring sound back — only quitting the app restarts Safari's audio for it.
const STUCK_AUDIO_MESSAGE = "Audio is stuck in Safari for this app. Quit the app (⌘Q) and reopen it — reloading won't fix it.";

document.getElementById("audio-reset")?.addEventListener("click", async () => {
  const running = await audio.resetAudio(theory.getInstrument(state.getState().instrument).voice);
  const banner = document.getElementById("audio-error-banner");
  if (running) {
    banner.hidden = true;
  } else {
    banner.textContent = STUCK_AUDIO_MESSAGE;
    banner.hidden = false;
  }
});

// Feature 008, FR-606 (AC-8.3.4): the piano re-fits between one and two rows as the
// window is resized, redrawing only when the fit actually changes.
window.addEventListener("resize", () => {
  const appState = state.getState();
  if (keyboard.needsRefit(appState)) fretboard.render(appState);
});

// Implements Story 1, FR-039/FR-040: load persisted state once, before the first
// render, then wire controls and the audio-load-failure indicator (FR-041).
// Bootstrap: load persisted state -> init audio -> initial render -> wire controls.

import * as state from "./state.js";
import * as fretboard from "./fretboard.js";
import * as controls from "./controls.js";
import * as audio from "./audio.js";

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

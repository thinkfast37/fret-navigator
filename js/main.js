// Bootstrap: load persisted state -> init audio -> initial render -> wire controls.

import * as state from "./state.js";
import * as fretboard from "./fretboard.js";
import * as controls from "./controls.js";

const restoredState = state.load();

fretboard.render(restoredState);
controls.initControls();

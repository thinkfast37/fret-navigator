// Bootstrap: load persisted state -> init audio -> initial render -> wire controls.

import * as state from "./state.js";

const restoredState = state.load();

// Stubbed until Phase 3 (US1) implements js/fretboard.js's render().
// fretboard.render(restoredState);

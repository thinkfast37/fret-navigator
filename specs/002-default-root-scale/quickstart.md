# Quickstart: Validate Default Root & Scale on First Load

## Prerequisites

- Node.js installed (for `node --test`)
- No other setup — this is a static, no-build web app (`src/index.html` + ES modules)

## Automated validation

```bash
node --test tests/state.test.js tests/main.test.js
```

Expected: passing assertions that
- `defaultState()` (or `load()` with no stored settings) returns `root: "C"`, `scaleId: "ionian"`
- Loading with no `localStorage` entry renders the fretboard/controls as if C Ionian were manually selected (not blank)
- Loading with a previously-persisted `root`/`scaleId` still uses the persisted value, not the new default

## Manual end-to-end validation (per constitution IV, supplement to automated tests)

1. Serve `src/index.html` (e.g. `npx serve src` or open the file directly in a browser).
2. Open the page in a **fresh browser profile / incognito window**, or run in devtools console first: `localStorage.removeItem("fret-navigator-settings")`, then reload.
3. **Expected**: without clicking anything, the root selector shows "C", the scale selector shows "Ionian", and the fretboard shows the C Ionian (C major) notes highlighted across the fretboard.
4. Change the root or scale via the controls; confirm the fretboard updates normally (existing behavior, no regression).
5. Reload the page; confirm the just-changed selection persists (loaded from `localStorage`), not reset back to C Ionian.
6. Clear `fret-navigator-settings` from `localStorage` again and reload; confirm it returns to the C Ionian default.

## Reference

- Default values and validation: `src/js/state.js` (`defaultState()`, `isValidStoredState()`)
- Valid root/scale identifiers: `src/js/theory.js` (`ROOTS`, `SCALES`)
- Full requirements: [spec.md](./spec.md)

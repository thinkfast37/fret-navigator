# Implementation Plan: Interactive Guitar Fretboard Visualizer

**Branch**: `001-fretboard-visualizer` | **Date**: 2026-07-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-fretboard-visualizer/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

A single-page, client-side-only interactive fretboard visualizer for guitarists: it renders a
guitar-oriented (not sheet-music-oriented) fretboard as inline SVG, lets the user choose tuning
(named library or custom), root note with enharmonic spelling, scale/mode (from a canonical
degree-formula table), a diatonic focal point with chord-tone overrides, a label mode (Notes /
Degrees / Intervals), a truncated fret-range view, and a capo — with real-guitar-sample audio
playback on every fret click. Technical approach: plain HTML/CSS/vanilla JS with native ES
modules (`<script type="module">`, no bundler/build step), an inline SVG fretboard where each
note is an individually addressable element updated via attribute/class changes, `soundfont-player`
(MIT, CDN-loaded) playing FluidR3_GM guitar samples (CC BY 3.0) for audio, `localStorage` for all
persistence (versioned schema), and a strictly pure, dependency-free `theory.js` module holding
all note/scale/chord/degree/capo math, unit-tested with Node's built-in test runner.

## Technical Context

**Language/Version**: JavaScript (ES2020+), native ES modules via `<script type="module">` — no
transpilation, no bundler, no build step. Runs directly in evergreen browsers.

**Primary Dependencies**: `soundfont-player` (MIT license), loaded via CDN `<script>` tag, playing
Benjamin Gleitzman's pre-rendered FluidR3_GM samples (CC BY 3.0, `acoustic_guitar_steel` voice)
served from the standard `midi-js-soundfonts` CDN. No other runtime dependency; no framework
(React/Vue/etc.).

**Storage**: Browser `localStorage` only — a single versioned (`schemaVersion`) JSON settings
object. No backend, no database, no accounts.

**Testing**: Node.js built-in test runner (`node --test`), zero added dependency, exercising the
pure `theory.js` module directly (no DOM required). UI/rendering/audio layers validated via the
manual `quickstart.md` scenarios per the constitution's lighter bar for that layer.

**Target Platform**: Modern evergreen desktop and mobile browsers (Chrome, Firefox, Safari, Edge)
with Web Audio API, ES module, and SVG support. Static files servable from any host (e.g. GitHub
Pages) — no server runtime.

**Project Type**: Single-page static web application (client-side only, no backend).

**Performance Goals**: Fretboard re-render on any state change (tuning/root/scale/focal/label
mode/fret range/capo) feels instantaneous (no perceptible delay, per SC-002). Audio playback
onset ≤ 30 ms after user interaction, per constitution Principle III.

**Constraints**: No build step or bundler; no UI framework; fully usable offline after first
successful load (SC-007); WCAG AA text contrast; every visual state must be interpretable without
color (shape/border always accompanies color, constitution Principle II + Accessibility section);
`localStorage` schema MUST carry `schemaVersion` with a migration path; the FluidR3_GM sample
source (CC BY 3.0) MUST be credited via a visible, always-accessible credit line (e.g. page footer
or About section), not a one-time or dismissible notice — this satisfies FR-042 and the CC BY 3.0
attribution condition underlying the audio dependency choice in Primary Dependencies above.

**Scale/Scope**: Single user, single page, no concurrency. Fixed reference data: 3 named tuning
groups (D/G/C-Family, ~17 named tunings total) + Custom, 13 scales/modes across 4 categories, up
to 12 chromatic scale-degree color roles, 25 frets (0–24) × 6 strings.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Constraint | Status | Notes |
|---|---|---|
| I. Music Theory Correctness (NON-NEGOTIABLE) | PASS | All note/scale/degree/chord/capo math lives in one pure, side-effect-free `theory.js` module, directly sourced from the Story 4 canonical tables; hard-gated unit tests planned (see Testing above). |
| II. Visualization Consistency | PASS | Single inline-SVG fretboard is the sole source of truth; every control mutates one shared state object and the SVG updates via attribute/class changes, not parallel views. Color-alone encoding is explicitly disallowed (FR-004, FR-024). |
| III. Audio Behavior | PASS | `soundfont-player` wraps the Web Audio API (no external audio library beyond this thin wrapper); playback fires only on direct user interaction (fret click/tap), never on state changes; AudioContext will be created/resumed inside the first user-gesture handler. |
| IV. Testing Standards | PASS | `theory.js` is the hard-gated, exhaustively unit-tested layer (open strings, 12-fret wraparound, enharmonics, all supported tunings, edge frets); rendering/audio layers use lighter manual quickstart validation. |
| V. Simplicity & Scope Discipline | PASS | No backend, no build tooling, single new runtime dependency (`soundfont-player`) with explicit justification (Web Audio API alone would require re-implementing sample loading/playback plumbing); `localStorage`-only persistence with `schemaVersion`. |
| Accessibility & Inclusive Design | PASS (design commitment) | Fret cells get `aria-label`s (e.g. "E4, root, fret 0, string 1"), are keyboard-focusable/activatable, and every highlight state pairs color with shape/border, per FR-004/FR-024 and the constitution's accessibility section. |
| Client-Side Architecture Constraints | PASS | Single serializable state object mirrors the persisted settings schema; no framework is introduced; dependency vetted below (research.md); no secrets/API keys (static site). |

No violations identified — Complexity Tracking table below is not needed.

**Post-Phase-1 re-check**: `research.md` and `data-model.md`/`contracts/` were reviewed against
this table after design — no new dependency, framework, storage mechanism, or architectural
element was introduced beyond what's listed above (still just `soundfont-player` + `localStorage`
+ vanilla JS/SVG). All rows remain PASS with no changes required.

## Project Structure

### Documentation (this feature)

```text
specs/001-fretboard-visualizer/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── theory-api.md
│   └── settings-schema.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
index.html               # Single page: markup shell, control elements, <script type="module"> entry
css/
└── styles.css           # All styling: color roles (bright/dark variants), shape/border indicators,
                          # slider, contrast-compliant text

js/
├── theory.js            # PURE, dependency-free: tuning/note/scale/degree/chord/capo math
                          # (constitution Principle I canonical module — the hard unit-test gate)
├── state.js              # App state shape, defaults, localStorage load/save/migrate (schemaVersion)
├── audio.js               # soundfont-player wrapper: instrument load/cache, play(midiNote),
                            # AudioContext creation/resume inside user-gesture handler
├── fretboard.js            # Inline SVG construction + per-note attribute/class updates driven
                             # purely by current state (no hidden mutable display state)
├── controls.js              # UI event wiring: tuning/root/scale selectors, fret-range slider,
                              # capo control, label-mode toggle, focal-point clicks
└── main.js                   # Bootstrap: load persisted state → init audio → initial render →
                               # wire controls

tests/
└── theory.test.js         # node --test unit tests for js/theory.js: open strings, 12-fret
                            # wraparound, enharmonics, every supported tuning, edge frets (0/12/24)
```

**Structure Decision**: Single static-site project at the repository root (no `src/`, `backend/`,
or `frontend/` split — there is no backend). The music-theory core (`js/theory.js`) is physically
isolated from rendering (`js/fretboard.js`), audio (`js/audio.js`), state/persistence (`js/state.js`),
and UI wiring (`js/controls.js`) so the constitution's hard unit-test gate applies cleanly to one
file with zero DOM or Web Audio dependencies. `index.html` loads `js/main.js` as a native ES module
(`<script type="module" src="js/main.js">`) plus the `soundfont-player` CDN script — no bundler
step is introduced anywhere in this tree.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Not applicable — the Constitution Check above has no violations (initial or post-design).

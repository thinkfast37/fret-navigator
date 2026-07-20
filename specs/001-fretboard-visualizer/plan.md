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

UAT round 2 (`docs/story-drafts/003-uat-round2-fixes.md`) refines two internal-architecture points
without changing this stack: `theory.js` gains a new `getHighlightRootSemitone` function that
determines the effective root used for on-fretboard color/degree-role/degree-label/interval-label/
chord-tone highlighting — shifting only when a capo is active AND Relative label mode is selected
(`+capoFret`, not the earlier, removed `-capoFret` formula) — while `noteAt`/`midiNote` (audio) and
the "Bright notes" chord-quality text summary always stay anchored to the literal selected root
(see `contracts/theory-api.md`). And `css/styles.css`'s existing `:root` custom-property layer
(already used for the 12 chromatic degree-role bright/dark color pairs) is extended to also cover
the handful of still-hardcoded UI-accent colors (root/capo-marker gold, text-on-bright-surface,
error-banner red), so every rendered color has exactly one editable source (see data-model.md's
Design Tokens section) — a pure refactor of where colors are defined, not a new dependency or
build step.

## Technical Context

**Language/Version**: JavaScript (ES2020+), native ES modules via `<script type="module">` — no
transpilation, no bundler, no build step. Runs directly in evergreen browsers.

**Primary Dependencies**: `soundfont-player` (MIT license), loaded via CDN `<script>` tag, playing
Benjamin Gleitzman's pre-rendered FluidR3_GM samples (CC BY 3.0, `acoustic_guitar_steel` voice)
served from the standard `midi-js-soundfonts` CDN. No other runtime dependency; no framework
(React/Vue/etc.).

**Storage**: Browser `localStorage` only — a single versioned (`schemaVersion`) JSON settings
object. No backend, no database, no accounts.

**Testing**: Node.js built-in test runner (`node --test`), exercising the pure `theory.js` module
directly (no DOM required) plus jsdom-based tests (test-only devDependency, never shipped to
users) for `state.js`, `audio.js`, `fretboard.js`, `controls.js`, and `main.js` covering DOM
construction, event wiring, and state transitions. `audio.js` tests mock the Web Audio API and
soundfont-player. Manual `quickstart.md` scenarios remain a supplement for true end-to-end/visual
behavior (actual color rendering, audio timbre) that no automated test can verify.

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
| I. Music Theory Correctness (NON-NEGOTIABLE) | PASS | All note/scale/degree/chord/capo math lives in one pure, side-effect-free `theory.js` module, directly sourced from the Story 4 canonical tables; hard-gated unit tests planned (see Testing above). UAT round 2 section A corrected the capo+Relative highlighting rule: `theory.js` now exports `getHighlightRootSemitone` (root + capoFret, shifted only under capo>0 AND Relative mode) as the sole root input for `getDiatonicSemitones`/`computeDefaultTriad`/`isToggleableChordTone`/`identifyChordQuality`/`getDegreeRole`/`getDegreeLabel`/`getIntervalLabel`, while `noteAt`/`midiNote` and the chord-quality text summary stay anchored to the literal true root always (FR-047/FR-048) — see `contracts/theory-api.md`'s updated rule, which supersedes round 1's "Root stability rule." |
| II. Visualization Consistency | PASS | Single inline-SVG fretboard is the sole source of truth; every control mutates one shared state object and the SVG updates via attribute/class changes, not parallel views. Color-alone encoding is explicitly disallowed (FR-004, FR-024). UAT round 2 section E extends the existing `:root` CSS custom-property layer to cover the remaining UI-accent colors that were still duplicated as raw hex literals across rules, so `css/styles.css` remains the single editable source for every rendered color — no behavior change, purely where colors are defined (FR-052). |
| III. Audio Behavior | PASS | `soundfont-player` wraps the Web Audio API (no external audio library beyond this thin wrapper); playback fires only on direct user interaction (fret click/tap), never on state changes; AudioContext will be created/resumed inside the first user-gesture handler. |
| IV. Testing Standards | PASS | Constitution requires persistent, committed automated tests for ALL modules (`theory.js`, `state.js`, `audio.js`, `fretboard.js`, `controls.js`, `main.js`). `theory.js` meets its exhaustive unit-test hard gate (open strings, 12-fret wraparound, enharmonics, all supported tunings, edge frets) via `tests/theory.test.js` (40 tests). `state.js`, `audio.js`, `fretboard.js`, `controls.js`, and `main.js` now each have committed jsdom-based `node --test` coverage (`tests/state.test.js` 26, `tests/audio.test.js` 6, `tests/fretboard.test.js` 36, `tests/controls.test.js` 19, `tests/main.test.js` 4) exercising every exported function and every `spec.md` acceptance scenario each module is responsible for — 131 tests total, all passing (`npm test` / `node --test`). `audio.js` tests mock the Web Audio API and soundfont-player rather than producing real sound, per the constitution's lighter (non-exhaustive) bar for non-`theory.js` modules. Manual `quickstart.md` validation remains a supplement for true end-to-end/visual behavior (actual color rendering, audio timbre) that no automated test can verify. |
| V. Simplicity & Scope Discipline | PASS | No backend, no build tooling, single new runtime dependency (`soundfont-player`) with explicit justification (Web Audio API alone would require re-implementing sample loading/playback plumbing); `localStorage`-only persistence with `schemaVersion`. |
| Accessibility & Inclusive Design | PASS (design commitment) | Fret cells get `aria-label`s (e.g. "E4, root, fret 0, string 1"), are keyboard-focusable/activatable, and every highlight state pairs color with shape/border, per FR-004/FR-024 and the constitution's accessibility section. |
| Client-Side Architecture Constraints | PASS | Single serializable state object mirrors the persisted settings schema; no framework is introduced; dependency vetted below (research.md); no secrets/API keys (static site). |

No outstanding violations. The Principle IV gap (testing coverage) introduced retroactively by
constitution amendment v1.2.0 was closed on 2026-07-19: jsdom-based `node --test` coverage was
added for `state.js`, `audio.js`, `fretboard.js`, `controls.js`, and `main.js` (131 tests total,
all passing), alongside `theory.js`'s existing exhaustive hard-gate coverage.

**UAT round 2 addendum** (`docs/story-drafts/003-uat-round2-fixes.md`): The capo+Relative
highlighting correction (new `getHighlightRootSemitone`, rows I above) and the CSS design-token
consolidation (row II above, FR-052) are both internal-architecture refinements within the
existing stack — no new dependency, framework, storage mechanism, or build step is introduced.
All rows remain PASS unchanged by this addendum.

**Post-Phase-1 re-check**: `research.md` and `data-model.md`/`contracts/` were reviewed against
this table after design — no new dependency, framework, storage mechanism, or architectural
element was introduced beyond what's listed above (still just `soundfont-player` + `localStorage`
+ vanilla JS/SVG). All rows other than IV remain PASS with no changes required; row IV was
downgraded after the fact by the v1.2.0 constitution amendment (see note in that row).

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
src/
├── index.html            # Single page: markup shell, control elements, <script type="module"> entry
├── css/
│   └── styles.css        # All styling: color roles (bright/dark variants), shape/border indicators,
│                         # slider, contrast-compliant text
└── js/
    ├── theory.js         # PURE, dependency-free: tuning/note/scale/degree/chord/capo math
    │                     # (constitution Principle I canonical module — the hard unit-test gate)
    ├── state.js          # App state shape, defaults, localStorage load/save/migrate (schemaVersion)
    ├── audio.js           # soundfont-player wrapper: instrument load/cache, play(midiNote),
    │                     # AudioContext creation/resume inside user-gesture handler
    ├── fretboard.js       # Inline SVG construction + per-note attribute/class updates driven
    │                     # purely by current state (no hidden mutable display state)
    ├── controls.js        # UI event wiring: tuning/root/scale selectors, fret-range slider,
    │                     # capo control, label-mode toggle, focal-point clicks
    └── main.js            # Bootstrap: load persisted state → init audio → initial render →
                          # wire controls

tests/
├── theory.test.js         # node --test unit tests for src/js/theory.js: open strings, 12-fret
│                           # wraparound, enharmonics, every supported tuning, edge frets (0/12/24)
├── state.test.js          # jsdom tests: setters, persistence/migration, validation, pruning
├── audio.test.js          # jsdom tests: mocked Web Audio API + soundfont-player call assertions
├── fretboard.test.js      # jsdom tests: SVG DOM construction, render(), event wiring
├── controls.test.js       # jsdom tests: control DOM construction, event wiring
└── main.test.js           # jsdom tests: bootstrap sequencing, audio-error-banner wiring
```

**Structure Decision**: Publishable assets live under `src/` (`index.html`, `css/`, `js/`), split
out from `specs/`, `tests/`, and `.specify/` at the repository root. The purpose of this split is
to isolate exactly what a static-hosting deploy (GitHub Pages) should publish: pointing Pages at
`src/` publishes only the app itself, keeping specs, tests, and tooling off the public site.
`tests/` did NOT move — it still lives at the repository root and its imports now point at
`../src/js/...` instead of `../js/...`. The music-theory core (`src/js/theory.js`) is physically
isolated from rendering (`src/js/fretboard.js`), audio (`src/js/audio.js`), state/persistence
(`src/js/state.js`), and UI wiring (`src/js/controls.js`) so the constitution's hard unit-test gate
applies cleanly to one file with zero DOM or Web Audio dependencies. `src/index.html` loads
`js/main.js` as a native ES module (`<script type="module" src="js/main.js">`) plus the
`soundfont-player` CDN script — all paths inside `src/` are relative and un-rooted, so the whole
directory works standalone whether served from the repository root or from `src/` directly. No
bundler step is introduced anywhere in this tree.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. (The Principle IV testing-coverage gap previously tracked here was closed on
2026-07-19 — see the Constitution Check table above.)

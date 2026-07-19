# Phase 0 Research: Interactive Guitar Fretboard Visualizer

All Technical Context items arrived pre-decided by the user's plan input (plain HTML/CSS/vanilla
JS, no build step; inline SVG per-note elements; `soundfont-player` + FluidR3_GM via CDN;
`localStorage` persistence; pure `theory.js` module). No `NEEDS CLARIFICATION` markers remain.
Research below verifies the two explicitly-flagged open items (license terms, instrument voice)
and documents supporting decisions needed to execute the given constraints.

## 1. Audio library & sample licensing (explicitly flagged for verification)

**Decision**: Use `soundfont-player` (MIT license) loaded via CDN `<script>` tag, playing
Benjamin Gleitzman's pre-rendered FluidR3_GM samples (MP3 format) served from the standard
`gleitz/midi-js-soundfonts` CDN (`https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/...`),
using the `acoustic_guitar_steel` instrument voice.

**Rationale**:
- `soundfont-player` itself (the JS loader/player library) is MIT-licensed — no restrictions on
  commercial or public use, no attribution requirement beyond standard MIT notice retention.
- The FluidR3_GM pre-rendered sample set distributed via the `gleitz/midi-js-soundfonts` CDN is
  licensed **CC BY 3.0** (not MIT, contrary to the story's candidate assumption) — verified
  directly from the repository's README. CC BY 3.0 permits free commercial and public use and
  requires only attribution, which Story 8's own sourcing constraints explicitly allow to be
  satisfied "in an about/credits section." This is fully compatible.
- Samples are static MP3 files served over HTTPS from a public CDN — no server-side rendering, no
  per-seat licensing, no API keys — satisfying the client-side-only / no-backend constraint.
- `acoustic_guitar_steel` was chosen over `acoustic_guitar_nylon` as the default voice: it is the
  more broadly recognizable "guitar" timbre across the tuning families in scope (standard, drop,
  and open tunings are all steel-string conventions in typical use), giving the most representative
  ear-training reference. Swapping to `acoustic_guitar_nylon` later is a one-line constant change
  in `js/audio.js`, not a structural change — no future-proofing hooks are needed for this.

**Alternatives considered**:
- **webaudiofont**: rejected — pulls in full multi-instrument soundbank payloads when only one
  guitar voice is needed; heavier than `soundfont-player` for this single-instrument use case.
- **Self-hosted/self-recorded samples**: rejected — no existing free, multi-sampled (per note/
  octave) guitar sample set is available in-repo, and recording one is out of scope for this
  feature; would also reopen the licensing question this research resolves.
- **Raw Web Audio synthesis**: explicitly disallowed by Story 8 ("a sine/square/sawtooth tone does
  not satisfy this story").

**Risk flagged**: the `danigb/soundfont-player` GitHub repository is archived (unmaintained), but
its published npm package (and CDN-served bundle) is stable, MIT-licensed, and functionally
sufficient for this feature's single-instrument playback needs. If a future maintenance issue
arises, `@birdofpreyru/soundfont-player` (an actively maintained fork with the same MIT license
and API) is a documented drop-in replacement — not required for this feature.

**Note on attribution requirement**: this research originally treated the CC BY 3.0 attribution
condition as an implicit licensing obligation satisfiable "somewhere in an about/credits section"
(per Story 8's sourcing constraints). It has since been elevated to an explicit functional
requirement — FR-042 in spec.md, and the corresponding Constraints entry in plan.md's Technical
Context — requiring a visible, always-accessible credit line (e.g. footer or About section) rather
than leaving placement/visibility as an implementation detail.

## 2. Rendering approach: inline SVG, per-note addressable elements

**Decision**: The fretboard is one inline `<svg>` element containing one `<g>` per string×fret
position (6 strings × 25 fret positions, including the open/nut position), each `<g>` holding a
`<circle>` (or shape variant for root/focal indicators) and a `<text>` label. Each `<g>` carries a
stable `id`/`data-*` attributes (string index, fret number) so `js/fretboard.js` can look up and
update color/class/border/label attributes directly in place on state changes, rather than
destroying and rebuilding the DOM subtree.

**Rationale**: Matches the user's explicit directive. This satisfies constitution Principle II's
requirement that visual state be "a pure, deterministic function of the current app state tuple"
without needing a virtual-DOM library to achieve efficient incremental updates — plain
`element.setAttribute`/`classList` calls are sufficient at this scale (150 note positions).
Individually addressable SVG elements also make per-note `aria-label`/keyboard-focusability
straightforward, satisfying the Accessibility & Inclusive Design section.

**Alternatives considered**:
- **Canvas**: rejected — canvas content is not individually DOM-addressable, making per-note
  `aria-label`s and keyboard focus targets (required by the constitution's accessibility section)
  substantially harder to implement without a parallel accessibility-tree hack.
- **Full HTML string re-render on every state change**: rejected — unnecessary DOM
  destruction/recreation and flicker risk for changes that only affect note coloring/labels, and
  works against the "no perceptible delay" performance goal (SC-002).

## 3. Music theory module isolation & data source

**Decision**: `js/theory.js` is a single ES module exporting pure functions only (no DOM access,
no Web Audio calls, no localStorage access): pitch-class/MIDI computation per string+fret+tuning,
scale/mode membership and degree-role assignment (sourced directly from the Story 4 canonical
tables, transcribed as one data structure inside this module), diatonic triad/chord-tone
computation, and Absolute/Relative capo label computation.

**Rationale**: Directly required by constitution Principle I ("a single canonical pitch/interval
module... pure, deterministic functions with no side effects") and Principle IV's hard unit-test
gate. Physically separating this file from `fretboard.js`/`audio.js`/`controls.js` means the test
suite can `import` and exercise it in Node with zero DOM or Web Audio shimming.

**Alternatives considered**: Embedding theory calculations inline within `fretboard.js` rendering
code — rejected outright; directly violates the constitution's non-negotiable separation
requirement and would make the hard-gated unit tests impossible to write cleanly.

## 4. Test tooling for the theory module

**Decision**: Node.js's built-in test runner (`node --test`), invoked directly against
`tests/theory.test.js`, which imports `js/theory.js` as a native ES module. Zero added npm
dependency; nothing to install for a contributor beyond a reasonably current Node.js.

**Rationale**: Constitution Principle V mandates a minimal dependency footprint and native APIs
over heavyweight tooling wherever reasonable; `node --test` (stable since Node 18) provides
`describe`/`it`/`assert` primitives sufficient for the theory layer's pure-function tests without
introducing Jest/Vitest/Mocha or any transform step — consistent with the "no build step, no
bundler" directive governing the whole feature. Because `theory.js` has zero DOM or browser API
dependencies, it runs identically under Node and in-browser.

**Alternatives considered**:
- **Vitest/Jest**: rejected — both typically pull in a bundler/transform pipeline (esbuild/Babel)
  that contradicts the explicit "no build step" instruction, even though tests themselves are
  dev-only tooling.
- **Browser-only manual testing of theory logic**: rejected — constitution Principle IV classifies
  theory-layer coverage as a hard, automatable gate; manual-only checking cannot satisfy "no music
  theory function ships without tests."

## 5. Persistence mechanism

**Decision**: One `localStorage` key (e.g. `fret-navigator-settings`) holding a single JSON object
with a top-level `schemaVersion` integer plus the fields enumerated in `data-model.md` /
`contracts/settings-schema.md`. `js/state.js` owns read (with migration-if-needed), write-on-change,
and default-fallback logic exclusively — no other module touches `localStorage` directly.

**Rationale**: Directly satisfies FR-039/FR-040 (from the Clarifications session) and the
constitution's localStorage schema-versioning constraint in one place, keeping migration logic
centralized and testable in isolation from rendering/audio.

**Alternatives considered**:
- **Multiple discrete `localStorage` keys** (one per setting): rejected — makes atomic
  versioning/migration harder to reason about and test as a unit.
- **IndexedDB**: rejected — unnecessary complexity for a small, flat, synchronous-access settings
  object; `localStorage` is explicitly named as the allowed mechanism in the constitution.

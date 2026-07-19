<!--
SYNC IMPACT REPORT
==================
Post-ratification note (2026-07-19): The v1.2.0 testing-coverage gap flagged below (Deferred
TODOs) has been closed. `tests/state.test.js`, `tests/audio.test.js`, `tests/fretboard.test.js`,
`tests/controls.test.js`, and `tests/main.test.js` now provide jsdom-based `node --test` coverage
for `state.js`, `audio.js`, `fretboard.js`, `controls.js`, and `main.js` respectively (131 tests
total across the full suite, all passing), matching every exported function and every relevant
`spec.md` acceptance scenario per module. `audio.js` tests mock the Web Audio API and
soundfont-player rather than exercising real audio output. `jsdom` was added as a devDependency
(test-only tooling, never loaded by `index.html` or shipped to users — does not violate Principle
V). `specs/001-fretboard-visualizer/plan.md`'s Constitution Check row IV and Complexity Tracking
table have been updated accordingly to reflect PASS with no outstanding violations. No further
constitution version bump is needed for this change — it closes a previously-flagged gap rather
than altering a principle's text.
==================
Version change: 1.1.0 → 1.2.0
Modified principles:
  - IV. Testing Standards — broadened the automated-test-coverage requirement from
    `theory.js` alone to ALL modules (`theory.js`, `state.js`, `audio.js`,
    `fretboard.js`, `controls.js`, `main.js`). `theory.js` keeps its exhaustive
    unit-test hard gate; the other modules now MUST have jsdom-based tests
    (DOM construction, event wiring, state transitions) run via the same
    `node --test` runner — not exhaustive, but every public function/exported
    behavior and every spec.md acceptance scenario MUST have at least one test.
    Manual `quickstart.md` validation is now explicitly scoped as a supplement
    for true end-to-end/visual checks only, not a substitute for automated
    coverage of any module's logic or DOM structure.

Added sections: None

Removed sections: None

Templates reviewed:
  - specs/001-fretboard-visualizer/plan.md    ⚠ — Constitution Check row IV previously
    claimed PASS based on the old theory.js-only standard. Under the broadened
    standard, only `tests/theory.test.js` exists; `state.js`, `audio.js`,
    `fretboard.js`, `controls.js`, and `main.js` have no committed automated
    tests. Row IV updated to reflect this gap accurately (no longer marked
    unconditional PASS) rather than silently continuing to claim compliance.

Deferred TODOs: Author jsdom-based test files for state.js, audio.js,
  fretboard.js, and controls.js (main.js coverage may be indirect via the
  others, or via a light bootstrap test) to close the gap flagged above.
==================
Version change: 1.0.0 → 1.1.0
Modified principles:
  - IV. Testing Standards — softened the CI coverage-gate requirement to match
    solo-MVP scope: `theory.js` still MUST maintain exhaustive test coverage,
    but verification is now via `node --test --experimental-test-coverage`
    run manually/on-demand, not an automated CI pipeline gate.

Added sections: None

Removed sections: None

Templates reviewed:
  - specs/001-fretboard-visualizer/plan.md    ✅ — Constitution Check row IV updated to match softened wording; still PASSes

Deferred TODOs: None — all placeholders resolved.
==================
Version change: [unversioned template] → 1.0.0
Modified principles: N/A (initial population — all placeholders replaced)

Added sections:
  - Core Principles (I–V)
  - Accessibility & Inclusive Design
  - Client-Side Architecture Constraints
  - Governance

Removed sections: None (no prior content)

Templates reviewed:
  - .specify/templates/plan-template.md       ✅ — Constitution Check section present; references updated mentally; no structural misalignment
  - .specify/templates/spec-template.md       ✅ — Scope/requirements sections align with single-page, client-side constraint
  - .specify/templates/tasks-template.md      ✅ — Task categorization (unit tests as hard gate, P0 bug handling) compatible with Phase 2 Foundational pattern

Deferred TODOs: None — all placeholders resolved.
-->

# Fret Navigator Constitution

## Core Principles

### I. Music Theory Correctness (NON-NEGOTIABLE)

All note, interval, chord, scale, and mode calculations MUST derive from a single
canonical pitch/interval module — never duplicated or hardcoded per-view or
per-component. This module is the sole arithmetic authority for the entire app.

- Note-from-fret, diatonic scale generation, mode derivation, and chord detection
  MUST be implemented as pure, deterministic functions with no side effects.
- Unit tests for this layer are a **hard gate**: no music theory function ships
  without tests covering open strings, 12-fret octave wraparound, enharmonic
  equivalents (C#/Db, F#/Gb, etc.), standard and non-standard tunings (e.g. DADGAD,
  open G, drop D, 7-string), and edge-position frets (nut, 12th, 24th).
- Enharmonic spelling MUST respect key context: the engine returns the diatonically
  correct spelling for the active key (F# in G major, Bb in F major, not the default
  sharp/flat). No view may override or bypass this spelling logic.

**Rationale**: Incorrect notes or interval labels destroy educational and practical
value instantly. Music theory bugs are never cosmetic; they are P0 correctness
failures regardless of where they surface.

### II. Visualization Consistency

The rendered fretboard is the single on-screen source of truth. Every control
(tuning selector, key picker, mode selector, chord palette) MUST update the one
shared fretboard view — never spawn parallel or secondary fretboard instances.

- Visual state (highlighted notes, root markers, scale degrees, interval labels)
  MUST be a pure, deterministic function of the current app state tuple:
  `(tuning, key, mode, selectedChord)`. No hidden mutable UI variables may hold
  display state that can diverge from the canonical state tuple.
- The fretboard MUST remain readable at minimum viable string/fret counts
  (6 strings × 12 frets) on viewport widths of 768 px and above without
  horizontal scrolling or truncated labels.
- Information MUST NOT be conveyed by color alone. Root notes MUST carry a
  distinct shape or border marker in addition to color. Scale degree annotations
  MUST use text or symbol indicators alongside any color coding. This applies to
  all highlight states rendered on the fretboard.

**Rationale**: A drifting visual model creates silent inconsistencies that are
harder to debug than crashes. Colorblind accessibility is a hard requirement, not
a nice-to-have.

### III. Audio Behavior

Note playback MUST use the correct absolute pitch for each string/fret position —
meaning the right MIDI pitch number including octave — not merely the pitch class.
Implementation MUST use the Web Audio API (or a thin wrapper around it); no
external audio library may be introduced unless it demonstrably cannot be
replicated with raw Web Audio.

- Audio MUST NOT autoplay on page load, on state changes (e.g. tuning change,
  key change), or on any programmatic update. Playback is triggered exclusively
  by direct user interaction with a fret cell, string, or dedicated play control.
- Playback latency from user interaction to audible sound onset MUST be
  imperceptible under normal conditions (target ≤ 30 ms; AudioContext
  pre-warming on first user gesture is acceptable to achieve this).
- The AudioContext MUST be created or resumed inside a user gesture handler to
  comply with browser autoplay policy. Apps MUST NOT preemptively suspend or
  close the context between notes in a way that reintroduces latency.

**Rationale**: Incorrect octave rendering defeats ear-training utility.
Accidental autoplay violates browser policy and degrades user trust.

### IV. Testing Standards

Every module — `theory.js`, `state.js`, `audio.js`, `fretboard.js`, `controls.js`,
and `main.js` — MUST have persistent, committed automated test coverage. This is
not a theory-only requirement: no module ships or continues to ship without a
corresponding test file exercising its public behavior.

- `theory.js` MUST maintain exhaustive unit test coverage as a hard quality gate
  — this layer is pure logic (no DOM), every branch is cheaply testable, and
  coverage must include open strings, 12-fret octave wraparound, enharmonic
  equivalents, every supported tuning, and edge-position frets (nut, 12th, 24th).
  No feature that modifies theory logic may merge without passing tests.
- `state.js`, `audio.js`, `fretboard.js`, and `controls.js` MUST have jsdom-based
  tests exercising DOM construction, event wiring, and state transitions, run via
  the same `node --test` runner used for `theory.js`. This coverage does not need
  to be as exhaustive as `theory.js` (e.g. it does not need every tuning × every
  scale combination) — but every public function or exported behavior MUST have
  at least one passing test, and every acceptance scenario in `spec.md` MUST be
  covered by at least one test somewhere in the suite.
- Any defect that causes an incorrect note name, wrong interval, or wrong chord
  label to appear anywhere in the UI is classified **P0** (correctness bug),
  regardless of how infrequently it is triggered or how visually minor it appears.
  P0 bugs block release.
- Test coverage is verified via `node --test` (with
  `--experimental-test-coverage` for `theory.js`), run manually/on-demand by the
  developer before merging changes. Per this project's solo-MVP scope, no CI
  pipeline enforces this automatically — it is a manual, developer-run
  verification step, not an automated gate.
- Manual `quickstart.md` validation remains a supplementary check for true
  end-to-end/visual behavior that no automated test can verify (e.g. actual
  color rendering, audio timbre) — it does NOT substitute for automated test
  coverage of logic or DOM structure in any module.

**Rationale**: Cheap tests on pure logic should never be skipped. Treating theory
bugs as cosmetic leads to shipped misinformation that erodes user trust. Limiting
the hard-gate to `theory.js` alone let regressions creep into state, audio,
rendering, and control-wiring code with no committed safety net beyond ad hoc
manual checks — those layers construct DOM, wire events, and manage state
transitions that are just as capable of silently breaking as theory math is.

### V. Simplicity & Scope Discipline

This is a **single-page, client-side** application. There is no backend, no
server-side persistence, no user accounts, and no authentication. These are
permanent constraints, not deferred features.

- User-created data (custom tunings, saved chord shapes, preferences) MAY be
  persisted in `localStorage` only. No remote storage, sync service, or
  third-party analytics SDK may be introduced.
- `localStorage` schemas MUST carry a `schemaVersion` key. Any future format
  change MUST include a migration path that reads and upgrades prior-version data
  rather than silently discarding it.
- The dependency footprint MUST be kept minimal. Prefer native Web APIs (Canvas,
  SVG, Web Audio) over heavyweight UI frameworks. A new dependency requires an
  explicit justification that it cannot be reasonably replaced with a few dozen
  lines of direct DOM/API code.
- YAGNI applies strictly: do not build configuration hooks, plugin systems, or
  abstractions for hypothetical features. Implement the minimum surface area that
  satisfies current requirements.

**Rationale**: Scope creep toward a framework-heavy SPA would contradict the
tool's core purpose. Keeping it lean ensures it loads fast, remains auditable,
and has no backend to maintain.

## Accessibility & Inclusive Design

The fretboard display MUST meet the following baseline accessibility requirements,
treated as first-class correctness criteria:

- **Color-independence**: Every piece of information (root note, scale degree,
  in-scale vs. out-of-scale) MUST have a non-color indicator (shape, border,
  text label, or pattern) so it is interpretable in monochrome or with common
  color vision deficiencies (deuteranopia, protanopia).
- **Keyboard navigability**: Users MUST be able to tab to and activate any
  interactive fret cell or control without a pointing device.
- **Screen reader support**: Fret cells and controls MUST expose meaningful
  `aria-label` or `aria-labelledby` text (e.g. "E4, root, fret 0 string 1")
  rather than unlabeled click targets.
- **Contrast**: Text labels on fret dots MUST meet WCAG AA contrast ratio
  (4.5:1 for normal text) against their background color in all highlight states.

Accessibility defects that render the fretboard uninterpretable to a user with
a disability are treated as P0 correctness bugs, not cosmetic issues.

## Client-Side Architecture Constraints

These constraints govern how state, data, and rendering are wired together:

- **State model**: App state is a single, serializable object: `{ tuning, key,
  mode, selectedChord, displayMode, savedData }`. All rendering is a pure
  function of this object. No component holds authoritative state outside it.
- **No framework mandate**: The constitution deliberately avoids naming a
  rendering framework (React, Vue, Svelte, vanilla JS). That decision belongs
  in the plan document. Any framework chosen MUST support the pure-state-→-render
  contract above.
- **localStorage schema versioning**: The stored object MUST include a top-level
  `"schemaVersion": <integer>` field. On load, the app MUST check this version,
  apply any pending migrations, and re-save before using the data. Migrations
  are append-only and idempotent.
- **Dependency vetting**: Before adding any npm/CDN dependency, confirm: (a) it
  is actively maintained, (b) its bundle size contribution is justified, and
  (c) no standard Web API achieves the same result. Web Audio API is sufficient
  for synthesis; a bundled sample library requires explicit justification.
- **No build-time secrets or server tokens**: Because there is no backend, no
  API keys or secrets may appear in client code. The app is a static artifact
  that runs entirely in the browser.

## Governance

This constitution supersedes all other project-level guidance on matters of
correctness, scope, accessibility, and testing standards. Conflicting conventions
in code reviews, tickets, or other documents must be resolved in favor of this
constitution.

**Amendment procedure**:
1. Propose a change via a pull request or equivalent review artifact that
   includes: (a) the changed principle text, (b) rationale for the change, and
   (c) an assessment of impact on existing code and tests.
2. Any amendment that weakens a NON-NEGOTIABLE clause (Principle I or the P0
   bug classification in Principle IV) requires explicit documented consensus
   from all active project contributors.
3. Bump the constitution version per the rules below. Update `Last Amended` date.

**Versioning policy**:
- **MAJOR**: Removal or backward-incompatible redefinition of a principle.
- **MINOR**: Addition of a new principle or section, or material expansion of
  guidance that imposes new requirements.
- **PATCH**: Clarifications, rewording, or typo fixes that do not change intent.

**Compliance review**: All feature plans and pull requests MUST pass the
Constitution Check step in the plan template before implementation begins. Any
plan that requires violating a principle MUST document the violation explicitly
in the Complexity Tracking table and receive sign-off before work starts.

**Tech stack decisions**: Choices of framework, bundler, test runner, and
deployment method belong in the plan document (`/speckit-plan`), not here.
This constitution governs behavior and quality bars regardless of stack.

**Version**: 1.2.0 | **Ratified**: 2026-07-18 | **Last Amended**: 2026-07-19

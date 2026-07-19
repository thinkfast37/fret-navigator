---

description: "Task list for Interactive Guitar Fretboard Visualizer"
---

# Tasks: Interactive Guitar Fretboard Visualizer

**Input**: Design documents from `/specs/001-fretboard-visualizer/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/theory-api.md, contracts/settings-schema.md, quickstart.md, `.specify/memory/constitution.md`

**Tests**: `js/theory.js` unit tests are a **hard, non-negotiable gate** per constitution Principle I/IV — every function is test-first (TDD: write the test, watch it fail, then implement). `fretboard.js`/`audio.js`/`controls.js`/`state.js` use the constitution's lighter bar: manual validation against `quickstart.md`, called out as its own task per story rather than an automated suite.

**Organization**: All 9 user stories in spec.md are Priority P1. Phase 3+ below follows the spec's own story order (1→9), which is also each story's natural build-on dependency order (US4 needs US3's root, US5 needs US3+US4, US9 needs US2+US7, etc.) — this is noted explicitly per phase, not just implied by ordering.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps a task to its user story (US1–US9); Setup/Foundational/Polish carry no story label
- Every task names its exact file path

## Path Conventions

Single static-site project at the repo root (per plan.md's Project Structure — no `src/`/`backend/`/`frontend/` split):

```
index.html
css/styles.css
js/theory.js  js/state.js  js/audio.js  js/fretboard.js  js/controls.js  js/main.js
tests/theory.test.js
```

---

## Phase 1: Setup

**Purpose**: Repo scaffolding — no logic yet.

- [X] T001 Create the project tree exactly as specified in plan.md's Project Structure: `index.html`, `css/styles.css`, `js/theory.js`, `js/state.js`, `js/audio.js`, `js/fretboard.js`, `js/controls.js`, `js/main.js`, `tests/theory.test.js` (empty/stub files)
- [X] T002 [P] Create `index.html` shell: `<script type="module" src="js/main.js">`, the `soundfont-player` CDN `<script>` tag, an empty `<svg>` container for the fretboard, and empty control-placeholder containers (tuning, root, scale, label-mode, fret-range, capo) to be filled in by later stories
- [X] T003 [P] Create `css/styles.css` skeleton: CSS custom properties for the 12 chromatic degree-role color pairs (bright + dark variant each, per data-model.md's Chromatic Degree Role), base page layout, no component styling yet
- [X] T004 [P] Confirm `node --test tests/theory.test.js` runs cleanly against the empty stub (zero tests, zero failures) — establishes the hard-gate test command works before any theory.js work begins

---

## Phase 2: Foundational — `js/theory.js` (BLOCKS all user stories)

**Purpose**: The single canonical, pure, dependency-free music-theory module (constitution Principle I). Every user story phase below calls into this module — none may duplicate its math. Every function is built test-first: **write the test in `tests/theory.test.js`, confirm it fails, then implement in `js/theory.js`.** No task here is folded into a generic "implement theory.js" line — each function (and the capo/Relative-mode binding rule) gets its own explicit, independently-checkable test task and implementation task, per contracts/theory-api.md.

**⚠️ CRITICAL**: No `fretboard.js`, `audio.js`, or `controls.js` task in any later phase may begin until the specific `theory.js` function(s) it depends on are both tested and implemented here. Each later-phase task below cites the exact `theory.js` task IDs it depends on for this reason.

### Reference data

- [X] T005 Write unit tests for the `TUNINGS` reference-data export in `tests/theory.test.js`: all ~17 named tunings (D-Family ×8, G-Family ×5, C-Family ×4) plus `"standard"`, each with correct `group`, 6-element `openPitchClasses`/`openOctaves` arrays, per data-model.md's Tuning shape and spec User Story 2's exact tuning list
- [X] T006 Implement the `TUNINGS` export in `js/theory.js` to satisfy T005 (depends on T005 failing first)
- [X] T007 Write unit tests for the `SCALES` reference-data export in `tests/theory.test.js`: all 13 scales/modes, correct `category` grouping (Church Modes/Pentatonic/Blues/Other), and `degreeFormula`/`semitoneOffsets` matching Story 4's tables exactly (e.g. Dorian → `["1","2","b3","4","5","6","b7"]` / `[0,2,3,5,7,9,10]`)
- [X] T008 Implement the `SCALES` export in `js/theory.js` to satisfy T007 (depends on T007)
- [X] T009 Write unit tests for the `DEGREE_ROLES` reference-data export in `tests/theory.test.js`: all 12 chromatic positions (`1, b2, 2, b3, 3, 4, #4/b5, 5, b6, 6, b7, 7`) with correct `roleLabel` and stable `colorRoleId`
- [X] T010 Implement the `DEGREE_ROLES` export in `js/theory.js` to satisfy T009 (depends on T009)

### Pitch computation

- [X] T011 Write unit tests for `noteAt(tuning, stringIndex, fret)` in `tests/theory.test.js`: open strings (`fret=0`), the 12-fret octave wraparound, every tuning in `TUNINGS`, and edge frets 0/12/24 — per the constitution's Principle I hard-gate list
- [X] T012 Implement `noteAt()` in `js/theory.js` to satisfy T011 (depends on T011, T006)
- [X] T013 Write unit tests for `spellPitchClass(semitone, keyContext)` in `tests/theory.test.js`: enharmonic equivalents (C#/Db, F#/Gb, etc.) spelled correctly per key context, not a fixed global sharp/flat default
- [X] T014 Implement `spellPitchClass()` in `js/theory.js` to satisfy T013 (depends on T013)

### Scale/degree computation

- [X] T015 Write unit tests for `getDiatonicSemitones(root, scaleId)` in `tests/theory.test.js`: exact semitone set (root + each `semitoneOffsets`, mod 12) for every scale × several roots, verifying "no more, no fewer" (FR-011)
- [X] T016 Implement `getDiatonicSemitones()` in `js/theory.js` to satisfy T015 (depends on T015, T008)
- [X] T017 Write unit tests for `getDegreeRole(semitoneFromRoot)` in `tests/theory.test.js`: all 12 positions return the fixed color-role descriptor independent of diatonic status
- [X] T018 Implement `getDegreeRole()` in `js/theory.js` to satisfy T017 (depends on T017, T010)
- [X] T019 Write unit tests for `getDegreeLabel(semitoneFromRoot, scaleId)` in `tests/theory.test.js`: exact Story 4 formula tokens (`"b3"`, `"#4"`, `"b7"`, etc.) for diatonic positions, and `null`/throw for non-diatonic input
- [X] T020 Implement `getDegreeLabel()` in `js/theory.js` to satisfy T019 (depends on T019, T008)
- [X] T021 Write unit tests for `getIntervalLabel(semitoneFromRoot)` in `tests/theory.test.js`: correct shorthand (`"R"`, `"M3"`, `"P5"`, `"m7"`, etc.) for all 12 positions
- [X] T022 Implement `getIntervalLabel()` in `js/theory.js` to satisfy T021 (depends on T021)

### Chord/focal-point computation

- [X] T023 Write unit tests for `computeDefaultTriad(focalSemitone, root, scaleId)` in `tests/theory.test.js`: stacking nearest diatonic thirds above several focal points across multiple scales, including at least one case producing each of major/minor/diminished/augmented
- [X] T024 Implement `computeDefaultTriad()` in `js/theory.js` to satisfy T023 (depends on T023, T016)
- [X] T025 Write unit tests for `getTriadQuality(triadSemitones)` in `tests/theory.test.js`: quality derived purely from interval structure for major/minor/diminished/augmented triads
- [X] T026 Implement `getTriadQuality()` in `js/theory.js` to satisfy T025 (depends on T025)
- [X] T027 Write unit tests for `isToggleableChordTone(semitoneFromRoot, root, scaleId)` in `tests/theory.test.js`: `true` only for semitones in `getDiatonicSemitones(root, scaleId)` — covers spec Story 5 Acceptance Scenarios 5–7 (Esus4 valid, F# blocked in C Major, F# unblocked in C Lydian)
- [X] T028 Implement `isToggleableChordTone()` in `js/theory.js` to satisfy T027 (depends on T027, T016)
- [X] T029 Write unit tests for `identifyChordQuality(brightSetSemitones, root)` in `tests/theory.test.js`: recognized shapes (e.g. minor triad → `"Minor"`) and `null` for sets that don't map to one canonical name (FR-021)
- [X] T030 Implement `identifyChordQuality()` in `js/theory.js` to satisfy T029 (depends on T029)

### Capo computation

- [X] T031 Write unit tests for `getDisplayRootSemitone(trueRootSemitone, capoFret, pitchReferenceMode)` in `tests/theory.test.js`: returns `trueRootSemitone` unchanged when `capoFret===0` or mode is `"absolute"`; returns `(trueRootSemitone - capoFret + 12) mod 12` when `capoFret>0` and mode is `"relative"` — per contracts/theory-api.md
- [X] T032 Implement `getDisplayRootSemitone()` in `js/theory.js` to satisfy T031 (depends on T031)
- [X] T033 Write unit tests for `getRelativeLabelSemitone(physicalFret, capoFret)` in `tests/theory.test.js`: returns `physicalFret - capoFret`, and equals `physicalFret` when `capoFret===0`
- [X] T034 Implement `getRelativeLabelSemitone()` in `js/theory.js` to satisfy T033 (depends on T033)
- [X] T035 Write unit tests for `isFretPlayable(fret, capoFret)` in `tests/theory.test.js`: `fret >= capoFret` across boundary values
- [X] T036 Implement `isFretPlayable()` in `js/theory.js` to satisfy T035 (depends on T035)

### The `getDisplayRootSemitone` binding rule (explicit, separately-verifiable)

Per contracts/theory-api.md's binding rule: `getDiatonicSemitones`, `computeDefaultTriad`, `isToggleableChordTone`, and `identifyChordQuality` MUST be called with `getDisplayRootSemitone`'s output — never the raw Story-3-selected root — whenever Relative mode + an active capo apply (spec Story 9 Acceptance Scenario 7). This is tested as its own case, not assumed to fall out of the four functions' individual tests above.

- [X] T037 Write the binding-rule integration test in `tests/theory.test.js`: with a fixed root/scale and `capoFret>0`/`pitchReferenceMode="relative"`, compute `displayRootSemitone = getDisplayRootSemitone(...)` and assert `getDiatonicSemitones(displayRootSemitone, scaleId)`, `computeDefaultTriad(focal, displayRootSemitone, scaleId)`, `isToggleableChordTone(semitone, displayRootSemitone, scaleId)`, and `identifyChordQuality(brightSet, displayRootSemitone)` all shift relative to their `capoFret=0` (or Absolute-mode) results — and assert all four are IDENTICAL to their true-root results when `capoFret===0` or mode is `"absolute"` (depends on T016, T024, T028, T030, T032 all being implemented — this test exercises finished functions, it does not implement new ones)

### Checkpoint

- [X] T038 Run `node --test tests/theory.test.js`: confirm 100% pass across every function above (T005–T037), satisfying constitution Principle I's hard gate — no later-phase task may begin until this passes

---

## Phase 2b: Foundational — `js/state.js` + `js/main.js` bootstrap (BLOCKS all user stories)

**Purpose**: Shared state shape, defaults, and persistence, owned exclusively by `state.js` per contracts/settings-schema.md — every story's controls funnel changes through it, and `main.js` must load it once before the first render (no default-then-restore flash).

- [ ] T039 Implement `js/state.js` in-memory state shape + setters for `tuning`, `root`, `accidentalPreference`, `scaleId`, `focalDegreeSemitone`, `chordToneOverrides`, `labelMode`, `capoFret`, `capoLabelMode`, `fretRange` per data-model.md/contracts/settings-schema.md, with first-load defaults: `tuning.presetId="standard"`, `root=null`, no scale, `labelMode="notes"`, `capoFret=0`, `capoLabelMode="absolute"`, `fretRange={lowerBound:0, upperBound:24}` (depends on T038)
- [ ] T040 Implement `js/state.js` `load()`/`save()`/`migrate()` against the `fret-navigator-settings` `localStorage` key: `schemaVersion` check + migration-before-use, discard-and-fall-back-to-defaults on any type/range validation failure, invariant enforcement (`capoFret>0 ⇒ fretRange.lowerBound===capoFret`), and pruning of `chordToneOverrides` entries that become non-diatonic on root/scale change (depends on T039)
- [ ] T041 Implement `js/main.js` bootstrap: call `state.load()` exactly once, before any render call (stub the render call — filled in by US1) (depends on T040)

**Checkpoint**: Foundation ready — every `theory.js` function is tested and implemented, and `state.js`/`main.js` bootstrap exists. User-story implementation may now begin.

---

## Phase 3: User Story 1 - Visualize the fretboard layout (Priority: P1) 🎯 MVP

**Goal**: A visually accurate, guitar-oriented static fretboard (string order, fret markers, open strings, color+shape distinction rule) with no other configuration.

**Independent Test**: Load the app with no interaction; visually confirm string order (high-E top/string 1 → low-E bottom/string 6), inlay markers, open-string rendering, and that active-note distinction uses color + shape/border together.

**theory.js dependencies used here**: `noteAt()` (T012), `spellPitchClass()` (T014) — both already tested and implemented per Phase 2.

- [ ] T042 [US1] Build the inline SVG fretboard skeleton in `js/fretboard.js`: one `<svg>` with one `<g>` per string×fret position (6 strings × 25 frets), string 1 (high-E) top row → string 6 (low-E) bottom row, stable `id`/`data-string`/`data-fret` attributes, using `noteAt()` (T012) for each position's pitch
- [ ] T043 [US1] Render inlay fret markers in `js/fretboard.js`: single-dot at frets 3,5,7,9,15,17,19,21; double-dot at 12 and 24 (depends on T042)
- [ ] T044 [US1] Render open-string notes distinctly, positioned left of fret 1 past the nut line, in `js/fretboard.js` (depends on T042)
- [ ] T045 [US1] Render the persistent base note-name label (via `spellPitchClass()`, T014) at every position, in a neutral non-distracting style, in `js/fretboard.js` (depends on T042)
- [ ] T046 [US1] Wire `js/main.js` to call `fretboard.render(state)` once after `state.load()`, using the default/restored state — first visible render (depends on T041, T042, T043, T044, T045)
- [ ] T047 [US1] Add per-note `aria-label`s (e.g. `"E4, root, fret 0, string 1"`) and keyboard focusability to every SVG `<g>` in `js/fretboard.js` (depends on T042)
- [ ] T048 [P] [US1] Style `css/styles.css`: base layer typography/contrast (WCAG AA), fret-marker dots, open-string visual distinction, nut line
- [ ] T049 [US1] Manually validate against quickstart.md Section 2 (base fretboard: string order, markers, open strings)

**Checkpoint**: US1 is independently functional — a static, correctly-oriented, accessible reference fretboard.

---

## Phase 4: User Story 2 - Change tuning (Priority: P1)

**Goal**: Select any named tuning (or Custom) and have every string/fretted note recalculate.

**Independent Test**: Select each named tuning and Custom; confirm every string's pitch and fretted-note labels update correctly.

**Depends on**: US1 (renders into the same fretboard). **theory.js dependencies used here**: `TUNINGS` (T006), `noteAt()` (T012) — already tested/implemented.

- [ ] T050 [US2] Build the tuning selector (D-Family/G-Family/C-Family groups + Standard) in `index.html`/`js/controls.js`, sourced from `theory.TUNINGS` (T006)
- [ ] T051 [US2] Build Custom Tuning per-string pitch inputs in `js/controls.js` (depends on T050)
- [ ] T052 [US2] Wire tuning selection/custom input → `state.setTuning()` → `fretboard.render(state)` full re-render, recalculating every position via `noteAt()` (T012) (depends on T050, T051, T042)
- [ ] T053 [P] [US2] Style the tuning selector and custom-tuning inputs in `css/styles.css`
- [ ] T054 [US2] Manually validate against quickstart.md Section 3 (Drop D retune, Custom Tuning)

**Checkpoint**: US1 + US2 both independently functional.

---

## Phase 5: User Story 3 - Select root note and enharmonic spelling (Priority: P1)

**Goal**: Choose a root note (C D E F G A B) and toggle sharp/flat spelling on enharmonic roots.

**Independent Test**: Select each root letter; toggle sharp/flat on enharmonic ones; confirm root highlight and label spelling update without pitch change.

**Depends on**: US1. **theory.js dependencies used here**: `spellPitchClass()` (T014) — already tested/implemented.

- [ ] T055 [US3] Build the root-note selector (C D E F G A B) in `js/controls.js`
- [ ] T056 [US3] Build the sharp/flat enharmonic toggle, enabled only for roots with an enharmonic pair (Edge Case: disabled for natural-only roots), wired to `state.accidentalPreference`, in `js/controls.js` (depends on T055)
- [ ] T057 [US3] Wire root/accidental changes → `fretboard.render(state)`: root highlight (`isRoot`) and relabeling via `spellPitchClass()` (T014), in `js/fretboard.js` (depends on T056, T042)
- [ ] T058 [US3] Manually validate against quickstart.md Section 4 step 1 (root selection; F#/Gb toggle without pitch/position change)

**Checkpoint**: US1–US3 independently functional.

---

## Phase 6: User Story 4 - Choose scale or mode (Priority: P1)

**Goal**: Select any of the 13 scales/modes and see exactly the matching notes highlighted as in-scale.

**Independent Test**: Select each scale/mode against a fixed root; confirm the highlighted set exactly matches the listed semitone offsets, with no stale notes on switch.

**Depends on**: US3 (needs a root to compute against). **theory.js dependencies used here**: `SCALES` (T008), `getDiatonicSemitones()` (T016) — already tested/implemented.

- [ ] T059 [US4] Build the scale/mode selector, grouped Church Modes/Pentatonic/Blues/Other, in `js/controls.js`, sourced from `theory.SCALES` (T008)
- [ ] T060 [US4] Compute `Note.isDiatonic` per position via `getDiatonicSemitones()` (T016) in `js/fretboard.js`'s render pipeline; diatonic notes get a color cue, non-diatonic notes get none (base layer only) (depends on T059, T057)
- [ ] T061 [US4] Confirm scale/mode change clears prior highlighting immediately — no residual DOM classes from the previous scale — in `js/fretboard.js` (depends on T060)
- [ ] T062 [US4] Manually validate against quickstart.md Section 4 steps 2 and 6 (exact in-scale set per Story 4 tables; no stale highlighting on scale switch)

**Checkpoint**: US1–US4 independently functional.

---

## Phase 7: User Story 5 - Diatonic focal-point highlighting (Priority: P1)

**Goal**: Fixed scale-degree color roles for every diatonic note, a selectable focal point with a computed triad, and a chord-tone override toggle.

**Independent Test**: Select root/scale, confirm fixed degree-role coloring; click through diatonic notes as focal points, confirm triad quality/brightness updates correctly; toggle chord tones on/off within diatonic bounds.

**Depends on**: US4 (needs diatonic-set computation). **theory.js dependencies used here**: `DEGREE_ROLES`/`getDegreeRole()` (T018), `computeDefaultTriad()`/`getTriadQuality()` (T024, T026), `isToggleableChordTone()` (T028), `identifyChordQuality()` (T030) — all already tested/implemented.

- [ ] T063 [US5] Assign each note's fixed `degreeRole` via `getDegreeRole()` (T018) and render the dark color-role variant for diatonic notes in `js/fretboard.js` (depends on T060)
- [ ] T064 [US5] Implement focal-point click handling in `js/fretboard.js`/`js/controls.js`: only diatonically-colored notes are clickable as focal, default focal = root (semitone 0) on every root/scale change (depends on T063)
- [ ] T065 [US5] Compute the default triad via `computeDefaultTriad()` (T024) and its quality via `getTriadQuality()` (T026); render focal-triad notes bright + bordered, other diatonic notes dark, in `js/fretboard.js` (depends on T064)
- [ ] T066 [US5] Implement the chord-tone override toggle UI, gated by `isToggleableChordTone()` (T028), in `js/controls.js` (depends on T065)
- [ ] T067 [US5] Display the active bright note set + recognized chord-quality label via `identifyChordQuality()` (T030) in `index.html`/`js/controls.js` (depends on T066)
- [ ] T068 [P] [US5] Implement focal-point + `chordToneOverrides` reset on root/scale change (Edge Case) in `js/state.js` (depends on T039)
- [ ] T069 [P] [US5] Style bright/dark/bordered variants for all 12 color roles in `css/styles.css`
- [ ] T070 [US5] Manually validate against quickstart.md Section 4 steps 3–6 (minor triad on E, Esus4 override via A, F# gated out of C Major, F# ungated in C Lydian)

**Checkpoint**: US1–US5 independently functional — the harmonic-analysis core is complete.

---

## Phase 8: User Story 6 - Base layer & label display control (Priority: P1)

**Goal**: A persistent note-name base layer with a Notes/Degrees/Intervals label-mode overlay.

**Independent Test**: Toggle label modes on a fixed root/scale; confirm labels update correctly while the base layer never disappears.

**Depends on**: US5 (labels apply on top of degree-role coloring). **theory.js dependencies used here**: `getDegreeLabel()` (T020), `getIntervalLabel()` (T022) — already tested/implemented.

- [ ] T071 [US6] Build the label-mode selector (Notes/Degrees/Intervals) in `js/controls.js`
- [ ] T072 [US6] Compute `displayLabel` per active mode in `js/fretboard.js`: Notes via `spellPitchClass()` (T014), Degrees via `getDegreeLabel()` (T020), Intervals via `getIntervalLabel()` (T022); non-diatonic notes always show their letter name (depends on T071, T063)
- [ ] T073 [US6] Confirm the root is distinguished by color-role + secondary border/shape indicator in every label mode, in `js/fretboard.js` (depends on T072)
- [ ] T074 [US6] Manually validate against quickstart.md Section 5 (base layer always visible; Degrees/Intervals correctness; root distinction in every mode)

**Checkpoint**: US1–US6 independently functional.

---

## Phase 9: User Story 7 - Adjust visible fret range (Priority: P1)

**Goal**: A dual-handle slider that truncates the visible fret window.

**Independent Test**: Drag each handle independently and in combination; confirm labels/visible frets update and stay constrained.

**Depends on**: US1 (renders on the base fretboard). No `theory.js` dependency — per data-model.md's Relationships summary, fret range affects visibility only, not Key Context or `midiNote`.

- [ ] T075 [US7] Build the dual-handle slider markup in `index.html` + `css/styles.css`
- [ ] T076 [US7] Implement drag handling + constraints (left ≤ right, minimum 1 fret visible) in `js/controls.js`, labeling the left handle `"N"` at the nut or the fret number otherwise, and the right handle always with its fret number (depends on T075)
- [ ] T077 [P] [US7] Wire `fretRange` state (`lowerBound`/`upperBound`, default `0`/`24`) in `js/state.js` (depends on T039)
- [ ] T078 [US7] Hide/show frets outside `[lowerBound, upperBound]` in `js/fretboard.js` — visibility only, no recomputation of pitch/diatonic/focal data (depends on T075, T076, T077, T042)
- [ ] T078a [US7] Build a reset control (button near the slider) in `index.html`/`js/controls.js` that resets both handles to their default positions (left="N", right=24) and updates `fretRange` state accordingly (FR-027), regardless of the current range (depends on T075, T076, T077)
- [ ] T079 [US7] Manually validate against quickstart.md Section 6 (default N–24; drag left to 5; drag right to 12; combined range; drag-past-other-handle constraint; reset control returns to N–24 from any adjusted range)

**Checkpoint**: US1–US7 independently functional.

---

## Phase 10: User Story 8 - Hear notes on the fretboard (Priority: P1)

**Goal**: Click/tap any fret to hear its correct, real-guitar-sample pitch at the correct octave.

**Independent Test**: Click fret positions across strings/octaves; confirm correct, distinct, real-sample playback with no cutoffs on rapid triggering.

**Depends on**: US1 (needs clickable fret positions). **theory.js dependency used here**: `noteAt()`'s `midiNote` (T012) — already tested/implemented.

- [ ] T080 [US8] Load `soundfont-player` + the `acoustic_guitar_steel` instrument via the `gleitz/midi-js-soundfonts` CDN, caching the loaded instrument, in `js/audio.js`
- [ ] T081 [US8] Implement `audio.play(midiNote)` in `js/audio.js`, using `noteAt()`'s `midiNote` (T012) — always the true sounding pitch, never a label-mode-adjusted one (depends on T080)
- [ ] T082 [US8] Create/resume the `AudioContext` inside the first user-gesture handler only — no autoplay on load or state change — in `js/audio.js` (depends on T080)
- [ ] T083 [US8] Wire fret click/tap → `audio.play()` in `js/controls.js`/`js/fretboard.js` (depends on T081, T082, T042)
- [ ] T084 [US8] Verify/implement clean handling of rapid sequential triggers (no improper cutoff, no audible lag) in `js/audio.js` (depends on T081)
- [ ] T085 [US8] Implement a visible, non-blocking error toast/banner on sample load failure, with retry-on-next-tap for the affected note (FR-041), in `js/audio.js` + `index.html`/`css/styles.css` (depends on T080)
- [ ] T086 [US8] Manually validate against quickstart.md Section 7 (correct octave distinction, offline replay after caching, rapid-trigger cleanliness, load-failure banner)

**Checkpoint**: US1–US8 independently functional.

---

## Phase 11: User Story 9 - Apply a capo (Priority: P1)

**Goal**: Capo mechanics (muted frets, fret-range lock) and the Absolute/Relative labeling distinction — including the `getDisplayRootSemitone` binding rule's effect on live rendering, not just on `theory.js`'s own tests.

**Independent Test**: Place a capo at several frets; confirm muted frets below it, the fret-range handle lock, and that Absolute vs. Relative modes diverge correctly and reconverge at capo 0 — including that diatonic *coloring*, not just labels, shifts in Relative mode (Story 9 Acceptance Scenario 7).

**Depends on**: US2 (tuning), US5 (diatonic/focal computation being redirected), US7 (fret-range lock target). **theory.js dependencies used here**: `getDisplayRootSemitone()` (T032), `getRelativeLabelSemitone()` (T034), `isFretPlayable()` (T036), and the binding-rule test T037 — all already tested/implemented; plus re-use of `getDiatonicSemitones()` (T016), `computeDefaultTriad()` (T024), `isToggleableChordTone()` (T028), `identifyChordQuality()` (T030) from US4/US5.

- [ ] T087 [US9] Build the capo fret selector (0–12) in `js/controls.js`
- [ ] T088 [US9] Compute `isPlayable` per note via `isFretPlayable()` (T036); mute/hide frets `< capoFret`, in `js/fretboard.js` (depends on T087, T042)
- [ ] T089 [US9] Lock the fret-range left handle to `capoFret` with a `"Capo"` label when `capoFret>0`; release it to free movement/`"N"` when `capoFret===0`; move the right handle up if it would fall below `capoFret` (FR-035, FR-036), in `js/controls.js` (depends on T076, T088)
- [ ] T090 [US9] Build the Absolute/Relative label-mode toggle, wired to `state.capoLabelMode`, in `js/controls.js` (depends on T087)
- [ ] T091 [US9] Implement Relative-mode note-NAME computation in `js/fretboard.js`: `spellPitchClass(tuning.openPitchClasses[stringIndex]'s semitone + getRelativeLabelSemitone(fret, capoFret), keyContext)` (T034) — using the tuning's static open pitch class directly, never a capo-raised pitch, per contracts/theory-api.md's "Note-name resolution in Relative mode" (depends on T090, T034, T014)
- [ ] T092 [P] [US9] Verify `audio.play()` continues to use `noteAt()`'s Absolute `midiNote` regardless of `capoLabelMode` (FR-032) in `js/audio.js` — confirm no capo-relative branch was accidentally introduced in T081/T083
- [ ] T093 [US9] **Implement the `getDisplayRootSemitone` binding-rule wiring** in `js/fretboard.js`: on every render, compute `const displayRootSemitone = theory.getDisplayRootSemitone(trueRootSemitone, state.capoFret, state.capoLabelMode)`, and pass its output — **never the raw Story-3-selected root** — as the `root` argument to `getDiatonicSemitones()` (T016), `computeDefaultTriad()` (T024), `isToggleableChordTone()` (T028), and `identifyChordQuality()` (T030) on every render pass, per contracts/theory-api.md's binding rule and spec Story 9 Acceptance Scenario 7 (depends on T032, T016, T024, T028, T030, T060, T065, T066, T067)
- [ ] T094 [US9] **Verify the binding-rule wiring** manually against quickstart.md Section 8 step 3 and spec Story 9 Acceptance Scenario 7: with a key/scale selected and a capo active, toggling Absolute↔Relative visibly changes the diatonic *color-highlighted note set* (not merely label text); confirm at `capoFret=0` the highlighted set is identical in both modes (depends on T093)
- [ ] T095 [US9] Manually validate the remaining capo scenarios against quickstart.md Section 8 (frets muted below capo; Absolute "C" vs. Relative "A" at capo-3 on the A string; capo reset to 0 releases the left handle to "N")

**Checkpoint**: All 9 user stories independently functional — full feature complete.

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Requirements that span every story rather than belonging to one.

- [ ] T096 [P] Add a visible, always-accessible FluidR3_GM CC BY 3.0 credit line (footer or About section, not dismissible) satisfying FR-042, in `index.html`
- [ ] T097 Full accessibility pass across `index.html`/`css/styles.css`/`js/fretboard.js`: keyboard navigability for every control and fret cell, WCAG AA contrast in every highlight state, and a colorblind-simulation check that shape/border alone conveys every color-coded state (SC-003)
- [ ] T098 Handle remaining Edge Cases in `js/fretboard.js`/`js/audio.js`: custom tuning with duplicate/unplayably-extreme pitches still renders via raw pitch math with no rejection; a note triggered mid-tuning-change finishes playing before the new tuning applies to subsequent triggers
- [ ] T099 Confirm zero further network requests after first successful load (SC-007): audio samples are fetched once and reused, not re-fetched per trigger
- [ ] T100 Run the full `quickstart.md` end-to-end (all 9 sections, including Section 9's persistence checks against the `fret-navigator-settings` `localStorage` key) as the final acceptance pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational — theory.js (Phase 2)**: Depends on Setup. BLOCKS every later phase. Internally strictly ordered: each function's test task (Txxx) precedes its implementation task (Txxx+1); the binding-rule test (T037) depends on T016/T024/T028/T030/T032 already being implemented; checkpoint T038 gates everything after it.
- **Foundational — state.js/main.js (Phase 2b)**: Depends on Phase 2 (T038) completing.
- **User Stories (Phase 3–11)**: All depend on Phase 2b completing. Despite all being P1, they have a natural build-on order reflected in phase numbering: US1 → US2/US3 (both only need US1) → US4 (needs US3) → US5 (needs US4) → US6 (needs US5) → US7 (needs only US1) → US8 (needs only US1) → US9 (needs US2 + US5 + US7). US2, US3, US7, and US8 could in principle be built in parallel by different people once US1 lands; US4→US5→US6 and US9 must follow their stated chain.
- **Polish (Phase 12)**: Depends on all 9 user-story phases being complete.

### Critical rule enforced throughout

No task in `js/fretboard.js`, `js/audio.js`, or `js/controls.js` (Phases 3–11) may be started before the specific `js/theory.js` function(s) it cites as a dependency have both a passing test (odd-numbered T-task) and an implementation (its paired even-numbered T-task) from Phase 2. Every task above that calls into `theory.js` names the exact T-task IDs it depends on for this reason — this is enforced explicitly per-task, not left to phase ordering alone.

### Within Each User Story

- Manual `quickstart.md` validation task comes last in every phase.
- `fretboard.js` rendering tasks generally precede `controls.js` wiring tasks that trigger them, except where a control must exist before its data can be tested against the render (noted per-task above).

---

## Parallel Example: Phase 2 checkpoint → Phase 2b → Phase 3

```bash
# Phase 2 is strictly sequential (two shared files: theory.js, theory.test.js) — no [P] tasks.
# After T038 (all theory.js tests green):

Task: "Implement js/state.js in-memory state shape + setters (T039)"
# → then T040, then T041 (each depends on the previous; same-ish file, sequential)

# Once Phase 2b's T041 completes, Phase 3 (US1) begins. Within US1:
Task: "Style css/styles.css base layer (T048)"   # different file, no dependency on T042-T047
# can run alongside:
Task: "Build inline SVG fretboard skeleton in js/fretboard.js (T042)"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1: Setup.
2. Complete Phase 2 + 2b: Foundational (`theory.js` fully tested/implemented — non-negotiable per constitution — then `state.js`/`main.js`).
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: quickstart.md Section 2 passes independently.
5. This is a static reference fretboard with no tuning/scale/audio/capo yet — a legitimate, demoable MVP slice.

### Incremental Delivery

Given every story is P1, the recommended order still follows the dependency chain baked into the phase numbering: Setup → Foundational → US1 → US2 → US3 → US4 → US5 → US6 → US7 → US8 → US9 → Polish. Each phase ends with its own quickstart.md validation checkpoint, so the app is demoable after every phase, not just at the end.

### Constitution Gate Reminder

Phase 2's checkpoint (T038: `node --test tests/theory.test.js` green) is a **hard, non-negotiable gate** per constitution Principle I/IV. It is not a "nice to have before Phase 3" — no later-phase task may be started until it passes, including the four functions named in the `getDisplayRootSemitone` binding rule (T037), which itself must pass before T093 (the binding-rule wiring in `fretboard.js`) may be written.

---

## Notes

- [P] tasks touch different files with no dependency on an incomplete task in the same phase — this excludes most of Phase 2, since nearly every theory task shares `js/theory.js` and `tests/theory.test.js`.
- Every `fretboard.js`/`audio.js`/`controls.js` task above cites its exact `theory.js` T-task dependency by ID — cross-check before starting a task that no cited dependency is still open.
- T093/T094 (the binding-rule wiring and its manual verification) are deliberately separate, explicitly-named tasks distinct from "build the capo UI" — do not fold them back into a generic capo-implementation task.
- Commit after each task or logical group; stop at any phase checkpoint to validate that story independently before continuing.

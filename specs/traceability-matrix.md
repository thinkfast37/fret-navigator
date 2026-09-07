# Traceability Matrix

<!--
  GENERATED FILE — do not edit by hand.

  Regenerate with:  npm run trace:matrix
  It is checked by  npm run check:trace  (check T8), so an out-of-date matrix fails
  the build rather than sitting quietly out of step with the spec.

  The decisions live elsewhere. Which AC belongs to which plan item, and which tasks
  build and prove it, are authored in the plan's own Traceability Matrix. This file is
  that expanded one row per criterion, cross-referenced against the test suite, and
  marked with what is true right now.
-->

**Feature**: specs/001-fretboard-visualizer/spec.md, specs/002-default-root-scale/spec.md, specs/003-chord-mode/spec.md, specs/004-play-chord/spec.md, specs/005-display-overhaul/spec.md
**Criteria**: 80 across 18 User Stories

**Coverage**: 28 of 80 criteria proven (35.0%)

| | Criteria | Share |
|---|---|---|
| 🟢 Proven | 28 | 35.0% |
| 🔴 Gap — CRITICAL | 52 | 65.0% |

A row is one *criterion*: an Acceptance Criterion that asserts one thing, or one Case of
an AC that asserts several. 🖵 marks a criterion that describes something a person sees or
does, which cannot be proved by a test with no document to look at.

🟢 proven · 🔵 waived · and 🟡 → 🟠 → 🔴
as a gap gets more serious. The colour only repeats what the row already says in words, so
nothing is lost reading this in greyscale, in a plain diff, or by someone who cannot tell
the red from the green.

## How a gap is ranked

Severity comes from the kind of gap, not from a judgement recorded per criterion, so it
cannot be talked down when a deadline is close.

| Severity | Gap | Why it ranks there |
|---|---|---|
| 🔴 **CRITICAL** | NO TEST — nothing names this criterion | Nobody has looked. This is the state an unbuilt requirement sits in. |
| 🔴 **HIGH** | WRONG TEST — a test names it but proves something else | The claim is unproven while reporting as covered. This is what hid US-2.2 and US-11.1/11.2. |
| 🔴 **HIGH** | NOT PROVABLE — UI-level, but only a pure unit test | Same failure, arrived at differently: `core/` cannot see a screen, whatever the test is named. |
| 🟠 **MEDIUM** | NEEDS CASES — a compound AC not decomposed | Partly proven. One test stands in for several claims, so some of them are unchecked. |
| 🟡 **LOW** | MISNAMED — right test, named in its own words | Proven. Clerical: the name has drifted from the spec's wording. |

🔵 **WAIVED** marks a gap deliberately left open, with its reason shown in the row. Only LOW
and MEDIUM may be waived — CRITICAL and HIGH are exactly the states that let unbuilt work
report as complete, so no reason clears them (Constitution Principle IV).

ᵃ marks a gap accepted as pre-existing debt (52 rows). It is reported but does not
fail the build, and it is outstanding work — never a settled decision.

## Coverage by User Story

| User Story | Criteria | 🟢 Proven | 🔵 Waived | 🔴 CRITICAL | 🔴 HIGH | 🟠 MEDIUM | 🟡 LOW |
|---|---|---|---|---|---|---|---|
| 🔴 US-1.1 | 5 | 0 | · | 5 | · | · | · |
| 🔴 US-1.2 | 6 | 0 | · | 6 | · | · | · |
| 🔴 US-1.3 | 3 | 0 | · | 3 | · | · | · |
| 🔴 US-1.4 | 4 | 0 | · | 4 | · | · | · |
| 🔴 US-1.5 | 2 | 0 | · | 2 | · | · | · |
| 🔴 US-1.6 | 5 | 0 | · | 5 | · | · | · |
| 🔴 US-1.7 | 6 | 0 | · | 6 | · | · | · |
| 🔴 US-1.8 | 5 | 0 | · | 5 | · | · | · |
| 🔴 US-1.9 | 13 | 0 | · | 13 | · | · | · |
| 🔴 US-2.1 | 3 | 0 | · | 3 | · | · | · |
| 🟢 US-3.1 | 6 | **6** | · | · | · | · | · |
| 🟢 US-3.2 | 9 | **9** | · | · | · | · | · |
| 🟢 US-3.3 | 3 | **3** | · | · | · | · | · |
| 🟢 US-3.4 | 1 | **1** | · | · | · | · | · |
| 🟢 US-4.1 | 4 | **4** | · | · | · | · | · |
| 🟢 US-5.1 | 3 | **3** | · | · | · | · | · |
| 🟢 US-5.2 | 1 | **1** | · | · | · | · | · |
| 🟢 US-5.3 | 1 | **1** | · | · | · | · | · |

## Every criterion

| Story | Criterion | What it requires | Plan | Implementation tasks | Test tasks | Proving test | Status |
|---|---|---|---|---|---|---|---|
| US-1.1 | `AC-1.1.1` 🖵 | Strings ordered high-E top to low-E bottom | P-002 | T042, T043, T044, T045, T046, T047, T048, T049, T110, T111, T112 (11/11 done) | T126 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.1 | `AC-1.1.2` 🖵 | Inlay dot markers at standard frets, double at 12 and 24 | P-002 | T042, T043, T044, T045, T046, T047, T048, T049, T110, T111, T112 (11/11 done) | T126 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.1 | `AC-1.1.3` 🖵 | Active notes distinguished by color and shape, not color alone | P-002 | T042, T043, T044, T045, T046, T047, T048, T049, T110, T111, T112 (11/11 done) | T126 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.1 | `AC-1.1.4` 🖵 | Open-string notes shown left of fret 1 past the nut | P-002 | T042, T043, T044, T045, T046, T047, T048, T049, T110, T111, T112 (11/11 done) | T126 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.1 | `AC-1.1.5` 🖵 | Inlay dots anchored to physical fret positions under capo Relative renumbering | P-002 | T042, T043, T044, T045, T046, T047, T048, T049, T110, T111, T112 (11/11 done) | T126 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.2 | `AC-1.2.1` | All 6 strings retune and every fretted note recalculates | P-003 | T050, T051, T052, T053, T054 (5/5 done) | T127 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.2 | `AC-1.2.2` | D-Family tunings reflected exactly | P-003 | T050, T051, T052, T053, T054 (5/5 done) | T127 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.2 | `AC-1.2.3` | G-Family tunings reflected exactly | P-003 | T050, T051, T052, T053, T054 (5/5 done) | T127 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.2 | `AC-1.2.4` | C-Family tunings reflected exactly | P-003 | T050, T051, T052, T053, T054 (5/5 done) | T127 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.2 | `AC-1.2.5` | Custom Tuning sets each string's pitch independently | P-003 | T050, T051, T052, T053, T054 (5/5 done) | T127 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.2 | `AC-1.2.6` | Enharmonic spelling stays consistent with key/scale context | P-003 | T050, T051, T052, T053, T054 (5/5 done) | T127 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.3 | `AC-1.3.1` 🖵 | Selected root highlighted as root everywhere it appears | P-004 | T055, T056, T057, T058, T117, T118, T119 (7/7 done) | T128 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.3 | `AC-1.3.2` 🖵 | Fixed circle-of-fifths spelling with no manual sharp/flat toggle | P-004 | T055, T056, T057, T058, T117, T118, T119 (7/7 done) | T128 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.3 | `AC-1.3.3` 🖵 | Selected root button uses the root color-role | P-004 | T055, T056, T057, T058, T117, T118, T119 (7/7 done) | T128 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.4 | `AC-1.4.1` 🖵 | Exactly the scale's semitone-offset notes highlighted | P-005 | T059, T060, T061, T062 (4/4 done) | T129 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.4 | `AC-1.4.2` 🖵 | Highlighted set updates immediately with no stale notes | P-005 | T059, T060, T061, T062 (4/4 done) | T129 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.4 | `AC-1.4.3` 🖵 | Degree labels use the exact formula notation | P-005 | T059, T060, T061, T062 (4/4 done) | T129 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.4 | `AC-1.4.4` | All scales and modes selectable, grouped by category | P-005 | T059, T060, T061, T062 (4/4 done) | T129 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.5 | `AC-1.5.1` 🖵 | Diatonic notes colored by degree role, non-diatonic notes uncolored | P-006 | T063, T064, T065, T066, T067, T068, T069, T070 (8/8 done) | T130 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.5 | `AC-1.5.4` 🖵 | Degree labels always relative to the key root | P-006 | T063, T064, T065, T066, T067, T068, T069, T070 (8/8 done) | T130 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.6 | `AC-1.6.1` 🖵 | Base-layer note names always visible | P-007 | T071, T072, T073, T074 (4/4 done) | T131 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.6 | `AC-1.6.2` 🖵 | Notes mode shows letter names in colored markers | P-007 | T071, T072, T073, T074 (4/4 done) | T131 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.6 | `AC-1.6.3` 🖵 | Degrees mode shows scale-degree numbers | P-007 | T071, T072, T073, T074 (4/4 done) | T131 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.6 | `AC-1.6.4` 🖵 | Intervals mode shows interval names relative to root | P-007 | T071, T072, T073, T074 (4/4 done) | T131 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.6 | `AC-1.6.5` 🖵 | Root distinguished by color and secondary indicator in every label mode | P-007 | T071, T072, T073, T074 (4/4 done) | T131 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.7 | `AC-1.7.1` 🖵 | Default full range N to 24 visible | P-008 | T075, T076, T077, T078, T079 (5/5 done) | T132 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.7 | `AC-1.7.2` 🖵 | Left handle drag narrows the range from below | P-008 | T075, T076, T077, T078, T079 (5/5 done) | T132 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.7 | `AC-1.7.3` 🖵 | Right handle drag narrows the range from above | P-008 | T075, T076, T077, T078, T079 (5/5 done) | T132 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.7 | `AC-1.7.4` 🖵 | Both handles adjusted shows only the selected range | P-008 | T075, T076, T077, T078, T079 (5/5 done) | T132 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.7 | `AC-1.7.5` 🖵 | Handle drag constrained so the range never inverts | P-008 | T075, T076, T077, T078, T079 (5/5 done) | T132 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.7 | `AC-1.7.6` 🖵 | Reset control restores the default N-24 view | P-008 | T075, T076, T077, T078, T079 (5/5 done) | T132 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.8 | `AC-1.8.1` 🖵 | Correct pitch and octave plays from a real guitar sample | P-009 | T080, T081, T082, T083, T084, T085, T086 (7/7 done) | T133 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.8 | `AC-1.8.2` | Same pitch class sounds distinct at different octaves | P-009 | T080, T081, T082, T083, T084, T085, T086 (7/7 done) | T133 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.8 | `AC-1.8.3` | Playback works offline after samples are cached | P-009 | T080, T081, T082, T083, T084, T085, T086 (7/7 done) | T133 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.8 | `AC-1.8.4` | Rapid triggers play cleanly without cutoffs or lag | P-009 | T080, T081, T082, T083, T084, T085, T086 (7/7 done) | T133 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.8 | `AC-1.8.5` 🖵 | Audio always sounds the true physical pitch under capo | P-009 | T080, T081, T082, T083, T084, T085, T086 (7/7 done) | T133 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.9 | `AC-1.9.1` 🖵 | Capo mutes lower frets and locks the left handle | P-010 | T087, T088, T089, T090, T091, T092, T093, T094, T095, T101, T102, T103, T104, T105, T106, T107, T108, T109, T113, T114, T115, T116 (22/22 done) | T134 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.9 | `AC-1.9.2` 🖵 | Absolute mode shows the true sounding pitch at the capo | P-010 | T087, T088, T089, T090, T091, T092, T093, T094, T095, T101, T102, T103, T104, T105, T106, T107, T108, T109, T113, T114, T115, T116 (22/22 done) | T134 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.9 | `AC-1.9.3` 🖵 | Relative mode shows the open-string name at the capo | P-010 | T087, T088, T089, T090, T091, T092, T093, T094, T095, T101, T102, T103, T104, T105, T106, T107, T108, T109, T113, T114, T115, T116 (22/22 done) | T134 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.9 | `AC-1.9.4` 🖵 | Relative and Absolute labels diverge above the capo | P-010 | T087, T088, T089, T090, T091, T092, T093, T094, T095, T101, T102, T103, T104, T105, T106, T107, T108, T109, T113, T114, T115, T116 (22/22 done) | T134 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.9 | `AC-1.9.5` | Highlighting recalculates on capo change with no stale frets | P-010 | T087, T088, T089, T090, T091, T092, T093, T094, T095, T101, T102, T103, T104, T105, T106, T107, T108, T109, T113, T114, T115, T116 (22/22 done) | T134 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.9 | `AC-1.9.6` 🖵 | Capo 0 makes both modes identical and frees the left handle | P-010 | T087, T088, T089, T090, T091, T092, T093, T094, T095, T101, T102, T103, T104, T105, T106, T107, T108, T109, T113, T114, T115, T116 (22/22 done) | T134 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.9 | `AC-1.9.7` 🖵 | Highlight root unshifted at capo 0 in either mode | P-010 | T087, T088, T089, T090, T091, T092, T093, T094, T095, T101, T102, T103, T104, T105, T106, T107, T108, T109, T113, T114, T115, T116 (22/22 done) | T134 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.9 | `AC-1.9.8` 🖵 | Highlight root unshifted in Absolute mode with capo | P-010 | T087, T088, T089, T090, T091, T092, T093, T094, T095, T101, T102, T103, T104, T105, T106, T107, T108, T109, T113, T114, T115, T116 (22/22 done) | T134 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.9 | `AC-1.9.9` 🖵 | Relative mode shifts the highlight root by plus capo fret | P-010 | T087, T088, T089, T090, T091, T092, T093, T094, T095, T101, T102, T103, T104, T105, T106, T107, T108, T109, T113, T114, T115, T116 (22/22 done) | T134 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.9 | `AC-1.9.10` 🖵 | Diatonic set, triad, toggles, and quality computed against the shifted root | P-010 | T087, T088, T089, T090, T091, T092, T093, T094, T095, T101, T102, T103, T104, T105, T106, T107, T108, T109, T113, T114, T115, T116 (22/22 done) | T134 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.9 | `AC-1.9.11` 🖵 | Playback always sounds the true physical pitch | P-010 | T087, T088, T089, T090, T091, T092, T093, T094, T095, T101, T102, T103, T104, T105, T106, T107, T108, T109, T113, T114, T115, T116 (22/22 done) | T134 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.9 | `AC-1.9.12` 🖵 | Bright notes summary always shows the true root's chord tones | P-010 | T087, T088, T089, T090, T091, T092, T093, T094, T095, T101, T102, T103, T104, T105, T106, T107, T108, T109, T113, T114, T115, T116 (22/22 done) | T134 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-1.9 | `AC-1.9.13` 🖵 | Capo indicator visually distinct from the nut | P-010 | T087, T088, T089, T090, T091, T092, T093, T094, T095, T101, T102, T103, T104, T105, T106, T107, T108, T109, T113, T114, T115, T116 (22/22 done) | T134 (1/1 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-2.1 | `AC-2.1.1` 🖵 | Root selector shows C and scale selector shows Ionian on first load | P-101 | T204, T205, T206, T207 (3/4 done) | T201, T202, T203 (3/3 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-2.1 | `AC-2.1.2` 🖵 | Fretboard shows C Ionian highlighted as if manually selected | P-101 | T204, T205, T206, T207 (3/4 done) | T201, T202, T203 (3/3 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-2.1 | `AC-2.1.3` | Changing root or scale after the default load updates the fretboard normally | P-101 | T204, T205, T206, T207 (3/4 done) | T201, T202, T203 (3/3 done) | **none** | 🔴 **CRITICAL** · NO TEST ᵃ |
| US-3.1 | `AC-3.1.1` 🖵 | Chord root dropdown lists all 12 chromatic roots as degrees of the current scale | P-202 | T311 (1/1 done) | T302 (1/1 done) | `controls.test.js`, `theory.test.js` | 🟢 OK |
| US-3.1 | `AC-3.1.2` 🖵 | Chord quality dropdown offers the full vocabulary | P-201 | T310 (1/1 done) | T301 (1/1 done) | `controls.test.js`, `theory.test.js` | 🟢 OK |
| US-3.1 | `AC-3.1.3` 🖵 | Selected chord's tones are computed from root + quality | P-201 | T310 (1/1 done) | T301 (1/1 done) | `fretboard.test.js`, `theory.test.js` | 🟢 OK |
| US-3.1 | `AC-3.1.4` 🖵 | Chord selection defaults to the scale root with a diatonic quality | P-203 | T312 (1/1 done) | T303 (1/1 done) | `controls.test.js`, `state.test.js`, `theory.test.js` | 🟢 OK |
| US-3.1 | `AC-3.1.5` | Chord selection persists across reloads | P-203 | T312 (1/1 done) | T303 (1/1 done) | `state.test.js` | 🟢 OK |
| US-3.1 | `AC-3.1.6` | Saved settings from the previous focal-point system load cleanly | P-203 | T312 (1/1 done) | T303 (1/1 done) | `state.test.js` | 🟢 OK |
| US-3.2 | `AC-3.2.1` 🖵 | View toggle switches between Scale and Chord views | P-204 | T313 (1/1 done) | T304 (1/1 done) | `controls.test.js` | 🟢 OK |
| US-3.2 | `AC-3.2.2` 🖵 | Chord view fully renders only the chord's tones | P-205 | T314 (1/1 done) | T305 (1/1 done) | `fretboard.test.js`, `styles.test.js` | 🟢 OK |
| US-3.2 | `AC-3.2.3` 🖵 | Chord view ghosts the remaining scale tones | P-205 | T314 (1/1 done) | T305 (1/1 done) | `fretboard.test.js` | 🟢 OK |
| US-3.2 | `AC-3.2.4` 🖵 | Chord view hides non-scale non-chord notes | P-205 | T314 (1/1 done) | T305 (1/1 done) | `fretboard.test.js` | 🟢 OK |
| US-3.2 | `AC-3.2.5` 🖵 | Scale view is unchanged by chord selection | P-206 | T315 (1/1 done) | T306 (1/1 done) | `fretboard.test.js` | 🟢 OK |
| US-3.2 | `AC-3.2.6` 🖵 | Clicking a note plays its pitch in both views | P-206 | T315 (1/1 done) | T306 (1/1 done) | `fretboard.test.js` | 🟢 OK |
| US-3.2 | `AC-3.2.7` 🖵 | Ghost dots remain non-interactive for selection but stay accessible | P-205 | T314 (1/1 done) | T305 (1/1 done) | `fretboard.test.js` | 🟢 OK |
| US-3.2 | `AC-3.2.8` 🖵 | Chord view shifts with the capo highlight root in Relative mode | P-207 | T316 (1/1 done) | T307 (1/1 done) | `fretboard.test.js` | 🟢 OK |
| US-3.2 | `AC-3.2.9` 🖵 | Chord summary line names the chord and its tones | P-204 | T313 (1/1 done) | T304 (1/1 done) | `controls.test.js`, `theory.test.js` | 🟢 OK |
| US-3.3 | `AC-3.3.1` 🖵 | Diatonic chord roots are labelled with case-correct Roman numerals | P-202 | T311 (1/1 done) | T302 (1/1 done) | `controls.test.js`, `theory.test.js` | 🟢 OK |
| US-3.3 | `AC-3.3.2` 🖵 | Non-diatonic chord roots are labelled as borrowed with a source when one is common | P-202 | T311 (1/1 done) | T302 (1/1 done) | `controls.test.js`, `theory.test.js` | 🟢 OK |
| US-3.3 | `AC-3.3.3` 🖵 | Non-seven-note scales fall back to degree-only labels | P-202 | T311 (1/1 done) | T302 (1/1 done) | `controls.test.js`, `theory.test.js` | 🟢 OK |
| US-3.4 | `AC-3.4.1` 🖵 | Root control is labelled "Scale Root" and chord picker "Chord Root" | P-204 | T313 (1/1 done) | T304 (1/1 done) | `controls.test.js` | 🟢 OK |
| US-4.1 | `AC-4.1.1` 🖵 | Play button strums the selected chord's tones ascending from its root | P-301 | T410, T411 (2/2 done) | T401 (1/1 done) | `audio.test.js`, `controls.test.js`, `theory.test.js` | 🟢 OK |
| US-4.1 | `AC-4.1.2` | Extended chords voice their extensions above the octave | P-301 | T410, T411 (2/2 done) | T401 (1/1 done) | `theory.test.js` | 🟢 OK |
| US-4.1 | `AC-4.1.3` | Playback is anchored to the true root, unaffected by capo Relative mode | P-302 | T412 (1/1 done) | T402 (1/1 done) | `controls.test.js` | 🟢 OK |
| US-4.1 | `AC-4.1.4` 🖵 | Chord playback only ever fires on the Play gesture | P-302 | T412 (1/1 done) | T402 (1/1 done) | `controls.test.js` | 🟢 OK |
| US-5.1 | `AC-5.1.1` 🖵 | Each degree role has exactly one color, used identically in both views | P-401 | T510 (1/1 done) | T501 (1/1 done) | `styles.test.js` | 🟢 OK |
| US-5.1 | `AC-5.1.2` | Note labels meet WCAG AA contrast on every role color | P-401 | T510 (1/1 done) | T501 (1/1 done) | `styles.test.js` | 🟢 OK |
| US-5.1 | `AC-5.1.3` 🖵 | Chord tones are marked by ring and size, never by a color swap | P-401 | T510 (1/1 done) | T501 (1/1 done) | `styles.test.js` | 🟢 OK |
| US-5.2 | `AC-5.2.1` 🖵 | Wide viewports get compact controls and a fretboard-first layout | P-402 | T511 (1/1 done) | T502 (1/1 done) | `styles.test.js` | 🟢 OK |
| US-5.3 | `AC-5.3.1` 🖵 | Chord picker dropdowns have a bounded width | P-402 | T511 (1/1 done) | T502 (1/1 done) | `styles.test.js` | 🟢 OK |

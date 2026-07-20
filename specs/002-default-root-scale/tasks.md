---

description: "Task list template for feature implementation"
---

# Tasks: Default Root & Scale on First Load

**Input**: Design documents from `/specs/002-default-root-scale/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Included — constitution Principle IV makes automated test coverage of `state.js` a hard gate, and this change alters `defaultState()`'s output.

**Organization**: This feature has a single user story (P1), so all tasks live in one phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1)
- Paths are relative to repository root (`src/`, `tests/`)

---

## Phase 1: Setup

**Purpose**: None required — this is a two-value change to an existing, already-scaffolded static web app. No new project setup, dependencies, or tooling needed.

---

## Phase 2: Foundational

**Purpose**: None required — `src/js/state.js`, `theory.js` (`ROOTS`/`SCALES`), `fretboard.js`, `controls.js`, and `main.js` already exist and already handle a populated `root`/`scaleId`. There is no blocking prerequisite work before User Story 1.

---

## Phase 3: User Story 1 - Default fretboard lit up on first visit (Priority: P1) 🎯 MVP

**Goal**: A user opening the app with no saved settings immediately sees the root selector on "C", the scale selector on "Ionian", and the fretboard highlighted for C Ionian — no clicks required.

**Independent Test**: With `localStorage` cleared (or in a fresh profile), load `src/index.html` and confirm the root/scale selectors show C/Ionian and the fretboard renders highlighted notes without any user interaction.

### Tests for User Story 1 ⚠️

> Write these first; confirm they FAIL against the current `null`/`null` defaults before making the implementation change.

- [ ] T001 [P] [US1] In `tests/state.test.js`, update/add a case asserting `defaultState()` (via `getState()` after a fresh module load, or via `load()` with no `fret-navigator-settings` key in `localStorage`) returns `root: "C"` and `scaleId: "ionian"`
- [ ] T002 [P] [US1] In `tests/state.test.js`, add/update a case asserting `load()` with an existing valid persisted `root`/`scaleId` (including a persisted `null`/`null` from a pre-change installation, if that's a representable stored state) still returns the persisted values, not the new "C"/"ionian" default
- [ ] T003 [P] [US1] In `tests/main.test.js`, add/update a case asserting that on initial app bootstrap with no persisted settings, the rendered fretboard/controls reflect C Ionian as highlighted (same DOM assertions the suite already uses for a manually-selected root/scale), rather than a blank/unselected state

### Implementation for User Story 1

- [ ] T004 [US1] In `src/js/state.js`, change `defaultState()` to return `root: "C"` and `scaleId: "ionian"` instead of `null`/`null` (depends on T001-T003 existing and failing first)
- [ ] T005 [US1] Run `node --test tests/state.test.js tests/main.test.js tests/fretboard.test.js tests/controls.test.js` and confirm all pass, including the new/updated cases from T001-T003, with zero regressions in the untouched fretboard/controls tests

**Checkpoint**: User Story 1 is fully functional and independently testable — this is the entire feature (single-story scope).

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across the whole automated + manual suite.

- [ ] T006 Run the full automated test suite (`node --test`) and confirm no regressions anywhere
- [ ] T007 Execute the manual validation steps in `specs/002-default-root-scale/quickstart.md` (fresh-profile load, change-and-reload, clear-and-reload) in an actual browser

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup / Foundational**: Not applicable — skipped, no prerequisite work exists for this change.
- **User Story 1 (Phase 3)**: No dependency on other phases; can start immediately.
- **Polish (Phase 4)**: Depends on Phase 3 completion.

### Within User Story 1

- Tests (T001-T003) MUST be written and observed failing before the implementation change (T004).
- T004 depends on T001-T003 existing.
- T005 depends on T004.

### Parallel Opportunities

- T001, T002, T003 touch different test cases (two in `tests/state.test.js`, one in `tests/main.test.js`) and can be drafted in parallel, though T001/T002 land in the same file so coordinate before committing.

---

## Parallel Example: User Story 1

```bash
# Draft the new/updated test cases together:
Task: "Add default-value test case to tests/state.test.js (T001)"
Task: "Add persisted-value-precedence test case to tests/state.test.js (T002)"
Task: "Add initial-render test case to tests/main.test.js (T003)"
```

---

## Implementation Strategy

### MVP First (and only) — User Story 1

1. Write/update tests (T001-T003); confirm they fail against current `null`/`null` defaults.
2. Make the one-line-per-field change in `defaultState()` (T004).
3. Run the full suite (T005-T006).
4. Manually validate via `quickstart.md` (T007).
5. Done — this feature has no further stories.

## Notes

- [P] tasks touch different files or independent, additive test cases — no shared-file conflicts beyond normal test-file edits.
- Commit after the test tasks (confirmed failing) and again after the implementation task (confirmed passing), per constitution's TDD-friendly gate for `state.js`.
- Avoid scope creep: do not add a UI-level "first-visit" flag, onboarding tour, or schema version bump — none of that is required by the spec.

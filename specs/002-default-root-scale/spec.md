# Feature Specification: Default Root & Scale on First Load

**Feature Branch**: `002-default-root-scale`

**Created**: 2026-07-20

**Status**: Draft

**Input**: User description: "On first load of the app, the fretboard should default to C Ionian (root=C, scale=Ionian) instead of no root/scale selected, so the fretboard immediately lights up with highlighted notes and demonstrates what the app does. Currently the app loads with no root and no scale selected, leaving the fretboard blank and the UI confusing for new users."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the fretboard lit up on first visit (Priority: P1)

A first-time visitor opens the app and, without selecting anything, immediately sees a fretboard with highlighted notes for a specific key (C Ionian), so they understand at a glance what the app is for.

**Why this priority**: This is the core problem being fixed — a blank fretboard on load is confusing and doesn't demonstrate the app's value. This is the entire scope of the change.

**Independent Test**: Load the app fresh (no prior state) and verify the root selector shows "C", the scale selector shows "Ionian", and the fretboard displays highlighted notes for C Ionian, with no additional user interaction required.

**Acceptance Scenarios**:

1. **Given** a user opens the app for the first time, **When** the page finishes loading, **Then** the root selector displays "C" and the scale selector displays "Ionian" as selected.
2. **Given** a user opens the app for the first time, **When** the page finishes loading, **Then** the fretboard displays the notes of C Ionian highlighted, exactly as if the user had manually selected root C and scale Ionian.
3. **Given** the app has loaded with the default C Ionian selection, **When** the user changes the root or scale, **Then** the fretboard updates normally to reflect the new selection (existing behavior is unaffected).

---

### Edge Cases

- If the app previously persisted a user's last-selected root/scale (e.g., in local storage or URL state), that saved selection MUST take precedence over the C Ionian default — the default only applies when no prior selection exists.
- Reloading the page after the user has explicitly changed the selection should not silently revert to C Ionian if a persisted selection mechanism exists.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: On initial application load, when no root/scale selection has been previously made (or restored from persisted state), the system MUST default the root to "C" and the scale to "Ionian".
- **FR-002**: On initial load with the default selection applied, the system MUST render the fretboard with the notes of C Ionian highlighted, using the same rendering behavior as when a user manually selects a root and scale.
- **FR-003**: The root and scale selector controls MUST visually reflect the default selection (C and Ionian) as pre-selected on load.
- **FR-004**: Users MUST be able to change the root and/or scale after load, with the fretboard updating accordingly (no change to existing selection behavior).
- **FR-005**: If the application supports persisting a user's prior selection across sessions, that persisted selection MUST be used instead of the C Ionian default when present.

### Key Entities

- **Selection State**: The currently active root note and scale, which drives which notes are highlighted on the fretboard. Previously could be empty/unset; now has a default value of root=C, scale=Ionian.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of first-time page loads (with no prior saved selection) display a fully highlighted fretboard with no user interaction required.
- **SC-002**: New users can visually identify what the app does (a fretboard/scale visualizer) within seconds of the page loading, without needing to read instructions.
- **SC-003**: Existing functionality for changing root/scale after load continues to work with zero regressions.

## Assumptions

- "C Ionian" is equivalent to the C major scale and is a reasonable, recognizable default for demonstrating the app.
- The app currently has no persisted selection mechanism (no local storage/URL state for root/scale); if one exists, it takes precedence per FR-005/Edge Cases.
- This change only affects the initial/default state of the selection; it does not change how scales are computed or how the fretboard renders once a selection is made.

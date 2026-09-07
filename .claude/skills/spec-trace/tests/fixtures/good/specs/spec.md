# Feature Specification: Fixture

A miniature spec-kit project in which every rule holds. The `broken` fixture beside it is
this one with a single defect introduced per check, so a test can assert that the checker
catches exactly that defect and nothing else.

### User Story 1 - Widgets

*Traceability: `US-1.1` — Widgets*

**Acceptance Scenarios**:

- **AC-1.1.1** — A widget has a name
  - **Given** a widget
  - **Then** it has a name

- **AC-1.1.2** — The widget button is disabled at the cap
  - **Given** ten widgets
  - **Then** the Add button is disabled

- **AC-1.1.3** — Widget totals for each size
  - **Given** a widget of each size
  - **Then** the totals are exactly:

  | Size | Total |
  |---|---|
  | small | 1 |
  | large | 2 |

  - **Cases**:
    - **AC-1.1.3/1** — A small widget totals one
    - **AC-1.1.3/2** — A large widget totals two

## Requirements

- **FR-001**: Widgets exist.

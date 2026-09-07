# Research — Feature 005 Display Overhaul

## R-501: One token per degree, chord emphasis by ring

- **Decision**: Collapse `--role-X-bright`/`--role-X-dark` into a single `--role-X`;
  Chord view marks chord tones with a thick white ring + larger radius over the same
  fill.
- **Rationale**: Maintainer's choice ("Same colors + strong ring") — removes the
  jarring palette jump between views and halves the token surface. Ring + size is a
  non-color cue, keeping the accessibility rule satisfied by construction.
- **Alternatives**: Keeping bright/dim with darkened brights (still two looks; declined).

## R-502: Deep saturated palette, white bold labels, computed AA floor

- **Decision**: 12 deep saturated hues (red → magenta around the chromatic circle),
  each validated ≥ 4.5:1 against `#fff` labels; the validation lives in
  `tests/styles.test.js` as a WCAG relative-luminance computation over the stylesheet
  source, so a future hue tweak that breaks contrast fails the build. Values:
  1 `#c62828`, b2 `#b3541e`, 2 `#8a6d00`, b3 `#66790a`, 3 `#2e7d32`, 4 `#00795c`,
  #4/b5 `#00707e`, 5 `#0b69b7`, b6 `#3f51b5`, 6 `#673ab7`, b7 `#8e24aa`, 7 `#c2185b`.
- **Rationale**: Maintainer's choice ("Deep saturated + white text"); pastel fills with
  light labels were unreadable at TV distance. Automating the floor turns the
  constitution's contrast bar into a gate.
- **Alternatives**: Bright fills + black text (glowy on a dark page at distance; declined).

## R-503: TV tier at ≥1280px, fretboard-first flex

- **Decision**: Keep the existing ≥768px no-scroll flex layout (fretboard container is
  the growing region) and add a ≥1280px tier that compacts controls: tighter gaps,
  smaller control labels/selects/buttons, reduced header/footer padding.
- **Rationale**: The board shrank because feature 003's wide selects wrapped the
  control strip taller; the fix is making the strip cheaper, not restructuring the
  page. Phones/iPads (reported fine) sit below the tier and are untouched.
- **Alternatives**: Sidebar controls at wide widths (bigger restructure, more risk to
  the modes that already look right; can revisit if the compact strip isn't enough).

## R-504: Bounded chord selects

- **Decision**: `max-width` cap (12rem; 10rem in the TV tier) + `text-overflow:
  ellipsis` on the chord root/quality selects; full text remains in the opened list.
- **Rationale**: The collapsed control was sized by its longest borrowed-from option.
  Native selects can't show different closed vs open text, so capping width is the
  portable fix (ellipsis support in collapsed selects varies; acceptable).
- **Alternatives**: Custom dropdown widget (heavy, accessibility work to re-earn — YAGNI).

## R-505: Token-name test updates are part of the refactor

- **Decision**: The FR-051 assertions in `tests/styles.test.js`/`tests/controls.test.js`
  that named `--role-1-bright` now name `--role-1`.
- **Rationale**: §2a — those tests asserted the shared-token *rule* via the then-current
  token name; FR-301 renames the token, so the tests follow the requirement, not the
  old code.

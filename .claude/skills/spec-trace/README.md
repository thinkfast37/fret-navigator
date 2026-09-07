# spec-trace — portability guide

A dependency-free traceability checker and matrix generator for
[spec-kit](https://github.com/github/spec-kit) projects. Copy this folder into any such
project and point a config file at its documents.

`SKILL.md` covers what the checks are and how to work under them. This file covers the
document conventions they assume, and how to adopt the tool on a project that already has
findings.

---

## Installing

1. Copy the whole `spec-trace` folder to `.claude/skills/spec-trace/`.
2. Add `spec-trace.config.json` at the repository root (see `SKILL.md`).
3. Add the scripts:

```json
{
  "check:trace": "node .claude/skills/spec-trace/spec-trace.mjs",
  "trace:matrix": "node .claude/skills/spec-trace/spec-trace.mjs matrix",
  "trace:changed": "node .claude/skills/spec-trace/spec-trace.mjs changed",
  "trace:prune": "node .claude/skills/spec-trace/spec-trace.mjs prune-baseline"
}
```

4. Run the self-tests. They need Vitest, which most spec-kit projects already have;
   add `.claude/skills/*/tests/*.test.js` to your Vitest `include`. Everything else runs
   on Node alone.

Node 18 or newer. No dependencies.

---

## Document conventions

The tool reads Markdown, so it needs to recognise a few shapes. All of them are the
spec-kit defaults.

### spec.md — an Acceptance Criterion

```markdown
- **AC-1.1.2** — Appending inherits the preceding Measure's Time Signature
  - **Given** a Pattern of 2 Measures whose last Measure is 3/4
  - **When** the Composer taps +Measure
  - **Then** a third Measure is appended at the end, set to 3/4
```

The ID is `AC-<epic>.<story>.<n>`; the text after the em dash is the **title**, and that
title is what a test must be named. The block ends at the next requirement or heading.

### spec.md — a compound AC and its Cases

An AC asserting more than one thing — several `Then`/`And` clauses, or a table — must
name its Cases, one per assertion:

```markdown
- **AC-1.2.2** — Beat count and note value, for all supported meters
  - **Then** the Beats and note values are exactly:

  | Signature | Beats | Note value |
  |---|---|---|
  | 4/4 | 4 | quarter |
  | 6/8 | 6 | eighth |

  - **Cases**:
    - **AC-1.2.2/1** — 4/4 is 4 quarter-note Beats
    - **AC-1.2.2/2** — 6/8 is 6 eighth-note Beats
```

A `Then` that introduces a table is not counted as an assertion beside the table's rows.

Cases are **additive**: the AC keeps its ID, so no cross-reference anywhere breaks.
Renumbering ACs is what causes IDs to slide onto the wrong criteria in the first place.

### plan.md — the authored Traceability Matrix

The one place a human decides which AC belongs to which plan item, and which tasks build
and prove it:

```markdown
| Plan item | Covers | Acceptance Criteria | Implementation tasks | Test tasks |
|---|---|---|---|---|
| **P-001** | Setup | — | T001–T011 | — |
| **P-002** | US-1.1 — Measure sequence | AC-1.1.1–AC-1.1.9 | T036–T037 | T038 |
```

Ranges are expanded (`–`, `—` or `-`), within a single story. `—` in the AC column marks
infrastructure: an item asserting no behaviour, which needs no test task.

### tasks.md — a task

```markdown
- [X] T036 [US1.1] Wire Measure add/remove into `src/ui/controls.js`
```

Backticked paths are the files the task touched. For a **completed** task they must exist.

### The test suite

```js
it('AC-1.1.2 — Appending inherits the preceding Measure’s Time Signature', () => { … });
```

Curly quotes, straight quotes and dash style are normalised, so typography never decides a
result. A name may contain quote characters.

---

## Adopting it on a project that already has findings

A gate that is permanently red gates nothing. Generate a baseline once, and let it burn
down:

```bash
npm run trace:matrix          # generate the matrix first, so T8 is satisfied
node -e "…"                   # write every current finding key into the baseline
```

The tool deliberately has **no command that adds to the baseline**. Seeding it is a
one-off, done in the open in the adopting commit and reviewed there; after that
`trace:prune` only ever removes entries. Taking on new debt means hand-editing the file,
which appears in a diff and has to be argued for.

A finding key is `<check> <id>`, with a discriminator for the checks that can raise
several findings against one id (`T2`, `T3`) and a severity for `T5`, so a criterion
accepted as merely misnamed cannot quietly decay into one whose test proves something
else.

---

## Tuning

Everything below is optional and lives in `spec-trace.config.json`.

| Key | Meaning |
|---|---|
| `waivers` | Gaps signed off with a reason (default `specs/traceability-waivers.json`) |
| `testDirs` | Where tests live |
| `domCapable` | Test paths that can reach a rendered document |
| `uiVocabulary` | Words that make a criterion UI-level |
| `synonyms` | Terms your project uses interchangeably |

`uiVocabulary` is the one worth revisiting per project: it decides which criteria T6
insists on proving at the DOM level. Add your domain's words for things a person sees.

`synonyms` only affects how findings are **ranked** (a test proving something else versus
one merely misnamed), never whether one is raised. Do not use it to paper over a stemming
problem — a synonym list covering what a stemmer got wrong hides the next word it gets
wrong too.

---

## Limitations, stated plainly

- **It reads names, not assertions.** A test named exactly for its criterion that asserts
  nothing will pass every check. Verbatim naming makes the claim legible and reviewable;
  it does not make it true. Review is still review.
- **A criterion already at the worst severity cannot get worse.** If a finding is
  baselined as `mismatched`, further damage to that test raises no new finding. It is
  already on the burn-down list.
- **The change matrix separates confidence rather than pretending to precision.** A
  criterion whose own test changed is listed in full; one reached only because the change
  touched a file some task mentions is collapsed to a count. The second set is a blast
  radius, and in a codebase with a composition root it is most of the application — early
  versions listed all of it and buried the rows a reviewer needed.
- **A waiver is a decision, not a measurement.** The tool checks that one exists, is
  reasoned, still applies, and stays within LOW/MEDIUM. It cannot check that the reason is
  a good one; that is what showing it in the matrix row is for.

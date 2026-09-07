---
name: spec-trace
description: Traceability for spec-kit projects — checks that every Acceptance Criterion traces to a plan item, an implementation task, a test task and a test actually named for it, and generates the reviewable traceability matrix. Use when adding or changing an Acceptance Criterion, when adding or renaming a test, when a change touches spec.md/plan.md/tasks.md, when asked for a traceability matrix or a coverage/traceability audit, or before opening a pull request in a spec-kit project.
---

# spec-trace

## What problem this solves

"Every AC has a test" is usually enforced by checking that an AC's ID appears somewhere in
a test file. That proves the ID was **typed**, not that anything was **proved**. Under such
a gate a User Story can be specified, never built, and report 100% coverage — which is
exactly what happened twice in this repository before the skill existed (US-2.2's pitch
strip, and US-11.1/US-11.2's duplicate and Family views).

spec-trace checks the whole chain instead:

```text
AC  →  Case (when the AC asserts more than one thing)
    →  plan item (P-0xx, in the plan's Traceability Matrix)
    →  implementation task  +  test task  (tasks.md)
    →  a test whose NAME is the criterion's title, verbatim
```

## Multi-feature projects

A project with several feature folders lists them in `spec-trace.config.json` as a
`features` array of `{spec, plan, tasks}` triples; they are checked as one project
against one matrix, baseline and waiver file. Every AC, plan-item and task ID must be
unique across features — give each feature its own AC epic number and its own P-/T-
ranges (the checker refuses to run on a duplicate rather than silently merging two
requirements into one row). This repository's allocation is in `CLAUDE.md` §2c.

## Commands

```bash
npm run check:trace              # every check; non-zero exit on a finding outside the baseline
npm run check:trace -- --summary # one line per check
npm run trace:matrix             # regenerate the committed master matrix
npm run trace:changed            # the matrix rows this change touches — paste into the PR
npm run trace:prune              # strike off baseline entries that are no longer findings
```

## The checks

| | Rule | Why it exists |
|---|---|---|
| **T1** | Every AC traces to a numbered plan item | An AC no plan item claims was never scheduled |
| **T2** | Every plan item carrying ACs has an implementation **and** a test task | A plan item with no test task is work whose proof was never scheduled |
| **T3** | Every file a **completed** task names exists | A finished task naming a file nobody wrote is a false record |
| **T4** | An AC asserting more than one thing declares numbered **Cases** | One test standing in for twelve table rows proves one and claims twelve |
| **T5** | Every criterion has a test whose **name is its title, verbatim** | A paraphrase can only be judged by similarity, and every threshold has a band where a wrong test gets through |
| **T6** | A UI-level criterion has a test that can reach the DOM | A pure unit test cannot prove a criterion about a control, whatever it is named |
| **T7** | No test names an AC or Case ID the spec does not declare | A renumbered AC leaves its old ID on a test that now proves nothing |
| **T8** | The committed matrix is up to date | A matrix that drifts is worse than none — it looks like assurance |
| **T9** | Every waiver is valid, reasoned, and still needed | A waiver file that rots becomes a blanket pass |

## When you are working in a spec-kit project

**Adding or changing an Acceptance Criterion.** Add its plan item row and both tasks in the
same change. T1 and T2 fail until they exist — that is what stops an AC being written down
and quietly never scheduled. Then regenerate the matrix.

**Writing a test.** Its name is the criterion's title, copied:

```js
it('AC-1.1.9 — Measure removal is always from the end', () => { … });
```

Append a qualifier when a criterion needs more than one test:

```js
it('AC-1.1.9 — Measure removal is always from the end: from six down to one', () => { … });
```

**Every** test naming a criterion must be named for it, not merely one of them.

**A criterion that names a control, view, panel, prompt, gesture or viewport** needs an
end-to-end or DOM-level test. A pure unit test cannot see a screen.

**When a test fails, fix the code.** Change a test only when the test itself is the defect —
it asserted something the AC never said — and say so explicitly, naming the AC that settles
it. Never relax, narrow, delete or skip a test to make a build green.

**Before opening a pull request**: run `npm run trace:matrix`, commit the result, and paste
`npm run trace:changed` into the PR body. It lists **directly affected** criteria — ones
whose own test changed — in full, and collapses the indirect blast radius to a count.

## Coverage and gap severity

The matrix reports the proportion **proven**, overall and per User Story, alongside the
gaps — a list of only what is wrong cannot say whether the work is fit to ship.

Every gap carries a severity **derived from its kind**, never assigned per criterion (an
assigned severity gets revised downward by whoever is in a hurry):

| | Gap | Why |
|---|---|---|
| 🔴 **CRITICAL** | No test names the criterion | Nobody has looked. The state an unbuilt requirement sits in. |
| 🔴 **HIGH** | A test names it but proves something else | Unproven while reporting as covered. |
| 🔴 **HIGH** | UI-level, but only a pure unit test | Same failure, reached differently. |
| 🟠 **MEDIUM** | Compound AC not decomposed | Partly proven; one test stands in for several claims. |
| 🟡 **LOW** | Right test, named in its own words | Proven. Clerical. |

Every row, every User Story and every headline count carries that colour — 🟢 proven, 🔵
waived, 🟡 → 🟠 → 🔴 as a gap gets more serious — so a matrix of hundreds of rows can be
scanned for trouble rather than read. A User Story takes the colour of its **worst**
criterion, since one unproven claim is the thing worth seeing. The colour is always
printed beside the words it repeats, never instead of them: red and green are the one pair
a colour-blind reader cannot separate, and the matrix has to survive a plain-text diff.

## Waivers

A **LOW or MEDIUM** gap may be signed off in the waivers file with a written reason, shown
in its matrix row:

```json
{
  "waived": [
    { "criterion": "AC-3.1.9", "reason": "Verified by hand each release; …", "date": "2026-08-17" }
  ]
}
```

**CRITICAL and HIGH can never be waived, by anyone, for any reason.** Those are the states
in which a specified requirement sits while unbuilt and reporting as complete. T9 fails a
waiver that reaches above MEDIUM, names an undeclared criterion, gives no real reason, or
covers a gap that has since been fixed.

## The baseline

`traceability-baseline.json` holds findings that pre-date the gate. They are reported but
do not fail the build; anything else does. **It may only shrink** — `trace:prune` removes
what is fixed, and nothing writes new entries, so taking on debt means hand-editing a
checked-in file, which shows up in a diff.

Fixing a baselined finding fails the gate until you prune. That is deliberate: it keeps the
list honest, so it can never quietly re-excuse a later regression. A baselined finding is
outstanding work, never a settled decision.

## Using it in another spec-kit project

Copy this whole folder to `.claude/skills/spec-trace/`, then add a
`spec-trace.config.json` at the repository root:

```json
{
  "spec": "specs/001-my-feature/spec.md",
  "plan": "specs/001-my-feature/plan.md",
  "tasks": "specs/001-my-feature/tasks.md",
  "matrix": "specs/traceability-matrix.md",
  "baseline": "specs/traceability-baseline.json",
  "waivers": "specs/traceability-waivers.json",
  "testDirs": ["tests/unit", "tests/e2e"],
  "domCapable": ["tests/e2e/", "tests/unit/ui/"]
}
```

`spec`, `plan` and `tasks` are feature-scoped and live under that feature's numbered
folder. `matrix`, `baseline` and `waivers` are not — the matrix reports on the whole
application, and outlives any one feature, so keep them at the `specs/` root rather than
nested inside a folder that one release will eventually be the last change to touch.

There are no dependencies and nothing to install. See `README.md` in this folder for the
document conventions the tool expects and how to adopt it on a project that already has
findings.

# Fret Navigator — working agreement

A browser-based guitar fretboard visualizer: tunings, scales/modes, capo, focal-point
chords, Web Audio playback. Client-side only, static site served from `src/`, no build
step, no backend. The maintainer is a practising guitarist, not a QA department: they
describe what they want in their own words, and **you pick the right workflow for it**.

This agreement is ported from rhythm-master, which learned each of these rules the hard
way. Read it before starting any change.

---

## 1. The blast-radius rule (the important one)

**Before implementing anything, work out what it touches beyond the literal request.**
Ask, in order:

1. Which Acceptance Criteria would have to change?
2. Which *other* User Stories' behaviour changes as a side effect?
3. Does it contradict a research decision (`research.md` in the feature folder)?
4. Does it contradict a Constitution principle (`.specify/memory/constitution.md`)?

Then:

| Blast radius | What to do |
|---|---|
| Confined to what was asked | **Announce the type in one line and proceed.** |
| Reaches behaviour that was not asked about | **Stop. Present what else changes, and get approval for the spill before writing code.** |

Classify by what a change **contradicts**, never by how big it feels. A one-line edit can
be a governance change; a thousand-line refactor can be a bug fix.

---

## 2. Choosing the workflow

| The change… | Type | Required path |
|---|---|---|
| Code doesn't do what an AC already says | **Bug** | Write the failing test first → fix → verify. No spec edit. |
| A test fails | **See §2a** | Fix the *code*. Changing the test is a separate, named decision. |
| An AC is wrong, impossible, or ambiguous | **Spec defect** | Revise the AC **first**, with a dated parenthetical saying what changed and why → then fix. |
| Nothing in the spec covers it | **New capability** | `/speckit-specify` → `/speckit-tasks` → `/speckit-implement`, in a **new feature folder** — see §2c for the ID ranges it must claim. Add `/speckit-plan` only when technical assumptions change. |
| Contradicts a research decision | **Approach change** | Amend the entry in that feature's `research.md` with the reversal and its reasoning → then whatever the row above implies. |
| Contradicts a Constitution principle | **Governance** | `/speckit-constitution` amendment with a version bump → then the rest. |

**Spec before code, never after.** If an AC has to change, change it in the same change
*before* the implementation, so the intent can be objected to rather than the finished
work.

---

## 2a. When a test fails, the code is wrong

This is a Constitution non-negotiable (Principle IV), not a preference.

**A failing test is evidence about the code.** The default conclusion is that the
implementation is wrong, and the implementation is what changes.

A test may be changed **only** when the test itself is the defect — it asserted something
the AC never said, or encoded an assumption the AC contradicts. When that is genuinely the
case: say so explicitly, naming the AC that settles it; log it in the task and cite it in
the commit; fix the test to match the AC — not to match the code. If the *AC* is what's
wrong, that is a **spec defect**: revise the AC first (§2).

**Never** relax an assertion, narrow a case, delete a test, or mark it skipped to turn a
build green. If you cannot make a test pass, say so and stop — a reported failure is worth
more than a green build that means nothing.

---

## 2b. Traceability: what stops a requirement being half-built

`npm run check:trace` enforces the chain:

```text
AC  →  Case (if the AC asserts more than one thing)
    →  plan item (P-xxx, the feature plan.md's Traceability Matrix)
    →  implementation task  +  test task  (the feature's tasks.md)
    →  a test named for the criterion, verbatim
```

Nine checks (T1–T9), each failing on its own — see `.claude/skills/spec-trace/SKILL.md`
for the full table and the reasoning. The consequences worth stating here:

- **A test name is not a claim, it is the criterion.** Write
  `test('AC-1.1.2 — Inlay dots at the standard marker frets', …)`, copying the AC's
  title verbatim; append `: qualifier` when a criterion needs several tests. `coverage:ac`
  proves the ID was typed; `check:trace` T5 proves the name matches. Both must pass.
- **A compound AC must be decomposed, not summarised** — numbered Cases
  (`AC-1.2.2/1`, `/2`, …), one test each.
- **A UI-level criterion needs a DOM-capable test.** `tests/theory.test.js` is pure and
  cannot prove anything about a screen; the jsdom suites (`fretboard`, `controls`,
  `main`, `main-default-selection`, `styles` — listed in `spec-trace.config.json`
  `domCapable`) can.
- **Adding a new AC means adding its plan item row and both tasks in the same change.**
  T1 and T2 fail until they exist. That is what stops an AC being written down and quietly
  never scheduled.

### The matrix

`specs/traceability-matrix.md` is the whole chain as one generated, colour-marked
document — one row per criterion across **all** feature folders, with coverage
percentages overall and per User Story. **Never edit it by hand.**

```bash
npm run trace:matrix     # regenerate; commit the result (T8 fails when stale)
npm run trace:changed    # the rows this change touches — paste into the PR body
```

### The baseline

The gate arrived 2026-09-07 with **57 findings standing: every criterion was `untested`**
— no test names any AC ID, because the IDs were retrofitted onto specs written before the
gate existed. The tests themselves exist (178 of them) and cover the behaviour; what is
missing is the per-criterion naming that makes coverage checkable. That is the burn-down:
as tests are renamed (or written) to their criteria, prune.

`specs/traceability-baseline.json` holds that debt: reported, not build-failing, and it
**may only shrink** (`npm run trace:prune`). `coverage:ac` reads the same file, so there
is one debt list, not two. A baselined finding is outstanding work, not a settled
decision. Fixing one fails the gate until you prune — deliberate, it keeps the list
honest.

Waivers (`specs/traceability-waivers.json`) are different in kind: a written, reviewable
decision *not* to close a LOW/MEDIUM gap. **CRITICAL and HIGH can never be waived, by
anyone, for any reason.**

---

## 2c. Multiple feature folders: the ID ranges

Unlike rhythm-master's single whole-app spec, this project keeps one folder per feature
and `check:trace` reads them all as one project (`spec-trace.config.json` → `features`).
That only works while **every ID is unique across features** — the checker refuses to run
otherwise. The allocation:

| Feature folder | AC epic | Plan items | Tasks |
|---|---|---|---|
| `001-fretboard-visualizer` | `AC-1.x.x` | P-001–P-099 | T001–T199 |
| `002-default-root-scale` | `AC-2.x.x` | P-101–P-199 | T201–T299 |
| next feature `00N` | `AC-N.x.x` | P-(N−1)01+ | T(N−1)01+ |

A new feature folder claims the next epic and ranges, gets its own plan Traceability
Matrix and tasks, and adds its `{spec, plan, tasks}` triple to `spec-trace.config.json`
**and** its spec path to the `SPECS` list in `tests/ac-coverage.js` in the same change.

---

## 3. Every change gets a task

Every change — bug, data fix, feature, anything — gets a numbered task in the tasks.md of
the feature it belongs to, checked off when done, naming the files it touched and the
US/AC IDs it implements or revises. Feature 001 continues from T135; feature 002 from
T209. The original build-out sections are historical record: do not renumber them (002's
tasks were renumbered T201–T207 once, on 2026-09-07, to make IDs globally unique — that
note stays).

---

## 4. Non-negotiable gates

Run before every commit. All must pass:

```bash
npm test              # node --test: app suites + spec-trace's own self-tests
npm run coverage:ac   # every AC outside the baseline has a test naming it
npm run trace:matrix  # regenerate the matrix, and commit it (§2b)
npm run check:trace   # the AC → plan → task → test chain (§2b)
```

`npm run check:trace --silent -- --summary` prints one line per check.

**`check:trace` must report no new findings, and `coverage:ac` no gaps outside the
baseline.** A new AC without a test is an incomplete change, not a passing one. Commit
messages cite the US/AC IDs they touch.

**A gate that fails stops the change.** Not "is noted and worked around": §2a governs
what to do next, and the answer is never to make the gate ask for less.

Known gaps this project has **not** yet closed (each is future work, not licence):
no linter, no real-browser e2e suite (all DOM tests are jsdom), and no unwired-export
check. Until they exist, nothing enforces `theory.js`'s purity or catches an export the
app cannot reach — be the gate yourself.

---

## 5. Landing the work: every change becomes a PR

**`main` is the live site.** `.github/workflows/pages.yml` fires on push to `main`, and
its `verify` job re-runs the gates before `deploy` publishes `src/` to Pages — red gates
stop the publish. Nothing on a branch is visible to the guitarist, so a branch left
unmerged is a change that, from where they sit, did not happen.

Every change lands the same way:

1. **Ask what §1 requires** and get the spill approved, if there is one.
2. **Ask how this one should land.** Once the plan is settled and you are about to write
   code, put one `AskUserQuestion` with two options:
   - **Auto** — you open the PR and merge it yourself once the gates pass. **Always the
     default, always listed first.**
   - **Review** — you open the PR, report the gate results, and stop. The maintainer
     merges.

   Ask it **once per change**, at that point. Not again later in the same change.
   Name it in the option text when either applies: the change **cannot be undone by a
   follow-up commit** (e.g. a `localStorage` schema migration rewrites saved settings on
   load), or **taste is the deliverable** (layout, spacing, colour — the gates prove it
   works, not that it is right, and the maintainer plays with it daily).
3. **Implement**, then run all four gates in §4.
4. **Open the PR either way** — it is the record, not the approval step. **Paste
   `npm run trace:changed` into the body**; if it comes back empty, say so.
5. **Auto: merge it.** Review: hand over the link and stop.
6. **Watch the deploy, and report what is actually live.** Merging is not landing —
   `verify` can pass and `deploy` still fail on its own. Check the run; if red, say so,
   name the failure, and do not describe the change as delivered. If the token cannot
   re-run the job, say plainly that the maintainer has to press **Re-run failed jobs**,
   with the link.

**A failing or skipped gate stops the merge in either mode.** Auto is permission to merge
*passing* work without waiting, never to merge red work. **If the blast radius changes
mid-implementation, the mode is void** — stop, say so, and ask again.

---

## 6. Architecture rules that hold (currently by discipline, not tooling)

- **`src/js/theory.js` is pure.** No DOM, no Web Audio, no `localStorage`; all musical
  arithmetic lives there and is never re-derived elsewhere. (No lint enforces this yet —
  see §4's gap list.)
- **State is the one source of truth.** `src/js/state.js` owns the settings shape,
  `schemaVersion`d in `localStorage`, validated and migrated before use; rendering
  consumes state, never the other way.
- **The capo binding rule.** Everything downstream of the display root
  (`getDisplayRootSemitone`) shifts together under Relative mode — scale membership,
  triads, toggles, chord naming. One function decides; consumers may not re-derive it.
- **Inlay dots are physical.** They anchor to true fret positions and never remap under
  Relative renumbering (AC-1.1.5).
- **No build step, no bundler.** `src/` is the deployable site; ES modules loaded
  directly. Test-only tooling (jsdom) never ships.
- **Every deployed build is stamped.** The Pages workflow injects UTC time + commit into
  `<meta name="build-version">` in `src/index.html`. View-source on the live site answers
  "which version is running?". Do not remove the stamp or the placeholder `content="dev"`
  tag it rewrites.

---

## 7. Where things live

| Path | What |
|---|---|
| `.specify/memory/constitution.md` | Principles and quality bars. Amending needs a version bump. |
| `specs/001-fretboard-visualizer/` | Feature 001: spec, plan (+ Traceability Matrix), tasks, research, contracts. |
| `specs/002-default-root-scale/` | Feature 002: same shape. |
| `specs/traceability-matrix.md` | Generated. The whole-project AC → plan → task → test chain. |
| `specs/traceability-baseline.json` | Accepted pre-gate debt. Shrink-only. |
| `spec-trace.config.json` | The feature triples and test-dir map the checker reads. |
| `tests/ac-coverage.js` | The fast per-AC gate (baseline-aware). |
| `.claude/skills/spec-trace/` | The checker itself, self-tested under `npm test`. |
| `src/js/` | The application: `theory` (pure), `state`, `fretboard`, `controls`, `audio`, `main`. |
| `docs/story-drafts/` | The raw UAT story documents the specs were built from. |

---

## 8. Check the record before asking

Long sessions get compacted; treat your own memory of this project as the least reliable
source available. Before asking the maintainer anything — and before reporting work as
outstanding:

```bash
git log --oneline -20
git log --oneline -- <the file>
git log --all --grep='<topic>'
```

Then the durable records: the tasks.md logs, the AC text in the spec, the research.md
entries, the constitution. **The repository is the source of truth. Your context is
not.** Write outcomes down when work lands, not when you plan it; verify state from
files, not commit messages; if a question feels familiar, search first.

---

## 9. Working style

- Surface decisions rather than making them quietly. When a choice would change what the
  guitarist gets, ask — with the trade-offs named, not just the options.
- Be concise. State the finding, not the journey.
- Report failures plainly, with the output.
- When the maintainer challenges something, check whether they are right before defending
  it.

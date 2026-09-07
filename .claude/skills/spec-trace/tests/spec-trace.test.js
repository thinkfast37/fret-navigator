/**
 * Self-tests for spec-trace.
 *
 * The tool's whole job is to stop a requirement being reported as proven when it is not.
 * Left untested it would be the one unchecked thing in a repository that checks
 * everything else — and a false PASS here is invisible by construction, because a gate
 * that never fires looks exactly like a gate with nothing to find.
 *
 * Each case takes the `good` fixture — a miniature spec-kit project in which every rule
 * holds — introduces exactly one defect, and asserts both that the intended check fires
 * and that no other check does. The second half matters as much as the first: a checker
 * that flags everything gets switched off.
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import { expect } from './expect.mjs';
import { mkdtempSync, cpSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEFAULTS } from '../lib/config.mjs';
import {
  run,
  masterMatrix,
  checkMatrixFreshness,
  checkWaivers,
  criteriaTouchedBy,
} from '../lib/project.mjs';
import {
  statusOf,
  renderChange,
  SEVERITY_OF,
  SEVERITY_ORDER,
  WAIVABLE,
  MARK_OF,
  markFor,
} from '../lib/matrix.mjs';
import { assertionCount, claimedTitle, normalise, findingKey, buildCriteria } from '../lib/analyse.mjs';
import { expandRange, readSpec } from '../lib/parse.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const GOOD = join(HERE, 'fixtures/good');

let root;

/** A throwaway copy of the good fixture, so a case can damage it freely. */
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'spec-trace-'));
  cpSync(GOOD, root, { recursive: true });
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

const config = () => ({
  ...DEFAULTS,
  root,
  spec: 'specs/spec.md',
  plan: 'specs/plan.md',
  tasks: 'specs/tasks.md',
  matrix: 'specs/traceability-matrix.md',
  baseline: 'specs/traceability-baseline.json',
});

/** Run every check, including the matrix-freshness one, with the matrix up to date. */
function checkAll({ freshMatrix = true } = {}) {
  const cfg = config();
  const state = run(cfg);
  const { text, rows } = masterMatrix(state, cfg, new Set());
  if (freshMatrix) writeFileSync(join(root, cfg.matrix), text);
  checkMatrixFreshness(state, cfg, text);
  return { state, findings: state.findings, rows, text, cfg };
}

/** Which checks fired, as a sorted list of ids — the shape every case asserts on. */
const fired = (findings) =>
  Object.entries(findings)
    .filter(([, list]) => list.length > 0)
    .map(([id]) => id)
    .sort();

const edit = (file, fn) => {
  const path = join(root, file);
  writeFileSync(path, fn(readFileSync(path, 'utf8')));
};

describe('the good fixture', () => {
  it('passes every check, so a failure elsewhere is the defect and not the fixture', () => {
    const { findings } = checkAll();
    expect(fired(findings)).toEqual([]);
  });

  it('counts one criterion per assertion, expanding a compound AC into its Cases', () => {
    const { rows } = checkAll();
    // AC-1.1.1, AC-1.1.2, and AC-1.1.3's two Cases — not AC-1.1.3 itself.
    expect(rows.map((r) => r.id)).toEqual(['AC-1.1.1', 'AC-1.1.2', 'AC-1.1.3/1', 'AC-1.1.3/2']);
  });
});

describe('T1 — every AC traces to a plan item', () => {
  it('fires when an AC is specified but no plan item claims it', () => {
    edit('specs/spec.md', (s) =>
      s.replace('## Requirements', '- **AC-1.1.9** — An unscheduled criterion\n  - **Then** it happens\n\n## Requirements')
    );
    const { findings } = checkAll();
    expect(findings.T1.map((f) => f.id)).toEqual(['AC-1.1.9']);
    // It has no test either, which is the point: specifying without scheduling.
    expect(fired(findings)).toEqual(['T1', 'T5']);
  });
});

describe('T2 — every plan item has both kinds of task', () => {
  it('fires when a plan item carrying ACs has no test task', () => {
    edit('specs/plan.md', (s) => s.replace('| T002 | T003 |', '| T002 | — |'));
    const { findings } = checkAll();
    expect(findings.T2).toHaveLength(1);
    expect(findings.T2[0].why).toContain('no test task');
  });

  it('does NOT fire for an infrastructure item, which asserts no behaviour', () => {
    // P-001 already carries no ACs and no test task.
    const { findings } = checkAll();
    expect(findings.T2).toEqual([]);
  });

  it('fires when a plan item names a task that does not exist', () => {
    edit('specs/plan.md', (s) => s.replace('| T002 | T003 |', '| T002, T099 | T003 |'));
    const { findings } = checkAll();
    expect(findings.T2[0].why).toContain('T099');
  });
});

describe('T3 — a completed task names files that exist', () => {
  it('fires when a completed task names a file that was never written', () => {
    rmSync(join(root, 'src/widget.js'));
    const { findings } = checkAll();
    expect(findings.T3.map((f) => f.id)).toEqual(['T002']);
  });

  it('does NOT fire for an OPEN task, whose named file is the work still to do', () => {
    edit('specs/tasks.md', (s) => `${s}- [ ] T004 Build it in \`src/not-yet.js\`\n`);
    const { findings } = checkAll();
    expect(findings.T3).toEqual([]);
  });
});

describe('T4 — a compound AC declares its Cases', () => {
  it('fires when an AC asserting several things declares none', () => {
    edit('specs/spec.md', (s) =>
      s.replace(/  - \*\*Cases\*\*:\n(    - \*\*AC-1\.1\.3\/\d\*\*.*\n)+/, '')
    );
    const { findings } = checkAll();
    expect(findings.T4.map((f) => f.id)).toEqual(['AC-1.1.3']);
  });

  it('counts a table as one assertion per data row, and not the Then that introduces it', () => {
    const acs = readSpec(join(root, 'specs/spec.md'));
    // Two data rows. "Then the totals are exactly:" introduces the table rather than
    // asserting anything alongside it, so it is not a third assertion.
    expect(assertionCount(acs.get('AC-1.1.3').body)).toBe(2);
    expect(assertionCount(acs.get('AC-1.1.1').body)).toBe(1);
  });
});

describe('T5 — a test named for its criterion, verbatim', () => {
  it('fires when the test proves something else, and says so', () => {
    edit('tests/unit/core/widget.test.js', (s) =>
      s.replace('AC-1.1.1 — A widget has a name', 'AC-1.1.1 — sprockets rotate counterclockwise')
    );
    const { findings } = checkAll();
    expect(findings.T5).toHaveLength(1);
    expect(findings.T5[0]).toMatchObject({ id: 'AC-1.1.1', kind: 'mismatched' });
  });

  it('fires more gently when the test is right but paraphrases the criterion', () => {
    edit('tests/unit/core/widget.test.js', (s) =>
      s.replace('AC-1.1.1 — A widget has a name', 'AC-1.1.1 — a widget carries its own name')
    );
    const { findings } = checkAll();
    expect(findings.T5[0]).toMatchObject({ id: 'AC-1.1.1', kind: 'reworded' });
  });

  it('fires when nothing names the criterion at all', () => {
    edit('tests/unit/core/widget.test.js', (s) => s.replace(/AC-1\.1\.3\/2/, 'AC-1.1.3/1'));
    const { findings } = checkAll();
    expect(findings.T5[0]).toMatchObject({ id: 'AC-1.1.3/2', kind: 'untested' });
  });

  it('accepts a qualifier after the title, so one criterion may have several tests', () => {
    edit('tests/unit/core/widget.test.js', (s) =>
      s.replace(
        "it('AC-1.1.1 — A widget has a name', () => {});",
        "it('AC-1.1.1 — A widget has a name: when empty', () => {});\n" +
          "it('AC-1.1.1 — A widget has a name: when renamed', () => {});"
      )
    );
    const { findings } = checkAll();
    expect(findings.T5).toEqual([]);
  });

  it('requires EVERY test naming a criterion to be named for it, not merely one', () => {
    // The hole this closes: a criterion with two tests, one of them repurposed, still
    // reads as covered if only one test has to match.
    edit('tests/unit/core/widget.test.js', (s) =>
      s.replace(
        "it('AC-1.1.1 — A widget has a name', () => {});",
        "it('AC-1.1.1 — A widget has a name', () => {});\n" +
          "it('AC-1.1.1 — sprockets rotate counterclockwise', () => {});"
      )
    );
    const { findings } = checkAll();
    expect(findings.T5).toHaveLength(1);
    expect(findings.T5[0].kind).toBe('mismatched');
  });

  it('is not fooled by curly quotes or dash style, which are typography and not meaning', () => {
    edit('specs/spec.md', (s) => s.replace('A widget has a name', 'A widget has a ‘name’'));
    // Double-quoted in the fixture, so the apostrophes are part of the name rather than
    // ending the JS string early.
    edit('tests/unit/core/widget.test.js', (s) =>
      s.replace(
        "it('AC-1.1.1 — A widget has a name'",
        `it("AC-1.1.1 - A widget has a 'name'"`
      )
    );
    const { findings } = checkAll();
    expect(findings.T5).toEqual([]);
  });

  it('reads a test name containing a quote character, rather than truncating at it', () => {
    // The bug this replaces: a name ending at its first quote was read as `the `, and
    // the criterion failed for a reason that had nothing to do with the test.
    edit('specs/spec.md', (s) => s.replace('A widget has a name', 'The "&" widget has a name'));
    edit('tests/unit/core/widget.test.js', (s) =>
      s.replace("it('AC-1.1.1 — A widget has a name'", `it('AC-1.1.1 — The "&" widget has a name'`)
    );
    const { findings } = checkAll();
    expect(findings.T5).toEqual([]);
  });
});

describe('T6 — a UI-level criterion needs a test that can reach the DOM', () => {
  it('fires when a criterion about a control is proved only by a pure unit test', () => {
    // Move the button test from e2e into the pure core, keeping its name intact.
    const spec = readFileSync(join(root, 'tests/e2e/widget.spec.js'), 'utf8');
    rmSync(join(root, 'tests/e2e/widget.spec.js'));
    edit('tests/unit/core/widget.test.js', (s) =>
      `${s}\nit('AC-1.1.2 — The widget button is disabled at the cap', () => {});\n`
    );
    expect(spec).toContain('AC-1.1.2');
    const { findings } = checkAll();
    expect(findings.T6.map((f) => f.id)).toEqual(['AC-1.1.2']);
    // The name is still correct, so T5 stays quiet — the two checks are independent.
    expect(findings.T5).toEqual([]);
  });

  it('does NOT fire for a criterion that describes arithmetic rather than a screen', () => {
    const { findings } = checkAll();
    expect(findings.T6).toEqual([]);
  });
});

describe('T7 — no test names a criterion the spec does not declare', () => {
  it('fires on an ID left behind by a renumbered or retired AC', () => {
    edit('tests/unit/core/widget.test.js', (s) => `${s}\nit('AC-9.9.9 — a ghost', () => {});\n`);
    const { findings } = checkAll();
    expect(findings.T7.map((f) => f.id)).toEqual(['AC-9.9.9']);
  });
});

describe('T8 — the committed matrix is up to date', () => {
  it('fires when the matrix has never been generated', () => {
    const { findings } = checkAll({ freshMatrix: false });
    expect(findings.T8).toHaveLength(1);
    expect(findings.T8[0].why).toContain('never been generated');
  });

  it('fires when the artefacts have moved on and the matrix has not', () => {
    const cfg = config();
    writeFileSync(join(root, cfg.matrix), '# Traceability Matrix\n\nstale\n');
    const state = run(cfg);
    const { text } = masterMatrix(state, cfg, new Set());
    checkMatrixFreshness(state, cfg, text);
    expect(state.findings.T8[0].why).toContain('out of date');
  });

  it('passes once regenerated, and the regeneration is deterministic', () => {
    const { text, cfg } = checkAll();
    const second = masterMatrix(run(cfg), cfg, new Set()).text;
    expect(second).toBe(text);
    expect(existsSync(join(root, cfg.matrix))).toBe(true);
  });
});

describe('the master matrix', () => {
  it('shows the story, criterion, plan item, and both kinds of task separately', () => {
    const { rows, text } = checkAll();
    const row = rows.find((r) => r.id === 'AC-1.1.1');
    expect(row).toMatchObject({ story: 'US-1.1', plan: ['P-002'], impl: ['T002'], test: ['T003'] });
    expect(text).toContain('| Story | Criterion | What it requires | Plan | Implementation tasks | Test tasks |');
  });

  it('marks a criterion by its worst problem, so a row cannot look better than it is', () => {
    edit('tests/unit/core/widget.test.js', (s) =>
      s.replace('AC-1.1.1 — A widget has a name', 'AC-1.1.1 — sprockets rotate counterclockwise')
    );
    const { rows } = checkAll();
    expect(rows.find((r) => r.id === 'AC-1.1.1').status.mark).toBe('WRONG TEST');
  });

  it('distinguishes an accepted finding from a clean row, without hiding it', () => {
    edit('tests/unit/core/widget.test.js', (s) =>
      s.replace('AC-1.1.1 — A widget has a name', 'AC-1.1.1 — sprockets rotate counterclockwise')
    );
    const cfg = config();
    const state = run(cfg);
    const baseline = new Set(['T5 AC-1.1.1 mismatched']);
    const { rows } = masterMatrix(state, cfg, baseline);
    const row = rows.find((r) => r.id === 'AC-1.1.1');
    expect(row.status.mark).toBe('WRONG TEST');
    expect(row.status.accepted).toBe(true);
  });
});

describe('the change matrix', () => {
  it('reaches a criterion through a changed SOURCE file, via the task that claims it', () => {
    // The route a diff alone misses: src/widget.js names no AC anywhere in it.
    const { state } = checkAll();
    const touched = criteriaTouchedBy(['src/widget.js'], state);
    expect([...touched.keys()].sort()).toEqual(['AC-1.1.1', 'AC-1.1.2', 'AC-1.1.3/1', 'AC-1.1.3/2']);
    // ...but only as a blast radius, not as a claim about any one criterion.
    expect([...new Set(touched.values())]).toEqual(['indirect']);
  });

  it('reaches a criterion through a changed TEST file that names it', () => {
    const { state } = checkAll();
    const touched = criteriaTouchedBy(['tests/e2e/widget.spec.js'], state);
    // Still the union of both routes — the file is also named by test task T003, which
    // the plan lists for all of P-002 — but the criterion whose own test changed is
    // marked `direct`, and the rest `indirect`. Without that split a change touching the
    // composition root reports most of the application and buries the real rows.
    expect(touched.get('AC-1.1.2')).toBe('direct');
    expect(touched.get('AC-1.1.1')).toBe('indirect');
    expect([...touched.keys()].sort()).toEqual(['AC-1.1.1', 'AC-1.1.2', 'AC-1.1.3/1', 'AC-1.1.3/2']);
  });

  it('reports nothing for a change that touches no traced file', () => {
    const { state } = checkAll();
    expect([...criteriaTouchedBy(['README.md'], state).keys()]).toEqual([]);
  });
});

describe('the baseline', () => {
  it('keys a T5 finding by its severity, so a misnamed test cannot decay unnoticed', () => {
    expect(findingKey('T5', { id: 'AC-1.1.1', kind: 'reworded' })).not.toBe(
      findingKey('T5', { id: 'AC-1.1.1', kind: 'mismatched' })
    );
  });

  it('does not key a finding by anything that moves when an unrelated test is edited', () => {
    const a = findingKey('T5', { id: 'AC-1.1.1', kind: 'reworded', why: '20% in common' });
    const b = findingKey('T5', { id: 'AC-1.1.1', kind: 'reworded', why: '31% in common' });
    expect(a).toBe(b);
  });

  it('distinguishes several findings raised against one task', () => {
    const a = findingKey('T3', { id: 'T002', why: 'names `a.js`, which does not exist' });
    const b = findingKey('T3', { id: 'T002', why: 'names `b.js`, which does not exist' });
    expect(a).not.toBe(b);
  });
});

describe('parsing', () => {
  it('expands an AC range written with an en dash, em dash, or hyphen', () => {
    for (const dash of ['–', '—', '-']) {
      expect([...expandRange(`AC-1.1.1${dash}AC-1.1.3`)]).toEqual(['AC-1.1.1', 'AC-1.1.2', 'AC-1.1.3']);
    }
  });

  it('leaves a range across different stories alone rather than inventing IDs', () => {
    expect([...expandRange('AC-1.1.1–AC-2.1.3')].sort()).toEqual(['AC-1.1.1', 'AC-2.1.3']);
  });

  it('strips the ID and separator from a test name to get what it claims', () => {
    expect(claimedTitle('AC-1.1.1 — A widget has a name', 'AC-1.1.1')).toBe('a widget has a name');
    expect(claimedTitle('AC-1.1.3/2 — A large widget', 'AC-1.1.3/2')).toBe('a large widget');
  });

  it('normalises typography but not words', () => {
    expect(normalise('A “quoted” thing — here')).toBe('a "quoted" thing - here');
  });

  it('treats a criterion with Cases as its Cases, and never also as itself', () => {
    const acs = readSpec(join(root, 'specs/spec.md'));
    const ids = buildCriteria(acs, DEFAULTS).map((c) => c.id);
    expect(ids).toContain('AC-1.1.3/1');
    expect(ids).not.toContain('AC-1.1.3');
  });
});

describe('gap severity', () => {
  /** Break the fixture in a chosen way and read the resulting status of AC-1.1.1. */
  function statusAfter(breakIt) {
    breakIt();
    const cfg = config();
    const state = run(cfg);
    const { text } = masterMatrix(state, cfg, new Set());
    checkMatrixFreshness(state, cfg, text);
    return statusOf('AC-1.1.1', state.findings, new Set(), findingKey);
  }

  it('ranks a criterion with no test at all CRITICAL', () => {
    const s = statusAfter(() =>
      edit('tests/unit/core/widget.test.js', (t) =>
        t.replace("it('AC-1.1.1 — A widget has a name', () => {});", '')
      )
    );
    expect(s).toMatchObject({ mark: 'NO TEST', severity: 'CRITICAL' });
  });

  it('ranks a test that proves something else HIGH', () => {
    const s = statusAfter(() =>
      edit('tests/unit/core/widget.test.js', (t) =>
        t.replace('AC-1.1.1 — A widget has a name', 'AC-1.1.1 — sprockets rotate counterclockwise')
      )
    );
    expect(s).toMatchObject({ mark: 'WRONG TEST', severity: 'HIGH' });
  });

  it('ranks a UI criterion with only a pure unit test HIGH', () => {
    const cfg = config();
    rmSync(join(root, 'tests/e2e/widget.spec.js'));
    edit('tests/unit/core/widget.test.js', (t) =>
      `${t}\nit('AC-1.1.2 — The widget button is disabled at the cap', () => {});\n`
    );
    const state = run(cfg);
    expect(statusOf('AC-1.1.2', state.findings, new Set(), findingKey)).toMatchObject({
      mark: 'NOT PROVABLE',
      severity: 'HIGH',
    });
  });

  it('ranks a merely misnamed test LOW, because it still proves the criterion', () => {
    const s = statusAfter(() =>
      edit('tests/unit/core/widget.test.js', (t) =>
        t.replace('AC-1.1.1 — A widget has a name', 'AC-1.1.1 — a widget carries its own name')
      )
    );
    expect(s).toMatchObject({ mark: 'MISNAMED', severity: 'LOW' });
  });

  it('never lets CRITICAL or HIGH be waivable', () => {
    for (const [mark, severity] of Object.entries(SEVERITY_OF)) {
      expect(WAIVABLE.has(severity)).toBe(severity === 'LOW' || severity === 'MEDIUM');
      expect(mark).toBeTruthy();
    }
    expect([...WAIVABLE].sort()).toEqual(['LOW', 'MEDIUM']);
  });
});

describe('waivers', () => {
  const REASON = 'Deliberate: this wording is checked by hand each release.';

  /** Waive a criterion and run everything, returning the state and its rows. */
  function withWaiver(criterion, reason = REASON) {
    const cfg = config();
    writeFileSync(
      join(root, cfg.waivers),
      JSON.stringify({ waived: [{ criterion, reason, date: '2026-08-17' }] }, null, 2)
    );
    const state = run(cfg);
    const waivers = new Map([[criterion, { criterion, reason }]]);
    const { rows, text } = masterMatrix(state, cfg, new Set(), waivers);
    checkMatrixFreshness(state, cfg, text);
    checkWaivers(state, waivers, new Set());
    return { state, rows };
  }

  it('marks a LOW gap waived, and shows the reason in its row', () => {
    edit('tests/unit/core/widget.test.js', (t) =>
      t.replace('AC-1.1.1 — A widget has a name', 'AC-1.1.1 — a widget carries its own name')
    );
    const { state, rows } = withWaiver('AC-1.1.1');
    const row = rows.find((r) => r.id === 'AC-1.1.1');
    expect(row.status).toMatchObject({ mark: 'MISNAMED', severity: 'LOW', waived: true });
    expect(row.status.reason).toBe(REASON);
    expect(state.findings.T9).toEqual([]);
  });

  it('refuses to waive a HIGH gap, however good the reason', () => {
    edit('tests/unit/core/widget.test.js', (t) =>
      t.replace('AC-1.1.1 — A widget has a name', 'AC-1.1.1 — sprockets rotate counterclockwise')
    );
    const { state, rows } = withWaiver('AC-1.1.1');
    // The row is still a HIGH gap...
    expect(rows.find((r) => r.id === 'AC-1.1.1').status).toMatchObject({
      severity: 'HIGH',
      waived: false,
    });
    // ...and the attempt to waive it is itself a finding.
    expect(state.findings.T9).toHaveLength(1);
    expect(state.findings.T9[0].why).toContain('HIGH');
  });

  it('refuses a waiver that does not say why', () => {
    edit('tests/unit/core/widget.test.js', (t) =>
      t.replace('AC-1.1.1 — A widget has a name', 'AC-1.1.1 — a widget carries its own name')
    );
    const { state } = withWaiver('AC-1.1.1', 'because');
    expect(state.findings.T9[0].why).toContain('without saying why');
  });

  it('refuses a waiver for a criterion the spec does not declare', () => {
    const { state } = withWaiver('AC-9.9.9');
    expect(state.findings.T9[0].why).toContain('does not declare');
  });

  it('refuses a waiver whose gap has been fixed, so the file cannot rot', () => {
    // AC-1.1.1 is clean in the good fixture, so this waiver excuses nothing.
    const { state } = withWaiver('AC-1.1.1');
    expect(state.findings.T9[0].why).toContain('no longer exists');
  });
});

describe('coverage reporting', () => {
  it('reports how much is proven, not only what is missing', () => {
    const { text, rows } = checkAll();
    expect(rows.every((r) => r.status.mark === 'OK')).toBe(true);
    expect(text).toContain('**Coverage**: 4 of 4 criteria proven (100.0%)');
    expect(text).toContain('## Coverage by User Story');
  });

  it('counts a waived gap as accounted for, but never as proven', () => {
    edit('tests/unit/core/widget.test.js', (t) =>
      t.replace('AC-1.1.1 — A widget has a name', 'AC-1.1.1 — a widget carries its own name')
    );
    const cfg = config();
    const state = run(cfg);
    const waivers = new Map([[
      'AC-1.1.1',
      { criterion: 'AC-1.1.1', reason: 'Deliberate: checked by hand each release.' },
    ]]);
    const { text } = masterMatrix(state, cfg, new Set(), waivers);
    expect(text).toContain('3 of 4 criteria proven');
    expect(text).toContain('plus 1 waived');
  });
});

describe('the colour of a row', () => {
  /** Break AC-1.1.1 so it renders as a HIGH gap, leaving the other three proven. */
  const breakOne = () =>
    edit('tests/unit/core/widget.test.js', (t) =>
      t.replace('AC-1.1.1 — A widget has a name', 'AC-1.1.1 — sprockets rotate counterclockwise')
    );

  it('gives every state a colour, so none can be added without one', () => {
    for (const sev of SEVERITY_ORDER) expect(MARK_OF[sev]).toBeTruthy();
    expect(MARK_OF.OK).toBeTruthy();
    expect(MARK_OF.WAIVED).toBeTruthy();
    // Green is proven and only proven; red is reserved for the two that hide unbuilt work.
    expect(MARK_OF.OK).not.toBe(MARK_OF.LOW);
    expect(MARK_OF.CRITICAL).toBe(MARK_OF.HIGH);
    expect(new Set([MARK_OF.OK, MARK_OF.LOW, MARK_OF.MEDIUM, MARK_OF.HIGH]).size).toBe(4);
  });

  it('colours a row by its status, waived before severity', () => {
    expect(markFor({ mark: 'OK' })).toBe(MARK_OF.OK);
    expect(markFor({ mark: 'MISNAMED', severity: 'LOW', waived: false })).toBe(MARK_OF.LOW);
    expect(markFor({ mark: 'MISNAMED', severity: 'LOW', waived: true })).toBe(MARK_OF.WAIVED);
  });

  it('marks proven green and a serious gap red, in the same table', () => {
    breakOne();
    const { text } = checkAll({ freshMatrix: false });
    expect(text).toContain(`${MARK_OF.HIGH} **HIGH** · WRONG TEST`);
    expect(text).toContain(`${MARK_OF.OK} OK`);
  });

  it('never lets the colour stand in for the words', () => {
    breakOne();
    const { text, rows } = checkAll({ freshMatrix: false });
    // Strip every mark: the matrix must still say what each row's status is.
    const plain = Object.values(MARK_OF)
      .reduce((s, m) => s.split(`${m} `).join(''), text)
      .replace(/\n\n+/g, '\n');
    expect(plain).toContain('**HIGH** · WRONG TEST');
    expect(plain).toContain('| Proven |');
    expect(plain).toContain('| US-1.1 | 4 | 3 |');
    expect(rows.filter((r) => r.status.mark === 'OK')).toHaveLength(3);
  });

  it('colours a User Story by its worst criterion, not its average', () => {
    breakOne();
    const { text } = checkAll({ freshMatrix: false });
    // Three of the four are proven, and the row is still red.
    expect(text).toContain(`| ${MARK_OF.HIGH} US-1.1 | 4 | 3 |`);
  });

  it('shows a waived gap in its own colour, with the reason still spelled out', () => {
    edit('tests/unit/core/widget.test.js', (t) =>
      t.replace('AC-1.1.1 — A widget has a name', 'AC-1.1.1 — a widget carries its own name')
    );
    const cfg = config();
    const state = run(cfg);
    const reason = 'Deliberate: checked by hand each release.';
    const waivers = new Map([['AC-1.1.1', { criterion: 'AC-1.1.1', reason }]]);
    const { text } = masterMatrix(state, cfg, new Set(), waivers);
    expect(text).toContain(`${MARK_OF.WAIVED} WAIVED (MISNAMED) — ${reason}`);
  });
});

describe('the change matrix, rendered', () => {
  // These exist because the split shipped with the CLI not passing `reach` at all, and
  // nothing caught it: the empty-change path returned before reading it, so the only
  // exercised case was the one that could not fail.
  const opts = (reach) => ({ touchedFiles: ['src/widget.js'], reason: 'Base: test.', reach });

  it('lists directly affected criteria in full and collapses the blast radius', () => {
    const { rows } = checkAll();
    const reach = new Map([
      ['AC-1.1.1', 'direct'],
      ['AC-1.1.2', 'indirect'],
      ['AC-1.1.3/1', 'indirect'],
    ]);
    const text = renderChange(rows.filter((r) => reach.has(r.id)), opts(reach));

    expect(text).toContain('**1 criterion directly affected**');
    expect(text).toContain('AC-1.1.1');
    // The indirect ones are counted, not tabulated.
    expect(text).toContain('2 further criteria could be affected');
    expect(text).toContain('<details>');
    expect(text).not.toContain('| US-1.1 | `AC-1.1.2`');
  });

  it('says so plainly when a change touches no criterion', () => {
    const text = renderChange([], opts(new Map()));
    expect(text).toContain('No Acceptance Criteria are touched');
  });

  it('renders without a reach map rather than throwing', () => {
    const { rows } = checkAll();
    const text = renderChange(rows, { touchedFiles: [], reason: 'Base: test.' });
    expect(text).toContain('further criteria could be affected');
  });
});

// ---------------------------------------------------------------------------
// Multi-feature projects: several {spec, plan, tasks} triples, one chain.
// ---------------------------------------------------------------------------

describe('multi-feature configs', () => {
  const multiConfig = () => ({
    ...config(),
    features: [
      { spec: 'specs/spec.md', plan: 'specs/plan.md', tasks: 'specs/tasks.md' },
      { spec: 'specs/f2/spec.md', plan: 'specs/f2/plan.md', tasks: 'specs/f2/tasks.md' },
    ],
  });

  /** The second feature's test, written per-case so single-feature cases never see it (T7). */
  const addGadgetTest = () =>
    writeFileSync(
      join(root, 'tests/unit/core/gadget.test.js'),
      "it('AC-2.1.1 — A gadget has a label', () => {});\n"
    );

  it('merges every feature into one chain with no findings when all rules hold', () => {
    addGadgetTest();
    const cfg = multiConfig();
    const state = run(cfg);
    const { text } = masterMatrix(state, cfg, new Set());
    writeFileSync(join(root, cfg.matrix), text);
    checkMatrixFreshness(state, cfg, text);

    expect(fired(state.findings)).toEqual([]);
    expect(state.acs.has('AC-1.1.1')).toBeTruthy();
    expect(state.acs.has('AC-2.1.1')).toBeTruthy();
    expect(state.plan.has('P-101')).toBeTruthy();
    expect(state.tasks.has('T101')).toBeTruthy();
    // The matrix names every spec it was generated from.
    expect(text).toContain('specs/spec.md, specs/f2/spec.md');
    expect(text).toContain('AC-2.1.1');
  });

  it('a gap in the second feature is found exactly as in the first', () => {
    // No gadget test written: AC-2.1.1 is untested.
    const state = run(multiConfig());
    expect(state.findings.T5.map((f) => f.id)).toContain('AC-2.1.1');
    expect(state.findings.T5.map((f) => f.id)).not.toContain('AC-1.1.1');
  });

  it('an ID reused across features is a config error, not a silent merge', () => {
    let threw = null;
    try {
      run({
        ...config(),
        features: [
          { spec: 'specs/spec.md', plan: 'specs/plan.md', tasks: 'specs/tasks.md' },
          { spec: 'specs/spec.md', plan: 'specs/plan.md', tasks: 'specs/tasks.md' },
        ],
      });
    } catch (e) {
      threw = e;
    }
    expect(threw).toBeTruthy();
    expect(threw.message).toContain('duplicate');
    expect(threw.message).toContain('unique across features');
  });

  it('a single-triple config still works untouched, features unset', () => {
    const { findings } = checkAll();
    expect(fired(findings)).toEqual([]);
  });
});

/**
 * Loading a whole spec-kit project and answering questions about it.
 *
 * Kept separate from the CLI so every one of these can be exercised against fixtures:
 * the thing that checks everything else must not be the one unchecked thing.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { readSpec, readPlan, readTasks, readSuite } from './parse.mjs';
import { analyse, findingKey } from './analyse.mjs';
import { buildRows, renderMaster, statusOf, WAIVABLE } from './matrix.mjs';

/**
 * The spec/plan/tasks triples the project declares: either one (the `spec`, `plan`,
 * `tasks` keys) or several (a `features` array of such triples, one per feature folder).
 */
export function featureTriples(config) {
  if (Array.isArray(config.features) && config.features.length > 0) return config.features;
  return [{ spec: config.spec, plan: config.plan, tasks: config.tasks }];
}

/** Read every artefact and run every check. */
export function run(config) {
  const acs = new Map();
  const plan = new Map();
  const tasks = new Map();
  // Every ID must be unique across features: the checks, the baseline and the matrix all
  // key on bare IDs, so a second feature reusing AC-1.x.x / P-001 / T001 would silently
  // merge two different requirements into one row. That is a config error, not a finding.
  const merge = (target, source, kind, file) => {
    for (const [id, value] of source) {
      if (target.has(id)) {
        throw new Error(
          `duplicate ${kind} ${id} in ${file} — IDs must be unique across features ` +
            `(give each feature its own AC epic, plan-item and task ranges)`
        );
      }
      target.set(id, value);
    }
  };
  for (const t of featureTriples(config)) {
    merge(acs, readSpec(join(config.root, t.spec)), 'AC', t.spec);
    merge(plan, readPlan(join(config.root, t.plan)), 'plan item', t.plan);
    merge(tasks, readTasks(join(config.root, t.tasks)), 'task', t.tasks);
  }
  const suite = readSuite(config.root, config.testDirs);
  return { acs, plan, tasks, suite, ...analyse({ acs, plan, tasks, suite, config }) };
}

export function readBaseline(config) {
  const file = join(config.root, config.baseline);
  if (!existsSync(file)) return new Set();
  return new Set(JSON.parse(readFileSync(file, 'utf8')).accepted ?? []);
}

const BASELINE_NOTE =
  'Traceability findings that pre-date the gate. Reported, but not build-failing. ' +
  'This list may only shrink: `prune-baseline` removes entries that are fixed, and ' +
  'nothing writes new ones. Adding an entry by hand is taking on debt deliberately ' +
  'and needs to be justified in review.';

export function writeBaseline(config, accepted, generated) {
  writeFileSync(
    join(config.root, config.baseline),
    JSON.stringify({ note: BASELINE_NOTE, generated, accepted: [...accepted].sort() }, null, 2) + '\n'
  );
}

/** The master matrix text, and the rows it was built from. */
export function masterMatrix(state, config, baseline, waivers = new Map()) {
  const rows = buildRows({ ...state, baseline, keyOf: findingKey, waivers });
  const generatedFor = featureTriples(config)
    .map((t) => t.spec)
    .join(', ');
  return { rows, text: renderMaster(rows, { generatedFor }) };
}

/** A reason has to actually say something; a word or two is a rubber stamp. */
const MIN_REASON = 20;

/**
 * T9 — every waiver is valid, reasoned, and still needed.
 *
 * The waiver file is the one place where a gap can be signed off rather than fixed, so it
 * is the place most worth policing. Four ways it goes wrong, all build-failing:
 *
 *   - it names a criterion the spec does not declare (a rename left it behind);
 *   - it carries no real reason, which makes it a rubber stamp;
 *   - the gap it covers is gone, so the waiver now silently excuses nothing — or worse,
 *     would excuse some future gap on the same criterion;
 *   - it covers a CRITICAL or HIGH gap, which no reason clears. Those are the states that
 *     let US-2.2 and US-11.1/11.2 report as complete while unbuilt (Principle IV).
 */
export function checkWaivers(state, waivers, baseline) {
  const byId = new Map(state.criteria.map((c) => [c.id, c]));
  for (const [id, waiver] of waivers) {
    if (!byId.has(id)) {
      state.findings.T9.push({ id, why: 'waives a criterion the spec does not declare' });
      continue;
    }
    if (!waiver.reason || waiver.reason.trim().length < MIN_REASON) {
      state.findings.T9.push({ id, why: 'waives a gap without saying why' });
      continue;
    }
    const status = statusOf(id, state.findings, baseline, findingKey, new Map());
    if (status.mark === 'OK') {
      state.findings.T9.push({ id, why: 'waives a gap that no longer exists — remove it' });
      continue;
    }
    if (!WAIVABLE.has(status.severity)) {
      state.findings.T9.push({
        id,
        why: `waives a ${status.severity} gap (${status.mark}), which no reason clears`,
      });
    }
  }
}

/**
 * T8 — the committed matrix matches what the artefacts currently say.
 * Pushed into the findings so it is baselined, reported and gated like every other check.
 */
export function checkMatrixFreshness(state, config, matrixText) {
  const file = join(config.root, config.matrix);
  if (!existsSync(file)) {
    state.findings.T8.push({ id: config.matrix, why: 'has never been generated' });
  } else if (readFileSync(file, 'utf8') !== matrixText) {
    state.findings.T8.push({
      id: config.matrix,
      why: 'is out of date — regenerate it with `npm run trace:matrix` and review the diff',
    });
  }
}

/**
 * Which criteria a change touches.
 *
 * Three routes, unioned, because a change reaches a criterion in more than one way:
 *
 *   1. a changed TEST file naming the criterion's ID;
 *   2. a changed SOURCE file named by a task that a plan item lists for the criterion;
 *   3. a changed spec, which is handled by the caller passing the spec file through.
 *
 * Route 2 is the one that matters most and the one a diff alone would miss: editing
 * `src/ui/library.js` says nothing about ACs until you go through the tasks that claim it.
 */
export function criteriaTouchedBy(changedFiles, state) {
  const { criteria, tasks, plan, testsFor, acToPlan } = state;
  /** @type {Map<string, 'direct'|'indirect'>} */
  const touched = new Map();
  const changed = new Set(changedFiles);

  // Indirect first, so a criterion reached both ways ends up marked direct.
  const touchedTasks = new Set();
  for (const [tid, task] of tasks) {
    if (task.files.some((f) => changed.has(f))) touchedTasks.add(tid);
  }
  const touchedPlanItems = new Set();
  for (const [pid, item] of plan) {
    if ([...item.impl, ...item.test].some((t) => touchedTasks.has(t))) touchedPlanItems.add(pid);
  }
  for (const c of criteria) {
    if ((acToPlan.get(c.parent) ?? []).some((p) => touchedPlanItems.has(p))) {
      touched.set(c.id, 'indirect');
    }
  }

  // Direct: a test naming this criterion is in the diff. Much the stronger signal — the
  // proof of this specific criterion changed, rather than some file a task happens to
  // mention. In a codebase with a composition root the indirect set is most of the app,
  // so collapsing the two into one list buries the rows a reviewer actually needs.
  for (const c of criteria) {
    for (const t of testsFor.get(c.id) ?? []) {
      if (changed.has(t.file)) touched.set(c.id, 'direct');
    }
  }

  return touched;
}

/**
 * Gaps deliberately left open, keyed by criterion.
 *
 * A waiver is not the baseline. The baseline is debt still owed and expected to shrink;
 * a waiver is a decision that a gap will not be closed, and it has to carry the reason
 * so the decision is reviewable rather than merely recorded.
 */
export function readWaivers(config) {
  const file = join(config.root, config.waivers);
  if (!existsSync(file)) return new Map();
  const parsed = JSON.parse(readFileSync(file, 'utf8'));
  return new Map((parsed.waived ?? []).map((w) => [w.criterion, w]));
}

/** Every finding's baseline key, for comparing against the accepted list. */
export function currentKeys(findings) {
  const keys = new Set();
  for (const [check, list] of Object.entries(findings)) {
    for (const f of list) keys.add(findingKey(check, f));
  }
  return keys;
}

#!/usr/bin/env node
/**
 * spec-trace — traceability for spec-kit projects.
 *
 * Checks the chain a specification promises but nothing normally verifies:
 *
 *     AC → Case → plan item → implementation task + test task → a verbatim-named test
 *
 * and generates a reviewable matrix of it.
 *
 * Portable: no dependencies, and everything project-specific lives in
 * `spec-trace.config.json`. Copy the `spec-trace` folder into any spec-kit project.
 *
 * Commands
 *   check                Run every check. Exit non-zero on a finding outside the baseline.
 *     --summary          One line per check.
 *     --json             Machine-readable.
 *   matrix               Write the master matrix to the configured path.
 *     --stdout           Print it instead of writing.
 *   changed [<base>]     Print the matrix rows a change touches (default: merge-base with main).
 *   prune-baseline       Strike off baseline entries that are no longer findings.
 *
 * This file is the command line only. Everything it does lives in lib/, so all of it can
 * be tested against fixtures.
 */
import { writeFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

import { loadConfig } from './lib/config.mjs';
import { findingKey, CHECKS } from './lib/analyse.mjs';
import { renderChange } from './lib/matrix.mjs';
import {
  run,
  readBaseline,
  readWaivers,
  writeBaseline,
  masterMatrix,
  checkMatrixFreshness,
  checkWaivers,
  criteriaTouchedBy,
  currentKeys,
} from './lib/project.mjs';

const SKILL_DIR = dirname(fileURLToPath(import.meta.url));

/** Walk up from the skill to the repository root. */
function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i++) {
    if (existsSync(join(dir, '.git')) || existsSync(join(dir, 'spec-trace.config.json'))) return dir;
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

const ROOT = process.env.SPEC_TRACE_ROOT ?? findRoot(SKILL_DIR);
const config = loadConfig(ROOT);

const argv = process.argv.slice(2);
const command = argv.find((a) => !a.startsWith('-')) ?? 'check';
const flag = (name) => argv.includes(`--${name}`);

const state = run(config);
const baseline = readBaseline(config);
const waivers = readWaivers(config);
const { rows, text: matrixText } = masterMatrix(state, config, baseline, waivers);
checkMatrixFreshness(state, config, matrixText);
checkWaivers(state, waivers, baseline);

/**
 * Criteria whose gap has been validly waived. `statusOf` has already refused to mark a
 * CRITICAL or HIGH gap as waived, so this can only ever excuse LOW and MEDIUM — and an
 * invalid waiver is itself a T9 finding, which nothing excuses.
 */
const waived = new Set(rows.filter((r) => r.status.waived).map((r) => r.id));
const excused = (check, f) =>
  baseline.has(findingKey(check, f)) ||
  (['T4', 'T5', 'T6'].includes(check) && waived.has(f.id));

const current = currentKeys(state.findings);
const regressions = [];
for (const [check, list] of Object.entries(state.findings)) {
  for (const f of list) {
    if (!excused(check, f)) regressions.push({ check, ...f });
  }
}
const fixed = [...baseline].filter((k) => !current.has(k));

// ---------------------------------------------------------------------------
// matrix
// ---------------------------------------------------------------------------

if (command === 'matrix') {
  if (flag('stdout')) {
    console.log(matrixText);
  } else {
    writeFileSync(join(ROOT, config.matrix), matrixText);
    console.log(`Wrote ${config.matrix} — ${rows.length} criteria.`);
  }
  process.exit(0);
}

// ---------------------------------------------------------------------------
// changed — the subset matrix for one change
// ---------------------------------------------------------------------------

if (command === 'changed') {
  const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
  let base = argv.find((a) => !a.startsWith('-') && a !== 'changed');
  let label = base;
  if (!base) {
    for (const candidate of ['origin/main', 'origin/master', 'main', 'master']) {
      try {
        base = git(['merge-base', 'HEAD', candidate]);
        label = `merge-base with ${candidate}`;
        break;
      } catch {
        /* try the next candidate */
      }
    }
    if (!base) {
      base = 'HEAD~1';
      label = 'HEAD~1';
    }
  }
  const names = git(['diff', '--name-only', base, '--']);
  // Untracked files too. `git diff` cannot see them, so running this before committing
  // would silently miss every new test file — which is exactly when a criterion's proof
  // is most likely to have just changed.
  const untracked = git(['ls-files', '--others', '--exclude-standard']);
  const files = [
    ...new Set([...names.split('\n'), ...untracked.split('\n')].filter(Boolean)),
  ];
  const touched = criteriaTouchedBy(files, state);
  console.log(
    renderChange(
      rows.filter((r) => touched.has(r.id)),
      {
        touchedFiles: files,
        reach: touched,
        reason: `Base: ${label}. Reached via changed tests, and via tasks naming changed files.`,
      }
    )
  );
  process.exit(0);
}

// ---------------------------------------------------------------------------
// prune-baseline
// ---------------------------------------------------------------------------

if (command === 'prune-baseline') {
  const remaining = [...baseline].filter((k) => current.has(k));
  writeBaseline(config, remaining, new Date().toISOString().slice(0, 10));
  console.log(`Baseline pruned: ${baseline.size} → ${remaining.length} (${fixed.length} struck off).`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// check
// ---------------------------------------------------------------------------

const failed = regressions.length > 0 || fixed.length > 0;

if (flag('json')) {
  console.log(
    JSON.stringify(
      {
        criteria: state.criteria.length,
        acs: state.acs.size,
        findings: state.findings,
        regressions,
        fixed,
        baseline: baseline.size,
      },
      null,
      2
    )
  );
} else if (flag('summary')) {
  for (const [checkId, label] of Object.entries(CHECKS)) {
    const all = state.findings[checkId].length;
    const fresh = state.findings[checkId].filter((f) => !excused(checkId, f)).length;
    let detail = all ? ` — ${all} finding(s), ${fresh} not in baseline` : '';
    if (checkId === 'T5' && all) {
      const by = { untested: 0, mismatched: 0, reworded: 0 };
      for (const f of state.findings.T5) by[f.kind]++;
      detail += ` (${by.untested} untested, ${by.mismatched} proving something else, ${by.reworded} misnamed)`;
    }
    console.log(`${fresh === 0 ? 'PASS' : 'FAIL'}  ${checkId}  ${label}${detail}`);
  }
  console.log(
    `\n${failed ? 'FAIL' : 'PASS'}  Overall — ${baseline.size} accepted, ` +
      `${waived.size} waived, ${regressions.length} new, ${fixed.length} fixed but still listed.`
  );
} else {
  console.log(
    `Traceability: ${state.acs.size} ACs, ${state.criteria.length} criteria, ` +
      `${state.plan.size} plan items, ${state.tasks.size} tasks.\n`
  );
  for (const [checkId, label] of Object.entries(CHECKS)) {
    const list = state.findings[checkId].filter((f) => !excused(checkId, f));
    const accepted = state.findings[checkId].length - list.length;
    if (list.length === 0) {
      console.log(`PASS  ${checkId}  ${label}${accepted ? ` (${accepted} accepted)` : ''}`);
      continue;
    }
    console.log(
      `FAIL  ${checkId}  ${label} — ${list.length} new finding(s)${accepted ? `, ${accepted} accepted` : ''}`
    );
    let kind = null;
    for (const f of list) {
      if (f.kind && f.kind !== kind) {
        kind = f.kind;
        const banner = {
          untested: 'no test at all',
          mismatched: 'a test exists but proves something else — treat as UNBUILT',
          reworded: "the right test, named in its own words rather than the spec's",
        }[kind];
        console.log(`\n      ── ${banner} ──`);
      }
      console.log(`        ${f.id} ${f.why}`);
      if (f.title) console.log(`           spec: ${f.title}`);
      if (f.got) console.log(`           test: ${f.got}`);
    }
    console.log('');
  }
  console.log(
    `Baseline: ${baseline.size} finding(s) accepted as pre-existing debt.` +
      (waived.size ? `\nWaived:   ${waived.size} gap(s) signed off with a reason (LOW/MEDIUM only).` : '')
  );

  if (fixed.length) {
    console.log(
      `\n${fixed.length} baseline entr(ies) are no longer findings. Run\n` +
        '  npm run trace:prune\n' +
        'to strike them off, so the baseline keeps shrinking and cannot hide a later regression:'
    );
    for (const k of fixed.slice(0, 20)) console.log(`        ${k}`);
    if (fixed.length > 20) console.log(`        … and ${fixed.length - 20} more`);
  }

  if (regressions.length) {
    console.log(
      '\nA finding is unbuilt or unproven work, not a formatting complaint.\n' +
        'Fix the code or the spec — never rename a test, or weaken one, to satisfy the gate.'
    );
  } else if (!failed) {
    console.log('\nNo new traceability findings.');
  }
}

process.exit(failed ? 1 : 0);

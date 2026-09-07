#!/usr/bin/env node
/**
 * Per-AC coverage reporter.
 *
 * Reads every Acceptance Criterion ID declared in each feature's spec.md, reads every
 * test name in tests/, and reports any AC no test references. Exits non-zero on a gap,
 * so "every AC has a test" is enforced rather than claimed.
 *
 * This is the weak gate: it proves an ID was typed, not that anything was proved.
 * `npm run check:trace` (spec-trace) is the strong one. Kept because it is fast, has no
 * baseline, and its 100% is a floor the strong gate builds on.
 *
 * Test names must contain their AC ID, e.g.
 *   test('AC-1.1.2 — Inlay dots at the standard marker frets', ...)
 * A single test may cover several ACs by naming each one.
 *
 * Usage:
 *   node tests/ac-coverage.js            # scan test SOURCE files (no run required)
 *   node tests/ac-coverage.js --json     # machine-readable summary
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SPECS = [
  join(ROOT, 'specs/001-fretboard-visualizer/spec.md'),
  join(ROOT, 'specs/002-default-root-scale/spec.md'),
  join(ROOT, 'specs/003-chord-mode/spec.md'),
  join(ROOT, 'specs/004-play-chord/spec.md'),
  join(ROOT, 'specs/005-display-overhaul/spec.md'),
];
const TEST_DIRS = [join(ROOT, 'tests')];

const AC_ID = /AC-\d+\.\d+\.\d+/g;

/** Every AC ID declared across the feature specs, in document order, de-duplicated. */
function specAcIds() {
  const ids = [];
  const seen = new Set();
  for (const spec of SPECS) {
    if (!existsSync(spec)) {
      console.error(`ac-coverage: spec not found at ${spec}`);
      process.exit(2);
    }
    for (const line of readFileSync(spec, 'utf8').split('\n')) {
      // Only headings declare an AC; prose and cross-references merely cite one.
      const m = line.match(/^- \*\*(AC-\d+\.\d+\.\d+)\*\*/);
      if (m && !seen.has(m[1])) {
        seen.add(m[1]);
        ids.push(m[1]);
      }
    }
  }
  return ids;
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(test|spec)\.js$/.test(entry) ? [full] : [];
  });
}

/** Map of AC ID -> [test files referencing it]. */
function coveredAcIds() {
  const covered = new Map();
  for (const dir of TEST_DIRS) {
    for (const file of walk(dir)) {
      const src = readFileSync(file, 'utf8');
      for (const id of src.match(AC_ID) ?? []) {
        if (!covered.has(id)) covered.set(id, []);
        const list = covered.get(id);
        const rel = file.slice(ROOT.length + 1);
        if (!list.includes(rel)) list.push(rel);
      }
    }
  }
  return covered;
}

/**
 * The accepted-debt list is spec-trace's baseline, not a second file: an AC with no test
 * is exactly a `T5 <id> untested` finding there. One source of debt, one prune command,
 * and when the baseline shrinks this gate tightens with it. Anything not in the baseline
 * fails the build — which is what makes a NEW AC without a test an incomplete change.
 */
function baselineAccepted() {
  const file = join(ROOT, 'specs/traceability-baseline.json');
  if (!existsSync(file)) return new Set();
  return new Set(JSON.parse(readFileSync(file, 'utf8')).accepted ?? []);
}

const declared = specAcIds();
const covered = coveredAcIds();
const accepted = baselineAccepted();
const allUncovered = declared.filter((id) => !covered.has(id));
const uncovered = allUncovered.filter((id) => !accepted.has(`T5 ${id} untested`));
const baselined = allUncovered.length - uncovered.length;
const orphans = [...covered.keys()].filter((id) => !declared.includes(id));

if (process.argv.includes('--json')) {
  console.log(
    JSON.stringify(
      { total: declared.length, covered: declared.length - uncovered.length, uncovered, orphans },
      null,
      2
    )
  );
} else {
  console.log(
    `AC coverage: ${declared.length - allUncovered.length}/${declared.length} declared ACs referenced by a test` +
      (baselined ? ` (${baselined} uncovered accepted as baseline debt — see specs/traceability-baseline.json)` : '') +
      '.'
  );
  if (uncovered.length) {
    console.log('\nUncovered ACs outside the baseline (no test names them):');
    for (const id of uncovered) console.log(`  ${id}`);
  }
  if (orphans.length) {
    console.log('\nOrphan IDs (named by tests, declared by no spec):');
    for (const id of orphans) console.log(`  ${id}`);
  }
  if (!uncovered.length && !orphans.length) console.log('No gaps, no orphans.');
}

process.exit(uncovered.length || orphans.length ? 1 : 0);

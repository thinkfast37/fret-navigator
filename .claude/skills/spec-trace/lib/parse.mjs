/**
 * Reading a spec-kit project's artefacts.
 *
 * Everything here is pure parsing: it turns Markdown into data and makes no judgements.
 * The judgements live in analyse.mjs, so a wrong finding can always be traced to one of
 * the two and never to a tangle of both.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** A criterion ID is an AC, optionally narrowed to one of its Cases: AC-1.2.2/7 */
export const CRITERION_ID = /AC-\d+\.\d+\.\d+(?:\/\d+)?/g;

/**
 * Every Acceptance Criterion in the spec, in document order.
 * @returns {Map<string, {title: string, body: string[], cases: Map<string,string>, story: string}>}
 */
export function readSpec(path) {
  if (!existsSync(path)) throw new Error(`spec not found at ${path}`);
  const acs = new Map();
  let current = null;
  let inCases = false;

  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const declaration = line.match(/^- \*\*(AC-(\d+\.\d+)\.\d+)\*\*\s*(?:—\s*(.*))?$/);
    if (declaration) {
      const [, id, story, title] = declaration;
      current =
        acs.get(id) ?? { title: (title ?? '').trim(), body: [], cases: new Map(), story: `US-${story}` };
      acs.set(id, current);
      inCases = false;
      continue;
    }
    if (!current) continue;

    // A new requirement of any kind, or any heading, closes the block.
    if (/^- \*\*(FR|SC|NFR)-/.test(line) || /^#{2,4} /.test(line)) {
      current = null;
      inCases = false;
      continue;
    }

    if (/^\s*- \*\*Cases\*\*:/.test(line)) {
      inCases = true;
      continue;
    }
    if (inCases) {
      const c = line.match(/^\s+- \*\*(AC-\d+\.\d+\.\d+\/\d+)\*\*\s*—\s*(.+)$/);
      if (c) {
        current.cases.set(c[1], c[2].trim());
        continue;
      }
      if (line.trim() !== '') inCases = false;
    }
    current.body.push(line);
  }
  return acs;
}

/** Expand `AC-1.2.1–AC-1.2.4` (en dash, em dash or hyphen) into every ID in the run. */
export function expandRange(text) {
  const ids = new Set();
  const range = /AC-(\d+)\.(\d+)\.(\d+)\s*[–—-]\s*AC-(\d+)\.(\d+)\.(\d+)/g;
  let consumed = text;
  for (const m of text.matchAll(range)) {
    const [, e1, s1, n1, e2, s2, n2] = m;
    // A range only means anything within one story. Across stories the two ends are just
    // two IDs, so leave them for the scan below rather than consuming them into nothing —
    // swallowing them silently drops both from the plan item that named them.
    if (e1 !== e2 || s1 !== s2) continue;
    for (let n = Number(n1); n <= Number(n2); n++) ids.add(`AC-${e1}.${s1}.${n}`);
    consumed = consumed.replace(m[0], ' ');
  }
  for (const m of consumed.matchAll(/AC-\d+\.\d+\.\d+/g)) ids.add(m[0]);
  return ids;
}

/** Expand `T012–T018` into every task ID in the run. */
function expandTaskRange(text) {
  const ids = [];
  const seen = new Set();
  let consumed = text;
  for (const m of text.matchAll(/T(\d+)\s*[–—-]\s*T(\d+)/g)) {
    const width = m[1].length;
    for (let n = Number(m[1]); n <= Number(m[2]); n++) {
      const id = `T${String(n).padStart(width, '0')}`;
      if (!seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    }
    consumed = consumed.replace(m[0], ' ');
  }
  for (const m of consumed.matchAll(/T\d+/g)) {
    if (!seen.has(m[0])) {
      seen.add(m[0]);
      ids.push(m[0]);
    }
  }
  return ids;
}

/**
 * The authored Traceability Matrix in the plan: the link a person decided on, as opposed
 * to the generated matrix, which is only ever this expanded and cross-checked.
 * @returns {Map<string, {title:string, covers:string, acs:Set<string>, impl:string[], test:string[]}>}
 */
export function readPlan(path) {
  if (!existsSync(path)) throw new Error(`plan not found at ${path}`);
  const items = new Map();
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    // | **P-003** | US-16.1 — … | AC-16.1.1–AC-16.1.11 | T032 | T033 |
    const m = line.match(/^\|\s*\*\*(P-\d+)\*\*\s*\|(.*)$/);
    if (!m) continue;
    const cells = m[2].split('|').map((c) => c.trim());
    const [title = '', acCell = '', implCell = '', testCell = ''] = cells;
    items.set(m[1], {
      title,
      covers: acCell,
      acs: expandRange(acCell),
      impl: expandTaskRange(implCell),
      test: expandTaskRange(testCell),
    });
  }
  return items;
}

/** @returns {Map<string, {done:boolean, text:string, files:string[]}>} */
export function readTasks(path) {
  if (!existsSync(path)) throw new Error(`tasks not found at ${path}`);
  const tasks = new Map();
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^- \[([ xX])\]\s*(T\d+)\s*(.*)$/);
    if (!m) continue;
    const files = [...m[3].matchAll(/`([^`]+\.(?:js|mjs|ts|json|css|md|html|yml|yaml))`/g)]
      .map((f) => f[1])
      // A path with an ellipsis is prose shorthand, not a path.
      .filter((f) => f.includes('/') && !f.includes('...'));
    tasks.set(m[2], { done: m[1] !== ' ', text: m[3], files });
  }
  return tasks;
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(test|spec)\.js$/.test(entry) ? [full] : [];
  });
}

/**
 * Every test name in the suite, with the file it lives in.
 *
 * `titles` is what a criterion is judged against. `mentions` is every ID appearing
 * anywhere in a test file — which is all the gate this replaced ever looked at, and the
 * reason two User Stories could be specified, unbuilt, and reported fully covered.
 */
export function readSuite(root, testDirs) {
  const titles = [];
  const mentions = new Map();
  for (const dir of testDirs) {
    for (const file of walk(join(root, dir))) {
      const rel = file.slice(root.length + 1);
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(CRITERION_ID)) {
        if (!mentions.has(m[0])) mentions.set(m[0], []);
        if (!mentions.get(m[0]).includes(rel)) mentions.get(m[0]).push(rel);
      }
      // The closing delimiter is whichever one opened the string, so a name may contain
      // the other two — matching on "any quote" truncates a name at its first quote and
      // fails it for a reason that has nothing to do with the test.
      const call = /\b(?:it|test)\s*(?:\.\w+)?\s*\(\s*(`|'|")((?:\\.|(?!\1)[^\\])*)\1/g;
      for (const m of src.matchAll(call)) {
        const title = m[2];
        for (const id of title.matchAll(CRITERION_ID)) {
          titles.push({ id: id[0], title, file: rel });
        }
      }
    }
  }
  return { titles, mentions };
}

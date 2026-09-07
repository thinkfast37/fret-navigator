/**
 * The judgements: what counts as a criterion, and the eight checks over the chain
 *
 *     AC → Case → plan item → implementation task + test task → a verbatim-named test
 *
 * Pure functions over the parsed artefacts, so the whole thing is testable against
 * fixtures without a repository.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const STOPWORDS = new Set(
  ('a an the is are was were be been being and or of to in on for with that it its by as at ' +
   'from not no this than then when given but each every only into over under any all ' +
   'does doing done have has had will would can could may might must shall should ' +
   'there here what which who whom whose how why where more most less least same other ' +
   'itself again still just also both either neither')
    .split(' ')
);

/** Words collapsed onto a canonical token, so a synonym is not read as a mismatch. */
function canonicalMap(synonyms) {
  const map = new Map();
  for (const group of synonyms) for (const w of group) map.set(w, group[0]);
  return map;
}

/**
 * Crude suffix stripping — enough to make "inherits" and "inherit" the same word.
 *
 * The plural and the trailing `e` are stripped in that order, and separately from the
 * verb endings. Taking `es` off in one step is what a naive stemmer does, and it maps
 * "measures" to "measur" while "measure" stays "measure" — so the spec's word and the
 * test's word for the same thing stop matching. That defect was live and invisible,
 * masked by an explicit measure/measures synonym entry; a synonym list covering what a
 * stemmer got wrong hides the next word it gets wrong too.
 */
function stem(word, canonical) {
  if (canonical.has(word)) return canonical.get(word);
  let w = word;

  // Verb and adverb endings.
  for (const suffix of ['ically', 'ingly', 'edly', 'ing', 'ied', 'ed']) {
    if (w.length - suffix.length >= 4 && w.endsWith(suffix)) {
      w = w.slice(0, -suffix.length);
      break;
    }
  }
  // Plurals: "ies" → "y", then a bare trailing "s" that is not part of "ss".
  if (w.length > 4 && w.endsWith('ies')) w = `${w.slice(0, -3)}y`;
  else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);

  // A trailing "e" last, so "measures" → "measure" → "measur" meets "measure" → "measur",
  // and "boxes" → "boxe" → "box" meets "box".
  if (w.length > 3 && w.endsWith('e')) w = w.slice(0, -1);

  return canonical.get(w) ?? w;
}

function significantWords(text, canonical) {
  return new Set(
    text
      .toLowerCase()
      .replace(/ac-\d+\.\d+\.\d+(\/\d+)?/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
      .map((w) => stem(w, canonical))
  );
}

function share(a, b) {
  if (a.size === 0) return 1;
  let hits = 0;
  for (const w of a) if (b.has(w)) hits++;
  return hits / a.size;
}

/**
 * Bidirectional similarity. A terse criterion title against a longer test name should not
 * be penalised for the test saying more, or the reverse. What this detects is two
 * sentences with nothing in common, which stays near zero in both directions.
 *
 * Used only to RANK findings, never to pass one — see `matches` below.
 */
export function overlap(a, b, canonical) {
  const wa = significantWords(a, canonical);
  const wb = significantWords(b, canonical);
  return Math.max(share(wa, wb), share(wb, wa));
}

/** Below this, a test is judged to be proving something else rather than merely misnamed. */
export const MISMATCH_THRESHOLD = 0.34;

/** Normalise for verbatim comparison: curly quotes, dashes, and runs of whitespace. */
export function normalise(text) {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** The part of a test name after `AC-x.y.z — `, with any trailing qualifier left in place. */
export function claimedTitle(testTitle, id) {
  const escaped = id.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  return normalise(testTitle.replace(new RegExp(`^\\s*${escaped}\\s*[—–:-]?\\s*`), ''));
}

/** How many separate assertions an AC makes. More than one means it must declare Cases. */
export function assertionCount(body) {
  let thens = 0;
  let ands = 0;
  let tableRows = 0;
  for (const line of body) {
    if (/^\s*- \*\*Then\*\*/.test(line)) thens++;
    else if (/^\s*- \*\*And\*\*/.test(line)) ands++;
    if (/^\s*\|/.test(line) && !/^\s*\|[\s\-:|]+\|\s*$/.test(line)) tableRows++;
  }
  // The header row is structure, not an assertion.
  if (tableRows > 0) tableRows -= 1;

  // When an AC states its outcome as a table, the `Then` introduces the table rather
  // than asserting anything beside it — "Then the totals are exactly:" followed by two
  // rows is two assertions, not three. Counting both made every table-shaped AC look
  // like it needed one more Case than it does.
  const outcomes = tableRows > 0 ? tableRows : thens;
  return Math.max(1, outcomes + ands);
}

function isUiLevel(title, body, vocabulary) {
  const text = (title + ' ' + body.join(' ')).toLowerCase();
  return vocabulary.some((w) => new RegExp(`\\b${w}\\b`).test(text));
}

/**
 * Everything the suite must prove: a simple AC, or each Case of a compound one.
 * @returns {Array<{id:string,title:string,parent:string,story:string,ui:boolean}>}
 */
export function buildCriteria(acs, config) {
  const criteria = [];
  for (const [id, ac] of acs) {
    if (ac.cases.size > 0) {
      for (const [caseId, caseTitle] of ac.cases) {
        criteria.push({
          id: caseId,
          title: caseTitle,
          parent: id,
          story: ac.story,
          ui: isUiLevel(caseTitle, ac.body, config.uiVocabulary),
        });
      }
    } else {
      criteria.push({
        id,
        title: ac.title,
        parent: id,
        story: ac.story,
        ui: isUiLevel(ac.title, ac.body, config.uiVocabulary),
      });
    }
  }
  return criteria;
}

export const CHECKS = {
  T1: 'Every AC traces to a numbered plan item',
  T2: 'Every plan item has an implementation task and a test task',
  T3: 'Every file a completed task names exists',
  T4: 'Every compound AC declares its Cases',
  T5: 'Every criterion has a test whose name matches it',
  T6: 'Every UI-level criterion has a test that can reach the DOM',
  T7: 'No test names a criterion the spec does not declare',
  T8: 'The generated traceability matrix is up to date',
  T9: 'Every waiver is valid, reasoned, and still needed',
};

/**
 * A finding's stable identity, for the baseline.
 *
 * T2 and T3 can raise several findings against one id, so they carry a discriminator.
 * T5 carries its severity, so a criterion accepted as merely misnamed cannot quietly
 * decay into one whose test proves something else. Neither carries a similarity score:
 * that moves whenever a test is edited, and a baseline entry that drifts every commit
 * excuses nothing.
 */
export function findingKey(check, f) {
  if (check === 'T2' || check === 'T3') return `${check} ${f.id} ${f.why}`;
  if (check === 'T5') return `${check} ${f.id} ${f.kind}`;
  return `${check} ${f.id}`;
}

/**
 * Run every check.
 * @returns {{findings: Record<string, Array<object>>, criteria: Array<object>, testsFor: Map}}
 */
export function analyse({ acs, plan, tasks, suite, config }) {
  const canonical = canonicalMap(config.synonyms);
  const criteria = buildCriteria(acs, config);
  const findings = { T1: [], T2: [], T3: [], T4: [], T5: [], T6: [], T7: [], T8: [], T9: [] };

  const testsFor = new Map();
  for (const t of suite.titles) {
    if (!testsFor.has(t.id)) testsFor.set(t.id, []);
    testsFor.get(t.id).push(t);
  }

  // T1 — every AC traces to a plan item.
  const acToPlan = new Map();
  for (const [pid, item] of plan) {
    for (const acId of item.acs) {
      if (!acToPlan.has(acId)) acToPlan.set(acId, []);
      acToPlan.get(acId).push(pid);
    }
  }
  for (const id of acs.keys()) {
    if (!acToPlan.has(id)) findings.T1.push({ id, why: 'no plan item claims this AC' });
  }

  // T2 — every plan item carrying ACs has both kinds of task.
  for (const [pid, item] of plan) {
    const missing = [];
    if (item.impl.length === 0) missing.push('implementation');
    // An item carrying no AC is infrastructure. It asserts no behaviour, so demanding a
    // test task of it would only invite a test written to satisfy the gate.
    if (item.test.length === 0 && item.acs.size > 0) missing.push('test');
    if (missing.length) {
      findings.T2.push({ id: pid, why: `no ${missing.join(' and ')} task`, title: item.title });
    }
    for (const t of [...item.impl, ...item.test]) {
      if (!tasks.has(t)) {
        findings.T2.push({ id: pid, why: `names ${t}, which is not a task`, title: item.title });
      }
    }
  }

  // T3 — a COMPLETED task's named files exist. An open task naming a missing file is
  // ordinary: the file is the work, or the task is about the file's absence.
  for (const [tid, task] of tasks) {
    if (!task.done) continue;
    for (const f of task.files) {
      if (!existsSync(join(config.root, f))) {
        findings.T3.push({ id: tid, why: `names \`${f}\`, which does not exist` });
      }
    }
  }

  // T4 — a compound AC declares its Cases.
  for (const [id, ac] of acs) {
    const n = assertionCount(ac.body);
    if (n > 1 && ac.cases.size === 0) {
      findings.T4.push({ id, why: `makes ${n} assertions but declares no Cases`, title: ac.title });
    } else if (ac.cases.size > 0 && ac.cases.size < n) {
      findings.T4.push({
        id,
        why: `makes ${n} assertions but declares only ${ac.cases.size} Cases`,
        title: ac.title,
      });
    }
  }

  // T5 — a test named for the criterion, in the criterion's own words.
  for (const c of criteria) {
    const found = testsFor.get(c.id) ?? [];
    if (found.length === 0) {
      findings.T5.push({ id: c.id, kind: 'untested', why: 'no test names this criterion', title: c.title });
      continue;
    }
    const want = normalise(c.title);
    const literal = want.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = (t) => {
      const claimed = claimedTitle(t.title, c.id);
      return claimed === want || new RegExp(`^${literal}\\s*[:\\-]`).test(claimed);
    };

    // EVERY test naming this criterion must be named for it, not merely one of them.
    // Requiring only one leaves a criterion with several tests able to have one quietly
    // repurposed while the criterion still reads as covered.
    const offenders = found.filter((t) => !matches(t));
    if (offenders.length === 0) continue;

    let best = 0;
    let bestTitle = '';
    for (const t of offenders) {
      const score = overlap(c.title, t.title, canonical);
      if (score >= best) {
        best = score;
        bestTitle = `${t.title}  [${t.file}]`;
      }
    }
    findings.T5.push({
      id: c.id,
      kind: best < MISMATCH_THRESHOLD ? 'mismatched' : 'reworded',
      score: best,
      why:
        best < MISMATCH_THRESHOLD
          ? `is proved by a test about something else (${(best * 100).toFixed(0)}% in common)`
          : `has a test, but its name is a paraphrase rather than the criterion (${(best * 100).toFixed(0)}% in common)`,
      title: c.title,
      got: bestTitle,
    });
  }
  const RANK = { untested: 0, mismatched: 1, reworded: 2 };
  findings.T5.sort((a, b) => RANK[a.kind] - RANK[b.kind] || (a.score ?? 0) - (b.score ?? 0));

  // T6 — a UI-level criterion needs a test that can reach the DOM.
  for (const c of criteria) {
    if (!c.ui) continue;
    const found = testsFor.get(c.id) ?? [];
    if (found.length === 0) continue; // already reported by T5
    if (!found.some((t) => config.domCapable.some((d) => t.file.startsWith(d)))) {
      findings.T6.push({
        id: c.id,
        why: 'is UI-level but every test for it is a pure unit test',
        title: c.title,
        got: [...new Set(found.map((t) => t.file))].join(', '),
      });
    }
  }

  // T7 — no test names an ID the spec does not declare.
  const declared = new Set(criteria.map((c) => c.id));
  for (const id of acs.keys()) declared.add(id);
  for (const id of suite.mentions.keys()) {
    if (!declared.has(id)) {
      findings.T7.push({
        id,
        why: `is named by ${suite.mentions.get(id).join(', ')} but the spec declares no such criterion`,
      });
    }
  }

  return { findings, criteria, testsFor, acToPlan };
}

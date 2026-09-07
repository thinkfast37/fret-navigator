/**
 * Rendering the traceability matrix.
 *
 * Two shapes, one row-builder underneath:
 *
 *   - the MASTER matrix, one row per criterion across the whole application, written to
 *     a committed file so it diffs in review like anything else;
 *   - a CHANGE matrix, the same rows filtered to what a given change touches, for the
 *     pull request body.
 *
 * The matrix is generated, never hand-edited. The authored decisions live in the plan's
 * own Traceability Matrix (which AC belongs to which plan item, and which tasks build and
 * prove it); this file is that expanded, cross-referenced against the suite, and marked
 * with what is actually true right now.
 *
 * It reports COVERAGE as well as gaps. A list of only what is wrong cannot answer "is
 * this good enough to ship" — that needs the proportion proven, and it needs the gaps
 * ranked, because a test that proves the wrong thing and a test with an untidy name are
 * not the same problem and should never be summed into one number.
 */

/**
 * How serious a gap is, derived from its kind rather than assigned per criterion.
 *
 * The ladder is the one the audit produced. MISNAMED never hid anything: the test runs
 * and proves the criterion, it is just labelled in its own words. WRONG TEST hid two
 * entire User Stories. NO TEST is the state a criterion is in when nobody has looked.
 */
export const SEVERITY_OF = {
  'NO TEST': 'CRITICAL',
  'WRONG TEST': 'HIGH',
  'NOT PROVABLE': 'HIGH',
  'NEEDS CASES': 'MEDIUM',
  'MISNAMED': 'LOW',
};

export const SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

/**
 * Colour for each state, green through red.
 *
 * Markdown has no colour of its own, so the mark has to be a glyph. It is always rendered
 * *beside* the words it repeats — never instead of them — because red and green are the one
 * pair a colour-blind reader cannot separate, and because a matrix has to survive being
 * read in a plain-text diff. The gradient exists because the severities are not
 * interchangeable: a test proving the wrong thing and a test with an untidy name are
 * different problems, and flattening both to "red" throws away the ranking.
 */
export const MARK_OF = {
  OK: '🟢',
  WAIVED: '🔵',
  CRITICAL: '🔴',
  HIGH: '🔴',
  MEDIUM: '🟠',
  LOW: '🟡',
};

/** The colour for one row's status: proven, argued away, or a gap of some severity. */
export const markFor = (status) =>
  status.mark === 'OK' ? MARK_OF.OK : status.waived ? MARK_OF.WAIVED : MARK_OF[status.severity];

/** Severities a waiver may cover. CRITICAL and HIGH are the states that hide unbuilt work. */
export const WAIVABLE = new Set(['LOW', 'MEDIUM']);

/** Status of one criterion, worst-first so a row's mark is its most serious problem. */
export function statusOf(id, findings, baseline, keyOf, waivers = new Map()) {
  const hit = (check) => findings[check].find((f) => f.id === id);

  let mark = null;
  let note = '';
  let key = null;

  const t5 = hit('T5');
  const t6 = hit('T6');
  const t4 = hit('T4');

  if (t5 && t5.kind === 'untested') {
    mark = 'NO TEST';
    note = 'no test names this criterion';
    key = keyOf('T5', t5);
  } else if (t5 && t5.kind === 'mismatched') {
    mark = 'WRONG TEST';
    note = 'the test named for it proves something else';
    key = keyOf('T5', t5);
  } else if (t6) {
    mark = 'NOT PROVABLE';
    note = 'UI-level, but only a pure unit test';
    key = keyOf('T6', t6);
  } else if (t4) {
    mark = 'NEEDS CASES';
    note = t4.why;
    key = keyOf('T4', t4);
  } else if (t5) {
    mark = 'MISNAMED';
    note = 'test name is a paraphrase, not the criterion';
    key = keyOf('T5', t5);
  }

  if (mark === null) return { mark: 'OK', severity: null, accepted: false, waived: false, note: '' };

  const severity = SEVERITY_OF[mark];
  const waiver = waivers.get(id);
  return {
    mark,
    severity,
    accepted: baseline.has(key),
    waived: Boolean(waiver) && WAIVABLE.has(severity),
    reason: waiver?.reason ?? '',
    note,
  };
}

const escapeCell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

/**
 * Build every row of the matrix.
 * @returns {Array<object>} one row per criterion, in spec order.
 */
export function buildRows({
  criteria,
  acs,
  plan,
  tasks,
  testsFor,
  acToPlan,
  findings,
  baseline,
  keyOf,
  waivers = new Map(),
}) {
  return criteria.map((c) => {
    const planIds = acToPlan.get(c.parent) ?? [];
    const impl = [];
    const test = [];
    for (const pid of planIds) {
      const item = plan.get(pid);
      if (!item) continue;
      impl.push(...item.impl);
      test.push(...item.test);
    }
    const tests = testsFor.get(c.id) ?? [];
    const status = statusOf(c.id, findings, baseline, keyOf, waivers);
    return {
      story: c.story,
      id: c.id,
      title: c.title,
      isCase: c.id.includes('/'),
      ui: c.ui,
      plan: planIds,
      impl: [...new Set(impl)],
      test: [...new Set(test)],
      implDone: [...new Set(impl)].filter((t) => tasks.get(t)?.done).length,
      testDone: [...new Set(test)].filter((t) => tasks.get(t)?.done).length,
      tests: tests.map((t) => ({ title: t.title, file: t.file })),
      status,
      acTitle: acs.get(c.parent)?.title ?? '',
    };
  });
}

/** A criterion counts as covered when it is proven, or when a gap has been argued away. */
const isCovered = (r) => r.status.mark === 'OK' || r.status.waived;

function tally(rows) {
  const counts = { OK: 0, WAIVED: 0, CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const r of rows) {
    if (r.status.mark === 'OK') counts.OK++;
    else if (r.status.waived) counts.WAIVED++;
    else counts[r.status.severity]++;
  }
  return counts;
}

const pct = (n, total) => (total === 0 ? '100.0' : ((n / total) * 100).toFixed(1));

/** One line of counts, each behind its own colour. */
const summaryLine = (t) =>
  `${MARK_OF.OK} Proven: ${t.OK}` +
  (t.WAIVED ? ` · ${MARK_OF.WAIVED} Waived: ${t.WAIVED}` : '') +
  SEVERITY_ORDER.filter((s) => t[s])
    .map((s) => ` · ${MARK_OF[s]} ${s}: ${t[s]}`)
    .join('');

/** Coverage and gap severity, headline figures. */
function renderCoverage(rows) {
  const t = tally(rows);
  const covered = rows.filter(isCovered).length;
  const proven = t.OK;

  const lines = [
    `**Coverage**: ${proven} of ${rows.length} criteria proven (${pct(proven, rows.length)}%)` +
      (t.WAIVED ? `, plus ${t.WAIVED} waived — ${pct(covered, rows.length)}% accounted for` : ''),
    '',
    '| | Criteria | Share |',
    '|---|---|---|',
    `| ${MARK_OF.OK} Proven | ${t.OK} | ${pct(t.OK, rows.length)}% |`,
  ];
  if (t.WAIVED)
    lines.push(
      `| ${MARK_OF.WAIVED} Waived, with a reason | ${t.WAIVED} | ${pct(t.WAIVED, rows.length)}% |`
    );
  for (const sev of SEVERITY_ORDER) {
    if (t[sev])
      lines.push(`| ${MARK_OF[sev]} Gap — ${sev} | ${t[sev]} | ${pct(t[sev], rows.length)}% |`);
  }
  return lines.join('\n');
}

/** Coverage per User Story, so a weak area is visible without reading 220 rows. */
function renderByStory(rows) {
  const stories = new Map();
  for (const r of rows) {
    if (!stories.has(r.story)) stories.set(r.story, []);
    stories.get(r.story).push(r);
  }

  const out = [
    `| User Story | Criteria | ${MARK_OF.OK} Proven | ${MARK_OF.WAIVED} Waived | ` +
      `${MARK_OF.CRITICAL} CRITICAL | ${MARK_OF.HIGH} HIGH | ${MARK_OF.MEDIUM} MEDIUM | ` +
      `${MARK_OF.LOW} LOW |`,
    '|---|---|---|---|---|---|---|---|',
  ];
  for (const [story, group] of stories) {
    const t = tally(group);
    const cell = (n) => (n === 0 ? '·' : String(n));
    // A Story's colour is its worst criterion, not its average: one unproven claim is the
    // thing worth seeing, and averaging would let a single CRITICAL hide behind nine OKs.
    const worst = SEVERITY_ORDER.find((s) => t[s]);
    const mark = worst ? MARK_OF[worst] : t.WAIVED ? MARK_OF.WAIVED : MARK_OF.OK;
    // A Story with no unproven criteria is worth seeing at a glance, not just counted.
    const proven = t.OK === group.length ? `**${t.OK}**` : String(t.OK);
    out.push(
      `| ${mark} ${story} | ${group.length} | ${proven} | ${cell(t.WAIVED)} | ` +
        `${cell(t.CRITICAL)} | ${cell(t.HIGH)} | ${cell(t.MEDIUM)} | ${cell(t.LOW)} |`
    );
  }
  return out.join('\n');
}

function renderTable(rows) {
  const out = [
    '| Story | Criterion | What it requires | Plan | Implementation tasks | Test tasks | Proving test | Status |',
    '|---|---|---|---|---|---|---|---|',
  ];
  for (const r of rows) {
    const taskCell = (ids, done) =>
      ids.length === 0 ? '**none**' : `${ids.join(', ')} (${done}/${ids.length} done)`;
    const testCell =
      r.tests.length === 0
        ? '**none**'
        : [...new Set(r.tests.map((t) => `\`${t.file.split('/').pop()}\``))].join(', ');

    // The colour repeats the words; it never replaces them. See MARK_OF.
    const dot = markFor(r.status);
    let mark;
    if (r.status.mark === 'OK') mark = `${dot} OK`;
    else if (r.status.waived)
      mark = `${dot} WAIVED (${r.status.mark}) — ${escapeCell(r.status.reason)}`;
    else mark = `${dot} **${r.status.severity}** · ${r.status.mark}${r.status.accepted ? ' ᵃ' : ''}`;

    out.push(
      `| ${r.story} | \`${r.id}\`${r.ui ? ' 🖵' : ''} | ${escapeCell(r.title)} | ` +
        `${r.plan.join(', ') || '**none**'} | ${taskCell(r.impl, r.implDone)} | ` +
        `${taskCell(r.test, r.testDone)} | ${testCell} | ${mark} |`
    );
  }
  return out.join('\n');
}

/** The master matrix — the whole application, written to a committed file. */
export function renderMaster(rows, { generatedFor }) {
  const accepted = rows.filter((r) => r.status.accepted && !r.status.waived).length;

  return `# Traceability Matrix

<!--
  GENERATED FILE — do not edit by hand.

  Regenerate with:  npm run trace:matrix
  It is checked by  npm run check:trace  (check T8), so an out-of-date matrix fails
  the build rather than sitting quietly out of step with the spec.

  The decisions live elsewhere. Which AC belongs to which plan item, and which tasks
  build and prove it, are authored in the plan's own Traceability Matrix. This file is
  that expanded one row per criterion, cross-referenced against the test suite, and
  marked with what is true right now.
-->

**Feature**: ${generatedFor}
**Criteria**: ${rows.length} across ${new Set(rows.map((r) => r.story)).size} User Stories

${renderCoverage(rows)}

A row is one *criterion*: an Acceptance Criterion that asserts one thing, or one Case of
an AC that asserts several. 🖵 marks a criterion that describes something a person sees or
does, which cannot be proved by a test with no document to look at.

${MARK_OF.OK} proven · ${MARK_OF.WAIVED} waived · and ${MARK_OF.LOW} → ${MARK_OF.MEDIUM} → ${MARK_OF.HIGH}
as a gap gets more serious. The colour only repeats what the row already says in words, so
nothing is lost reading this in greyscale, in a plain diff, or by someone who cannot tell
the red from the green.

## How a gap is ranked

Severity comes from the kind of gap, not from a judgement recorded per criterion, so it
cannot be talked down when a deadline is close.

| Severity | Gap | Why it ranks there |
|---|---|---|
| ${MARK_OF.CRITICAL} **CRITICAL** | NO TEST — nothing names this criterion | Nobody has looked. This is the state an unbuilt requirement sits in. |
| ${MARK_OF.HIGH} **HIGH** | WRONG TEST — a test names it but proves something else | The claim is unproven while reporting as covered. This is what hid US-2.2 and US-11.1/11.2. |
| ${MARK_OF.HIGH} **HIGH** | NOT PROVABLE — UI-level, but only a pure unit test | Same failure, arrived at differently: \`core/\` cannot see a screen, whatever the test is named. |
| ${MARK_OF.MEDIUM} **MEDIUM** | NEEDS CASES — a compound AC not decomposed | Partly proven. One test stands in for several claims, so some of them are unchecked. |
| ${MARK_OF.LOW} **LOW** | MISNAMED — right test, named in its own words | Proven. Clerical: the name has drifted from the spec's wording. |

${MARK_OF.WAIVED} **WAIVED** marks a gap deliberately left open, with its reason shown in the row. Only LOW
and MEDIUM may be waived — CRITICAL and HIGH are exactly the states that let unbuilt work
report as complete, so no reason clears them (Constitution Principle IV).

ᵃ marks a gap accepted as pre-existing debt (${accepted} rows). It is reported but does not
fail the build, and it is outstanding work — never a settled decision.

## Coverage by User Story

${renderByStory(rows)}

## Every criterion

${renderTable(rows)}
`;
}

/**
 * The change matrix — the same rows, filtered to what one change touches.
 *
 * Split by how the criterion was reached, because those are different claims. A changed
 * test that names a criterion is near-certain to affect it. A criterion reached only
 * because the change touched a file some task mentions is a maybe — and in a codebase
 * with a composition root, that is most of the application. Listing both in one table
 * produced 167 rows for a change that really touched fourteen, which is not a review aid.
 */
export function renderChange(rows, { touchedFiles, reason, reach = new Map() }) {
  if (rows.length === 0) {
    return (
      '### Traceability\n\nNo Acceptance Criteria are touched by this change.\n\n' +
      `_Files considered: ${touchedFiles.length}. ${reason}_\n`
    );
  }

  const direct = rows.filter((r) => reach.get(r.id) === 'direct');
  const indirect = rows.filter((r) => reach.get(r.id) !== 'direct');

  const out = ['### Traceability', ''];

  if (direct.length > 0) {
    const t = tally(direct);
    out.push(
      `**${direct.length} criteri${direct.length === 1 ? 'on' : 'a'} directly affected** — ` +
        `a test naming the criterion changed in this diff.`,
      '',
      summaryLine(t),
      '',
      renderTable(direct),
      ''
    );
  } else {
    out.push('No criterion had a test of its own changed in this diff.', '');
  }

  if (indirect.length > 0) {
    const t = tally(indirect);
    const stories = [...new Set(indirect.map((r) => r.story))];
    out.push(
      '<details>',
      `<summary><strong>${indirect.length} further criteria could be affected</strong> ` +
        `across ${stories.length} User Stories — reached only because this change touches a ` +
        'file some task names, so treat as a blast radius rather than a finding.</summary>',
      '',
      summaryLine(t),
      '',
      `Stories: ${stories.join(', ')}`,
      '',
      '</details>',
      ''
    );
  }

  out.push(`_Derived from ${touchedFiles.length} changed file(s). ${reason}_`);
  return out.join('\n');
}

/**
 * Configuration for spec-trace.
 *
 * Everything project-specific lives here so the rest of the skill is portable: drop the
 * `spec-trace` folder into any spec-kit project, write a `spec-trace.config.json` naming
 * where that project's spec, plan and tasks live, and the tool works unchanged.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/** Everything a spec-kit project is assumed to have, and nothing more. */
export const DEFAULTS = {
  /**
   * A project with several feature folders sets `features` instead: an array of
   * `{spec, plan, tasks}` triples, one per folder, checked as one project against one
   * matrix, baseline and waiver file. IDs must be unique across features — give each
   * feature its own AC epic number and its own plan-item and task ranges. When
   * `features` is present the three single-file keys below are ignored.
   */
  features: null,
  /** The specification carrying User Stories and Acceptance Criteria. */
  spec: 'specs/spec.md',
  /** The implementation plan carrying the authored Traceability Matrix. */
  plan: 'specs/plan.md',
  /** The task list. */
  tasks: 'specs/tasks.md',
  /** Where the generated matrix is written. Committed, reviewed, never hand-edited. */
  matrix: 'specs/traceability-matrix.md',
  /** Findings accepted as pre-existing debt. May only shrink. */
  baseline: 'specs/traceability-baseline.json',
  /**
   * Gaps deliberately not being closed, each with a written reason.
   *
   * Different in kind from the baseline: the baseline is debt still owed, a waiver is a
   * decision not to pay it. Kept in its own file so the two are never confused, and so a
   * waiver has to be written by hand and argued for in review.
   */
  waivers: 'specs/traceability-waivers.json',

  /** Directories scanned for tests. */
  testDirs: ['tests/unit', 'tests/e2e'],
  /** Test paths that can reach a rendered document, for the UI-level check. */
  domCapable: ['tests/e2e/', 'tests/unit/ui/'],

  /**
   * Words that make an Acceptance Criterion UI-level — it describes something a person
   * sees or does, so it cannot be proved by a test with no document to look at.
   */
  uiVocabulary: [
    'button', 'control', 'picker', 'menu', 'dropdown', 'dialog', 'prompt', 'panel',
    'view', 'screen', 'viewport', 'strip', 'toggle', 'field', 'link', 'pill', 'row',
    'tap', 'taps', 'tapped', 'click', 'clicks', 'drag', 'scroll', 'scrolls',
    'shown', 'shows', 'show', 'displayed', 'displays', 'visible', 'hidden', 'render',
    'renders', 'rendered', 'disabled', 'enabled', 'greyed', 'grayed', 'highlight',
    'highlighted', 'dimmed', 'px', 'looks', 'sees', 'onscreen', 'on-screen',
  ],

  /**
   * How a test task is told apart from an implementation task in the plan's matrix.
   * Both must be present for any plan item that carries ACs.
   */
  testTaskPattern: '^(\\[P\\] )?((Unit t|T)ests?|Verify)\\b',

  /** Vocabulary the project uses interchangeably, so a synonym is not read as a mismatch. */
  synonyms: [
    ['meter', 'time', 'signature', 'timesignature'],
    ['tap', 'click', 'press', 'taps', 'clicks'],
    ['add', 'added', 'adding', 'append', 'appended', 'appending'],
    ['remove', 'removed', 'removal', 'delete', 'deleted', 'deletion', 'drop', 'drops'],
    ['prior', 'preceding', 'previous', 'last', 'earlier'],
    ['show', 'shows', 'shown', 'display', 'displays', 'displayed', 'visible', 'render'],
    ['hidden', 'absent', 'gone', 'none'],
    ['change', 'changes', 'changed', 'changing', 'switch', 'switches', 'switching', 'set'],
    ['reset', 'resets', 'clears', 'cleared', 'clear'],
    ['compute', 'computed', 'recompute', 'recomputed', 'derived', 'derive'],
    ['keep', 'keeps', 'kept', 'retain', 'retains', 'survive', 'survives', 'preserved'],
    ['disabled', 'refused', 'rejected', 'blocked', 'capped', 'cap'],
  ],
};

/**
 * Load configuration, merging `spec-trace.config.json` over the defaults.
 * @param {string} root Repository root.
 */
export function loadConfig(root) {
  const file = join(root, 'spec-trace.config.json');
  if (!existsSync(file)) return { ...DEFAULTS, root };
  const parsed = JSON.parse(readFileSync(file, 'utf8'));
  return { ...DEFAULTS, ...parsed, root };
}

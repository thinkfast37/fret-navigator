#!/usr/bin/env node
/**
 * Stop-hook companion for spec-trace.
 *
 * Runs the traceability check when a session ends and surfaces new findings to the user.
 * The point is timing: drift is cheapest to fix in the session that introduced it, while
 * the reasoning is still to hand. Waiting for CI means finding out once the context is
 * gone.
 *
 * It never blocks. A Stop hook that halts a session over a documentation gap would be
 * turned off within a day, and a gate that is off enforces nothing.
 *
 * Emits `{"systemMessage": …}` only when there is something new; silent otherwise, so a
 * clean session ends without noise.
 */
import { execFileSync } from 'node:child_process';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const SKILL_DIR = dirname(fileURLToPath(import.meta.url));
const CLI = resolve(SKILL_DIR, '..', 'spec-trace.mjs');

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i++) {
    if (existsSync(join(dir, 'spec-trace.config.json')) || existsSync(join(dir, '.git'))) return dir;
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

const root = findRoot(SKILL_DIR);

// Nothing configured in this repository — the skill is present but not adopted here.
if (!existsSync(join(root, 'spec-trace.config.json'))) process.exit(0);

let output = '';
let clean = true;
try {
  output = execFileSync(process.execPath, [CLI, '--summary'], { cwd: root, encoding: 'utf8' });
} catch (error) {
  // A non-zero exit is the finding signal, not a crash. Anything genuinely broken
  // (a missing spec, a parse error) also lands here and is worth showing.
  clean = false;
  output = `${error.stdout ?? ''}${error.stderr ?? ''}`.trim() || String(error.message);
}

if (clean) process.exit(0);

const failing = output
  .split('\n')
  .filter((line) => line.startsWith('FAIL'))
  .join('\n');

console.log(
  JSON.stringify({
    systemMessage:
      'Traceability check reports new findings — an AC, plan item, task or test is out ' +
      'of step (CLAUDE.md §2b). Fix the chain, or regenerate the matrix with ' +
      '`npm run trace:matrix`.\n\n' +
      (failing || output),
    suppressOutput: true,
  })
);

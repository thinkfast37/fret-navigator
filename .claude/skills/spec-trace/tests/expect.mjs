/**
 * A minimal `expect` for running the skill's self-tests under `node --test`.
 *
 * The tests were written against Vitest's expect; this repo's runner is Node's
 * built-in. Rather than rewrite ninety-odd assertions (and risk changing what
 * they assert), this shim implements exactly the matchers the suite uses —
 * toBe, toEqual, toContain, toHaveLength, toBeTruthy, toMatchObject, and
 * `.not` for the first three — on top of node:assert. An unused matcher is a
 * TypeError, not a silent pass.
 */
import assert from 'node:assert/strict';

function matchesObject(actual, expected) {
  if (expected === null || typeof expected !== 'object') {
    try {
      assert.deepStrictEqual(actual, expected);
      return true;
    } catch {
      return false;
    }
  }
  if (actual === null || typeof actual !== 'object') return false;
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) return false;
    return expected.every((v, i) => matchesObject(actual[i], v));
  }
  return Object.entries(expected).every(([k, v]) => matchesObject(actual[k], v));
}

function contains(haystack, needle) {
  if (typeof haystack === 'string') return haystack.includes(needle);
  if (Array.isArray(haystack) || haystack instanceof Set) {
    for (const item of haystack) {
      try {
        assert.deepStrictEqual(item, needle);
        return true;
      } catch {
        /* not this one */
      }
    }
    return false;
  }
  throw new TypeError(`toContain: cannot search a ${typeof haystack}`);
}

export function expect(actual) {
  const positive = {
    toBe: (expected) => assert.strictEqual(actual, expected),
    toEqual: (expected) => assert.deepStrictEqual(actual, expected),
    toContain: (needle) =>
      assert.ok(contains(actual, needle), `expected ${JSON.stringify(actual)} to contain ${JSON.stringify(needle)}`),
    toHaveLength: (n) =>
      assert.strictEqual(actual.length ?? actual.size, n, `expected length ${n}, got ${actual.length ?? actual.size}`),
    toBeTruthy: () => assert.ok(actual, `expected a truthy value, got ${JSON.stringify(actual)}`),
    toMatchObject: (expected) =>
      assert.ok(
        matchesObject(actual, expected),
        `expected ${JSON.stringify(actual)} to match ${JSON.stringify(expected)}`
      ),
    not: {
      toBe: (expected) => assert.notStrictEqual(actual, expected),
      toContain: (needle) =>
        assert.ok(!contains(actual, needle), `expected ${JSON.stringify(actual)} not to contain ${JSON.stringify(needle)}`),
      toEqual: (expected) => assert.notDeepStrictEqual(actual, expected),
    },
  };
  return positive;
}

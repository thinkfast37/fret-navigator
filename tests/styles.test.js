// Source-level checks for css/styles.css per UAT round 2 section E (FR-052).
// These are not jsdom/DOM tests - they assert against the stylesheet TEXT
// itself, since jsdom in the other test files never loads styles.css (no
// computed-style resolution is available there). This is the appropriate,
// lightweight way to hard-gate "colors live in exactly one place" for a
// plain-CSS project with no build step.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const cssPath = fileURLToPath(new URL("../src/css/styles.css", import.meta.url));
const css = readFileSync(cssPath, "utf8");

function rootBlock() {
  const match = css.match(/:root\s*\{([\s\S]*?)\}/);
  assert.ok(match, "expected a :root block in styles.css");
  return match[1];
}

describe("design tokens (UAT round 2 section E, FR-052)", () => {
  test("every color outside :root is a var() reference - no raw hex literal remains", () => {
    const withoutRoot = css.replace(/:root\s*\{[\s\S]*?\}/, "");
    const hexLiterals = withoutRoot.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
    assert.deepEqual(hexLiterals, []);
  });

  test("the new UI-accent tokens exist in :root with their pre-refactor values unchanged", () => {
    const root = rootBlock();
    assert.match(root, /--color-root-accent:\s*#ffd54a;/);
    assert.match(root, /--color-error-bg:\s*#7a2323;/);
    assert.match(root, /--color-error-text:\s*#fff;/);
    // --color-text-on-bright aliases --color-bg, which is already #14171c.
    assert.match(root, /--color-text-on-bright:\s*var\(--color-bg\);/);
    assert.match(root, /--color-bg:\s*#14171c;/);
  });

  test("the root-button selected-state rule uses --role-1-bright (FR-051), not the shared --color-root-accent", () => {
    const match = css.match(/\.root-buttons button\[aria-pressed="true"\]\s*\{([^}]*)\}/);
    assert.ok(match);
    assert.match(match[1], /var\(--role-1-bright\)/);
    assert.doesNotMatch(match[1], /--color-root-accent/);
  });

  test("the capo indicator uses its own token, distinct from the nut's", () => {
    const nut = css.match(/\.nut-line\s*\{([^}]*)\}/);
    const capo = css.match(/\.capo-line\s*\{([^}]*)\}/);
    assert.ok(nut && capo);
    assert.doesNotMatch(capo[1], /var\(--color-fg\)/); // nut's color token
    assert.match(capo[1], /var\(--color-capo-indicator\)/);
  });
});

describe("Buy Me a Coffee link (UAT round 2 section F, FR-053)", () => {
  const htmlPath = fileURLToPath(new URL("../src/index.html", import.meta.url));
  const html = readFileSync(htmlPath, "utf8");

  test("links to the correct URL, opening in a new tab with safe rel attributes", () => {
    const match = html.match(/<a\s+href="https:\/\/buymeacoffee\.com\/stevetakadimi"[^>]*>/);
    assert.ok(match, "expected a link to https://buymeacoffee.com/stevetakadimi");
    assert.match(match[0], /target="_blank"/);
    assert.match(match[0], /rel="noopener noreferrer"/);
  });

  test("uses the exact specified link text", () => {
    assert.match(html, /☕ Enjoying Fret Navigator\? Buy me a coffee →/);
  });

  test("is placed inside the existing credits footer, not a new visual pattern", () => {
    const footerMatch = html.match(/<footer id="credits">([\s\S]*?)<\/footer>/);
    assert.ok(footerMatch);
    assert.match(footerMatch[1], /buymeacoffee\.com\/stevetakadimi/);
  });
});

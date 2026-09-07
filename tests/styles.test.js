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

  test("the root-button selected-state rule uses the shared --role-1 token (FR-051), not --color-root-accent", () => {
    // (Updated 2026-09-07 with feature 005 FR-301: the token FR-051 shares is
    // now the single --role-1, the bright/dark pair having been collapsed.)
    const match = css.match(/\.root-buttons button\[aria-pressed="true"\]\s*\{([^}]*)\}/);
    assert.ok(match);
    assert.match(match[1], /var\(--role-1\)/);
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

// ---- Feature 005: display overhaul (T501/T502, P-401/P-402) ----

const ROLE_IDS_005 = ["1", "b2", "2", "b3", "3", "4", "4s5b", "5", "b6", "6", "b7", "7"];

function roleToken(id) {
  const m = rootBlock().match(new RegExp(`--role-${id}:\\s*(#[0-9a-fA-F]{6});`));
  assert.ok(m, `expected a --role-${id} token in :root`);
  return m[1];
}

function relativeLuminance(hex) {
  const channel = (i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrastRatio(hexA, hexB) {
  const [a, b] = [relativeLuminance(hexA), relativeLuminance(hexB)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe("unified degree palette (feature 005, FR-301/FR-302/FR-303)", () => {
  test("AC-5.1.1 — Each degree role has exactly one color, used identically in both views", () => {
    // The bright/dark variant pair is gone...
    assert.doesNotMatch(css, /--role-[\w]+-bright/);
    assert.doesNotMatch(css, /--role-[\w]+-dark/);
    // ...each role has exactly one token...
    for (const id of ROLE_IDS_005) roleToken(id);
    // ...and no chord-view rule re-fills a role with a different color: the
    // only fill rule per role is the shared one.
    for (const id of ROLE_IDS_005) {
      const fillRules = css.match(new RegExp(`\\.note\\.role-${id}(?![\\w-])[^{]*\\{[^}]*fill:[^}]*\\}`, "g")) || [];
      assert.equal(fillRules.length, 1, `role-${id} must have exactly one fill rule`);
      assert.doesNotMatch(fillRules[0], /is-chord-tone/);
    }
  });

  test("AC-5.1.2 — Note labels meet WCAG AA contrast on every role color", () => {
    const labelColor = "#ffffff"; // bold white labels on colored fills (R-502)
    assert.match(css, /--color-note-label:\s*#fff(?:fff)?;/);
    for (const id of ROLE_IDS_005) {
      const ratio = contrastRatio(roleToken(id), labelColor);
      assert.ok(ratio >= 4.5, `--role-${id} ${roleToken(id)} vs white label: ${ratio.toFixed(2)} < 4.5`);
    }
  });

  test("AC-5.1.3 — Chord tones are marked by ring and size, never by a color swap", () => {
    const ring = css.match(/\.note\.is-chord-tone \.note-marker\s*\{([^}]*)\}/);
    assert.ok(ring, "expected an .is-chord-tone marker rule");
    assert.match(ring[1], /stroke:/);
    assert.match(ring[1], /stroke-width:/);
    assert.match(ring[1], /r:/); // larger radius = the size cue
    assert.doesNotMatch(ring[1], /fill:/); // never a color swap
    // Root + chord tone keeps the root's accent ring (edge case).
    const rootRing = css.match(/\.note\.is-chord-tone\.is-root \.note-marker\s*\{([^}]*)\}/);
    assert.ok(rootRing);
    assert.match(rootRing[1], /var\(--color-root-accent\)/);
  });
});

describe("TV layout + bounded chord selects (feature 005, FR-304/FR-305)", () => {
  test("AC-5.2.1 — Wide viewports get compact controls and a fretboard-first layout", () => {
    // The ≥768px no-scroll layout keeps the fretboard as the growing region...
    const noScroll = css.match(/@media \(min-width: 768px\)\s*\{([\s\S]*?)\n\}/);
    assert.ok(noScroll);
    assert.match(noScroll[1], /#fretboard-container\s*\{[^}]*flex:\s*1 1 auto/);
    // ...and a ≥1280px tier compacts the control strip.
    const tv = css.match(/@media \(min-width: 1280px\)\s*\{([\s\S]*?)\n\}/);
    assert.ok(tv, "expected a min-width: 1280px compact tier");
    assert.match(tv[1], /#controls\s*\{[^}]*gap:/);
    assert.match(tv[1], /\.control-label\s*\{[^}]*font-size:/);
    assert.match(tv[1], /#controls select[^{]*\{[^}]*font-size:/);
  });

  test("AC-5.3.1 — Chord picker dropdowns have a bounded width", () => {
    const rules = css.match(/#chord-root-select,\s*#chord-quality-select\s*\{[^}]*\}/g) || [];
    assert.ok(rules.length >= 1, "expected a shared width rule for the chord selects");
    for (const rule of rules) assert.match(rule, /max-width:/);
    assert.ok(rules.some((rule) => /text-overflow:\s*ellipsis/.test(rule)));
  });
});

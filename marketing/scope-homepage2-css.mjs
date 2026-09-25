import postcss from "postcss";
import { readFileSync, writeFileSync } from "fs";

const SCOPE = ".hp2-scope";
const files = [
  "src/styles/homepage2/combined.css",
  "src/styles/homepage2/custom.css",
];

function scopeSelector(sel) {
  const trimmed = sel.trim();
  if (trimmed === ":root" || trimmed === "html" || trimmed === "body") {
    return SCOPE;
  }
  // html.foo / body.foo -> .hp2-scope.foo
  if (/^(html|body)(\.|:)/.test(trimmed)) {
    return SCOPE + trimmed.replace(/^(html|body)/, "");
  }
  return `${SCOPE} ${trimmed}`;
}

let out = `/* Auto-generated: homepage2/combined.css + custom.css, every selector
 * scoped under ${SCOPE} so it can be loaded alongside Sierra's own global
 * CSS on the same page without overriding shared Elementor core classes
 * (.e-con, .e-grid, etc.) that both captures define independently.
 * Regenerate with: node scope-homepage2-css.mjs
 */
`;

for (const file of files) {
  const css = readFileSync(file, "utf8");
  const root = postcss.parse(css, { from: file });

  root.walkAtRules((atRule) => {
    // Don't descend into / scope selectors inside keyframes (0%, 50%, to, from, etc.)
    if (/^(-\w+-)?keyframes$/i.test(atRule.name)) {
      atRule.walkRules = () => {}; // no-op guard, not strictly needed but explicit
    }
  });

  root.walkRules((rule) => {
    // Skip rules nested directly inside @keyframes / @font-face
    let p = rule.parent;
    let insideKeyframes = false;
    while (p) {
      if (p.type === "atrule" && /^(-\w+-)?keyframes$/i.test(p.name)) {
        insideKeyframes = true;
        break;
      }
      p = p.parent;
    }
    if (insideKeyframes) return;

    rule.selectors = rule.selectors.map(scopeSelector);
  });

  out += `\n/* ==== ${file} ==== */\n`;
  out += root.toResult().css;
  out += "\n";
}

writeFileSync("src/styles/homepage2-scoped.css", out);
console.log("Wrote src/styles/homepage2-scoped.css", out.length, "bytes");

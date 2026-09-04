import fs from "node:fs";

const layoutPath = "app/layout.tsx";
const cssPath = "app/globals.css";

let source = fs.readFileSync(layoutPath, "utf8");

console.log("\n=== NARA Offline Font Build Fix ===\n");

/*
 * Find font variable names declared from next/font/google.
 * Example:
 *
 * import { Geist, Geist_Mono } from "next/font/google";
 *
 * const geistSans = Geist({...});
 * const geistMono = Geist_Mono({...});
 */

source = source.replace(
  /import\s*\{[^}]*\}\s*from\s*["']next\/font\/google["'];?\s*/g,
  "",
);

const fontVariables = [];

for (const match of source.matchAll(
  /const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:Geist|Geist_Mono)\s*\(\s*\{[\s\S]*?\}\s*\)\s*;?/g,
)) {
  fontVariables.push(match[1]);
}

source = source.replace(
  /const\s+[A-Za-z_$][\w$]*\s*=\s*(?:Geist|Geist_Mono)\s*\(\s*\{[\s\S]*?\}\s*\)\s*;?\s*/g,
  "",
);

/*
 * Remove className interpolations such as:
 * ${geistSans.variable}
 * ${geistMono.variable}
 * ${geistSans.className}
 */
for (const variable of fontVariables) {
  const escaped = variable.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  source = source.replace(
    new RegExp(`\\$\\{${escaped}\\.(?:variable|className)\\}`, "g"),
    "",
  );
}

/*
 * Also cover common names if declaration detection changed.
 */
source = source
  .replace(/\$\{geist\.variable\}/g, "")
  .replace(/\$\{geist\.className\}/g, "")
  .replace(/\$\{geistSans\.variable\}/g, "")
  .replace(/\$\{geistSans\.className\}/g, "")
  .replace(/\$\{geistMono\.variable\}/g, "")
  .replace(/\$\{geistMono\.className\}/g, "");

fs.writeFileSync(layoutPath, source, "utf8");

console.log("✅ next/font/google dependency removed");

/*
 * Preserve existing Geist CSS variable API so components
 * using var(--font-geist-sans) / mono don't break.
 */

let css = fs.readFileSync(cssPath, "utf8");

const marker = "/* NARA offline font fallback */";

if (!css.includes(marker)) {
  css += `

/* NARA offline font fallback */
:root {
  --font-geist-sans:
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;

  --font-geist-mono:
    ui-monospace,
    "Cascadia Code",
    "Segoe UI Mono",
    Consolas,
    monospace;
}

body {
  font-family: var(--font-geist-sans);
}

code,
pre,
kbd,
samp {
  font-family: var(--font-geist-mono);
}
`;

  fs.writeFileSync(cssPath, css, "utf8");

  console.log("✅ offline Geist-compatible CSS fallback added");
} else {
  console.log("✅ offline font fallback already exists");
}

console.log("\n✅ Font build fix complete.\n");

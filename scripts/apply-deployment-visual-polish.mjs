import fs from "node:fs";

const shellPath = "features/chat/nara-shell.tsx";
const cssPath = "app/globals.css";
const manifestPath = "app/manifest.ts";
const packagePath = "package.json";

let shell = fs.readFileSync(shellPath, "utf8");
let css = fs.readFileSync(cssPath, "utf8");
let manifest = fs.readFileSync(manifestPath, "utf8");
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));

console.log("\n=== NARA Deployment + Visual Polish Mega Pack ===\n");

const imports = [
  {
    marker: "@/features/system/offline-banner",
    line: 'import { OfflineBanner } from "@/features/system/offline-banner";',
  },
  {
    marker: "@/features/system/release-watermark",
    line: 'import { ReleaseWatermark } from "@/features/system/release-watermark";',
  },
];

for (const item of imports) {
  if (shell.includes(item.marker)) {
    continue;
  }

  const anchors = [
    'import { AboutNara } from "@/features/system/about-nara";',
    'import { RuntimeStatus } from "@/features/system/runtime-status";',
    'import { SettingsHub } from "@/features/settings/settings-hub";',
  ];

  const anchor = anchors.find((candidate) => shell.includes(candidate));

  if (!anchor) {
    throw new Error(`Could not find shell import anchor for ${item.line}`);
  }

  shell = shell.replace(anchor, `${anchor}\n${item.line}`);
}

console.log("✅ deployment polish imports");

if (!shell.includes("<OfflineBanner")) {
  const mainClose = shell.lastIndexOf("</main>");

  if (mainClose === -1) {
    throw new Error("</main> not found.");
  }

  const block = `      <OfflineBanner />
      <ReleaseWatermark />

`;

  shell = shell.slice(0, mainClose) + block + shell.slice(mainClose);

  console.log("✅ offline banner + release watermark rendered");
}

const polishMarker = "/* NARA final visual polish */";

if (!css.includes(polishMarker)) {
  css += `

${polishMarker}
html {
  background: #050714;
  color-scheme: dark;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
}

body {
  min-height: 100dvh;
  overscroll-behavior-y: none;
  background:
    radial-gradient(circle at 82% 8%, rgba(109, 40, 217, 0.12), transparent 28rem),
    radial-gradient(circle at 10% 92%, rgba(8, 145, 178, 0.07), transparent 24rem),
    #050714;
}

::selection {
  background: rgba(139, 92, 246, 0.28);
  color: #ffffff;
}

* {
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.18) transparent;
}

*::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

*::-webkit-scrollbar-track {
  background: transparent;
}

*::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.16);
}

*::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.28);
}

button,
a,
input,
textarea,
select {
  -webkit-tap-highlight-color: transparent;
}

@supports (padding: max(0px)) {
  body {
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
  }
}
`;

  console.log("✅ global visual polish + mobile safe-area rules");
}

if (!manifest.includes('src: "/icon.svg"')) {
  const categoriesAnchor = 'categories: ["productivity", "utilities"],';

  if (!manifest.includes(categoriesAnchor)) {
    throw new Error("Manifest categories anchor not found.");
  }

  manifest = manifest.replace(
    categoriesAnchor,
    `${categoriesAnchor}
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],`,
  );

  console.log("✅ PWA manifest icon metadata");
}

packageJson.scripts = {
  ...packageJson.scripts,
  "deployment:doctor": "node scripts/deployment-doctor.mjs",
};

const preferredGates = [
  "format:check",
  "lint",
  "typecheck",
  "memory:eval",
  "knowledge:eval",
  "knowledge:citations",
  "personality:eval",
  "conversation:eval",
  "conversation:state",
  "ux:eval",
  "hardening:eval",
  "release:smoke",
  "deployment:doctor",
  "preflight",
  "build",
];

const available = preferredGates.filter((name) => packageJson.scripts[name]);

packageJson.scripts["release:check"] = available
  .map((name) => `pnpm ${name}`)
  .join(" && ");

fs.writeFileSync(shellPath, shell, "utf8");
fs.writeFileSync(cssPath, css, "utf8");
fs.writeFileSync(manifestPath, manifest, "utf8");
fs.writeFileSync(
  packagePath,
  `${JSON.stringify(packageJson, null, 2)}\n`,
  "utf8",
);

console.log("✅ deployment:doctor quality gate registered");
console.log(`✅ release:check rebuilt with ${available.length} gates`);
console.log("\n✅ Deployment + Visual Polish Mega Pack applied.\n");

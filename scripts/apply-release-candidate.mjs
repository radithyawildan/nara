import fs from "node:fs";

const shellPath = "features/chat/nara-shell.tsx";
const settingsPath = "features/settings/settings-hub.tsx";
const packagePath = "package.json";
const envExamplePath = ".env.example";

let shell = fs.readFileSync(shellPath, "utf8");
let settings = fs.readFileSync(settingsPath, "utf8");
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));

console.log("\n=== NARA Release Candidate Mega Pack ===\n");

if (!shell.includes("@/features/system/about-nara")) {
  const anchors = [
    'import { RuntimeStatus } from "@/features/system/runtime-status";',
    'import { SettingsHub } from "@/features/settings/settings-hub";',
  ];

  const anchor = anchors.find((candidate) => shell.includes(candidate));

  if (!anchor) {
    throw new Error("Could not find safe NaraShell import anchor.");
  }

  shell = shell.replace(
    anchor,
    `${anchor}\nimport { AboutNara } from "@/features/system/about-nara";`,
  );

  console.log("✅ About NARA import");
}

if (!shell.includes("aboutNaraOpen")) {
  const anchors = [
    "const [settingsHubOpen, setSettingsHubOpen] = useState(false);",
    "const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);",
  ];

  const anchor = anchors.find((candidate) => shell.includes(candidate));

  if (!anchor) {
    throw new Error("Could not find settings state anchor.");
  }

  shell = shell.replace(
    anchor,
    `${anchor}

  const [aboutNaraOpen, setAboutNaraOpen] = useState(false);`,
  );

  console.log("✅ About NARA state");
}

if (!settings.includes("onOpenAbout?: () => void;")) {
  settings = settings.replace(
    "  onOpenAccount?: () => void;",
    `  onOpenAccount?: () => void;
  onOpenAbout?: () => void;`,
  );

  settings = settings.replace(
    "  onOpenAccount,",
    `  onOpenAccount,
  onOpenAbout,`,
  );

  const quickActionsAnchor = `          <HubAction
            title="Quick actions"`;

  if (!settings.includes(quickActionsAnchor)) {
    throw new Error("Quick actions settings anchor not found.");
  }

  settings = settings.replace(
    quickActionsAnchor,
    `          <HubAction
            title="About NARA"
            description="Version, release channel, runtime readiness, and diagnostics."
            onClick={onOpenAbout ? () => launch(onOpenAbout) : undefined}
          />
${quickActionsAnchor}`,
  );

  console.log("✅ About NARA added to Control Center");
}

if (!shell.includes("onOpenAbout={() =>")) {
  const settingsStart = shell.indexOf("<SettingsHub");
  const settingsEnd =
    settingsStart === -1 ? -1 : shell.indexOf("/>", settingsStart);

  if (settingsStart === -1 || settingsEnd === -1) {
    throw new Error("SettingsHub render block not found.");
  }

  shell =
    shell.slice(0, settingsEnd) +
    `        onOpenAbout={() => {
          setAboutNaraOpen(true);
        }}
      ` +
    shell.slice(settingsEnd);

  console.log("✅ About NARA handler connected");
}

if (!shell.includes("<AboutNara")) {
  const mainClose = shell.lastIndexOf("</main>");

  if (mainClose === -1) {
    throw new Error("</main> not found.");
  }

  const block = `      <AboutNara
        open={aboutNaraOpen}
        onClose={() => setAboutNaraOpen(false)}
      />

`;

  shell = shell.slice(0, mainClose) + block + shell.slice(mainClose);

  console.log("✅ About NARA rendered");
}

let envExample = fs.existsSync(envExamplePath)
  ? fs.readFileSync(envExamplePath, "utf8")
  : "";

const envLines = [
  ["NEXT_PUBLIC_SITE_URL", ""],
  ["NEXT_PUBLIC_NARA_VERSION", "0.1.0-rc.1"],
  ["NEXT_PUBLIC_NARA_RELEASE_CHANNEL", "release-candidate"],
  ["NEXT_PUBLIC_GIT_SHA", ""],
  ["NEXT_PUBLIC_BUILD_TIME", ""],
];

for (const [key, value] of envLines) {
  if (!new RegExp(`^${key}=`, "m").test(envExample)) {
    envExample += `${envExample.endsWith("\n") || !envExample ? "" : "\n"}${key}=${value}\n`;
  }
}

fs.writeFileSync(envExamplePath, envExample, "utf8");

console.log("✅ release metadata env template");

packageJson.scripts = {
  ...packageJson.scripts,
  "release:smoke": "node scripts/release-smoke.mjs",
  "release:info": "node scripts/release-info.mjs",
};

if (
  !packageJson.scripts["conversation:state"] &&
  fs.existsSync("scripts/evaluate-conversation-state.ts")
) {
  packageJson.scripts["conversation:state"] =
    "tsx scripts/evaluate-conversation-state.ts";

  console.log("✅ conversation:state quality gate restored");
}

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
  "preflight",
  "build",
];

const available = preferredGates.filter((name) => packageJson.scripts[name]);

packageJson.scripts["release:check"] = available
  .map((name) => `pnpm ${name}`)
  .join(" && ");

fs.writeFileSync(shellPath, shell, "utf8");
fs.writeFileSync(settingsPath, settings, "utf8");
fs.writeFileSync(
  packagePath,
  `${JSON.stringify(packageJson, null, 2)}\n`,
  "utf8",
);

console.log(`✅ release:check rebuilt with ${available.length} gates`);
console.log(
  available.includes("conversation:state")
    ? "✅ conversation:state included in master release gate"
    : "⚠️ conversation:state script is not registered yet",
);

console.log("\n✅ Release Candidate Mega Pack applied.\n");

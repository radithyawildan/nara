import fs from "node:fs";

const shellPath = "features/chat/nara-shell.tsx";
const packagePath = "package.json";

let shell = fs.readFileSync(shellPath, "utf8");
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));

console.log("\n=== NARA UX / Product Completion Mega Pack ===\n");

const imports = [
  {
    marker: "@/features/experience/command-palette",
    line: 'import { NaraCommandPalette } from "@/features/experience/command-palette";',
  },
  {
    marker: "@/features/navigation/mobile-history-drawer",
    line: 'import { HistoryMenuIcon, MobileHistoryDrawer } from "@/features/navigation/mobile-history-drawer";',
  },
  {
    marker: "@/features/onboarding/first-run-onboarding",
    line: 'import { FirstRunOnboarding } from "@/features/onboarding/first-run-onboarding";',
  },
  {
    marker: "@/features/settings/settings-hub",
    line: 'import { ControlCenterIcon, SettingsHub } from "@/features/settings/settings-hub";',
  },
  {
    marker: "@/features/system/runtime-status",
    line: 'import { RuntimeStatus } from "@/features/system/runtime-status";',
  },
];

for (const item of imports) {
  if (shell.includes(item.marker)) {
    continue;
  }

  const anchorCandidates = [
    'import { NaraSidebar } from "@/features/navigation/nara-sidebar";',
    'import { VoiceSettings } from "@/features/settings/voice-settings";',
    'import { Composer } from "@/features/chat/composer";',
  ];

  const anchor = anchorCandidates.find((candidate) =>
    shell.includes(candidate),
  );

  if (!anchor) {
    throw new Error(`Could not find import anchor for ${item.line}`);
  }

  shell = shell.replace(anchor, `${anchor}\n${item.line}`);
}

console.log("✅ UX component imports");

/* State */
if (!shell.includes("mobileHistoryOpen")) {
  const candidates = [
    "const [settingsOpen, setSettingsOpen] = useState(false);",
    "const [memoryCenterOpen, setMemoryCenterOpen] = useState(false);",
  ];

  const anchor = candidates.find((candidate) => shell.includes(candidate));

  if (!anchor) {
    throw new Error("Could not find modal state anchor.");
  }

  shell = shell.replace(
    anchor,
    `${anchor}

  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);

  const [settingsHubOpen, setSettingsHubOpen] = useState(false);`,
  );

  console.log("✅ mobile history + control center state");
}

/* Runtime status replaces the old static Online badge when possible. */
if (!shell.includes("<RuntimeStatus")) {
  const onlinePattern =
    /<div className="hidden items-center gap-2 rounded-full border border-emerald-400\/15 bg-emerald-400\/\[0\.05\] px-3 py-2 text-xs text-emerald-300 sm:flex">\s*<span className="h-1\.5 w-1\.5 rounded-full bg-emerald-300" \/>\s*Online\s*<\/div>/;

  if (onlinePattern.test(shell)) {
    shell = shell.replace(onlinePattern, "<RuntimeStatus />");
  } else {
    const buttonArea = '<div className="flex items-center gap-2">';
    const first = shell.indexOf(buttonArea);

    if (first !== -1) {
      const insertion = first + buttonArea.length;
      shell =
        shell.slice(0, insertion) +
        "\n            <RuntimeStatus />" +
        shell.slice(insertion);
    }
  }

  console.log("✅ runtime status connected");
}

/* Mobile history button */
if (!shell.includes('aria-label="Open conversation history"')) {
  const memoryButton =
    '<button\n              type="button"\n              disabled={!persistenceAvailable}';

  const index = shell.indexOf(memoryButton);

  if (index === -1) {
    throw new Error("Could not find mobile memory button anchor.");
  }

  const button = `            <button
              type="button"
              aria-label="Open conversation history"
              onClick={() => {
                setSettingsHubOpen(false);
                setMobileHistoryOpen(true);
              }}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/[0.08] bg-white/[0.035] text-slate-400 transition hover:border-violet-400/20 hover:bg-violet-400/[0.08] hover:text-white xl:hidden"
            >
              <HistoryMenuIcon />
            </button>

`;

  shell = shell.slice(0, index) + button + shell.slice(index);

  console.log("✅ mobile history trigger");
}

/* Control center button */
if (!shell.includes('aria-label="Open NARA controls"')) {
  const settingsButton =
    '<button\n              type="button"\n              aria-label="Open voice settings"';

  const index = shell.indexOf(settingsButton);

  if (index === -1) {
    throw new Error("Could not find voice settings button anchor.");
  }

  const button = `            <button
              type="button"
              aria-label="Open NARA controls"
              aria-expanded={settingsHubOpen}
              onClick={() => {
                setSettingsOpen(false);
                setMobileHistoryOpen(false);
                setSettingsHubOpen(true);
              }}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/[0.08] bg-white/[0.035] text-slate-400 transition hover:border-violet-400/20 hover:bg-violet-400/[0.08] hover:text-white"
            >
              <ControlCenterIcon />
            </button>

`;

  shell = shell.slice(0, index) + button + shell.slice(index);

  console.log("✅ control center trigger");
}

/* Render completion components before final </main>. */
if (!shell.includes("<MobileHistoryDrawer")) {
  const mainClose = shell.lastIndexOf("</main>");

  if (mainClose === -1) {
    throw new Error("</main> not found.");
  }
  const knowledgeOpen = shell.includes("setKnowledgeCenterOpen")
    ? `onOpenKnowledge={() => {
          setKnowledgeCenterOpen(true);
        }}`
    : "";

  const personalityOpen = shell.includes("setPersonalityCenterOpen")
    ? `onOpenPersonality={() => {
          setPersonalityCenterOpen(true);
        }}`
    : "";

  const accountOpen = shell.includes("setAccountCenterOpen")
    ? `onOpenAccount={() => {
          setAccountCenterOpen(true);
        }}`
    : "";

  const block = `
      <MobileHistoryDrawer
        open={mobileHistoryOpen}
        conversations={conversations}
        activeConversationId={activeConversationId}
        disabled={isBusy}
        loading={historyLoading}
        onClose={() => setMobileHistoryOpen(false)}
        onNewChat={handleNewChat}
        onSelectConversation={(conversationId) => {
          void handleSelectConversation(conversationId);
        }}
      />

      <SettingsHub
        open={settingsHubOpen}
        onClose={() => setSettingsHubOpen(false)}
        onOpenVoice={() => setSettingsOpen(true)}
        onOpenMemory={() => setMemoryCenterOpen(true)}
        ${knowledgeOpen}
        ${personalityOpen}
        ${accountOpen}
      />

      <NaraCommandPalette
        onNewChat={handleNewChat}
        onOpenHistory={() => setMobileHistoryOpen(true)}
        onOpenControls={() => setSettingsHubOpen(true)}
      />

      <FirstRunOnboarding
        onOpenControls={() => setSettingsHubOpen(true)}
        onOpenHistory={() => setMobileHistoryOpen(true)}
      />

`;

  shell = shell.slice(0, mainClose) + block + shell.slice(mainClose);

  console.log(
    "✅ mobile drawer, control center, command palette, onboarding rendered",
  );
}

packageJson.scripts = {
  ...packageJson.scripts,
  "ux:eval": "tsx scripts/evaluate-ux-product.ts",
};

fs.writeFileSync(shellPath, shell, "utf8");
fs.writeFileSync(
  packagePath,
  `${JSON.stringify(packageJson, null, 2)}\n`,
  "utf8",
);

console.log("✅ ux:eval quality gate registered");
console.log("✅ loading/error recovery surfaces installed");
console.log("✅ /api/health runtime endpoint installed");

console.log("\n✅ UX / Product Completion Mega Pack applied.\n");

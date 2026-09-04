import fs from "node:fs";

const path = "features/chat/nara-shell.tsx";
let source = fs.readFileSync(path, "utf8");

console.log("\n=== NARA Account & Identity v1 ===\n");

if (!source.includes('from "@/features/account/account-center"')) {
  const candidates = [
    'import { NaraAvatar } from "@/features/avatar/nara-avatar";',
    'import { NaraSidebar } from "@/features/navigation/nara-sidebar";',
  ];

  const anchor = candidates.find((candidate) => source.includes(candidate));

  if (!anchor) {
    throw new Error("Could not find a safe component import anchor.");
  }

  source = source.replace(
    anchor,
    `${anchor}\nimport { AccountCenter } from "@/features/account/account-center";`,
  );

  console.log("✅ AccountCenter import");
}

if (!source.includes("const [accountCenterOpen")) {
  const anchor =
    "  const [memoryCenterOpen, setMemoryCenterOpen] = useState(false);";

  if (!source.includes(anchor)) {
    throw new Error("Could not find memoryCenterOpen state anchor.");
  }

  source = source.replace(
    anchor,
    `${anchor}\n\n  const [accountCenterOpen, setAccountCenterOpen] = useState(false);`,
  );

  console.log("✅ account center state");
}

if (!source.includes("function AccountIcon()")) {
  const anchor = "function MemoryIcon() {";
  const start = source.indexOf(anchor);

  if (start === -1) {
    throw new Error("Could not find MemoryIcon function.");
  }

  const nextImport = source.indexOf("import type", start);
  const nextExport = source.indexOf("export function NaraShell", start);
  const insertionPoint = nextImport !== -1 ? nextImport : nextExport;

  if (insertionPoint === -1) {
    throw new Error("Could not find icon insertion point.");
  }

  const icon = `function AccountIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}

`;

  source =
    source.slice(0, insertionPoint) + icon + source.slice(insertionPoint);
  console.log("✅ Account icon");
}

if (!source.includes('aria-label="Open account center"')) {
  const settingsButton =
    '<button\n              type="button"\n              aria-label="Open voice settings"';
  const literalIndex = source.indexOf(settingsButton.replaceAll("\\n", "\n"));

  let insertionPoint = literalIndex;

  if (insertionPoint === -1) {
    insertionPoint = source.indexOf('aria-label="Open voice settings"');
    if (insertionPoint !== -1) {
      insertionPoint = source.lastIndexOf("<button", insertionPoint);
    }
  }

  if (insertionPoint === -1) {
    throw new Error("Could not find voice settings button anchor.");
  }

  const button = `            <button
              type="button"
              aria-label="Open account center"
              aria-expanded={accountCenterOpen}
              onClick={() => {
                setSettingsOpen(false);
                setMemoryCenterOpen(false);
                setAccountCenterOpen(true);
              }}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/[0.08] bg-white/[0.035] text-slate-400 transition hover:border-violet-400/20 hover:bg-violet-400/[0.08] hover:text-white"
            >
              <AccountIcon />
            </button>

`;

  source =
    source.slice(0, insertionPoint) + button + source.slice(insertionPoint);
  console.log("✅ Account header button");
}

source = source.replaceAll(
  "setMemoryCenterOpen(true);",
  "setAccountCenterOpen(false);\n\n                setMemoryCenterOpen(true);",
);

source = source.replaceAll(
  "setSettingsOpen((current) => !current);",
  "setAccountCenterOpen(false);\n\n                setSettingsOpen((current) => !current);",
);

if (!source.includes("<AccountCenter")) {
  const memoryCenterIndex = source.lastIndexOf("<MemoryCenter");

  if (memoryCenterIndex === -1) {
    throw new Error("Could not find MemoryCenter render anchor.");
  }

  const component = `      <AccountCenter
        open={accountCenterOpen}
        onClose={() => setAccountCenterOpen(false)}
      />

`;

  source =
    source.slice(0, memoryCenterIndex) +
    component +
    source.slice(memoryCenterIndex);
  console.log("✅ AccountCenter rendered");
}

fs.writeFileSync(path, source, "utf8");
console.log("\n✅ Account & Identity v1 patch applied.\n");

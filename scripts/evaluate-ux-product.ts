import {
  NARA_SHORTCUTS,
  type NaraShortcutId,
} from "../lib/experience/shortcuts";

let passed = 0;
let total = 0;

function check(name: string, success: boolean, detail: string) {
  total += 1;

  if (success) {
    passed += 1;
  }

  console.log(`${success ? "✅" : "❌"} ${name}`);
  console.log(`   ${detail}\n`);
}

console.log("\n=== NARA UX / PRODUCT COMPLETION EVALUATION ===\n");

const required: NaraShortcutId[] = [
  "palette",
  "new-chat",
  "history",
  "controls",
];

const ids = NARA_SHORTCUTS.map((shortcut) => shortcut.id);

check(
  "All core keyboard actions are registered",
  required.every((id) => ids.includes(id)),
  ids.join(", "),
);

check(
  "Shortcut ids are unique",
  new Set(ids).size === ids.length,
  `unique=${new Set(ids).size}, total=${ids.length}`,
);

check(
  "Every shortcut has visible key guidance",
  NARA_SHORTCUTS.every(
    (shortcut) => shortcut.keys.length > 0 && shortcut.label.length > 0,
  ),
  NARA_SHORTCUTS.map(
    (shortcut) => `${shortcut.label}: ${shortcut.keys.join("+")}`,
  ).join(" | "),
);

const percentage = Math.round((passed / total) * 100);

console.log("========================================");
console.log(`Result: ${passed}/${total} passed (${percentage}%)`);
console.log("========================================\n");

if (passed !== total) {
  console.error("❌ NARA UX completion quality gate failed.");
  process.exit(1);
}

console.log("✅ NARA UX completion passed the quality gate.");

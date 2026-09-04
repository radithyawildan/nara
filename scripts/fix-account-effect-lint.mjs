import fs from "node:fs";

const accountPath = "features/account/account-center.tsx";
const shellPath = "features/chat/nara-shell.tsx";

let account = fs.readFileSync(accountPath, "utf8");
let shell = fs.readFileSync(shellPath, "utf8");

console.log("\n=== NARA React 19 Effect Cleanup ===\n");

/*
 * 1. Account recovery mode.
 *
 * Before:
 * setRecoveryMode(params.get("account") === "recovery");
 *
 * Defer it to a microtask so it is no longer a synchronous
 * state update directly inside the effect body.
 */
const recoveryOld =
  '    setRecoveryMode(params.get("account") === "recovery");';

const recoveryNew = `    queueMicrotask(() => {
      setRecoveryMode(
        params.get("account") === "recovery",
      );
    });`;

if (account.includes(recoveryOld)) {
  account = account.replace(recoveryOld, recoveryNew);

  console.log("✅ recovery effect made asynchronous");
} else {
  console.log("ℹ️ recovery state anchor already changed");
}

/*
 * 2. Clear ephemeral Account Center messages when closed.
 *
 * Before:
 * useEffect(() => {
 *   if (!open) {
 *     setError(null);
 *     setNotice(null);
 *   }
 * }, [open]);
 *
 * Keep the behavior, but defer the state reset.
 */
const closeEffectPattern =
  /useEffect\(\(\) => \{\s*if \(!open\) \{\s*setError\(null\);\s*setNotice\(null\);\s*\}\s*\}, \[open\]\);/;

if (closeEffectPattern.test(account)) {
  account = account.replace(
    closeEffectPattern,
    `useEffect(() => {
    if (!open) {
      queueMicrotask(() => {
        setError(null);
        setNotice(null);
      });
    }
  }, [open]);`,
  );

  console.log("✅ account close reset made asynchronous");
} else {
  console.log("ℹ️ account close effect anchor already changed");
}

/*
 * 3. Recovery deep-link opening in NaraShell.
 *
 * React lint dislikes three synchronous setState calls
 * directly inside the mount effect.
 */
const shellRecoveryPattern =
  /(\s*)setSettingsOpen\(false\);\s*setMemoryCenterOpen\(false\);\s*setAccountCenterOpen\(true\);/;

if (shellRecoveryPattern.test(shell)) {
  shell = shell.replace(
    shellRecoveryPattern,
    (_, indent) =>
      `${indent}queueMicrotask(() => {
${indent}  setSettingsOpen(false);
${indent}  setMemoryCenterOpen(false);
${indent}  setAccountCenterOpen(true);
${indent}});`,
  );

  console.log("✅ recovery deep-link UI transition deferred");
} else {
  console.log("ℹ️ shell recovery anchor already changed");
}

fs.writeFileSync(accountPath, account, "utf8");
fs.writeFileSync(shellPath, shell, "utf8");

console.log("\n✅ React 19 effect cleanup complete.\n");

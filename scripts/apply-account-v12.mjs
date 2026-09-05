import fs from "node:fs";

const clientPath = "lib/account/client.ts";
const centerPath = "features/account/account-center.tsx";

let client = fs.readFileSync(clientPath, "utf8");
let center = fs.readFileSync(centerPath, "utf8");

console.log("\n=== NARA Account & Identity v1.2 ===\n");

function updateNamedImport(source, moduleName, additions, removals = []) {
  const pattern = new RegExp(
    `import\\s*\\{([\\s\\S]*?)\\}\\s*from\\s*"${moduleName.replaceAll("/", "\\/")}";`,
  );

  const match = source.match(pattern);

  if (!match) {
    throw new Error(`Import block not found: ${moduleName}`);
  }

  const names = match[1]
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
    .filter((name) => !removals.includes(name));

  for (const addition of additions) {
    if (!names.includes(addition)) {
      names.push(addition);
    }
  }

  return source.replace(
    pattern,
    `import {\n  ${names.join(",\n  ")},\n} from "${moduleName}";`,
  );
}

if (!client.includes("mergeTemporaryAccountIntoExisting")) {
  client += `

interface AccountSwitchResponse {
  accessToken?: string;
  refreshToken?: string;
  error?: string;
  cleanupWarning?: string | null;
}

async function switchTemporaryAccount(
  email: string,
  password: string,
  mode: "merge" | "discard",
) {
  const supabase = getClient();

  const response = await fetch("/api/account/merge", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
      confirmation: "MERGE",
      mode,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | AccountSwitchResponse
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Could not switch NARA accounts.");
  }

  if (!payload?.accessToken || !payload.refreshToken) {
    throw new Error("The destination account session was not returned.");
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: payload.accessToken,
    refresh_token: payload.refreshToken,
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error("The destination NARA account could not be activated.");
  }

  if (payload.cleanupWarning) {
    console.warn("[NARA] Account switch cleanup warning:", payload.cleanupWarning);
  }

  return toAccountState(data.user);
}

export async function mergeTemporaryAccountIntoExisting(
  email: string,
  password: string,
) {
  return switchTemporaryAccount(email, password, "merge");
}

export async function discardTemporaryAccountAndSignIn(
  email: string,
  password: string,
) {
  return switchTemporaryAccount(email, password, "discard");
}

export async function deleteNaraAccount(password: string) {
  const supabase = getClient();

  const response = await fetch("/api/account/delete", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      confirmation: "DELETE",
      password,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Could not delete the NARA account.");
  }

  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
}
`;

  console.log("✅ secure merge/delete account client actions added");
} else {
  console.log("✅ account client actions already installed");
}

center = updateNamedImport(
  center,
  "@/lib/account/client",
  [
    "deleteNaraAccount",
    "discardTemporaryAccountAndSignIn",
    "mergeTemporaryAccountIntoExisting",
  ],
  ["signInToExistingAccount"],
);

center = center.replace(
  'type PersistentPanel = "profile" | "security" | "sessions";',
  'type PersistentPanel = "profile" | "security" | "sessions" | "danger";',
);

if (!center.includes("const [deletePassword")) {
  const anchor =
    '  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");';

  if (!center.includes(anchor)) {
    throw new Error("Password state anchor not found in AccountCenter.");
  }

  center = center.replace(
    anchor,
    `${anchor}\n\n  const [deletePassword, setDeletePassword] = useState("");\n  const [deleteConfirmation, setDeleteConfirmation] = useState("");`,
  );

  console.log("✅ account deletion confirmation state added");
}

const existingSignInPattern =
  /  async function submitExistingSignIn\([\s\S]*?\n  async function handlePasswordRecoveryRequest\(\) \{/;

if (!center.includes("mergeTemporaryAccountIntoExisting(email")) {
  if (!existingSignInPattern.test(center)) {
    throw new Error("Existing-account submit handler anchor not found.");
  }

  center = center.replace(
    existingSignInPattern,
    `  async function submitExistingSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();
    setPending(true);

    try {
      await mergeTemporaryAccountIntoExisting(email, signInPassword);
      setNotice("Temporary data merged. Loading your persistent account...");
      window.setTimeout(() => window.location.reload(), 450);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not merge into the existing account.",
      );
    } finally {
      setPending(false);
    }
  }

  async function handleDiscardAndSignIn() {
    resetMessages();
    setPending(true);

    try {
      await discardTemporaryAccountAndSignIn(email, signInPassword);
      setNotice("Temporary data discarded. Loading your existing account...");
      window.setTimeout(() => window.location.reload(), 450);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not discard the temporary account.",
      );
    } finally {
      setPending(false);
    }
  }

  async function handlePasswordRecoveryRequest() {`,
  );

  console.log("✅ anonymous-to-existing merge flow installed");
}

if (!center.includes("async function handleDeleteAccount()")) {
  const returnAnchor = '  return (\n    <div className="fixed inset-0';
  const returnIndex = center.indexOf(returnAnchor.replace("\\n", "\n"));

  if (returnIndex === -1) {
    throw new Error("AccountCenter return anchor not found.");
  }

  const handler = `  async function handleDeleteAccount() {
    resetMessages();

    if (deleteConfirmation !== "DELETE") {
      setError('Type "DELETE" exactly to confirm account deletion.');
      return;
    }

    setPending(true);

    try {
      await deleteNaraAccount(deletePassword);
      window.location.reload();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not delete the NARA account.",
      );
      setPending(false);
    }
  }

`;

  center = center.slice(0, returnIndex) + handler + center.slice(returnIndex);
  console.log("✅ secure account deletion handler added");
}

center = center.replace("Identity v1.1", "Identity v1.2");
center = center.replace(
  "Recovery, password security, and cross-device session controls.",
  "Account merge, recovery, session security, and permanent deletion.",
);

center = center.replace(
  "Signing in switches away from this temporary identity. Identity v1.1 still does not merge two different user IDs.",
  "Merge keeps this temporary account's conversations, memories, knowledge vectors, citations, and private files before switching to the existing account.",
);

center = center.replace(
  "<PrimaryButton pending={pending}>Sign in</PrimaryButton>",
  "<PrimaryButton pending={pending}>Merge & sign in</PrimaryButton>",
);

if (!center.includes("Discard temporary data & sign in")) {
  const forgotAnchor = `                  <button
                    type="button"
                    disabled={pending || !email.trim()}
                    onClick={() => void handlePasswordRecoveryRequest()}`;

  if (!center.includes(forgotAnchor)) {
    throw new Error("Forgot-password button anchor not found.");
  }

  const secondary = `                  <button
                    type="button"
                    disabled={
                      pending || !email.trim() || !signInPassword
                    }
                    onClick={() => void handleDiscardAndSignIn()}
                    className="w-full rounded-xl border border-white/[0.06] px-3 py-2 text-[10px] text-slate-500 transition hover:bg-white/[0.03] hover:text-slate-200 disabled:opacity-30"
                  >
                    Discard temporary data & sign in
                  </button>

`;

  center = center.replace(forgotAnchor, secondary + forgotAnchor);
  console.log("✅ explicit discard-vs-merge choice added");
}

center = center.replace(
  '(["profile", "security", "sessions"] as const)',
  '(["profile", "security", "sessions", "danger"] as const)',
);

center = center.replace(
  `                          {panel === "profile"
                            ? "Profile"
                            : panel === "security"
                              ? "Security"
                              : "Sessions"}`,
  `                          {panel === "profile"
                            ? "Profile"
                            : panel === "security"
                              ? "Security"
                              : panel === "sessions"
                                ? "Sessions"
                                : "Danger"}`,
);

if (!center.includes("Delete NARA account")) {
  const userIdAnchor = `              <div className="mt-4 rounded-2xl border border-white/[0.06] bg-black/10 p-4">
                <p className="text-[9px] leading-4 text-slate-600">User ID</p>`;

  if (!center.includes(userIdAnchor)) {
    throw new Error("User ID card anchor not found.");
  }

  const dangerPanel = `              {persistentPanel === "danger" && !recoveryMode && (
                <div className="mt-4 space-y-3 rounded-2xl border border-red-400/15 bg-red-400/[0.035] p-4">
                  <div>
                    <p className="text-xs font-medium text-red-200">
                      Delete NARA account
                    </p>
                    <p className="mt-1 text-[9px] leading-4 text-red-200/55">
                      Permanently removes conversations, messages, long-term
                      memories, knowledge chunks, citations, private source
                      files, and this authentication identity. This action
                      cannot be undone.
                    </p>
                  </div>

                  <FieldLabel>Current password</FieldLabel>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={deletePassword}
                    onChange={(event) => setDeletePassword(event.target.value)}
                    className={inputClassName}
                  />

                  <FieldLabel>Type DELETE to confirm</FieldLabel>
                  <input
                    value={deleteConfirmation}
                    onChange={(event) =>
                      setDeleteConfirmation(event.target.value)
                    }
                    placeholder="DELETE"
                    className={inputClassName}
                  />

                  <button
                    type="button"
                    disabled={
                      pending ||
                      !deletePassword ||
                      deleteConfirmation !== "DELETE"
                    }
                    onClick={() => void handleDeleteAccount()}
                    className="w-full rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2.5 text-xs font-medium text-red-200 transition hover:bg-red-500/18 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    {pending ? "Deleting..." : "Delete account permanently"}
                  </button>
                </div>
              )}

`;

  center = center.replace(userIdAnchor, dangerPanel + userIdAnchor);
  console.log("✅ permanent account danger zone added");
}

fs.writeFileSync(clientPath, client, "utf8");
fs.writeFileSync(centerPath, center, "utf8");

console.log("\n✅ Account & Identity v1.2 patch applied.\n");

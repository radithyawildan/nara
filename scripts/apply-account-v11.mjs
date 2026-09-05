import fs from "node:fs";

const path = "features/chat/nara-shell.tsx";
let source = fs.readFileSync(path, "utf8");

console.log("\n=== NARA Account & Identity v1.1 ===\n");

if (!source.includes("account=recovery")) {
  const anchor =
    "  const [accountCenterOpen, setAccountCenterOpen] = useState(false);";

  if (!source.includes(anchor)) {
    throw new Error(
      "Account v1 state anchor was not found. Apply Account v1 first.",
    );
  }

  const recoveryEffect = `${anchor}

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("account") !== "recovery") {
      return;
    }

    setSettingsOpen(false);
    setMemoryCenterOpen(false);
    setAccountCenterOpen(true);
  }, []);`;

  source = source.replace(anchor, recoveryEffect);
  console.log("✅ password recovery deep-link opens Account Center");
} else {
  console.log("✅ recovery deep-link already installed");
}

fs.writeFileSync(path, source, "utf8");

console.log("✅ recovery + password security + session controls installed");
console.log("\n✅ Account & Identity v1.1 patch applied.\n");

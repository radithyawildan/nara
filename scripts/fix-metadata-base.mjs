import fs from "node:fs";

const path = "app/layout.tsx";
let source = fs.readFileSync(path, "utf8");

if (!source.includes("metadataBase:")) {
  const anchor = "export const metadata: Metadata = {";

  if (!source.includes(anchor)) {
    throw new Error("Metadata export anchor not found.");
  }

  source = source.replace(
    anchor,
    `${anchor}
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),`,
  );

  fs.writeFileSync(path, source, "utf8");

  console.log("✅ metadataBase added");
} else {
  console.log("✅ metadataBase already present");
}

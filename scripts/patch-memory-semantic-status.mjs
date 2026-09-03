import fs from "node:fs";

const path = "features/memory/memory-center.tsx";

let source = fs.readFileSync(path, "utf8");

console.log("\n=== NARA Semantic Status UI Patch ===\n");

if (source.includes("Semantic ready")) {
  console.log("✅ Semantic status UI already present");

  process.exit(0);
}

const pattern =
  /<span className="text-\[10px\] text-slate-700">\s*\{memory\.isEnabled\s*\?\s*"Used when relevant"\s*:\s*"Currently disabled"\}\s*<\/span>/;

if (!pattern.test(source)) {
  console.error("❌ Memory status footer anchor not found.");

  process.exit(1);
}

source = source.replace(
  pattern,
  `<div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[10px] text-slate-700">
                                    {memory.isEnabled
                                      ? "Used when relevant"
                                      : "Currently disabled"}
                                  </span>

                                  <span
                                    className={\`rounded-full border px-2 py-0.5 text-[9px] \${
                                      memory.semanticReady
                                        ? "border-cyan-400/15 bg-cyan-400/[0.05] text-cyan-300/70"
                                        : "border-amber-400/15 bg-amber-400/[0.05] text-amber-300/70"
                                    }\`}
                                    title={
                                      memory.embeddingModel ??
                                      "Embedding pending"
                                    }
                                  >
                                    {memory.semanticReady
                                      ? "Semantic ready"
                                      : "Semantic pending"}
                                  </span>
                                </div>`,
);

fs.writeFileSync(path, source, "utf8");

console.log("✅ Semantic readiness badge added");

console.log("\n✅ Memory Center semantic status patch applied.\n");

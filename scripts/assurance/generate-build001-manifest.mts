import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { build001EvidenceSource } from "../../assurance/build-001-evidence-source.mts";
import { AssuranceManifestSourceSchema, createAssuranceManifest } from "../../src/assurance/development-evidence.mts";

const outputPath = resolve("assurance/build-001-evidence-manifest.json");
const source = AssuranceManifestSourceSchema.parse(build001EvidenceSource);
const serialized = `${JSON.stringify(createAssuranceManifest(source), null, 2)}\n`;

if (process.argv.includes("--check")) {
  const current = readFileSync(outputPath, "utf8");
  if (current !== serialized) {
    console.error("BUILD 001 assurance manifest is stale. Run pnpm assurance:manifest.");
    process.exitCode = 1;
  } else {
    console.log("BUILD 001 assurance manifest is current.");
  }
} else {
  writeFileSync(outputPath, serialized, "utf8");
  console.log(`Wrote ${outputPath}`);
}

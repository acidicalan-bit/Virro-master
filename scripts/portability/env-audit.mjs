import fs from "node:fs";

const inventoryPath = "scripts/portability/environment-contract.json";
const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
const source = fs.readFileSync(".env.example", "utf8");
const names = [...source.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((match) => match[1]);
const byName = new Map(inventory.variables.map((row) => [row.name, row]));
const missingFromInventory = names.filter((name) => !byName.has(name));
const missingRequired = inventory.variables.filter((row) => !row.optional && !names.includes(row.name)).map((row) => row.name);

console.log(JSON.stringify({
  authority: inventoryPath,
  variables: names.map((name) => ({ ...byName.get(name), value: undefined })),
  values: "omitted",
  nextPublic: inventory.variables.filter((row) => row.classification === "BUILD_TIME_PUBLIC"),
  missingFromInventory,
  missingRequired,
  ENVIRONMENT_CONTRACT_RATCHET: missingFromInventory.length || missingRequired.length ? "FAIL" : "PASS",
}, null, 2));

if (missingFromInventory.length || missingRequired.length) process.exitCode = 1;

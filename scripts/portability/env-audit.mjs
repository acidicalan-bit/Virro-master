import fs from "node:fs";

const source = fs.readFileSync(".env.example", "utf8");
const names = [...source.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((match) => match[1]);
const classify = (name) => {
  if (name.startsWith("NEXT_PUBLIC_")) return "BUILD_TIME_PUBLIC";
  if (name.includes("ANON")) return "RUNTIME_PUBLIC";
  if (name === "FIELD_BETA_CONTROLLED_EXECUTOR") return "TEST_ONLY";
  if (/KEY|SECRET|TOKEN|PASSWORD/.test(name) && !name.includes("MODEL")) return "RUNTIME_SECRET";
  if (/PROVIDER|BASE_URL|MODEL|VERSION|ENABLED|SAMPLING_RATE|ROUTES/.test(name)) return "RUNTIME_SERVER_CONFIG";
  return "RUNTIME_SERVER_CONFIG";
};
const rows = names.map((name) => ({ name, class: classify(name) }));
console.log(JSON.stringify({ variables: rows, values: "omitted", nextPublic: rows.filter((row) => row.name.startsWith("NEXT_PUBLIC_")) }, null, 2));

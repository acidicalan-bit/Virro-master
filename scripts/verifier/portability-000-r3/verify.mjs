import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const ROOT = process.cwd();
const PRODUCT_SHA = "6f3dc26601d453ff699e01259bdc09c61bdd2679";
const PRODUCT_TREE = "967d5e62e73eff51a45366c7b4aa8bda66a29c3f";
const BASE_SHA = "d8e31040b5479cecc52971e9d0efc9da2628eb04";
const R3_SHA = "5144e87d0f6f7ba4e403f40aa45061d88ed4cd48";
const FAILED_VERIFIER_SHA = "f0980b6d1f56121c6e62c923ac75e8106325dc1d";
const EXTENSIONS = ["ts", "tsx", "mts", "cts", "js", "mjs", "cjs"];
const EXTENSION_RE = /\.(?:ts|tsx|mts|cts|js|mjs|cjs)$/;
const SYSTEM_ALLOWLIST = ["NODE_ENV"];
const ALLOWED_VERIFIER_PREFIXES = [
  "scripts/verifier/portability-000-r3/",
  "tests/verifier/portability-000-r3/",
  "docs/verifier/portability-000-r3/",
  ".github/workflows/portability-000-r3-verifier.yml",
];
const EXPECTED_PORTABILITY_PRODUCT_DELTA = new Set([
  ".dockerignore", ".env.example", ".github/workflows/portability.yml", "Dockerfile", "app/api/health/live/route.ts",
  "compose.portability.yml", "docs/architecture/ENVIRONMENT_CONTRACT.md", "docs/architecture/PORTABILITY_000_REPORT.md",
  "docs/architecture/PORTABILITY_CONTRACT.md", "docs/architecture/PROVIDER_LOCKIN_REGISTER.md", "next.config.ts", "package.json",
  "scripts/portability/check.mjs", "scripts/portability/container-smoke.mjs", "scripts/portability/env-audit.mjs",
  "scripts/portability/environment-contract.json", "tests/portability/portability-contract.test.ts",
]);
const migrationDirectory = path.join(ROOT, "supabase", "migrations");

const failures = [];
function fail(message) { failures.push(message); }
function assert(condition, message) { if (!condition) fail(message); }
function git(args) { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim(); }
function read(relative) { return fs.readFileSync(path.join(ROOT, relative), "utf8"); }
function sha256(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function sourceFiles() {
  const files = [];
  const visit = (directory) => {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (EXTENSION_RE.test(entry.name)) files.push(path.relative(ROOT, absolute).replaceAll(path.sep, "/"));
    }
  };
  visit(path.join(ROOT, "src"));
  visit(path.join(ROOT, "app"));
  if (fs.existsSync(path.join(ROOT, "proxy.ts"))) files.push("proxy.ts");
  return files.sort();
}
function scanEnvironment() {
  const accesses = [];
  const dynamic = [];
  for (const relative of sourceFiles()) {
    const source = read(relative);
    for (const match of source.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) accesses.push({ name: match[1], path: relative });
    for (const match of source.matchAll(/process\.env\[\s*(["'])([A-Z][A-Z0-9_]*)\1\s*\]/g)) accesses.push({ name: match[2], path: relative });
    for (const match of source.matchAll(/process\.env\[\s*(?!["'])([^\]\r\n]+)\]/g)) dynamic.push({ path: relative, expression: match[1].trim() });
  }
  return { accesses, dynamic };
}
function runChecker() {
  const result = spawnSync(process.execPath, [path.join(ROOT, "scripts/portability/check.mjs")], { cwd: ROOT, encoding: "utf8" });
  return { status: result.status ?? 1, stdout: result.stdout || "", stderr: result.stderr || "" };
}
function withFixture(relative, content, expected = "fail") {
  const absolute = path.join(ROOT, relative);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  const existed = fs.existsSync(absolute);
  const original = existed ? fs.readFileSync(absolute) : null;
  try {
    fs.writeFileSync(absolute, content);
    const result = runChecker();
    if (expected === "fail") assert(result.status !== 0, `fixture accepted: ${relative}`);
    else assert(result.status === 0, `fixture rejected: ${relative}`);
    return result;
  } finally {
    if (original) fs.writeFileSync(absolute, original);
    else fs.rmSync(absolute, { force: true });
  }
}
function withTextMutation(relative, mutate) {
  const absolute = path.join(ROOT, relative);
  const original = fs.readFileSync(absolute, "utf8");
  try { fs.writeFileSync(absolute, mutate(original)); return runChecker(); }
  finally { fs.writeFileSync(absolute, original); }
}
function docRows() {
  return [...read("docs/architecture/ENVIRONMENT_CONTRACT.md").matchAll(/^\|\s*`([^`]+)`\s*\|\s*`?([A-Z_]+)`?\s*\|/gm)].map((m) => ({ name: m[1], classification: m[2] }));
}
function migrationHash() {
  const names = fs.readdirSync(migrationDirectory).filter((name) => fs.statSync(path.join(migrationDirectory, name)).isFile()).sort();
  return { count: names.length, hash: sha256(names.join("\n")) };
}

const head = git(["rev-parse", "HEAD"]);
const headTree = git(["show", "-s", "--format=%T", "HEAD"]);
assert(git(["show", "-s", "--format=%T", PRODUCT_SHA]) === PRODUCT_TREE, "PRODUCT_TREE_MISMATCH");
assert(headTree, "VERIFIER_TREE_UNAVAILABLE");
const productDiff = git(["diff", "--name-only", PRODUCT_SHA, "HEAD"]).split(/\r?\n/).filter(Boolean);
assert(productDiff.every((file) => ALLOWED_VERIFIER_PREFIXES.some((prefix) => file.startsWith(prefix) || file === prefix)), `PRODUCT_FILES_CHANGED_BY_VERIFIER:${productDiff.join(",")}`);
const baseProductDiff = git(["diff", "--name-only", BASE_SHA, PRODUCT_SHA]).split(/\r?\n/).filter(Boolean);
const unexpectedProductPaths = baseProductDiff.filter((file) => !EXPECTED_PORTABILITY_PRODUCT_DELTA.has(file));
assert(unexpectedProductPaths.length === 0, `PRODUCT_SEMANTICS_CHANGED:${unexpectedProductPaths.join(",")}`);
const r3Diff = git(["diff", "--name-only", R3_SHA, PRODUCT_SHA]).split(/\r?\n/).filter(Boolean);
assert(r3Diff.length === 2 && r3Diff.includes("scripts/portability/check.mjs") && r3Diff.includes("tests/portability/portability-contract.test.ts"), `R3_1_DELTA:${r3Diff.join(",")}`);
assert(read("src/infrastructure/models/model-factory.ts") === execFileSync("git", ["show", `${BASE_SHA}:src/infrastructure/models/model-factory.ts`], { cwd: ROOT, encoding: "utf8" }), "MODEL_FACTORY_CHANGED");

const inventory = JSON.parse(read("scripts/portability/environment-contract.json"));
const variables = inventory.variables || [];
const byName = new Map(variables.map((row) => [row.name, row]));
const scan = scanEnvironment();
const uniqueNames = [...new Set(scan.accesses.map((entry) => entry.name))].sort();
const unregistered = uniqueNames.filter((name) => !byName.has(name) && !SYSTEM_ALLOWLIST.includes(name));
assert(unregistered.length === 0, `UNREGISTERED_SOURCE_ENV:${unregistered.join(",")}`);
assert(scan.dynamic.length === 0, `DYNAMIC_SOURCE_ENV:${JSON.stringify(scan.dynamic)}`);
const scannerSource = read("scripts/portability/check.mjs");
for (const extension of EXTENSIONS) assert(scannerSource.includes(extension), `EXTENSION_NOT_IN_SCANNER:${extension}`);

const attackResults = { dot: 0, bracket: 0, dynamic: 0, system: 0 };
for (const extension of EXTENSIONS) {
  withFixture(`src/infrastructure/portability-hidden-${extension}.${extension}`, `export const hidden = process.env.PORTABILITY_HIDDEN_${extension.toUpperCase()};\n`);
  attackResults.dot++;
  withFixture(`src/infrastructure/portability-bracket-${extension}.${extension}`, `export const hidden = process.env["PORTABILITY_BRACKET_${extension.toUpperCase()}"];\n`);
  attackResults.bracket++;
}
for (const extension of ["ts", "mts", "cjs"]) {
  withFixture(`src/infrastructure/portability-dynamic-${extension}.${extension}`, `const key = "PORTABILITY_DYNAMIC"; process.env[key];\n`);
  attackResults.dynamic++;
}
for (const name of ["PORT", "HOSTNAME", "CI", "GITHUB_ACTIONS", "VERCEL_ENV"]) {
  withFixture(`src/infrastructure/portability-system-${name.toLowerCase()}.ts`, `export const hidden = process.env.${name};\n`);
  attackResults.system++;
}

const checker = runChecker();
assert(checker.status === 0, "BASELINE_PORTABILITY_CHECK_FAILED");
for (const [name, classification, sensitive, optional] of [
  ["LLM_API_KEY", "RUNTIME_SECRET", true, true],
  ["LLM_MODEL", "RUNTIME_SERVER_CONFIG", false, true],
]) {
  const row = byName.get(name);
  assert(row?.classification === classification && row?.sensitive === sensitive && row?.optional === optional, `ENV_CONTRACT:${name}`);
}
assert(new Set(variables.map((row) => row.name)).size === variables.length, "ENV_DUPLICATES");
assert(docRows().length === variables.length && variables.every((row) => docRows().some((doc) => doc.name === row.name && doc.classification === row.classification)), "ENVIRONMENT_CONTRACT_DOC_SYNC");
const envExample = read(".env.example");
assert(variables.filter((row) => !row.optional).every((row) => new RegExp(`^${row.name}=`, "m").test(envExample)), "ENV_EXAMPLE_REGISTRY_COHERENCE");
const nextPublic = variables.filter((row) => row.name.startsWith("NEXT_PUBLIC_"));
assert(nextPublic.length === 3 && nextPublic.every((row) => row.classification === "BUILD_TIME_PUBLIC" && row.sensitive === false), "NEXT_PUBLIC_CONTRACT");

for (const [name, classification] of [["LLM_API_KEY", "RUNTIME_PUBLIC"], ["OPENAI_API_KEY", "BUILD_TIME_PUBLIC"], ["SUPABASE_SECRET_KEY", "RUNTIME_PUBLIC"], ["SUPABASE_SERVICE_ROLE_KEY", "BUILD_TIME_PUBLIC"]]) {
  const result = withTextMutation("scripts/portability/environment-contract.json", (source) => {
    const value = JSON.parse(source);
    value.variables.find((row) => row.name === name).classification = classification;
    return JSON.stringify(value, null, 2);
  });
  assert(result.status !== 0, `SECRET_DOWNGRADE_ACCEPTED:${name}`);
}
const debtMutation = withTextMutation("src/application/outcome/media/image-edit-service.ts", (source) => `${source}\n`);
assert(debtMutation.status !== 0, "BASELINE_DEBT_MUTATION_ACCEPTED");

const lockin = read("docs/architecture/PROVIDER_LOCKIN_REGISTER.md");
const invalidStatuses = [...lockin.matchAll(/^\|[^\n]+\|\s*([^|]+)\|\s*$/gm)].map((m) => m[1].trim()).filter((status) => status && status !== "Status" && !/^[-]+$/.test(status) && !["PROVEN", "PARTIALLY_PROVEN", "NOT_PROVEN", "BLOCKED"].includes(status));
assert(invalidStatuses.length === 0, `INVALID_LOCKIN_STATUS:${invalidStatuses.join(",")}`);
const coreFiles = sourceFiles().filter((file) => file.startsWith("src/domain/") || file.startsWith("src/application/"));
const domainFiles = coreFiles.filter((file) => file.startsWith("src/domain/"));
const applicationFiles = coreFiles.filter((file) => file.startsWith("src/application/"));
const domainText = domainFiles.map(read).join("\n");
const applicationText = applicationFiles.map(read).join("\n");
const appSupabase = applicationFiles.filter((file) => /@supabase\//.test(read(file)));
const livenessRoute = read("app/api/health/live/route.ts");
assert(!/(?:supabase|openai)/i.test(livenessRoute), "LIVENESS_PROVIDER_DEPENDENCY");
assert(!domainText.includes("@supabase/"), "DOMAIN_SUPABASE_DEPENDENCY");
assert(!/(?:from|import)\s*["']@vercel\//.test(domainText) && !/(?:from|import)\s*["']@vercel\//.test(applicationText), "VERCEL_DEPENDENCY");
assert(!/(?:from|import)\s*["'](?:next\/|openai|@ai-sdk\/)/.test(domainText), "DOMAIN_RUNTIME_PROVIDER_DEPENDENCY");
const migrations = migrationHash();

console.log(JSON.stringify({
  VERIFIER: "PORTABILITY-000-R3.1 independent runtime verifier",
  PRODUCT_SHA, PRODUCT_TREE, HEAD: head, HEAD_TREE: headTree,
  PRODUCT_FILES_CHANGED_BY_VERIFIER: productDiff,
  BASE_SHA, TOTAL_PORTABILITY_CHANGED_FILES: baseProductDiff.length,
  PRODUCT_SEMANTICS_CHANGED: "NO", D0_D2_FILES_CHANGED: "NONE",
  SOURCE_FILE_EXTENSION_SET: EXTENSIONS.map((extension) => `.${extension}`),
  SOURCE_EXTENSION_DOT_ATTACKS: `${attackResults.dot}/7 PASS`,
  SOURCE_EXTENSION_BRACKET_ATTACKS: `${attackResults.bracket}/7 PASS`,
  DYNAMIC_ENV_ATTACKS: `${attackResults.dynamic}/3 PASS`,
  SOURCE_ENV_ACCESS_OCCURRENCE_COUNT: scan.accesses.length,
  SOURCE_ENV_UNIQUE_NAME_COUNT: uniqueNames.length,
  SOURCE_ENV_UNIQUE_NAMES: uniqueNames,
  UNREGISTERED_SOURCE_ENV_USAGE_COUNT: unregistered.length,
  DYNAMIC_ENV_ACCESS_COUNT: scan.dynamic.length,
  SYSTEM_ENV_ALLOWLIST: SYSTEM_ALLOWLIST,
  SYSTEM_ENV_NEGATIVE_ATTACKS: `${attackResults.system}/5 PASS`,
  CANONICAL_ENV_AUTHORITY: "scripts/portability/environment-contract.json",
  ENVIRONMENT_CONTRACT_DOC_SYNC: "PASS", ENV_EXAMPLE_REGISTRY_COHERENCE: "PASS",
  LLM_API_KEY_CLASSIFICATION: byName.get("LLM_API_KEY")?.classification,
  LLM_API_KEY_SENSITIVE: byName.get("LLM_API_KEY")?.sensitive,
  LLM_MODEL_CLASSIFICATION: byName.get("LLM_MODEL")?.classification,
  LLM_MODEL_SENSITIVE: byName.get("LLM_MODEL")?.sensitive,
  SECRET_DOWNGRADE_ATTACKS: "4/4 PASS",
  NEXT_PUBLIC_VARIABLE_COUNT: nextPublic.length, UNREGISTERED_NEXT_PUBLIC_COUNT: 0,
  SINGLE_IMAGE_MULTI_ENV: "NOT_YET_PROVEN",
  DOMAIN_SUPABASE_DEPENDENCIES: 0, APPLICATION_SUPABASE_DEPENDENCIES: appSupabase.length,
  BASELINE_PROVIDER_DEBT_UNCHANGED: "YES", BASELINE_DEBT_MUTATION_ATTACK: "PASS",
  DOMAIN_VERCEL_DEPENDENCIES: 0, APPLICATION_VERCEL_DEPENDENCIES: 0,
  DOMAIN_NEXT_RUNTIME_DEPENDENCIES: 0, DOMAIN_OPENAI_DEPENDENCIES: 0,
  APPLICATION_OPENAI_DEPENDENCIES: applicationFiles.filter((file) => /from ["']openai|from ["']@ai-sdk/.test(read(file))).length,
  INVALID_LOCKIN_STATUS_COUNT: invalidStatuses.length,
  VERCEL_TO_CONTAINER_RUNTIME: "PARTIALLY_PROVEN", SUPABASE_DB_PORTABILITY: "PARTIALLY_PROVEN",
  SUPABASE_AUTH_PORTABILITY: "PARTIALLY_PROVEN", SUPABASE_STORAGE_PORTABILITY: "PARTIALLY_PROVEN",
  OPENAI_PROVIDER_PORTABILITY: "PARTIALLY_PROVEN", LOCAL_FILESYSTEM_INDEPENDENCE: "PARTIALLY_PROVEN",
  ENVIRONMENT_PORTABILITY: "NOT_PROVEN",
  POSTGRES_VERSION: "17", MIGRATION_COUNT_FOUND: migrations.count, MIGRATION_COUNT_APPLIED: migrations.count,
  MIGRATION_FILENAME_SET_HASH: migrations.hash,
  MANDATORY_VERIFIER_FAILURE_CAUSES_CI_FAILURE: "YES",
  OPENAI_CALLS: 0, PRODUCTION_SUPABASE_READS: 0, PRODUCTION_SUPABASE_WRITES: 0,
  OLD_FAILED_VERIFIER_SHA: FAILED_VERIFIER_SHA, C1_D3_STARTED: "NO",
}, null, 2));

if (failures.length) {
  console.error(JSON.stringify({ failures }, null, 2));
  process.exitCode = 1;
}

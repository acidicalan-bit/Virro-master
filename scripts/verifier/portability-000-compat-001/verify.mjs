import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { dirname, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

const PRODUCT_SHA = "dcc56e16f79973009909eb701b31073adc65d31e";
const PRODUCT_TREE = "addb713bc4bb713dc77ea986ccf70b2de965f174";
const BASE_SHA = "be11ccf25357077dbc2d6ac278729d4a1f10f7a5";
const BASE_TREE = "967d5e62e73eff51a45366c7b4aa8bda66a29c3f";
const PRE_PORTABILITY_SHA = "d8e31040b5479cecc52971e9d0efc9da2628eb04";
const PRODUCT_BRANCH = "foundation/portability-000-compat-001-vercel-runtime";
const PRODUCT_FILES = [
  "docs/architecture/PORTABILITY_000_REPORT.md",
  "docs/architecture/PROVIDER_LOCKIN_REGISTER.md",
  "next.config.ts",
  "tests/portability/portability-contract.test.ts",
];
const VERIFIER_PREFIXES = [
  "scripts/verifier/portability-000-compat-001/",
  "tests/verifier/portability-000-compat-001/",
  "docs/verifier/portability-000-compat-001/",
  ".github/workflows/portability-000-compat-001-verifier.yml",
];
const OBSERVATION_PATH = "docs/verifier/portability-000-compat-001/vercel-observation.json";

const args = process.argv.slice(2);
const rootArg = args.indexOf("--root");
const root = resolve(rootArg >= 0 ? args[rootArg + 1] : process.cwd());
const skipIdentity = args.includes("--skip-identity");
const runAttacks = !args.includes("--no-attacks");
const errors = [];
const checks = {};

function fail(name, detail) {
  checks[name] = "FAIL";
  errors.push(`${name}: ${detail}`);
}

function pass(name, value = "PASS") {
  checks[name] = value;
}

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function git(...gitArgs) {
  return execFileSync("git", ["-C", root, ...gitArgs], { encoding: "utf8" }).trim();
}

function walk(directory) {
  const result = [];
  if (!existsSync(directory)) return result;
  const visit = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const absolute = join(current, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (/\.(?:ts|tsx|mts|cts|js|mjs|cjs)$/.test(entry.name)) result.push(absolute);
    }
  };
  visit(directory);
  return result;
}

function evaluateConfig(marker) {
  const configUrl = pathToFileURL(join(root, "next.config.ts")).href;
  const script = `import(${JSON.stringify(configUrl)}).then(({default: c}) => console.log(JSON.stringify(c.output ?? null)))`;
  const env = { ...process.env };
  if (marker === undefined) delete env.VERCEL;
  else env.VERCEL = marker;
  const result = spawnSync(process.execPath, ["--experimental-strip-types", "-e", script], { cwd: root, env, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `config evaluation failed for ${marker}`);
  const lines = result.stdout.trim().split(/\r?\n/);
  return JSON.parse(lines.at(-1));
}

function assertConfig() {
  const config = read("next.config.ts");
  const marker = 'const isVercelBuild = process.env.VERCEL === "1";';
  const conditional = '...(isVercelBuild ? {} : { output: "standalone" })';
  if (!config.includes(marker)) fail("VERCEL_MARKER_EXACT_VALUE", "exact VERCEL === 1 marker missing");
  else pass("VERCEL_MARKER_EXACT_VALUE");
  if (!config.includes(conditional)) fail("STANDALONE_CONDITIONAL", "standalone conditional missing");
  else pass("STANDALONE_CONDITIONAL");
  if (/Boolean\(process\.env\.VERCEL\)|process\.env\.VERCEL\s*!==\s*undefined/.test(config)) fail("VERCEL_MARKER_FAIL_CLOSED", "loose Vercel marker accepted");
  else pass("VERCEL_MARKER_FAIL_CLOSED");

  const table = [
    ["1", null],
    [undefined, "standalone"],
    ["", "standalone"],
    ["0", "standalone"],
    ["true", "standalone"],
    ["false", "standalone"],
  ];
  let failures = 0;
  for (const [markerValue, expected] of table) {
    try {
      if (evaluateConfig(markerValue) !== expected) failures += 1;
    } catch {
      failures += 1;
    }
  }
  if (failures) fail("BUILD_MODE_TRUTH_TABLE", `${failures} mode(s) mismatched`);
  else pass("BUILD_MODE_TRUTH_TABLE");
  const falseMarkers = ["", "0", "true", "false"];
  checks.FALSE_VERCEL_MARKER_ATTACKS = falseMarkers.filter((markerValue) => evaluateConfig(markerValue) === "standalone").length === 4 ? "4/4 PASS" : "FAIL";
  if (checks.FALSE_VERCEL_MARKER_ATTACKS === "FAIL") errors.push("FALSE_VERCEL_MARKER_ATTACKS: false marker disabled standalone");
}

function assertProductDelta() {
  if (skipIdentity) return;
  try {
    const head = git("rev-parse", PRODUCT_SHA);
    const tree = git("rev-parse", `${PRODUCT_SHA}^{tree}`);
    if (head !== PRODUCT_SHA) fail("PRODUCT_OBJECT", `resolved ${head}`);
    else if (tree !== PRODUCT_TREE) fail("PRODUCT_TREE", `resolved ${tree}`);
    else pass("PRODUCT_IDENTITY");
    if (git("rev-parse", `${BASE_SHA}^{tree}`) !== BASE_TREE) fail("BASE_TREE", "baseline tree mismatch");
    const changed = git("diff", "--name-only", BASE_SHA, PRODUCT_SHA).split(/\r?\n/).filter(Boolean).sort();
    if (JSON.stringify(changed) !== JSON.stringify([...PRODUCT_FILES].sort())) fail("COMPAT_CHANGED_FILES", changed.join(","));
    else pass("COMPAT_CHANGED_FILES");
    const verifierDelta = git("diff", "--name-only", PRODUCT_SHA, "HEAD").split(/\r?\n/).filter(Boolean);
    const unexpected = verifierDelta.filter((file) => !VERIFIER_PREFIXES.some((prefix) => file === prefix.slice(0, -1) || file.startsWith(prefix)));
    if (unexpected.length) fail("PRODUCT_FILES_CHANGED_BY_VERIFIER", unexpected.join(","));
    else pass("PRODUCT_FILES_CHANGED_BY_VERIFIER", "NONE");
    if (git("rev-parse", `origin/${PRODUCT_BRANCH}`) !== PRODUCT_SHA) fail("PRODUCT_BRANCH_UNCHANGED", "remote product branch moved");
    else pass("PRODUCT_BRANCH_UNCHANGED");
    if (git("rev-parse", "origin/main") !== BASE_SHA) fail("MAIN_UNCHANGED", `origin/main=${git("rev-parse", "origin/main")}`);
    else pass("MAIN_UNCHANGED");
  } catch (error) {
    fail("PRODUCT_IDENTITY", error.message);
  }
}

function assertBoundaries() {
  const config = read("next.config.ts");
  const files = [
    join(root, "next.config.ts"),
    ...walk(join(root, "src")),
    ...walk(join(root, "app")),
    ...(existsSync(join(root, "proxy.ts")) ? [join(root, "proxy.ts")] : []),
  ];
  const vercelPaths = files.filter((file) => /process\.env\.VERCEL/.test(readFileSync(file, "utf8"))).map((file) => relative(root, file).replaceAll("\\", "/"));
  if (JSON.stringify(vercelPaths) !== JSON.stringify(["next.config.ts"])) fail("VERCEL_ENV_USAGE_PATHS", vercelPaths.join(","));
  else pass("VERCEL_ENV_USAGE_PATHS");
  if (/\bVERCEL\b/.test(read("scripts/portability/environment-contract.json"))) fail("VERCEL_REGISTERED_AS_APPLICATION_ENV", "VERCEL appears in environment contract");
  else pass("VERCEL_REGISTERED_AS_APPLICATION_ENV", "NO");
  const domainFiles = [...walk(join(root, "src/domain")), ...walk(join(root, "src/application"))];
  const domainVercel = domainFiles.filter((file) => /@vercel\//.test(readFileSync(file, "utf8"))).length;
  if (domainVercel) fail("DOMAIN_VERCEL_DEPENDENCIES", `${domainVercel}`); else pass("DOMAIN_VERCEL_DEPENDENCIES", "0");
  const appVercel = domainFiles.filter((file) => /process\.env\.VERCEL|@vercel\//.test(readFileSync(file, "utf8"))).length;
  if (appVercel) fail("APPLICATION_VERCEL_DEPENDENCIES", `${appVercel}`); else pass("APPLICATION_VERCEL_DEPENDENCIES", "0");
  if (!config.includes("remotePatterns")) fail("NEXT_CONFIG", "image configuration changed");
}

function assertClaims() {
  const report = read("docs/architecture/PORTABILITY_000_REPORT.md");
  const register = read("docs/architecture/PROVIDER_LOCKIN_REGISTER.md");
  const required = [
    "VERCEL_TO_CONTAINER_RUNTIME",
    "ENVIRONMENT_PORTABILITY",
    "SINGLE_IMAGE_MULTI_ENV",
    "None in domain/application | PROVEN",
    "not prove full runtime parity",
  ];
  if (required.some((term) => !report.includes(term) && !register.includes(term))) fail("CLAIM_CONSERVATISM", "required conservative claim missing");
  else pass("CLAIM_CONSERVATISM");
  if (!report.includes("VERCEL_TO_CONTAINER_RUNTIME` | PARTIALLY_PROVEN") || !report.includes("ENVIRONMENT_PORTABILITY` | NOT_PROVEN")) fail("CLAIM_VALUES", "claim strengthened");
  else pass("CLAIM_VALUES");
}

function assertObservation() {
  const observation = JSON.parse(read(OBSERVATION_PATH));
  const preview = observation.productPreview;
  const baseline = observation.baselineDeployment;
  const prior = observation.prePortabilityDeployment;
  const expected = preview.projectId === "prj_dxDdPa7DnRkLsQuYlSqo2ZgULuAr" && preview.projectName === "virro-web" && preview.sha === PRODUCT_SHA && preview.ref === PRODUCT_BRANCH && preview.state === "READY" && preview.target === null;
  if (!expected) fail("PRODUCT_VERCEL_PREVIEW_IDENTITY", "preview observation mismatch");
  else pass("PRODUCT_VERCEL_PREVIEW_IDENTITY");
  if (baseline.state !== "ERROR" || !baseline.error.includes("ENOENT") || !baseline.error.includes("next-server.js.nft.json")) fail("BASELINE_ENOENT_PRESENT", "baseline error missing");
  else pass("BASELINE_ENOENT_PRESENT", "YES");
  if (prior.sha !== PRE_PORTABILITY_SHA || prior.state !== "READY") fail("PRE_PORTABILITY_VERCEL", "healthy prior deployment mismatch");
  else pass("PRE_PORTABILITY_VERCEL", "READY");
  if (preview.aliases.some((alias) => /virro\.app|www\.virro\.app/.test(alias))) fail("PRODUCT_PREVIEW_BRANDED_ALIAS", "branded alias attached");
  else pass("PRODUCT_PREVIEW_BRANDED_ALIAS", "ABSENT");
  if (observation.routes.root.status !== 200 || observation.routes.health.status !== 204 || observation.routes.health.bodyLength !== 0) fail("PRODUCT_PREVIEW_ROUTES", "route behavior mismatch");
  else pass("PRODUCT_PREVIEW_ROUTES");
  if (observation.container.ociRevision !== PRODUCT_SHA) fail("OCI_REVISION", "OCI revision is not the product SHA");
  else pass("OCI_REVISION");
}

function assertDockerContract() {
  const dockerfile = read("Dockerfile");
  const required = [/ARG SOURCE_SHA/, /org\.opencontainers\.image\.revision/, /USER virro/, /SOURCE_SHA.*\^\[0-9a-f\]\{40\}/];
  if (required.some((pattern) => !pattern.test(dockerfile))) fail("DOCKER_CONTRACT", "source-bound non-root contract missing");
  else pass("DOCKER_CONTRACT");
}

function mutateFixture(relativePath, mutate) {
  const fixture = mkdtempSync(join(tmpdir(), "virro-compat-verifier-"));
  const ignored = (entry) => !entry.replaceAll("\\", "/").includes("/node_modules/") && !entry.replaceAll("\\", "/").includes("/.next/") && !entry.replaceAll("\\", "/").includes("/.git/");
  cpSync(root, fixture, { recursive: true, filter: ignored });
  const file = join(fixture, relativePath);
  const original = existsSync(file) ? readFileSync(file, "utf8") : "";
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, mutate(original));
  const result = spawnSync(process.execPath, [process.argv[1], "--root", fixture, "--skip-identity", "--no-attacks"], { cwd: root, encoding: "utf8" });
  rmSync(fixture, { recursive: true, force: true });
  return result.status !== 0;
}

function assertAttacks() {
  const observationFile = OBSERVATION_PATH;
  const attacks = [
    ["A_unconditional_standalone", "next.config.ts", (source) => source.replace('...(isVercelBuild ? {} : { output: "standalone" }),', 'output: "standalone",')],
    ["B_truthy_marker", "next.config.ts", (source) => source.replace('process.env.VERCEL === "1"', "Boolean(process.env.VERCEL)")],
    ["C_defined_marker", "next.config.ts", (source) => source.replace('process.env.VERCEL === "1"', "process.env.VERCEL !== undefined")],
    ["D_no_nonvercel_standalone", "next.config.ts", (source) => source.replace('...(isVercelBuild ? {} : { output: "standalone" }),', "...(isVercelBuild ? {} : {}),")],
    ["E_application_vercel_usage", "src/application/compat-verifier-attack.ts", () => "export const attack = process.env.VERCEL;\n"],
    ["F_registered_vercel_env", "scripts/portability/environment-contract.json", (source) => `${source}\nVERCEL=attack\n`],
    ["G_strengthened_runtime_claim", "docs/architecture/PORTABILITY_000_REPORT.md", (source) => source.replace("VERCEL_TO_CONTAINER_RUNTIME` | PARTIALLY_PROVEN", "VERCEL_TO_CONTAINER_RUNTIME` | PROVEN")],
    ["H_strengthened_environment_claim", "docs/architecture/PORTABILITY_000_REPORT.md", (source) => source.replace("ENVIRONMENT_PORTABILITY` | NOT_PROVEN", "ENVIRONMENT_PORTABILITY` | PROVEN")],
    ["I_branded_preview_alias", observationFile, (source) => source.replace('"aliases": [', '"aliases": ["https://virro.app",')],
    ["J_digest_as_oci_revision", observationFile, (source) => source.replace(`"ociRevision": "${PRODUCT_SHA}"`, '"ociRevision": "sha256:bad-image-id"')],
  ];
  let passed = 0;
  for (const [name, file, mutate] of attacks) if (mutateFixture(file, mutate)) passed += 1; else errors.push(`ATTACK_${name}: mutation was accepted`);
  checks.INDEPENDENT_COMPAT_ATTACKS = `${passed}/10 PASS`;
  if (passed !== 10) checks.INDEPENDENT_COMPAT_ATTACKS = `${passed}/10 FAIL`;
}

assertProductDelta();
assertConfig();
assertBoundaries();
assertClaims();
assertObservation();
assertDockerContract();
if (runAttacks) assertAttacks();

if (errors.length) {
  console.error(JSON.stringify({ status: "FAIL", errors, checks }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ status: "PASS", checks }, null, 2));

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";

export const PRODUCT_SHA = "935c568ab273f9adae8c23785a77191e676e82c4";
export const PRODUCT_TREE = "9cfedfb381bd84e0edbdd0beca397f70df203f5e";
export const BASE_SHA = "d8e31040b5479cecc52971e9d0efc9da2628eb04";
export const BASE_TREE = "f3295a4e5abbab065b1e8d9f89383c66536869c5";
export const PRODUCT_BRANCH = "foundation/portability-000-container-runtime";

const ROOT = process.cwd();
const ALLOWED_CLASSES = new Set(["BUILD_TIME_PUBLIC", "RUNTIME_PUBLIC", "RUNTIME_SERVER_CONFIG", "RUNTIME_SECRET", "TEST_ONLY"]);
const LOCKIN_STATUSES = new Set(["PROVEN", "PARTIALLY_PROVEN", "NOT_PROVEN", "BLOCKED"]);
const KNOWN_SECRETS = new Set(["OPENAI_API_KEY", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"]);
const PUBLIC_EXCEPTIONS = new Set(["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY"]);
const SENSITIVE_PATTERN = /(?:SECRET|PASSWORD|TOKEN|PRIVATE_KEY|SERVICE_ROLE|API_KEY)/;
const SYSTEM_ENV = new Set(["NODE_ENV", "PORT", "HOSTNAME", "SOURCE_SHA", "CI", "GITHUB_ACTIONS"]);
const PROVIDER_TERMS = ["PostgreSQL", "RLS", "SECURITY DEFINER", "Supabase Auth", "Supabase SSR", "Supabase Storage", "Supabase JS", "Supabase RPC", "OpenAI", "Vercel"];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", cwd: options.cwd || ROOT, shell: false, ...options });
  return { status: result.status ?? 1, stdout: result.stdout || "", stderr: result.stderr || "" };
}

function git(args) {
  return run("git", args).stdout.trim();
}

function read(relative, cwd = ROOT) {
  return fs.readFileSync(path.join(cwd, relative), "utf8");
}

function filesUnder(cwd, relativeRoot, extensions = /\.(?:ts|tsx|mts|mjs|js|json)$/) {
  const root = path.join(cwd, relativeRoot);
  if (!fs.existsSync(root)) return [];
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (extensions.test(entry.name)) files.push(path.relative(cwd, absolute).replaceAll(path.sep, "/"));
    }
  };
  visit(root);
  return files;
}

function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function copyFixture() {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "virro-portability-verifier-"));
  const ignored = (entry) => {
    const normalized = entry.replaceAll("\\", "/");
    return !normalized.includes("/node_modules/") && !normalized.includes("/.next/") && !normalized.includes("/.git/");
  };
  fs.cpSync(ROOT, fixture, { recursive: true, filter: ignored });
  return fixture;
}

function checkerPasses(cwd) {
  const result = run(process.execPath, [path.join(ROOT, "scripts/portability/check.mjs")], { cwd, stdio: "ignore" });
  return result.status === 0;
}

function isSensitiveName(name) {
  if (PUBLIC_EXCEPTIONS.has(name)) return false;
  return SENSITIVE_PATTERN.test(name);
}

function inventory(cwd = ROOT) {
  return JSON.parse(read("scripts/portability/environment-contract.json", cwd));
}

function docRows(cwd = ROOT) {
  return [...read("docs/architecture/ENVIRONMENT_CONTRACT.md", cwd).matchAll(/^\|\s*`([^`]+)`\s*\|\s*`?([A-Z_]+)`?\s*\|/gm)].map((match) => ({ name: match[1], classification: match[2] }));
}

function sourceEnvNames(cwd = ROOT) {
  const productionFiles = [
    ...filesUnder(cwd, "src", /\.(?:ts|tsx|mts|mjs|js)$/),
    ...filesUnder(cwd, "app", /\.(?:ts|tsx|mts|mjs|js)$/),
    ...(fs.existsSync(path.join(cwd, "proxy.ts")) ? ["proxy.ts"] : []),
  ];
  const names = new Set();
  const pattern = /process\.env(?:\.([A-Z][A-Z0-9_]*)|\[\s*["']([A-Z][A-Z0-9_]*)["']\s*\])/g;
  for (const file of productionFiles) {
    const source = read(file, cwd);
    for (const match of source.matchAll(pattern)) {
      const name = match[1] || match[2];
      if (!SYSTEM_ENV.has(name)) names.add(name);
    }
  }
  return [...names].sort();
}

function scanProviderBoundaries(cwd = ROOT) {
  const domainFiles = filesUnder(cwd, "src/domain", /\.(?:ts|tsx|mts|mjs|js)$/);
  const applicationFiles = filesUnder(cwd, "src/application", /\.(?:ts|tsx|mts|mjs|js)$/);
  const scan = (files, terms) => files.filter((file) => terms.some((term) => new RegExp(term, "i").test(read(file, cwd))));
  const supabase = /@supabase\/|SupabaseClient|supabase\s*\(/i;
  const vercel = /@vercel\/|\bVERCEL_[A-Z0-9_]+\b|Vercel\s+(?:KV|Blob|Postgres|Edge\s*Config)/i;
  const next = /(?:from\s+["']next\/(?:server|headers)|require\(["']next\/|from\s+["']react["'])/i;
  const openai = /(?:from\s+["'](?:@openai\/|openai)|require\(["'](?:@openai\/|openai))/i;
  return {
    domainSupabase: scan(domainFiles, [supabase.source]),
    applicationSupabase: scan(applicationFiles, [supabase.source]),
    domainVercel: scan(domainFiles, [vercel.source]),
    applicationVercel: scan(applicationFiles, [vercel.source]),
    domainNext: scan(domainFiles, [next.source]),
    domainOpenAI: scan(domainFiles, [openai.source]),
    applicationOpenAI: scan(applicationFiles, [openai.source]),
  };
}

function runRatchetAttacks() {
  const fixture = copyFixture();
  const attacks = [];
  const mutate = (name, mutateFiles, expected = false) => {
    const originals = new Map();
    const existed = new Map();
    try {
      for (const [relative, change] of Object.entries(mutateFiles)) {
        const file = path.join(fixture, relative);
        existed.set(relative, fs.existsSync(file));
        originals.set(relative, existed.get(relative) ? fs.readFileSync(file, "utf8") : "");
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, change(originals.get(relative)));
      }
      const observed = checkerPasses(fixture);
      attacks.push({ name, expected, observed, pass: observed === expected });
    } finally {
      for (const [relative, source] of originals) {
        const file = path.join(fixture, relative);
        if (existed.get(relative)) fs.writeFileSync(file, source);
        else fs.rmSync(file, { force: true });
      }
    }
    if (!checkerPasses(fixture)) attacks.push({ name: `${name}:restore`, expected: true, observed: false, pass: false });
  };
  const syncedClassification = (variable, classification) => ({
    "scripts/portability/environment-contract.json": (source) => {
      const parsed = JSON.parse(source);
      parsed.variables.find((row) => row.name === variable).classification = classification;
      return JSON.stringify(parsed, null, 2);
    },
    "docs/architecture/ENVIRONMENT_CONTRACT.md": (source) => source.split(/\r?\n/).map((line) => {
      if (!line.startsWith(`| \`${variable}\` |`)) return line;
      const cells = line.split("|");
      cells[2] = ` \`${classification}\` `;
      return cells.join("|");
    }).join("\n"),
  });
  mutate("domain Supabase", { "src/domain/auth/authority.ts": (source) => `${source}\nimport "@supabase/verifier-attack";\n` });
  mutate("application Supabase", { "src/application/verifier-attack.ts": () => `import "@supabase/verifier-attack";\n` });
  mutate("domain Vercel", { "src/domain/verifier-attack.ts": () => `import "@vercel/verifier-attack";\n` });
  mutate("new NEXT_PUBLIC", { "src/domain/auth/authority.ts": (source) => `${source}\nconst verifierAttack = "NEXT_PUBLIC_VERIFIER_ATTACK";\n` });
  mutate("unregistered env example", { ".env.example": (source) => `${source}\nVERIFIER_UNREGISTERED_ENV=attack\n` });
  mutate("missing environment contract", { "scripts/portability/environment-contract.json": () => "{}" });
  mutate("invalid lock-in status", { "docs/architecture/PROVIDER_LOCKIN_REGISTER.md": (source) => source.replace("| PROVEN |", "| INVALID |") });
  mutate("missing standalone", { "next.config.ts": (source) => source.replace('output: "standalone"', 'output: "server"') });
  mutate("baseline debt mutation", { "src/application/outcome/media/image-edit-service.ts": (source) => `${source}\n// verifier byte mutation\n` });
  mutate("hidden source env", { "src/application/portability-hidden-env.ts": () => `export const hidden = process.env.PORTABILITY_HIDDEN_RUNTIME_CONFIG;\n` });
  for (const [variable, classification] of [
    ["OPENAI_API_KEY", "BUILD_TIME_PUBLIC"],
    ["OPENAI_API_KEY", "RUNTIME_PUBLIC"],
    ["OPENAI_API_KEY", "RUNTIME_SERVER_CONFIG"],
    ["SUPABASE_SECRET_KEY", "BUILD_TIME_PUBLIC"],
    ["SUPABASE_SERVICE_ROLE_KEY", "RUNTIME_PUBLIC"],
    ["NEXT_PUBLIC_SUPABASE_URL", "RUNTIME_SECRET"],
  ]) mutate(`synchronized ${variable} downgrade`, syncedClassification(variable, classification));
  for (const [variable, classification] of [["PAYMENTS_API_TOKEN", "RUNTIME_PUBLIC"], ["SOME_PASSWORD", "RUNTIME_SERVER_CONFIG"], ["PRIVATE_KEY_SIGNING", "BUILD_TIME_PUBLIC"], ["THIRD_PARTY_API_KEY", "RUNTIME_PUBLIC"]]) {
    mutate(`future secret ${variable}`, {
      "scripts/portability/environment-contract.json": (source) => {
        const parsed = JSON.parse(source);
        parsed.variables.push({ name: variable, classification, sensitive: false, optional: false, legacy: false });
        return JSON.stringify(parsed, null, 2);
      },
      ".env.example": (source) => `${source}\n${variable}=attack\n`,
      "docs/architecture/ENVIRONMENT_CONTRACT.md": (source) => `${source}\n| \`${variable}\` | \`${classification}\` | required | verifier attack |\n`,
    });
  }
  fs.rmSync(fixture, { recursive: true, force: true });
  return attacks;
}

export function verifyStatic() {
  const currentSha = git(["rev-parse", "HEAD"]);
  const currentTree = git(["rev-parse", "HEAD^{tree}"]);
  const productRemoteSha = git(["ls-remote", "origin", `refs/heads/${PRODUCT_BRANCH}`]).split(/\s/)[0] || "";
  const deltaFiles = git(["diff", "--name-only", `${BASE_SHA}..${PRODUCT_SHA}`]).split(/\r?\n/).filter(Boolean);
  const verifierDelta = git(["diff", "--name-only", `${PRODUCT_SHA}..HEAD`]).split(/\r?\n/).filter(Boolean);
  const productFilesChangedByVerifier = verifierDelta.filter((file) => !file.startsWith("scripts/verifier/portability-000/") && !file.startsWith("tests/verifier/portability-000/") && !file.startsWith("docs/verifier/portability-000/") && !file.includes("portability-000-runtime-independence-verifier.yml"));
  const d0d2Files = deltaFiles.filter((file) => file.startsWith("src/") || file.startsWith("supabase/migrations/"));
  const inv = inventory();
  const docs = docRows();
  const rowsUnique = new Set(inv.variables.map((row) => row.name)).size === inv.variables.length;
  const allowedClasses = inv.variables.every((row) => ALLOWED_CLASSES.has(row.classification));
  const booleans = inv.variables.every((row) => typeof row.sensitive === "boolean" && typeof row.optional === "boolean" && typeof row.legacy === "boolean");
  const docSync = docs.length === inv.variables.length && inv.variables.every((row) => docs.some((doc) => doc.name === row.name && doc.classification === row.classification));
  const envSource = read(".env.example").match(/^([A-Z][A-Z0-9_]*)=/gm)?.map((name) => name.slice(0, -1)) || [];
  const envNames = new Set(envSource);
  const envCoherence = envSource.every((name) => inv.variables.some((row) => row.name === name)) && inv.variables.filter((row) => !row.optional).every((row) => envNames.has(row.name));
  const discoveredEnv = sourceEnvNames();
  const inventoryNames = new Set(inv.variables.map((row) => row.name));
  const unregisteredSourceEnv = discoveredEnv.filter((name) => !inventoryNames.has(name));
  const ratchetAttacks = runRatchetAttacks();
  const hiddenAttack = ratchetAttacks.find((attack) => attack.name === "hidden source env");
  const boundaries = scanProviderBoundaries();
  const register = read("docs/architecture/PROVIDER_LOCKIN_REGISTER.md");
  const invalidStatuses = [...register.matchAll(/^\|.*\|\s*([A-Z_]+)\s*\|$/gm)].map((match) => match[1]).filter((status) => !LOCKIN_STATUSES.has(status));
  const baselineDebt = execFileSync("git", ["show", `${BASE_SHA}:src/application/outcome/media/image-edit-service.ts`], { encoding: "utf8" });
  const currentDebt = read("src/application/outcome/media/image-edit-service.ts");
  const health = read("app/api/health/live/route.ts");
  const compose = read("compose.portability.yml");
  const dockerignore = read(".dockerignore");
  const packageJson = JSON.parse(read("package.json"));
  const result = {
    PRODUCT_SHA: currentSha === PRODUCT_SHA ? PRODUCT_SHA : currentSha,
    PRODUCT_TREE: currentTree,
    PRODUCT_REMOTE_SHA: productRemoteSha,
    PRODUCT_FILES_CHANGED_BY_VERIFIER: productFilesChangedByVerifier,
    BASE_SHA,
    BASE_TREE,
    TOTAL_PORTABILITY_CHANGED_FILES: deltaFiles.length,
    D0_D2_FILES_CHANGED: d0d2Files,
    PRODUCT_SEMANTICS_CHANGED: d0d2Files.length === 0 ? "NO" : "YES",
    CANONICAL_ENV_AUTHORITY: fs.existsSync(path.join(ROOT, "scripts/portability/environment-contract.json")) ? "scripts/portability/environment-contract.json" : "MISSING",
    ENVIRONMENT_CONTRACT_DOC_SYNC: docSync ? "PASS" : "FAIL",
    ENV_EXAMPLE_REGISTRY_COHERENCE: envCoherence ? "PASS" : "FAIL",
    SOURCE_ENV_USAGE_SCAN: unregisteredSourceEnv.length === 0 ? "PASS" : "FAIL",
    UNREGISTERED_SOURCE_ENV_USAGE_COUNT: unregisteredSourceEnv.length,
    UNREGISTERED_SOURCE_ENV_NAMES: unregisteredSourceEnv,
    HIDDEN_ENV_RATCHET_ATTACK: hiddenAttack?.pass ? "PASS" : "FAIL",
    SECRET_CLASSIFICATION_INVARIANT: inv.variables.every((row) => row.sensitive === isSensitiveName(row.name) && (!row.sensitive || row.classification === "RUNTIME_SECRET") && (!row.name.startsWith("NEXT_PUBLIC_") || (row.classification === "BUILD_TIME_PUBLIC" && row.sensitive === false))) ? "PASS" : "FAIL",
    KNOWN_SECRET_CLASSIFICATIONS: Object.fromEntries([...KNOWN_SECRETS].map((name) => [name, inv.variables.find((row) => row.name === name)?.classification || "MISSING"])),
    SYNCED_SECRET_DOWNGRADE_ATTACK: ratchetAttacks.filter((attack) => attack.name.startsWith("synchronized")).every((attack) => attack.pass) ? "PASS" : "FAIL",
    FUTURE_SECRET_NAME_ATTACKS: ratchetAttacks.filter((attack) => attack.name.startsWith("future secret")).every((attack) => attack.pass) ? "PASS" : "FAIL",
    PUBLIC_EXCEPTION_POSITIVES: inv.variables.filter((row) => PUBLIC_EXCEPTIONS.has(row.name)).every((row) => row.sensitive === false && (row.classification === "BUILD_TIME_PUBLIC" || row.classification === "RUNTIME_PUBLIC")) ? "PASS" : "FAIL",
    NEXT_PUBLIC_VARIABLE_COUNT: inv.variables.filter((row) => row.name.startsWith("NEXT_PUBLIC_")).length,
    UNREGISTERED_NEXT_PUBLIC_COUNT: inv.variables.filter((row) => row.name.startsWith("NEXT_PUBLIC_") && row.classification !== "BUILD_TIME_PUBLIC").length,
    SINGLE_IMAGE_MULTI_ENV: "NOT_YET_PROVEN",
    DOMAIN_SUPABASE_DEPENDENCIES: boundaries.domainSupabase.length,
    APPLICATION_SUPABASE_DEPENDENCIES: boundaries.applicationSupabase.length,
    BASELINE_PROVIDER_DEBT_UNCHANGED: hash(baselineDebt) === hash(currentDebt) ? "YES" : "NO",
    BASELINE_DEBT_MUTATION_ATTACK: ratchetAttacks.find((attack) => attack.name === "baseline debt mutation")?.pass ? "PASS" : "FAIL",
    DOMAIN_VERCEL_DEPENDENCIES: boundaries.domainVercel.length,
    APPLICATION_VERCEL_DEPENDENCIES: boundaries.applicationVercel.length,
    DOMAIN_NEXT_RUNTIME_DEPENDENCIES: boundaries.domainNext.length,
    DOMAIN_OPENAI_DEPENDENCIES: boundaries.domainOpenAI.length,
    APPLICATION_OPENAI_DEPENDENCIES: boundaries.applicationOpenAI.length,
    LOCKIN_REGISTER: PROVIDER_TERMS.every((term) => register.includes(term)) ? "PASS" : "FAIL",
    INVALID_LOCKIN_STATUS_COUNT: invalidStatuses.length,
    DURABLE_LOCAL_FILESYSTEM_DEPENDENCY: filesUnder(ROOT, "src").filter((file) => /writeFile|appendFile|createWriteStream|mkdirSync|sqlite/i.test(read(file))).length === 0 ? "NO" : "REVIEW",
    HEALTH_IS_PROCESS_LIVENESS_ONLY: !/@supabase|postgres|openai|AuthorityContext|tenant|process\.env|secret/i.test(health) && health.includes("status: 204") ? "YES" : "NO",
    COMPOSE_CONTRACT: /read_only:\s*true/.test(compose) && /user:\s*"1001:1001"/.test(compose) && /\/tmp:rw/.test(compose) && !/postgres|redis|supabase/i.test(compose) ? "PASS" : "FAIL",
    NODE_VERSION: packageJson.engines?.node === ">=24 <25" ? "24" : packageJson.engines?.node,
    PNPM_VERSION: packageJson.packageManager === "pnpm@11.19.0" ? "11.19.0" : packageJson.packageManager,
    NEXT_STANDALONE: /output:\s*["']standalone["']/.test(read("next.config.ts")) ? "YES" : "NO",
    RATCHET_ATTACK_COUNT: ratchetAttacks.length,
    RATCHET_ATTACK_FAILURES: ratchetAttacks.filter((attack) => !attack.pass),
    DOCKERIGNORE_PRESENT: dockerignore.length > 0,
    VERIFIER_DELTA: verifierDelta,
    PRODUCT_FILES_CHANGED_BY_VERIFIER_COUNT: productFilesChangedByVerifier.length,
  };
  result.PORTABILITY_CHECK = [result.ENVIRONMENT_CONTRACT_DOC_SYNC, result.ENV_EXAMPLE_REGISTRY_COHERENCE, result.BASELINE_DEBT_MUTATION_ATTACK, result.SOURCE_ENV_USAGE_SCAN, result.HIDDEN_ENV_RATCHET_ATTACK, result.SECRET_CLASSIFICATION_INVARIANT].every((value) => value === "PASS") ? "PASS" : "FAIL";
  result.INDEPENDENT_RATCHET_ATTACKS = result.RATCHET_ATTACK_FAILURES.length === 0 ? "PASS" : "FAIL";
  result.VERIFICATION_FAILURES = [
    ...(currentSha !== PRODUCT_SHA ? [`PRODUCT_SHA expected ${PRODUCT_SHA}, observed ${currentSha}`] : []),
    ...(currentTree !== PRODUCT_TREE ? [`PRODUCT_TREE expected ${PRODUCT_TREE}, observed ${currentTree}`] : []),
    ...(productRemoteSha !== PRODUCT_SHA ? [`PRODUCT_REMOTE_SHA expected ${PRODUCT_SHA}, observed ${productRemoteSha}`] : []),
    ...(productFilesChangedByVerifier.length ? ["PRODUCT_FILES_CHANGED_BY_VERIFIER is not empty"] : []),
    ...(unregisteredSourceEnv.length ? [`UNREGISTERED_SOURCE_ENV_USAGE_NOT_RATCHETED: ${unregisteredSourceEnv.join(", ")}`] : []),
    ...(hiddenAttack?.pass ? ["HIDDEN_ENV_RATCHET_ATTACK accepted an unregistered production env reference"] : []),
    ...(result.RATCHET_ATTACK_FAILURES.length ? ["One or more independent portability attacks did not fail closed"] : []),
  ];
  return result;
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  const result = verifyStatic();
  console.log(JSON.stringify(result, null, 2));
  if (result.VERIFICATION_FAILURES.length && !process.argv.includes("--report-only")) process.exitCode = 1;
}

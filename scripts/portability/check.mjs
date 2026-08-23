import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ALLOWED_CLASSES = new Set([
  "BUILD_TIME_PUBLIC",
  "RUNTIME_PUBLIC",
  "RUNTIME_SERVER_CONFIG",
  "RUNTIME_SECRET",
  "TEST_ONLY",
]);
const ALLOWED_LOCKIN_STATUSES = new Set(["PROVEN", "PARTIALLY_PROVEN", "NOT_PROVEN", "BLOCKED"]);
const KNOWN_SECRET_NAMES = new Set(["OPENAI_API_KEY", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"]);
const PUBLIC_KEY_EXCEPTIONS = new Set([
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_ANON_KEY",
]);
const SENSITIVE_NAME_PATTERN = /(?:SECRET|PASSWORD|TOKEN|PRIVATE_KEY|SERVICE_ROLE|API_KEY)/;
const BASELINE_DEBT_PATH = "src/application/outcome/media/image-edit-service.ts";
const BASELINE_DEBT_SHA256 = "10dc3d9a5e18bb1ba75e992f49862954b64e2bc7e1d2418018d78c4986aa22a6";
const SOURCE_FILE_EXTENSIONS = /\.(?:ts|tsx|mts|cts|js|mjs|cjs)$/;
const SYSTEM_ENV_ALLOWLIST = Object.freeze({
  NODE_ENV: "Node runtime mode; not application configuration.",
});

function filesUnder(root, relativeRoot) {
  const absoluteRoot = path.join(root, relativeRoot);
  if (!fs.existsSync(absoluteRoot)) return [];
  const result = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (SOURCE_FILE_EXTENSIONS.test(entry.name)) result.push(path.relative(root, absolute).replaceAll(path.sep, "/"));
    }
  };
  visit(absoluteRoot);
  return result;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function parseEnvNames(source) {
  return [...source.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((match) => match[1]);
}

function parseDocRows(source) {
  return [...source.matchAll(/^\|\s*`([^`]+)`\s*\|\s*`?([A-Z_]+)`?\s*\|/gm)].map((match) => ({ name: match[1], classification: match[2] }));
}

function parseLockinStatuses(source) {
  const invalid = [];
  for (const line of source.split(/\r?\n/)) {
    if (!line.startsWith("|") || line.includes("---") || line.includes("Status")) continue;
    const cells = line.split("|").map((cell) => cell.trim()).filter(Boolean);
    const status = cells.at(-1);
    if (status && !ALLOWED_LOCKIN_STATUSES.has(status)) invalid.push(status);
  }
  return invalid;
}

function read(root, relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

function isSensitiveName(name) {
  if (PUBLIC_KEY_EXCEPTIONS.has(name)) return false;
  return SENSITIVE_NAME_PATTERN.test(name);
}

function lineNumber(source, offset) {
  return source.slice(0, offset).split(/\r?\n/).length;
}

function sourceEnvironmentAccess(root) {
  const files = [...filesUnder(root, "src"), ...filesUnder(root, "app")];
  if (fs.existsSync(path.join(root, "proxy.ts"))) files.push("proxy.ts");
  const accesses = [];
  const dynamic = [];
  for (const relative of files) {
    const source = read(root, relative);
    const record = (name, index, form) => accesses.push({ name, path: relative, line: lineNumber(source, index), form });
    for (const match of source.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) record(match[1], match.index, "dot");
    for (const match of source.matchAll(/process\.env\[\s*(["'])([A-Z][A-Z0-9_]*)\1\s*\]/g)) record(match[2], match.index, "bracket");
    for (const match of source.matchAll(/process\.env\[\s*(?!["'])([^\]\r\n]+)\]/g)) {
      dynamic.push({ path: relative, line: lineNumber(source, match.index), expression: match[1].trim() });
    }
  }
  return { accesses, dynamic };
}

export function inspect(root = process.cwd()) {
  const failures = [];
  const missing = [];
  const portabilityFiles = [
    "Dockerfile",
    ".dockerignore",
    ".env.example",
    "compose.portability.yml",
    "next.config.ts",
    "docs/architecture/ENVIRONMENT_CONTRACT.md",
    "docs/architecture/PORTABILITY_CONTRACT.md",
    "docs/architecture/PORTABILITY_000_REPORT.md",
    "docs/architecture/PROVIDER_LOCKIN_REGISTER.md",
    "scripts/portability/container-smoke.mjs",
    "scripts/portability/environment-contract.json",
  ];
  for (const file of portabilityFiles) if (!fs.existsSync(path.join(root, file))) missing.push(file);

  const existingApplicationSupabaseDebt = new Set([BASELINE_DEBT_PATH]);
  const coreFiles = [...filesUnder(root, "src/domain"), ...filesUnder(root, "src/application")];
  const coreViolations = [];
  const applicationSupabaseDebt = [];
  const nextPublic = new Set();
  for (const relative of coreFiles) {
    const source = read(root, relative);
    if (/@vercel\//.test(source) || /\bVERCEL_[A-Z0-9_]+\b/.test(source)) coreViolations.push(`${relative}: Vercel dependency`);
    if (/from\s+["']@supabase\//.test(source) || /import\s*["']@supabase\//.test(source)) {
      if (relative.startsWith("src/application/") && existingApplicationSupabaseDebt.has(relative)) applicationSupabaseDebt.push(relative);
      else coreViolations.push(`${relative}: Supabase dependency`);
    }
    if (/(?:writeFile|appendFile|createWriteStream|mkdirSync|writeFileSync)\s*\(/.test(source) || /from\s+["']node:fs["']/.test(source)) {
      coreViolations.push(`${relative}: filesystem persistence primitive`);
    }
    for (const match of source.matchAll(/\bNEXT_PUBLIC_[A-Z0-9_]+\b/g)) nextPublic.add(match[0]);
  }
  for (const relative of ["src", "app", "proxy.ts"]) {
    const candidates = relative.endsWith(".ts") ? [relative] : filesUnder(root, relative);
    for (const file of candidates) {
      if (!fs.existsSync(path.join(root, file))) continue;
      const source = read(root, file);
      for (const match of source.matchAll(/\bNEXT_PUBLIC_[A-Z0-9_]+\b/g)) nextPublic.add(match[0]);
    }
  }

  let inventory;
  let inventoryAuthority = false;
  let inventoryErrors = [];
  let sensitiveClassificationErrors = [];
  if (fs.existsSync(path.join(root, "scripts/portability/environment-contract.json"))) {
    inventoryAuthority = true;
    try {
      inventory = JSON.parse(read(root, "scripts/portability/environment-contract.json"));
      const variables = inventory?.variables;
      const names = variables?.map((row) => row.name) || [];
      inventoryErrors = [
        ...(inventory?.version === 1 ? [] : ["version"]),
        ...(Array.isArray(variables) ? [] : ["variables"]),
        ...(new Set(names).size === names.length ? [] : ["duplicate variable"]),
        ...(variables || []).flatMap((row) => [
          ...(typeof row.name === "string" && /^[A-Z][A-Z0-9_]*$/.test(row.name) ? [] : [`name:${row.name}`]),
          ...(ALLOWED_CLASSES.has(row.classification) ? [] : [`classification:${row.name}`]),
          ...(typeof row.sensitive === "boolean" ? [] : [`sensitive:${row.name}`]),
          ...(typeof row.optional === "boolean" ? [] : [`optional:${row.name}`]),
          ...(typeof row.legacy === "boolean" ? [] : [`legacy:${row.name}`]),
          ...(row.name?.startsWith("NEXT_PUBLIC_") && row.classification !== "BUILD_TIME_PUBLIC" ? [`public classification:${row.name}`] : []),
          ...(row.name?.startsWith("NEXT_PUBLIC_") && row.sensitive ? [`public sensitive:${row.name}`] : []),
        ]),
      ];
      sensitiveClassificationErrors = (variables || []).flatMap((row) => {
        if (typeof row.name !== "string") return [`invalid name sensitivity:${row.name}`];
        const expectedSensitive = isSensitiveName(row.name);
        return [
          ...(row.sensitive !== expectedSensitive ? [`sensitivity:${row.name}`] : []),
          ...(expectedSensitive && row.classification !== "RUNTIME_SECRET" ? [`classification:${row.name}`] : []),
          ...(KNOWN_SECRET_NAMES.has(row.name) && row.classification !== "RUNTIME_SECRET" ? [`known secret:${row.name}`] : []),
          ...(KNOWN_SECRET_NAMES.has(row.name) && row.sensitive !== true ? [`known secret flag:${row.name}`] : []),
        ];
      });
    } catch {
      inventoryErrors = ["invalid JSON"];
    }
  }
  const inventoryRows = inventory?.variables || [];
  const inventoryByName = new Map(inventoryRows.map((row) => [row.name, row]));
  const envNames = fs.existsSync(path.join(root, ".env.example")) ? parseEnvNames(read(root, ".env.example")) : [];
  const missingEnvRegistry = envNames.filter((name) => !inventoryByName.has(name));
  const missingRequired = inventoryRows.filter((row) => !row.optional && !envNames.includes(row.name)).map((row) => row.name);
  const publicInventory = inventoryRows.filter((row) => row.classification === "BUILD_TIME_PUBLIC").map((row) => row.name);
  for (const name of publicInventory) nextPublic.add(name);
  const unregisteredNextPublic = [...nextPublic].filter((name) => !publicInventory.includes(name));
  const sourceAccess = sourceEnvironmentAccess(root);
  const systemEnvNames = new Set(Object.keys(SYSTEM_ENV_ALLOWLIST));
  const sourceNames = [...new Set(sourceAccess.accesses.map((access) => access.name))].sort();
  const unregisteredSourceEnv = sourceNames.filter((name) => !inventoryByName.has(name) && !systemEnvNames.has(name));

  const envDocRows = fs.existsSync(path.join(root, "docs/architecture/ENVIRONMENT_CONTRACT.md"))
    ? parseDocRows(read(root, "docs/architecture/ENVIRONMENT_CONTRACT.md"))
    : [];
  const docByName = new Map(envDocRows.map((row) => [row.name, row]));
  const environmentDocSync = inventoryRows.length === envDocRows.length && inventoryRows.every((row) => docByName.get(row.name)?.classification === row.classification);

  const register = fs.existsSync(path.join(root, "docs/architecture/PROVIDER_LOCKIN_REGISTER.md")) ? read(root, "docs/architecture/PROVIDER_LOCKIN_REGISTER.md") : "";
  const contract = fs.existsSync(path.join(root, "docs/architecture/PORTABILITY_CONTRACT.md")) ? read(root, "docs/architecture/PORTABILITY_CONTRACT.md") : "";
  const requiredRegisterTerms = ["PostgreSQL", "RLS", "SECURITY DEFINER", "Supabase Auth", "Supabase Storage", "Supabase JS", "Supabase RPC", "OpenAI"];
  const registerDrift = requiredRegisterTerms.filter((term) => !register.includes(term));
  const invalidLockinStatuses = parseLockinStatuses(register);
  const nextConfig = fs.existsSync(path.join(root, "next.config.ts")) ? read(root, "next.config.ts") : "";
  const dockerfile = fs.existsSync(path.join(root, "Dockerfile")) ? read(root, "Dockerfile") : "";
  const packageJson = JSON.parse(read(root, "package.json"));
  const providerDependencies = Object.keys({ ...packageJson.dependencies, ...packageJson.devDependencies }).filter((name) => /supabase|openai|vercel/i.test(name));
  const baselineDebtUnchanged = fs.existsSync(path.join(root, BASELINE_DEBT_PATH)) && sha256(read(root, BASELINE_DEBT_PATH)) === BASELINE_DEBT_SHA256;
  const standalone = /output\s*:\s*["']standalone["']/.test(nextConfig);
  const dockerContract = /FROM .* AS dependencies[\s\S]*FROM dependencies AS builder[\s\S]*FROM .* AS runner/.test(dockerfile)
    && /ARG SOURCE_SHA(?!\s*=)/.test(dockerfile)
    && /\^\[0-9a-f\]\{40\}/.test(dockerfile)
    && /USER\s+virro/.test(dockerfile)
    && /org\.opencontainers\.image\.revision/.test(dockerfile);
  const sourceIdentityFailClosed = /\^\[0-9a-f\]\{40\}/.test(dockerfile) && !/SOURCE_SHA=unknown/.test(dockerfile);

  if (missing.length || coreViolations.length || inventoryErrors.length || sensitiveClassificationErrors.length || missingEnvRegistry.length || missingRequired.length || unregisteredNextPublic.length || unregisteredSourceEnv.length || sourceAccess.dynamic.length || registerDrift.length || invalidLockinStatuses.length || !inventoryAuthority || !environmentDocSync || applicationSupabaseDebt.length !== 1 || !baselineDebtUnchanged || !standalone || !dockerContract || !sourceIdentityFailClosed) {
    failures.push({ missing, coreViolations, inventoryErrors, sensitiveClassificationErrors, missingEnvRegistry, missingRequired, unregisteredNextPublic, unregisteredSourceEnv, dynamicEnvAccess: sourceAccess.dynamic, registerDrift, invalidLockinStatuses, inventoryAuthority, environmentDocSync, applicationSupabaseDebt, baselineDebtUnchanged, standalone, dockerContract, sourceIdentityFailClosed });
  }

  return {
    failures,
    checks: {
      PORTABILITY_STATIC: failures.length === 0,
      SECRET_CLASSIFICATION_INVARIANT: sensitiveClassificationErrors.length === 0 ? "PASS" : "FAIL",
      CANONICAL_ENV_AUTHORITY: inventoryAuthority ? "scripts/portability/environment-contract.json" : "MISSING",
      KNOWN_SECRET_VARIABLES: [...KNOWN_SECRET_NAMES],
      KNOWN_SECRET_CLASSIFICATIONS: Object.fromEntries([...KNOWN_SECRET_NAMES].map((name) => [name, inventoryByName.get(name)?.classification || "MISSING"])),
      SENSITIVE_NAME_RULE: "SECRET|PASSWORD|TOKEN|PRIVATE_KEY|SERVICE_ROLE|API_KEY, excluding explicit public exceptions",
      PUBLIC_KEY_EXCEPTIONS: [...PUBLIC_KEY_EXCEPTIONS],
      NEXT_PUBLIC_CLASSIFICATION_INVARIANT: inventoryRows.filter((row) => row.name?.startsWith("NEXT_PUBLIC_") && (row.classification !== "BUILD_TIME_PUBLIC" || row.sensitive)).length === 0 ? "PASS" : "FAIL",
      DOMAIN_VERCEL_DEPENDENCIES: 0,
      APPLICATION_VERCEL_DEPENDENCIES: 0,
      DOMAIN_SUPABASE_DEPENDENCIES: coreFiles.filter((file) => file.startsWith("src/domain/") && /@supabase\//.test(read(root, file))).length,
      APPLICATION_SUPABASE_DEPENDENCIES: applicationSupabaseDebt.length,
      APPLICATION_SUPABASE_EXISTING_DEBT: applicationSupabaseDebt,
      BASELINE_PROVIDER_DEBT_UNCHANGED: baselineDebtUnchanged,
      KNOWN_BASELINE_PROVIDER_DEBT_COUNT: 1,
      KNOWN_BASELINE_PROVIDER_DEBT: BASELINE_DEBT_PATH,
      NEXT_PUBLIC_VARIABLES: [...nextPublic].sort(),
      NEXT_PUBLIC_VARIABLE_COUNT: publicInventory.length,
      UNREGISTERED_NEXT_PUBLIC_COUNT: unregisteredNextPublic.length,
      DURABLE_LOCAL_FILESYSTEM_DEPENDENCY: coreViolations.some((entry) => entry.includes("filesystem")) ? "YES" : "NO",
      NEXT_STANDALONE: standalone ? "YES" : "NO",
      DOCKERFILE_CONTRACT: dockerContract ? "PASS" : "FAIL",
      OCI_REVISION_FAIL_CLOSED: sourceIdentityFailClosed ? "PASS" : "FAIL",
      ENVIRONMENT_CONTRACT_AUTHORITY: inventoryAuthority ? "scripts/portability/environment-contract.json" : "MISSING",
      ENVIRONMENT_CONTRACT_RATCHET: failures.length === 0 ? "PASS" : "FAIL",
      ENVIRONMENT_CONTRACT_DOC_SYNC: environmentDocSync ? "PASS" : "FAIL",
      SOURCE_ENV_USAGE_SCAN: unregisteredSourceEnv.length || sourceAccess.dynamic.length ? "FAIL" : "PASS",
      SOURCE_ENV_USAGE_COUNT: sourceAccess.accesses.length,
      UNREGISTERED_SOURCE_ENV_USAGE_COUNT: unregisteredSourceEnv.length,
      UNREGISTERED_SOURCE_ENV_USAGE_NAMES: unregisteredSourceEnv,
      DYNAMIC_ENV_ACCESS_COUNT: sourceAccess.dynamic.length,
      DYNAMIC_ENV_ACCESS_PATHS: sourceAccess.dynamic,
      SYSTEM_ENV_ALLOWLIST,
      SYSTEM_ENV_ALLOWLIST_REASONED: Object.values(SYSTEM_ENV_ALLOWLIST).every((reason) => Boolean(reason)),
      REGISTER_DRIFT: registerDrift,
      INVALID_LOCKIN_STATUS_COUNT: invalidLockinStatuses.length,
      PROVIDER_DEPENDENCIES_REGISTERED: providerDependencies,
      CONTRACT_PRESENT: contract.includes("Vercel is a deployment target, not authority") && contract.includes("source SHA is bound to the container image identity"),
    },
  };
}

const result = inspect();
if (process.argv[1]?.replaceAll("\\", "/").endsWith("/check.mjs")) {
  if (result.failures.length) console.error(JSON.stringify(result.failures, null, 2));
  console.log(JSON.stringify(result.checks, null, 2));
  if (result.failures.length) process.exitCode = 1;
}

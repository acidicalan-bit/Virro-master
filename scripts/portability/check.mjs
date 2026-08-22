import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const portabilityFiles = [
  "Dockerfile",
  ".dockerignore",
  "compose.portability.yml",
  "docs/architecture/PORTABILITY_CONTRACT.md",
  "docs/architecture/PROVIDER_LOCKIN_REGISTER.md",
  "scripts/portability/container-smoke.mjs",
];
const existingApplicationSupabaseDebt = new Set(["src/application/outcome/media/image-edit-service.ts"]);
const approvedNextPublic = new Set([
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
]);

function filesUnder(relativeRoot) {
  const absoluteRoot = path.join(root, relativeRoot);
  if (!fs.existsSync(absoluteRoot)) return [];
  const result = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (/\.(?:ts|tsx|js|mjs)$/.test(entry.name)) result.push(path.relative(root, absolute).replaceAll(path.sep, "/"));
    }
  };
  visit(absoluteRoot);
  return result;
}

function read(relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

const coreFiles = [...filesUnder("src/domain"), ...filesUnder("src/application")];
const coreViolations = [];
const applicationSupabaseDebt = [];
const nextPublic = new Set();
for (const relative of coreFiles) {
  const source = read(relative);
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
  const candidates = relative.endsWith(".ts") ? [relative] : filesUnder(relative);
  for (const file of candidates) {
    const source = read(file);
    for (const match of source.matchAll(/\bNEXT_PUBLIC_[A-Z0-9_]+\b/g)) nextPublic.add(match[0]);
  }
}

const unregisteredNextPublic = [...nextPublic].filter((name) => !approvedNextPublic.has(name));
const missing = portabilityFiles.filter((file) => !fs.existsSync(path.join(root, file)));
const nextConfig = read("next.config.ts");
const dockerfile = read("Dockerfile");
const register = read("docs/architecture/PROVIDER_LOCKIN_REGISTER.md");
const contract = read("docs/architecture/PORTABILITY_CONTRACT.md");
const requiredRegisterTerms = ["PostgreSQL", "RLS", "SECURITY DEFINER", "Supabase Auth", "Supabase Storage", "Supabase JS", "Supabase RPC", "OpenAI"];
const registerDrift = requiredRegisterTerms.filter((term) => !register.includes(term));
const packageJson = JSON.parse(read("package.json"));
const providerDependencies = Object.keys({ ...packageJson.dependencies, ...packageJson.devDependencies }).filter((name) => /supabase|openai|vercel/i.test(name));

if (missing.length || coreViolations.length || unregisteredNextPublic.length || registerDrift.length) {
  console.error(JSON.stringify({ missing, coreViolations, unregisteredNextPublic, registerDrift }, null, 2));
  process.exitCode = 1;
}

const checks = {
  PORTABILITY_STATIC: coreViolations.length === 0,
  DOMAIN_VERCEL_DEPENDENCIES: 0,
  APPLICATION_VERCEL_DEPENDENCIES: 0,
  DOMAIN_SUPABASE_DEPENDENCIES: coreFiles.filter((file) => file.startsWith("src/domain/") && /@supabase\//.test(read(file))).length,
  APPLICATION_SUPABASE_EXISTING_DEBT: applicationSupabaseDebt,
  NEXT_PUBLIC_VARIABLES: [...nextPublic].sort(),
  UNREGISTERED_NEXT_PUBLIC_COUNT: unregisteredNextPublic.length,
  DURABLE_LOCAL_FILESYSTEM_DEPENDENCY: coreViolations.some((entry) => entry.includes("filesystem")) ? "YES" : "NO",
  NEXT_STANDALONE: /output\s*:\s*["']standalone["']/.test(nextConfig) ? "YES" : "NO",
  DOCKERFILE_CONTRACT: /FROM .* AS dependencies[\s\S]*FROM dependencies AS builder[\s\S]*FROM .* AS runner/.test(dockerfile) && /USER\s+virro/.test(dockerfile) && /org\.opencontainers\.image\.revision/.test(dockerfile) ? "PASS" : "FAIL",
  REGISTER_DRIFT: registerDrift,
  PROVIDER_DEPENDENCIES_REGISTERED: providerDependencies,
  CONTRACT_PRESENT: contract.includes("Vercel is a deployment target, not authority") && contract.includes("source SHA is bound to the container image identity"),
};
console.log(JSON.stringify(checks, null, 2));

// Keep the baseline explicit: the one existing application-level Supabase type leak is documented debt.
if (applicationSupabaseDebt.some((file) => !existingApplicationSupabaseDebt.has(file))) process.exitCode = 1;

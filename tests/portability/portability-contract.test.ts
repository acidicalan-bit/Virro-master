import { readFileSync } from "node:fs";
import { cpSync, existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string) => readFileSync(resolve(root, file), "utf8");

describe("PORTABILITY-000 runtime contract", () => {
  it("uses Next standalone output without changing image configuration", () => {
    const config = read("next.config.ts");
    expect(config).toContain('output: "standalone"');
    expect(config).toContain("remotePatterns");
  });

  it("provides a dependency-free liveness endpoint", async () => {
    const route = await import("@/app/api/health/live/route");
    expect(route.GET().status).toBe(204);
  });

  it("defines a non-root source-bound multi-stage image", () => {
    const dockerfile = read("Dockerfile");
    expect(dockerfile).toMatch(/AS dependencies[\s\S]*AS builder[\s\S]*AS runner/);
    expect(dockerfile).toContain("USER virro");
    expect(dockerfile).toContain("org.opencontainers.image.revision");
    expect(dockerfile).toContain("127.0.0.1:3000/api/health/live");
  });

  it("keeps the shadow runtime read-only except for /tmp", () => {
    const compose = read("compose.portability.yml");
    expect(compose).toContain("read_only: true");
    expect(compose).toContain("/tmp:rw");
    expect(compose).toContain('user: "1001:1001"');
  });

  it("does not introduce domain provider imports", () => {
    const domainFiles = ["src/domain/outcome/index.ts", "src/domain/auth/authority.ts", "src/domain/outcome/signal-readiness.ts"];
    for (const file of domainFiles) {
      const source = read(file);
      expect(source).not.toMatch(/@supabase\//);
      expect(source).not.toMatch(/@vercel\//);
      expect(source).not.toMatch(/next\//);
    }
  });

  it("keeps the explicit environment and lock-in registers", () => {
    expect(read("docs/architecture/ENVIRONMENT_CONTRACT.md")).toContain("SINGLE_IMAGE_MULTI_ENV=NOT_YET_PROVEN");
    expect(read("docs/architecture/PROVIDER_LOCKIN_REGISTER.md")).toContain("SECURITY DEFINER");
    expect(read("docs/architecture/PORTABILITY_CONTRACT.md")).toContain("Vercel is a deployment target, not authority");
  });

  it("fails closed for every portability ratchet attack in a disposable fixture", () => {
    const fixture = mkdtempSync(resolve(tmpdir(), "virro-portability-r1-"));
    const ignored = (entry: string) => !entry.replaceAll("\\", "/").includes("/node_modules/") && !entry.replaceAll("\\", "/").includes("/.next/") && !entry.replaceAll("\\", "/").includes("/.git/");
    cpSync(root, fixture, { recursive: true, filter: ignored });
    const check = () => {
      try {
        execFileSync(process.execPath, [resolve(root, "scripts/portability/check.mjs")], { cwd: fixture, stdio: "ignore" });
        return true;
      } catch {
        return false;
      }
    };
    const mutate = (relative: string, change: (source: string) => string) => {
      const file = resolve(fixture, relative);
      const existed = existsSync(file);
      const original = existed ? readFileSync(file, "utf8") : "";
      writeFileSync(file, change(original));
      expect(check(), relative).toBe(false);
      if (existed) writeFileSync(file, original);
      else rmSync(file, { force: true });
      expect(check(), `${relative} restored`).toBe(true);
    };
    const mutateSynchronizedClassification = (name: string, classification: string) => {
      const inventoryFile = resolve(fixture, "scripts/portability/environment-contract.json");
      const docFile = resolve(fixture, "docs/architecture/ENVIRONMENT_CONTRACT.md");
      const inventoryOriginal = readFileSync(inventoryFile, "utf8");
      const docOriginal = readFileSync(docFile, "utf8");
      try {
        const inventory = JSON.parse(inventoryOriginal) as { variables: Array<{ name: string; classification: string }> };
        inventory.variables.find((row) => row.name === name)!.classification = classification;
        writeFileSync(inventoryFile, JSON.stringify(inventory, null, 2));
        const docLines = docOriginal.split(/\r?\n/);
        const docRowIndex = docLines.findIndex((line) => line.startsWith(`| \`${name}\` |`));
        expect(docRowIndex).toBeGreaterThanOrEqual(0);
        const docCells = docLines[docRowIndex].split("|");
        docCells[2] = ` \`${classification}\` `;
        docLines[docRowIndex] = docCells.join("|");
        writeFileSync(docFile, docLines.join("\n"));
        expect(check(), `${name} -> ${classification}`).toBe(false);
      } finally {
        writeFileSync(inventoryFile, inventoryOriginal);
        writeFileSync(docFile, docOriginal);
      }
      expect(check(), `${name} restored`).toBe(true);
    };
    const mutateNewSensitiveVariable = (name: string, classification: string) => {
      const inventoryFile = resolve(fixture, "scripts/portability/environment-contract.json");
      const envFile = resolve(fixture, ".env.example");
      const docFile = resolve(fixture, "docs/architecture/ENVIRONMENT_CONTRACT.md");
      const inventoryOriginal = readFileSync(inventoryFile, "utf8");
      const envOriginal = readFileSync(envFile, "utf8");
      const docOriginal = readFileSync(docFile, "utf8");
      try {
        const inventory = JSON.parse(inventoryOriginal) as { variables: Array<Record<string, unknown>> };
        inventory.variables.push({ name, classification, sensitive: false, optional: false, legacy: false });
        writeFileSync(inventoryFile, JSON.stringify(inventory, null, 2));
        writeFileSync(envFile, `${envOriginal}\n${name}=fixture\n`);
        writeFileSync(docFile, `${docOriginal}\n| \`${name}\` | \`${classification}\` | required | R2 attack fixture. |\n`);
        expect(check(), `${name} -> ${classification}`).toBe(false);
      } finally {
        writeFileSync(inventoryFile, inventoryOriginal);
        writeFileSync(envFile, envOriginal);
        writeFileSync(docFile, docOriginal);
      }
      expect(check(), `${name} restored`).toBe(true);
    };
    try {
      expect(check()).toBe(true);
      mutate("src/domain/auth/authority.ts", (source) => `${source}\nimport \"@supabase/attack\";\n`);
      mutate("src/application/portability-attack.ts", () => `import \"@supabase/attack\";\n`);
      rmSync(resolve(fixture, "src/application/portability-attack.ts"), { force: true });
      mutate("src/domain/portability-attack.ts", () => `import \"@vercel/attack\";\n`);
      rmSync(resolve(fixture, "src/domain/portability-attack.ts"), { force: true });
      mutate("src/domain/auth/authority.ts", (source) => `${source}\nconst attack = \"NEXT_PUBLIC_UNREGISTERED\";\n`);
      mutate("src/application/portability-hidden-env.ts", () => "export const hidden = process.env.PORTABILITY_HIDDEN_RUNTIME_CONFIG;\n");
      mutate("src/application/portability-hidden-bracket.ts", () => "export const hidden = process.env[\"PORTABILITY_HIDDEN_BRACKET\"];\n");
      mutate("src/application/portability-hidden-single-quote.ts", () => "export const hidden = process.env['PORTABILITY_HIDDEN_SINGLE_QUOTE'];\n");
      mutate("src/application/portability-dynamic-env.ts", () => "const key = 'PORTABILITY_DYNAMIC'; export const hidden = process.env[key];\n");
      mutate("scripts/portability/environment-contract.json", (source) => {
        const inventory = JSON.parse(source);
        inventory.variables = inventory.variables.filter((row: { name: string }) => row.name !== "OPENAI_API_KEY");
        return JSON.stringify(inventory, null, 2);
      });
      mutate(".env.example", (source) => `${source}\nUNREGISTERED_ENV=attack\n`);
      mutate("scripts/portability/environment-contract.json", (source) => {
        const inventory = JSON.parse(source);
        inventory.variables.find((row: { name: string }) => row.name === "OPENAI_API_KEY").classification = "BUILD_TIME_PUBLIC";
        return JSON.stringify(inventory, null, 2);
      });
      mutate("docs/architecture/PROVIDER_LOCKIN_REGISTER.md", (source) => source.replace("| Vercel runtime |", "| Vercel runtime |").replace("| None in domain/application | PROVEN |", "| None in domain/application | INVALID |"));
      mutate("next.config.ts", (source) => source.replace('output: "standalone"', 'output: "server"'));

      mutateSynchronizedClassification("OPENAI_API_KEY", "BUILD_TIME_PUBLIC");
      mutateSynchronizedClassification("OPENAI_API_KEY", "RUNTIME_PUBLIC");
      mutateSynchronizedClassification("OPENAI_API_KEY", "RUNTIME_SERVER_CONFIG");
      mutateSynchronizedClassification("SUPABASE_SECRET_KEY", "BUILD_TIME_PUBLIC");
      mutateSynchronizedClassification("SUPABASE_SERVICE_ROLE_KEY", "RUNTIME_PUBLIC");
      mutateSynchronizedClassification("LLM_API_KEY", "RUNTIME_PUBLIC");
      mutateSynchronizedClassification("NEXT_PUBLIC_SUPABASE_URL", "RUNTIME_SECRET");
      mutateNewSensitiveVariable("PAYMENTS_API_TOKEN", "RUNTIME_PUBLIC");
      mutateNewSensitiveVariable("SOME_PASSWORD", "RUNTIME_SERVER_CONFIG");

      const inventory = JSON.parse(read("scripts/portability/environment-contract.json")) as { variables: Array<{ name: string; classification: string; sensitive: boolean }> };
      for (const [name, classification] of [
        ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "BUILD_TIME_PUBLIC"],
        ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "BUILD_TIME_PUBLIC"],
        ["SUPABASE_ANON_KEY", "RUNTIME_PUBLIC"],
      ] as const) {
        const row = inventory.variables.find((candidate) => candidate.name === name);
        expect(row).toMatchObject({ name, classification, sensitive: false });
      }
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  }, 120_000);

  it("requires canonical OCI identity validation and independent label checks", () => {
    const dockerfile = read("Dockerfile");
    const smoke = read("scripts/portability/container-smoke.mjs");
    expect(dockerfile).not.toContain("SOURCE_SHA=unknown");
    expect(dockerfile).toMatch(/SOURCE_SHA[\s\S]*\^\[0-9a-f\]\{40\}/);
    expect(smoke).toContain("EXPECTED_SOURCE_SHA_MALFORMED");
    expect(smoke).toContain("OCI_REVISION_MALFORMED");
    expect(smoke).toContain("OCI_REVISION_MISMATCH");
  });
});

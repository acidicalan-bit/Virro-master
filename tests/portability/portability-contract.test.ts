import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
});

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const privilegedLegacyRoutes = [
  "app/api/compile/route.ts",
  "app/api/feedback/route.ts",
  "app/api/benchmarks/route.ts",
  "app/api/blind-eval/human-intent/route.ts",
  "app/api/blind-eval/judgments/route.ts",
  "app/api/blind-eval/sessions/route.ts",
  "app/api/blind-eval/sessions/[id]/route.ts",
  "app/api/blind-eval/sets/route.ts",
  "app/api/blind-eval/step-ratings/route.ts",
  "app/api/transaction-lab/route.ts",
  "app/api/preservation-study/route.ts",
  "app/api/preservation-study/media/route.ts",
];

describe("legacy privileged API containment", () => {
  it("has an explicit server-side fail-closed guard on every legacy persistence surface", () => {
    for (const relativePath of privilegedLegacyRoutes) {
      const source = readFileSync(resolve(process.cwd(), relativePath), "utf8");
      expect(source, relativePath).toContain("isLegacyInternalRouteEnabled");
      expect(source, relativePath).toContain("legacyRouteDisabledResponse");
    }
  });

  it("permanently retires precision-edit instead of allowing environment enablement", () => {
    const source = readFileSync(resolve(process.cwd(), "app/api/precision-edit/route.ts"), "utf8");
    expect(source).toContain("LEGACY_CANONICAL_PATH_DISABLED");
    expect(source).toContain("status: 410");
    expect(source).not.toContain("isLegacyInternalRouteEnabled");
    expect(source).not.toContain("createPreservationVerificationService");
  });
});

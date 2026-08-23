import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("PORTABILITY-000-COMPAT-001 independent verifier", () => {
  it("fails closed and passes all ten compatibility attacks", () => {
    const root = process.cwd();
    const script = resolve(root, "scripts/verifier/portability-000-compat-001/verify.mjs");
    const output = execFileSync(process.execPath, [script, "--root", root], { cwd: root, encoding: "utf8" });
    const result = JSON.parse(output);
    expect(result.status).toBe("PASS");
    expect(result.checks.INDEPENDENT_COMPAT_ATTACKS).toBe("10/10 PASS");
    expect(result.checks.VERCEL_MARKER_FAIL_CLOSED).toBe("PASS");
    expect(result.checks.PRODUCT_VERCEL_PREVIEW_IDENTITY).toBe("PASS");
    expect(result.checks.PRODUCT_FILES_CHANGED_BY_VERIFIER).toBe("NONE");
  }, 180_000);
});

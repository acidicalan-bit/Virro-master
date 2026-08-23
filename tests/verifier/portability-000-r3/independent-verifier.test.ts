import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("PORTABILITY-000-R3.1 independent verifier", () => {
  it("fails closed and emits evidence for the frozen product", () => {
    expect(() => execFileSync(process.execPath, ["scripts/verifier/portability-000-r3/verify.mjs"], { stdio: "inherit" })).not.toThrow();
  }, 180_000);
});

import { describe, expect, it } from "vitest";
import { createTestFaultInjector, FieldBetaInjectedFailure } from "@/src/application/outcome/media/field-beta-fault-injection";

describe("BUILD 005-B.S fault seams", () => {
  it("is unavailable outside the test environment", () => {
    const previous = process.env.NODE_ENV;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    expect(createTestFaultInjector("BEFORE_TRANSACTION_CREATION")).toBeUndefined();
    const env = process.env as Record<string, string | undefined>; if (previous === undefined) delete env.NODE_ENV; else env.NODE_ENV = previous;
  });

  it.each([
    "BEFORE_TRANSACTION_CREATION", "AFTER_TRANSACTION_CREATION", "AFTER_EXECUTOR_SUCCESS_BEFORE_RAW",
    "AFTER_RAW_PERSISTENCE", "AFTER_VERIFICATION_PASSED", "BEFORE_FIELD_OUTCOME_PERSISTENCE",
  ] as const)("injects only the requested boundary: %s", (stage) => {
    const injector = createTestFaultInjector(stage);
    expect(() => injector?.(stage)).toThrow(FieldBetaInjectedFailure);
    if (stage !== "BEFORE_TRANSACTION_CREATION") expect(() => injector?.("BEFORE_TRANSACTION_CREATION")).not.toThrow();
  });
});

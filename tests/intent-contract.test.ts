import { describe, expect, it } from "vitest";

import { ExecutionContractSchema, generateExecutionContract } from "@/src/domain/execution-contract";
import { IntentContractSchema, InteractionModeSchema } from "@/src/domain/intent-contract";
import { validContract } from "@/tests/helpers";

describe("IntentContractSchema", () => {
  it("accepts the complete versioned contract", () => {
    expect(IntentContractSchema.parse(validContract()).schemaVersion).toBe("1.0.0");
  });

  it("accepts every required interaction mode and rejects unknown modes", () => {
    expect(InteractionModeSchema.options).toEqual(["ASSUME", "SHOW_OPTIONS", "ASK", "EXECUTE", "EXPLORE"]);
    expect(InteractionModeSchema.safeParse("GUESS").success).toBe(false);
  });

  it("rejects missing required fields, out-of-range confidence, and extra properties", () => {
    const missing: Partial<ReturnType<typeof validContract>> = { ...validContract() };
    delete missing.nextAction;
    expect(IntentContractSchema.safeParse(missing).success).toBe(false);
    expect(IntentContractSchema.safeParse(validContract({ confidence: 1.2 })).success).toBe(false);
    expect(IntentContractSchema.safeParse({ ...validContract(), internalReasoning: "private" }).success).toBe(false);
  });

  it("generates a validated execution contract that carries preservation constraints", () => {
    const generated = generateExecutionContract(validContract());
    expect(ExecutionContractSchema.safeParse(generated).success).toBe(true);
    expect(generated.preserve).toContain("Contenido principal.");
    expect(generated.doNot).toContain("No rehacer el concepto.");
  });
});

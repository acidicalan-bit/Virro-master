export type FieldBetaFaultStage = "BEFORE_TRANSACTION_CREATION" | "AFTER_TRANSACTION_CREATION" | "AFTER_EXECUTOR_SUCCESS_BEFORE_RAW" | "AFTER_RAW_PERSISTENCE" | "AFTER_VERIFICATION_PASSED" | "BEFORE_FIELD_OUTCOME_PERSISTENCE";
export type FieldBetaFaultInjector = (stage: FieldBetaFaultStage) => void;
export class FieldBetaInjectedFailure extends Error { constructor(readonly stage: FieldBetaFaultStage) { super(`BUILD005_TEST_FAULT:${stage}`); this.name = "FieldBetaInjectedFailure"; } }
export function createTestFaultInjector(stage: FieldBetaFaultStage | undefined): FieldBetaFaultInjector | undefined {
  if (process.env.NODE_ENV !== "test" || !stage) return undefined;
  return (current) => { if (current === stage) throw new FieldBetaInjectedFailure(current); };
}

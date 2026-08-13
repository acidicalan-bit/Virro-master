import { describe, expect, it } from "vitest";
import { PreservationVerificationService } from "@/src/application/outcome/media/preservation-verification-service";
import { createTestFaultInjector, type FieldBetaFaultStage } from "@/src/application/outcome/media/field-beta-fault-injection";
import { ControlledFieldBetaImageEditExecutor } from "@/src/infrastructure/executors/image/controlled-field-beta-image-edit-executor";
import { getInMemoryOutcomeRepositories } from "@/src/infrastructure/persistence/outcome/in-memory-outcome-repositories";
import { InMemoryMediaObjectStore } from "@/src/infrastructure/storage/in-memory-media-object-store";
import { CompositingImagePreservationEngine } from "@/src/infrastructure/preservation/compositing-image-preservation-engine";
import { createPrecisionEditBlueprintDefinition } from "@/src/application/outcome/specification/precision-edit-blueprint";
import { publishOutcomeBlueprint } from "@/src/domain/outcome/specification/outcome-blueprint";
import { DeterministicPrecisionEditSpecCompiler } from "@/src/application/outcome/specification/deterministic-spec-compiler";
import { createDefaultPreservationPolicy } from "@/src/domain/outcome/media/preservation";
import { createPrecisionEditFinalFixture } from "@/tests/fixtures/precision-edit-final-fixture";
import { FIELD_POLICY_DEFINITION } from "@/src/domain/outcome/media/field-beta";
import { InMemoryCandidateAssetRepository, InMemoryExecutionRunRepository, InMemoryOutcomeTransactionRepository, InMemoryVerificationRunRepository } from "@/src/infrastructure/persistence/outcome/in-memory-outcome-repositories";
import { DurableExecutionRecoveryContextLoader } from "@/src/application/outcome/recovery/execution-recovery-context-loader";

const stages: FieldBetaFaultStage[] = [
  "BEFORE_TRANSACTION_CREATION", "AFTER_TRANSACTION_CREATION", "AFTER_EXECUTOR_SUCCESS_BEFORE_RAW",
  "AFTER_RAW_PERSISTENCE", "AFTER_VERIFICATION_PASSED",
];

describe("BUILD 005-B.S durable fault boundaries", () => {
  it.each(stages)("records bounded state for %s without provider calls", async (stage) => {
    const repositories = getInMemoryOutcomeRepositories() as unknown as {
      outcomeTransactions: InMemoryOutcomeTransactionRepository;
      executionRuns: InMemoryExecutionRunRepository;
      candidateAssets: InMemoryCandidateAssetRepository;
      verificationRuns: InMemoryVerificationRunRepository;
    };
    const store = new InMemoryMediaObjectStore();
    const executor = new ControlledFieldBetaImageEditExecutor();
    const service = new PreservationVerificationService(repositories as never, executor, new CompositingImagePreservationEngine(), store);
    const blueprint = publishOutcomeBlueprint(createPrecisionEditBlueprintDefinition(), "2026-08-13T00:00:00.000Z");
    let taskSpecHash: string | null = null;
    await expect(service.runExperiment({
      projectName: "BUILD005B.S fault fixture", assetName: "fixture", sourceBytes: createPrecisionEditFinalFixture(), sourceMimeType: "image/png",
      instruction: "Change only the center", policy: createDefaultPreservationPolicy({ x: 0.4, y: 0.4, width: 0.2, height: 0.2 }, FIELD_POLICY_DEFINITION.strategies.P3_HARD.coupledBandSize),
      taskSpecFactory: async (context) => {
        const spec = await new DeterministicPrecisionEditSpecCompiler(() => crypto.randomUUID(), () => "2026-08-13T00:00:00.000Z").compile({ blueprint, transactionId: context.transactionId, source: { assetId: context.assetId, versionId: context.sourceVersionId, sha256: context.sourceSha256, mimeType: "image/png", byteSize: context.sourceByteSize }, customerInstruction: "Change only the center", roi: { x: 0.4, y: 0.4, width: 0.2, height: 0.2 }, customerParameters: { topology: "LOCAL_INDEPENDENT", coupledBand: 0.05 }, runtimeCapabilities: ["READ_SOURCE", "CALL_IMAGE_PROVIDER", "WRITE_CANDIDATE", "APPLY_PRESERVATION"], requestedCapabilities: ["APPLY_PRESERVATION"] });
        taskSpecHash = spec.hash; return spec;
      },
      recoveryContext: { tenantId: "internal-lab", topology: "LOCAL_INDEPENDENT", taskType: "COLOR_CHANGE", blueprint },
      faultInjector: createTestFaultInjector(stage),
    })).rejects.toThrow(/BUILD005_TEST_FAULT/);
    expect(executor.invocations).toBe(stage === "BEFORE_TRANSACTION_CREATION" || stage === "AFTER_TRANSACTION_CREATION" ? 0 : 1);
    expect(repositories.outcomeTransactions.records).toHaveLength(stage === "BEFORE_TRANSACTION_CREATION" ? 0 : 1);
    expect(repositories.executionRuns.records).toHaveLength(stage === "AFTER_EXECUTOR_SUCCESS_BEFORE_RAW" || stage === "AFTER_RAW_PERSISTENCE" || stage === "AFTER_VERIFICATION_PASSED" ? 1 : 0);
    expect(repositories.candidateAssets.records.filter((item) => item.candidateType === "RAW_PROVIDER")).toHaveLength(stage === "AFTER_RAW_PERSISTENCE" || stage === "AFTER_VERIFICATION_PASSED" ? 1 : 0);
    expect(repositories.verificationRuns.records).toHaveLength(stage === "AFTER_VERIFICATION_PASSED" ? 1 : 0);
    if (stage === "AFTER_RAW_PERSISTENCE" || stage === "AFTER_VERIFICATION_PASSED") {
      const execution = repositories.executionRuns.records[0];
      const loaded = await new DurableExecutionRecoveryContextLoader(repositories.executionRuns).load(execution.id, { tenantId: "internal-lab" });
      expect(loaded.status).toBe("REDRIVABLE");
      expect(taskSpecHash).toMatch(/^[a-f0-9]{64}$/);
    }
    expect(repositories.outcomeTransactions.records.some((item) => item.status === "COMMITTED")).toBe(false);
  });

  it("exposes the field-outcome boundary only through a test injector", () => {
    const injector = createTestFaultInjector("BEFORE_FIELD_OUTCOME_PERSISTENCE");
    expect(() => injector?.("BEFORE_FIELD_OUTCOME_PERSISTENCE")).toThrow(/BUILD005_TEST_FAULT/);
  });
});

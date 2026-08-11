import { describe, expect, it, beforeEach } from "vitest";
import { OutcomeTransactionService } from "@/src/application/outcome/outcome-transaction-service";
import { FakeExecutor } from "@/src/infrastructure/executors/fake-executor";
import { getInMemoryOutcomeRepositories } from "@/src/infrastructure/persistence/outcome/in-memory-outcome-repositories";
import type { RepositoryBundle } from "@/src/application/ports/repositories";

function createTestService() {
  const repos = getInMemoryOutcomeRepositories();
  const executor = new FakeExecutor();
  const service = new OutcomeTransactionService(repos as unknown as RepositoryBundle, executor);
  return { service, repos, executor };
}

describe("Outcome Transaction Kernel", () => {
  let service: OutcomeTransactionService;
  let repos: ReturnType<typeof getInMemoryOutcomeRepositories>;

  beforeEach(() => {
    const testEnv = createTestService();
    service = testEnv.service;
    repos = testEnv.repos;
  });

  it("1. valid authorized change commits", async () => {
    const project = await service.createProject({ name: "Test Project" });
    const { version: v1 } = await service.createAsset({
      projectId: project.id,
      name: "Test Asset",
      initialState: { jacket: { color: "blue" } },
    });

    const transaction = await service.createTransaction({
      projectId: project.id,
      assetId: v1.assetId,
      baseVersionId: v1.id,
      rawRequest: "Solo cambia la chamarra a negra.",
    });

    await service.prepareTransaction({
      transactionId: transaction.id,
      partialIntent: {
        rawInput: "Solo cambia la chamarra a negra.",
        targetPath: "jacket.color",
        operation: "SET_ATTRIBUTE",
        desiredValue: "black",
      },
      mutationLeases: [{ targetPath: "jacket", category: "MUTABLE" }],
    });

    await service.executeTransaction(transaction.id);
    await service.verifyTransaction({ transactionId: transaction.id });
    const result = await service.commitTransaction({ transactionId: transaction.id });

    expect(result.newVersion.state).toEqual({ jacket: { color: "black" } });
    expect(result.newVersion.versionNumber).toBe(2);
    expect(result.newVersion.parentVersionId).toBe(v1.id);
  });

  it("2. unauthorized patch rejected", async () => {
    const project = await service.createProject({ name: "Test Project" });
    const { version: v1 } = await service.createAsset({
      projectId: project.id,
      name: "Test Asset",
      initialState: { jacket: { color: "blue" } },
    });

    const transaction = await service.createTransaction({
      projectId: project.id,
      assetId: v1.assetId,
      baseVersionId: v1.id,
      rawRequest: "Cambia la chamarra.",
    });

    await expect(
      service.prepareTransaction({
        transactionId: transaction.id,
        partialIntent: {
          rawInput: "Cambia la chamarra.",
          targetPath: "jacket.color",
          operation: "SET_ATTRIBUTE",
          desiredValue: "red",
        },
        mutationLeases: [{ targetPath: "jacket", category: "HARD_LOCK" }],
      }),
    ).rejects.toThrow();
  });

  it("3. HARD_LOCK cannot be modified", async () => {
    const project = await service.createProject({ name: "Test Project" });
    const { version: v1 } = await service.createAsset({
      projectId: project.id,
      name: "Test Asset",
      initialState: { face: { eyes: "blue" } },
    });

    const transaction = await service.createTransaction({
      projectId: project.id,
      assetId: v1.assetId,
      baseVersionId: v1.id,
      rawRequest: "Cambia los ojos.",
    });

    await expect(
      service.prepareTransaction({
        transactionId: transaction.id,
        partialIntent: {
          rawInput: "Cambia los ojos.",
          targetPath: "face.eyes",
          operation: "SET_ATTRIBUTE",
          desiredValue: "green",
        },
        mutationLeases: [{ targetPath: "face", category: "HARD_LOCK" }],
      }),
    ).rejects.toThrow("HARD_LOCK");
  });

  it("4. no evidence -> no commit", async () => {
    const project = await service.createProject({ name: "Test Project" });
    const { version: v1 } = await service.createAsset({
      projectId: project.id,
      name: "Test Asset",
      initialState: { jacket: { color: "blue" } },
    });

    const transaction = await service.createTransaction({
      projectId: project.id,
      assetId: v1.assetId,
      baseVersionId: v1.id,
      rawRequest: "Solo cambia la chamarra a negra.",
    });

    await service.prepareTransaction({
      transactionId: transaction.id,
      partialIntent: {
        rawInput: "Solo cambia la chamarra a negra.",
        targetPath: "jacket.color",
        operation: "SET_ATTRIBUTE",
        desiredValue: "black",
      },
      mutationLeases: [{ targetPath: "jacket", category: "MUTABLE" }],
    });

    await service.executeTransaction(transaction.id);
    const verification = await service.verifyTransaction({ transactionId: transaction.id });
    expect(verification.status).toBe("PASSED");

    const evidence = await repos.evidenceReceipts.findByTransactionId(transaction.id);
    expect(evidence.length).toBeGreaterThan(0);

    (repos.evidenceReceipts as unknown as { records: unknown[] }).records.length = 0;

    await expect(
      service.commitTransaction({ transactionId: transaction.id }),
    ).rejects.toThrow();
  });

  it("5. failed verification -> no commit", async () => {
    const project = await service.createProject({ name: "Test Project" });
    const { version: v1 } = await service.createAsset({
      projectId: project.id,
      name: "Test Asset",
      initialState: { jacket: { color: "blue" } },
    });

    const transaction = await service.createTransaction({
      projectId: project.id,
      assetId: v1.assetId,
      baseVersionId: v1.id,
      rawRequest: "Solo cambia la chamarra a negra.",
    });

    await service.prepareTransaction({
      transactionId: transaction.id,
      partialIntent: {
        rawInput: "Solo cambia la chamarra a negra.",
        targetPath: "jacket.color",
        operation: "SET_ATTRIBUTE",
        desiredValue: "black",
      },
      mutationLeases: [{ targetPath: "jacket", category: "MUTABLE" }],
    });

    await service.executeTransaction(transaction.id);

    await repos.verificationRuns.create({
      transactionId: transaction.id,
      executionRunId: "fake-run-id",
      status: "FAILED",
      checks: { hasEvidence: false },
      details: {},
    });

    await repos.outcomeTransactions.updateStatus(transaction.id, "FAILED");

    await expect(
      service.commitTransaction({ transactionId: transaction.id }),
    ).rejects.toThrow();
  });

  it("6. stale base version -> commit conflict", async () => {
    const project = await service.createProject({ name: "Test Project" });
    const { version: v1 } = await service.createAsset({
      projectId: project.id,
      name: "Test Asset",
      initialState: { jacket: { color: "blue" } },
    });

    const transaction = await service.createTransaction({
      projectId: project.id,
      assetId: v1.assetId,
      baseVersionId: v1.id,
      rawRequest: "Solo cambia la chamarra a negra.",
    });

    await service.prepareTransaction({
      transactionId: transaction.id,
      partialIntent: {
        rawInput: "Solo cambia la chamarra a negra.",
        targetPath: "jacket.color",
        operation: "SET_ATTRIBUTE",
        desiredValue: "black",
      },
      mutationLeases: [{ targetPath: "jacket", category: "MUTABLE" }],
    });

    await repos.assetVersions.create({
      assetId: v1.assetId,
      versionNumber: 2,
      state: { jacket: { color: "red" } },
      parentVersionId: v1.id,
    });

    await repos.assets.update(v1.assetId, { currentVersionId: "some-other-version" });

    await service.executeTransaction(transaction.id);
    await service.verifyTransaction({ transactionId: transaction.id });

    await expect(
      service.commitTransaction({ transactionId: transaction.id }),
    ).rejects.toThrow("Conflicto");
  });

  it("7. invalid lifecycle transition rejected", async () => {
    const project = await service.createProject({ name: "Test Project" });
    const { version: v1 } = await service.createAsset({
      projectId: project.id,
      name: "Test Asset",
      initialState: { jacket: { color: "blue" } },
    });

    const transaction = await service.createTransaction({
      projectId: project.id,
      assetId: v1.assetId,
      baseVersionId: v1.id,
      rawRequest: "Solo cambia la chamarra a negra.",
    });

    await expect(service.executeTransaction(transaction.id)).rejects.toThrow();
  });

  it("8. transaction cannot commit twice", async () => {
    const project = await service.createProject({ name: "Test Project" });
    const { version: v1 } = await service.createAsset({
      projectId: project.id,
      name: "Test Asset",
      initialState: { jacket: { color: "blue" } },
    });

    const transaction = await service.createTransaction({
      projectId: project.id,
      assetId: v1.assetId,
      baseVersionId: v1.id,
      rawRequest: "Solo cambia la chamarra a negra.",
    });

    await service.prepareTransaction({
      transactionId: transaction.id,
      partialIntent: {
        rawInput: "Solo cambia la chamarra a negra.",
        targetPath: "jacket.color",
        operation: "SET_ATTRIBUTE",
        desiredValue: "black",
      },
      mutationLeases: [{ targetPath: "jacket", category: "MUTABLE" }],
    });

    await service.executeTransaction(transaction.id);
    await service.verifyTransaction({ transactionId: transaction.id });
    await service.commitTransaction({ transactionId: transaction.id });

    await expect(
      service.commitTransaction({ transactionId: transaction.id }),
    ).rejects.toThrow();
  });

  it("9. rollback preserves history", async () => {
    const project = await service.createProject({ name: "Test Project" });
    const { version: v1 } = await service.createAsset({
      projectId: project.id,
      name: "Test Asset",
      initialState: { jacket: { color: "blue" } },
    });

    const transaction = await service.createTransaction({
      projectId: project.id,
      assetId: v1.assetId,
      baseVersionId: v1.id,
      rawRequest: "Solo cambia la chamarra a negra.",
    });

    await service.prepareTransaction({
      transactionId: transaction.id,
      partialIntent: {
        rawInput: "Solo cambia la chamarra a negra.",
        targetPath: "jacket.color",
        operation: "SET_ATTRIBUTE",
        desiredValue: "black",
      },
      mutationLeases: [{ targetPath: "jacket", category: "MUTABLE" }],
    });

    await service.executeTransaction(transaction.id);
    await service.verifyTransaction({ transactionId: transaction.id });
    await service.commitTransaction({ transactionId: transaction.id });

    const rollbackVersion = await service.rollbackTransaction({
      transactionId: transaction.id,
      targetVersionId: v1.id,
    });

    expect(rollbackVersion.versionNumber).toBe(3);
    expect(rollbackVersion.state).toEqual({ jacket: { color: "blue" } });

    const allVersions = await repos.assetVersions.findByAssetId(v1.assetId);
    expect(allVersions).toHaveLength(3);
  });

  it("10. PartialIntent does not invent unspecified values", async () => {
    const project = await service.createProject({ name: "Test Project" });
    const { version: v1 } = await service.createAsset({
      projectId: project.id,
      name: "Test Asset",
      initialState: { jacket: { color: "blue" }, pants: { color: "gray" } },
    });

    const transaction = await service.createTransaction({
      projectId: project.id,
      assetId: v1.assetId,
      baseVersionId: v1.id,
      rawRequest: "Solo cambia la chamarra a negra.",
    });

    const prepareResult = await service.prepareTransaction({
      transactionId: transaction.id,
      partialIntent: {
        rawInput: "Solo cambia la chamarra a negra.",
        targetPath: "jacket.color",
        operation: "SET_ATTRIBUTE",
        desiredValue: "black",
      },
      mutationLeases: [{ targetPath: "jacket", category: "MUTABLE" }],
    });

    expect(prepareResult.partialIntent.targetPath).toBe("jacket.color");
    expect(prepareResult.partialIntent.desiredValue).toBe("black");
    expect(prepareResult.partialIntent).not.toHaveProperty("pants");
  });

  it("11. evidence belongs to correct transaction", async () => {
    const project = await service.createProject({ name: "Test Project" });
    const { version: v1 } = await service.createAsset({
      projectId: project.id,
      name: "Test Asset",
      initialState: { jacket: { color: "blue" } },
    });

    const transaction = await service.createTransaction({
      projectId: project.id,
      assetId: v1.assetId,
      baseVersionId: v1.id,
      rawRequest: "Solo cambia la chamarra a negra.",
    });

    await service.prepareTransaction({
      transactionId: transaction.id,
      partialIntent: {
        rawInput: "Solo cambia la chamarra a negra.",
        targetPath: "jacket.color",
        operation: "SET_ATTRIBUTE",
        desiredValue: "black",
      },
      mutationLeases: [{ targetPath: "jacket", category: "MUTABLE" }],
    });

    await service.executeTransaction(transaction.id);

    const evidence = await repos.evidenceReceipts.findByTransactionId(transaction.id);
    expect(evidence.length).toBeGreaterThan(0);
    expect(evidence.every((e) => e.transactionId === transaction.id)).toBe(true);
  });

  it("12. verification belongs to correct execution", async () => {
    const project = await service.createProject({ name: "Test Project" });
    const { version: v1 } = await service.createAsset({
      projectId: project.id,
      name: "Test Asset",
      initialState: { jacket: { color: "blue" } },
    });

    const transaction = await service.createTransaction({
      projectId: project.id,
      assetId: v1.assetId,
      baseVersionId: v1.id,
      rawRequest: "Solo cambia la chamarra a negra.",
    });

    await service.prepareTransaction({
      transactionId: transaction.id,
      partialIntent: {
        rawInput: "Solo cambia la chamarra a negra.",
        targetPath: "jacket.color",
        operation: "SET_ATTRIBUTE",
        desiredValue: "black",
      },
      mutationLeases: [{ targetPath: "jacket", category: "MUTABLE" }],
    });

    const execResults = await service.executeTransaction(transaction.id);
    const verification = await service.verifyTransaction({ transactionId: transaction.id });

    expect(verification.executionRunId).toBe(execResults[0].run.id);
    expect(verification.transactionId).toBe(transaction.id);
  });

  it("13. cost record persists", async () => {
    const project = await service.createProject({ name: "Test Project" });
    const { version: v1 } = await service.createAsset({
      projectId: project.id,
      name: "Test Asset",
      initialState: { jacket: { color: "blue" } },
    });

    const transaction = await service.createTransaction({
      projectId: project.id,
      assetId: v1.assetId,
      baseVersionId: v1.id,
      rawRequest: "Solo cambia la chamarra a negra.",
    });

    await service.prepareTransaction({
      transactionId: transaction.id,
      partialIntent: {
        rawInput: "Solo cambia la chamarra a negra.",
        targetPath: "jacket.color",
        operation: "SET_ATTRIBUTE",
        desiredValue: "black",
      },
      mutationLeases: [{ targetPath: "jacket", category: "MUTABLE" }],
    });

    await service.executeTransaction(transaction.id);

    const costs = await repos.costRecords.findByTransactionId(transaction.id);
    expect(costs.length).toBeGreaterThan(0);
    expect(costs[0].amountUsd).toBeGreaterThan(0);
    expect(costs[0].transactionId).toBe(transaction.id);
  });

  it("14. FakeExecutor cannot mutate canonical state directly", async () => {
    const project = await service.createProject({ name: "Test Project" });
    const { version: v1 } = await service.createAsset({
      projectId: project.id,
      name: "Test Asset",
      initialState: { jacket: { color: "blue" } },
    });

    const originalState = { ...v1.state };
    const executor = new FakeExecutor();

    await executor.execute({
      transactionId: "test-tx",
      patch: {
        id: "patch-1",
        transactionId: "test-tx",
        partialIntentId: "pi-1",
        operation: "SET_ATTRIBUTE",
        targetPath: "jacket.color",
        parameters: { value: "black" },
        createdAt: new Date().toISOString(),
      },
      baseVersion: v1,
    });

    expect(v1.state).toEqual(originalState);
  });

  it("15. canonical state only changes through commit", async () => {
    const project = await service.createProject({ name: "Test Project" });
    const { version: v1 } = await service.createAsset({
      projectId: project.id,
      name: "Test Asset",
      initialState: { jacket: { color: "blue" } },
    });

    const transaction = await service.createTransaction({
      projectId: project.id,
      assetId: v1.assetId,
      baseVersionId: v1.id,
      rawRequest: "Solo cambia la chamarra a negra.",
    });

    await service.prepareTransaction({
      transactionId: transaction.id,
      partialIntent: {
        rawInput: "Solo cambia la chamarra a negra.",
        targetPath: "jacket.color",
        operation: "SET_ATTRIBUTE",
        desiredValue: "black",
      },
      mutationLeases: [{ targetPath: "jacket", category: "MUTABLE" }],
    });

    await service.executeTransaction(transaction.id);

    const { version: beforeCommit } = await service.getAssetState(v1.assetId);
    expect(beforeCommit.state).toEqual({ jacket: { color: "blue" } });

    await service.verifyTransaction({ transactionId: transaction.id });
    await service.commitTransaction({ transactionId: transaction.id });

    const { version: afterCommit } = await service.getAssetState(v1.assetId);
    expect(afterCommit.state).toEqual({ jacket: { color: "black" } });
  });
});

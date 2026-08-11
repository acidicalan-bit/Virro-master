import type { RepositoryBundle } from "@/src/application/ports/repositories";
import type { ExecutorPort } from "@/src/application/ports/outcome/executor-port";
import {
  isValidTransition,
  type TransactionStatus,
  type SemanticPatchOperation,
  type MutationLeaseCategory,
} from "@/src/domain/outcome";

export type PrepareTransactionInput = {
  transactionId: string;
  partialIntent: {
    rawInput: string;
    targetPath: string;
    operation: SemanticPatchOperation;
    desiredValue: unknown;
  };
  mutationLeases: Array<{
    targetPath: string;
    category: MutationLeaseCategory;
    reason?: string | null;
  }>;
};

export type VerifyTransactionInput = {
  transactionId: string;
};

export type CommitTransactionInput = {
  transactionId: string;
};

export type RollbackTransactionInput = {
  transactionId: string;
  targetVersionId: string;
};

export class InvalidTransitionError extends Error {
  constructor(from: TransactionStatus, to: TransactionStatus) {
    super(`Transición inválida de ${from} a ${to}.`);
    this.name = "InvalidTransitionError";
  }
}

export class CommitInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommitInvariantError";
  }
}

export class PatchAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PatchAuthorizationError";
  }
}

export class OutcomeTransactionService {
  constructor(
    private readonly repositories: Pick<
      RepositoryBundle,
      | "projects"
      | "assets"
      | "assetVersions"
      | "outcomeTransactions"
      | "partialIntents"
      | "semanticPatches"
      | "mutationLeases"
      | "executionRuns"
      | "evidenceReceipts"
      | "verificationRuns"
      | "stateCommits"
      | "costRecords"
    >,
    private readonly executor: ExecutorPort,
  ) {}

  async createProject(input: { name: string; description?: string | null }) {
    return this.repositories.projects.create({
      name: input.name,
      description: input.description ?? null,
    });
  }

  async createAsset(input: { projectId: string; name: string; description?: string | null; initialState: Record<string, unknown> }) {
    const asset = await this.repositories.assets.create({
      projectId: input.projectId,
      name: input.name,
      description: input.description ?? null,
    });

    const version = await this.repositories.assetVersions.create({
      assetId: asset.id,
      versionNumber: 1,
      state: input.initialState,
      parentVersionId: null,
    });

    await this.repositories.assets.update(asset.id, { currentVersionId: version.id });
    return { asset, version };
  }

  async getAssetState(assetId: string) {
    const asset = await this.repositories.assets.findById(assetId);
    if (!asset) throw new Error("Activo no encontrado.");
    if (!asset.currentVersionId) throw new Error("El activo no tiene versión actual.");
    const version = await this.repositories.assetVersions.findById(asset.currentVersionId);
    if (!version) throw new Error("Versión actual no encontrada.");
    return { asset, version };
  }

  async createTransaction(input: {
    projectId: string;
    assetId: string;
    baseVersionId: string;
    rawRequest: string;
  }) {
    return this.repositories.outcomeTransactions.create(input);
  }

  async prepareTransaction(input: PrepareTransactionInput) {
    const transaction = await this.repositories.outcomeTransactions.findById(input.transactionId);
    if (!transaction) throw new Error("Transacción no encontrada.");

    if (!isValidTransition(transaction.status, "PREPARED")) {
      throw new InvalidTransitionError(transaction.status, "PREPARED");
    }

    const partialIntent = await this.repositories.partialIntents.create({
      transactionId: input.transactionId,
      rawInput: input.partialIntent.rawInput,
      targetPath: input.partialIntent.targetPath,
      operation: input.partialIntent.operation,
      desiredValue: input.partialIntent.desiredValue,
    });

    const leases = await Promise.all(
      input.mutationLeases.map((lease) =>
        this.repositories.mutationLeases.create({
          transactionId: input.transactionId,
          targetPath: lease.targetPath,
          category: lease.category,
          reason: lease.reason ?? null,
        }),
      ),
    );

    this.validatePatchAgainstLeases(partialIntent.targetPath, leases);

    const semanticPatch = await this.repositories.semanticPatches.create({
      transactionId: input.transactionId,
      partialIntentId: partialIntent.id,
      operation: input.partialIntent.operation,
      targetPath: input.partialIntent.targetPath,
      parameters: { value: input.partialIntent.desiredValue },
    });

    await this.repositories.outcomeTransactions.updateStatus(input.transactionId, "PREPARED");

    return { partialIntent, semanticPatch, leases };
  }

  async executeTransaction(transactionId: string) {
    const transaction = await this.repositories.outcomeTransactions.findById(transactionId);
    if (!transaction) throw new Error("Transacción no encontrada.");

    if (!isValidTransition(transaction.status, "READY")) {
      throw new InvalidTransitionError(transaction.status, "READY");
    }

    await this.repositories.outcomeTransactions.updateStatus(transactionId, "READY");

    const patches = await this.repositories.semanticPatches.findByTransactionId(transactionId);
    if (patches.length === 0) throw new Error("No hay parches semánticos para ejecutar.");

    const baseVersion = await this.repositories.assetVersions.findById(transaction.baseVersionId);
    if (!baseVersion) throw new Error("Versión base no encontrada.");

    if (!isValidTransition(transaction.status, "EXECUTING")) {
      throw new InvalidTransitionError(transaction.status, "EXECUTING");
    }

    await this.repositories.outcomeTransactions.updateStatus(transactionId, "EXECUTING");

    const results = [];
    for (const patch of patches) {
      const result = await this.executor.execute({
        transactionId,
        patch,
        baseVersion,
      });

      await this.repositories.executionRuns.create(result.run);
      await this.repositories.evidenceReceipts.create(result.evidence);
      if (result.run.costUsd !== null) {
        await this.repositories.costRecords.create({
          transactionId,
          executionRunId: result.run.id,
          amountUsd: result.run.costUsd,
          description: `Ejecución ${result.run.executor} - ${patch.operation}`,
        });
      }

      results.push(result);
    }

    await this.repositories.outcomeTransactions.updateStatus(transactionId, "VERIFYING");

    return results;
  }

  async verifyTransaction(input: VerifyTransactionInput) {
    const transaction = await this.repositories.outcomeTransactions.findById(input.transactionId);
    if (!transaction) throw new Error("Transacción no encontrada.");

    if (!isValidTransition(transaction.status, "VERIFIED")) {
      throw new InvalidTransitionError(transaction.status, "VERIFIED");
    }

    const evidenceList = await this.repositories.evidenceReceipts.findByTransactionId(input.transactionId);
    const executionRuns = await this.repositories.executionRuns.findByTransactionId(input.transactionId);
    const patches = await this.repositories.semanticPatches.findByTransactionId(input.transactionId);
    const leases = await this.repositories.mutationLeases.findByTransactionId(input.transactionId);

    const checks: Record<string, boolean> = {};
    const details: Record<string, unknown> = {};

    checks.hasEvidence = evidenceList.length > 0;
    checks.allExecutionsSucceeded = executionRuns.every((r) => r.status === "SUCCESS");
    checks.evidenceMatchesTransaction = evidenceList.every((e) => e.transactionId === input.transactionId);
    checks.baseVersionMatches = evidenceList.every((e) => e.baseVersionId === transaction.baseVersionId);

    const patchTargets = patches.map((p) => p.targetPath);
    const hardLockedPaths = leases.filter((l) => l.category === "HARD_LOCK").map((l) => l.targetPath);
    const unauthorizedPaths = patchTargets.filter((target) =>
      hardLockedPaths.some((locked) => target.startsWith(locked) || locked.startsWith(target)),
    );
    checks.patchWithinLease = unauthorizedPaths.length > 0 ? false : true;
    details.unauthorizedPaths = unauthorizedPaths;

    const allPassed = Object.values(checks).every(Boolean);

    const verification = await this.repositories.verificationRuns.create({
      transactionId: input.transactionId,
      executionRunId: executionRuns[0]?.id ?? "",
      status: allPassed ? "PASSED" : "FAILED",
      checks,
      details,
    });

    if (allPassed) {
      await this.repositories.outcomeTransactions.updateStatus(input.transactionId, "VERIFIED");
    } else {
      await this.repositories.outcomeTransactions.updateStatus(input.transactionId, "FAILED");
    }

    return verification;
  }

  async commitTransaction(input: CommitTransactionInput) {
    const transaction = await this.repositories.outcomeTransactions.findById(input.transactionId);
    if (!transaction) throw new Error("Transacción no encontrada.");

    if (transaction.status !== "VERIFIED") {
      throw new CommitInvariantError("La transacción debe estar VERIFIED para hacer commit.");
    }

    const verificationList = await this.repositories.verificationRuns.findByTransactionId(input.transactionId);
    const latestVerification = verificationList[verificationList.length - 1];
    if (!latestVerification || latestVerification.status !== "PASSED") {
      throw new CommitInvariantError("La verificación no pasó.");
    }

    const evidenceList = await this.repositories.evidenceReceipts.findByTransactionId(input.transactionId);
    if (evidenceList.length === 0) {
      throw new CommitInvariantError("No hay evidencia para hacer commit.");
    }

    const existingCommit = await this.repositories.stateCommits.findByTransactionId(input.transactionId);
    if (existingCommit) {
      throw new CommitInvariantError("La transacción ya hizo commit.");
    }

    const asset = await this.repositories.assets.findById(transaction.assetId);
    if (!asset) throw new Error("Activo no encontrado.");

    if (asset.currentVersionId !== transaction.baseVersionId) {
      throw new CommitInvariantError(
        "La versión base no coincide con la cabeza del activo. Conflicto de escritura stale.",
      );
    }

    const executionResults = await this.getExecutionResults(input.transactionId);
    if (executionResults.length === 0) {
      throw new CommitInvariantError("No hay resultados de ejecución.");
    }

    const baseVersion = await this.repositories.assetVersions.findById(transaction.baseVersionId);
    if (!baseVersion) throw new Error("Versión base no encontrada.");

    const patches = await this.repositories.semanticPatches.findByTransactionId(input.transactionId);
    let currentState = structuredClone(baseVersion.state);
    for (const patch of patches) {
      currentState = this.applyPatchToState(currentState, patch);
    }

    const latestVersion = await this.repositories.assetVersions.findLatestByAssetId(asset.id);
    const newVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

    const newVersion = await this.repositories.assetVersions.create({
      assetId: asset.id,
      versionNumber: newVersionNumber,
      state: currentState,
      parentVersionId: asset.currentVersionId,
    });

    await this.repositories.assets.update(asset.id, { currentVersionId: newVersion.id });

    const stateCommit = await this.repositories.stateCommits.create({
      transactionId: input.transactionId,
      assetId: asset.id,
      newVersionId: newVersion.id,
      previousVersionId: asset.currentVersionId!,
    });

    await this.repositories.outcomeTransactions.updateStatus(
      input.transactionId,
      "COMMITTED",
      { completedAt: new Date().toISOString() },
    );

    return { stateCommit, newVersion };
  }

  async abortTransaction(transactionId: string, reason?: string) {
    const transaction = await this.repositories.outcomeTransactions.findById(transactionId);
    if (!transaction) throw new Error("Transacción no encontrada.");

    if (!isValidTransition(transaction.status, "ABORTED")) {
      throw new InvalidTransitionError(transaction.status, "ABORTED");
    }

    await this.repositories.outcomeTransactions.updateStatus(transactionId, "ABORTED", {
      abortReason: reason ?? null,
      completedAt: new Date().toISOString(),
    });

    return this.repositories.outcomeTransactions.findById(transactionId);
  }

  async rollbackTransaction(input: RollbackTransactionInput) {
    const transaction = await this.repositories.outcomeTransactions.findById(input.transactionId);
    if (!transaction) throw new Error("Transacción no encontrada.");

    const asset = await this.repositories.assets.findById(transaction.assetId);
    if (!asset) throw new Error("Activo no encontrado.");

    const targetVersion = await this.repositories.assetVersions.findById(input.targetVersionId);
    if (!targetVersion) throw new Error("Versión objetivo no encontrada.");

    const latestVersion = await this.repositories.assetVersions.findLatestByAssetId(asset.id);
    const newVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

    const rollbackVersion = await this.repositories.assetVersions.create({
      assetId: asset.id,
      versionNumber: newVersionNumber,
      state: structuredClone(targetVersion.state),
      parentVersionId: asset.currentVersionId,
    });

    await this.repositories.assets.update(asset.id, { currentVersionId: rollbackVersion.id });

    return rollbackVersion;
  }

  private validatePatchAgainstLeases(
    targetPath: string,
    leases: Array<{ targetPath: string; category: MutationLeaseCategory }>,
  ): void {
    for (const lease of leases) {
      const isTarget =
        targetPath === lease.targetPath ||
        targetPath.startsWith(lease.targetPath + ".") ||
        lease.targetPath.startsWith(targetPath + ".");

      if (isTarget && lease.category === "HARD_LOCK") {
        throw new PatchAuthorizationError(
          `El camino ${targetPath} está protegido por HARD_LOCK.`,
        );
      }
    }
  }

  private applyPatchToState(
    state: Record<string, unknown>,
    patch: { operation: SemanticPatchOperation; targetPath: string; parameters: Record<string, unknown> },
  ): Record<string, unknown> {
    const next = structuredClone(state);
    const { operation, targetPath, parameters } = patch;

    switch (operation) {
      case "SET_ATTRIBUTE":
        this.setNestedValue(next, targetPath, parameters.value);
        break;
      case "DELETE_ENTITY":
        this.deleteNestedValue(next, targetPath);
        break;
      case "TRANSFORM_ENTITY": {
        const current = this.getNestedValue(next, targetPath);
        if (typeof current === "string" && parameters.transform === "uppercase") {
          this.setNestedValue(next, targetPath, current.toUpperCase());
        } else if (typeof current === "string" && parameters.transform === "lowercase") {
          this.setNestedValue(next, targetPath, current.toLowerCase());
        } else {
          this.setNestedValue(next, targetPath, current);
        }
        break;
      }
      case "ADJUST_ATTRIBUTE": {
        const current = this.getNestedValue(next, targetPath);
        if (typeof current === "number" && typeof parameters.delta === "number") {
          this.setNestedValue(next, targetPath, current + parameters.delta);
        } else {
          this.setNestedValue(next, targetPath, parameters.value ?? current);
        }
        break;
      }
    }

    return next;
  }

  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const keys = path.split(".");
    let current: Record<string, unknown> = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (typeof current[key] !== "object" || current[key] === null) {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }
    current[keys[keys.length - 1]] = value;
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const keys = path.split(".");
    let current: unknown = obj;
    for (const key of keys) {
      if (typeof current !== "object" || current === null) return undefined;
      current = (current as Record<string, unknown>)[key];
    }
    return current;
  }

  private deleteNestedValue(obj: Record<string, unknown>, path: string): void {
    const keys = path.split(".");
    let current: Record<string, unknown> = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (typeof current[key] !== "object" || current[key] === null) return;
      current = current[key] as Record<string, unknown>;
    }
    delete current[keys[keys.length - 1]];
  }

  private async getExecutionResults(transactionId: string) {
    const runs = await this.repositories.executionRuns.findByTransactionId(transactionId);
    return runs.map((run) => ({
      runId: run.id,
      newState: {} as Record<string, unknown>,
    }));
  }
}

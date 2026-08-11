import type {
  ExecutionContext,
  ExecutionResult,
  ExecutorPort,
} from "@/src/application/ports/outcome/executor-port";
import type {
  ExecutionRun,
  EvidenceReceipt,
  SemanticPatchOperation,
} from "@/src/domain/outcome";

export class FakeExecutor implements ExecutorPort {
  readonly name = "fake-executor";

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const { transactionId, patch, baseVersion } = context;
    const startedAt = new Date();

    const newState = this.applyPatch(baseVersion.state, patch);

    const completedAt = new Date(startedAt.getTime() + 100);
    const latencyMs = completedAt.getTime() - startedAt.getTime();

    const run: ExecutionRun = {
      id: crypto.randomUUID(),
      transactionId,
      status: "SUCCESS",
      executor: this.name,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      latencyMs,
      costUsd: 0.001,
      errorMessage: null,
      metadata: { simulated: true, operation: patch.operation },
    };

    const evidence: EvidenceReceipt = {
      id: crypto.randomUUID(),
      transactionId,
      executionRunId: run.id,
      baseVersionId: baseVersion.id,
      operation: patch.operation,
      target: patch.targetPath,
      requestedEffect: patch.parameters,
      observedEffect: this.extractEffect(newState, patch.targetPath),
      executor: this.name,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      costUsd: run.costUsd,
      success: true,
    };

    return { run, evidence, newState };
  }

  private applyPatch(
    state: Record<string, unknown>,
    patch: { operation: SemanticPatchOperation; targetPath: string; parameters: Record<string, unknown> },
  ): Record<string, unknown> {
    const next = structuredClone(state);
    const { operation, targetPath, parameters } = patch;

    switch (operation) {
      case "SET_ATTRIBUTE": {
        this.setNestedValue(next, targetPath, parameters.value);
        break;
      }
      case "DELETE_ENTITY": {
        this.deleteNestedValue(next, targetPath);
        break;
      }
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

  private extractEffect(state: Record<string, unknown>, targetPath: string): unknown {
    return this.getNestedValue(state, targetPath);
  }
}

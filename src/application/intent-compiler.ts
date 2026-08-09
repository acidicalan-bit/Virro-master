import { z } from "zod";

import type { IntentModel } from "@/src/application/ports/intent-model";
import type {
  IntentModelFailureRepository,
  IntentRunRepository,
} from "@/src/application/ports/repositories";
import { analyzePragmatics } from "@/src/domain/human-pragmatics";
import {
  CompileIntentInputSchema,
  IntentContractSchema,
  type CompileIntentInput,
} from "@/src/domain/intent-contract";
import { estimateModelCost } from "@/src/domain/model-pricing";
import { logEvent } from "@/src/infrastructure/observability/logger";

export type CompileIntentResult = {
  contract: z.infer<typeof IntentContractSchema>;
  runId: string;
  metadata: {
    provider: string;
    modelName: string;
    modelVersion: string | null;
    latencyMs: number;
    providerLatencyMs: number | null;
    compilerVersion: string;
    systemInstructionVersion: string;
    schemaVersion: string;
    usage: {
      inputTokens: number | null;
      cachedInputTokens: number | null;
      outputTokens: number | null;
      reasoningTokens: number | null;
      totalTokens: number | null;
    } | null;
    estimatedCostUsd: number | null;
    pricingVersion: string | null;
  };
};

export class IntentCompilationFailure extends Error {
  constructor(
    message: string,
    readonly failureId: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "IntentCompilationFailure";
  }
}

export class IntentCompiler {
  constructor(
    private readonly model: IntentModel,
    private readonly runs: IntentRunRepository,
    private readonly compilerVersion = process.env.INTENT_COMPILER_VERSION?.trim() || "0.1.0",
    private readonly failures?: IntentModelFailureRepository,
  ) {}

  async compile(untrustedInput: CompileIntentInput): Promise<CompileIntentResult> {
    const input = CompileIntentInputSchema.parse(untrustedInput);
    const startedAt = performance.now();
    logEvent("compilation_started", { compilerVersion: this.compilerVersion });

    try {
      const pragmatics = analyzePragmatics(input);
      const modelResult = await this.model.compile(input, pragmatics);
      const validation = IntentContractSchema.safeParse(modelResult.contract);
      if (!validation.success) {
        logEvent("validation_failed", { issues: validation.error.issues.length });
        throw validation.error;
      }

      const latencyMs = Math.max(0, Math.round(performance.now() - startedAt));
      const systemInstructionVersion =
        modelResult.systemInstructionVersion ??
        this.model.descriptor?.systemInstructionVersion ??
        "not-applicable";
      const cost = estimateModelCost(
        modelResult.provider,
        modelResult.modelName,
        modelResult.usage,
      );
      const record = await this.runs.create({
        rawInput: input.rawInput,
        context: input.context,
        compiledContract: validation.data,
        compilerVersion: this.compilerVersion,
        modelProvider: modelResult.provider,
        modelName: modelResult.modelName,
        modelVersion: modelResult.modelVersion,
        systemInstructionVersion,
        latencyMs,
        providerLatencyMs: modelResult.providerLatencyMs ?? null,
        usage: modelResult.usage,
        estimatedCostUsd: cost?.estimatedCostUsd ?? null,
        pricingVersion: cost?.pricingVersion ?? null,
      });

      logEvent("compilation_succeeded", {
        runId: record.id,
        provider: modelResult.provider,
        model: modelResult.modelName,
        latencyMs,
      });

      return {
        contract: validation.data,
        runId: record.id,
        metadata: {
          provider: modelResult.provider,
          modelName: modelResult.modelName,
          modelVersion: modelResult.modelVersion,
          latencyMs,
          providerLatencyMs: modelResult.providerLatencyMs ?? null,
          compilerVersion: this.compilerVersion,
          systemInstructionVersion,
          schemaVersion: validation.data.schemaVersion,
          usage: modelResult.usage,
          estimatedCostUsd: cost?.estimatedCostUsd ?? null,
          pricingVersion: cost?.pricingVersion ?? null,
        },
      };
    } catch (error) {
      const latencyMs = Math.max(0, Math.round(performance.now() - startedAt));
      const errorName = error instanceof Error ? error.name : "UnknownError";
      logEvent("compilation_failed", {
        errorName,
        provider: this.model.descriptor?.provider ?? "unknown",
        model: this.model.descriptor?.modelName ?? "unknown",
        latencyMs,
      });

      if (!this.failures) throw error;

      try {
        const failure = await this.failures.create({
          rawInput: input.rawInput,
          context: input.context,
          compilerVersion: this.compilerVersion,
          modelProvider: this.model.descriptor?.provider ?? "unknown",
          modelName: this.model.descriptor?.modelName ?? "unknown",
          modelVersion: this.model.descriptor?.modelVersion ?? null,
          systemInstructionVersion:
            this.model.descriptor?.systemInstructionVersion ?? "not-applicable",
          latencyMs,
          failureType: errorName,
          failureMessage: sanitizeFailureMessage(error),
        });
        throw new IntentCompilationFailure(
          error instanceof Error ? error.message : "La compilación falló.",
          failure.id,
          { cause: error },
        );
      } catch (failurePersistenceError) {
        if (failurePersistenceError instanceof IntentCompilationFailure) {
          throw failurePersistenceError;
        }
        logEvent("failure_persistence_failed", {
          errorName:
            failurePersistenceError instanceof Error
              ? failurePersistenceError.name
              : "UnknownError",
        });
        throw error;
      }
    }
  }
}

function sanitizeFailureMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown provider failure";
  return message.replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]").slice(0, 1_000);
}

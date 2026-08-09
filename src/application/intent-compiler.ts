import { z } from "zod";

import type { IntentModel } from "@/src/application/ports/intent-model";
import type { IntentRunRepository } from "@/src/application/ports/repositories";
import { analyzePragmatics } from "@/src/domain/human-pragmatics";
import {
  CompileIntentInputSchema,
  IntentContractSchema,
  type CompileIntentInput,
} from "@/src/domain/intent-contract";
import { logEvent } from "@/src/infrastructure/observability/logger";

export type CompileIntentResult = {
  contract: z.infer<typeof IntentContractSchema>;
  runId: string;
  metadata: {
    provider: string;
    modelName: string;
    modelVersion: string | null;
    latencyMs: number;
    compilerVersion: string;
    schemaVersion: string;
    usage: { inputTokens: number | null; outputTokens: number | null; totalTokens: number | null } | null;
  };
};

export class IntentCompiler {
  constructor(
    private readonly model: IntentModel,
    private readonly runs: IntentRunRepository,
    private readonly compilerVersion = process.env.INTENT_COMPILER_VERSION?.trim() || "0.1.0",
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
      const record = await this.runs.create({
        rawInput: input.rawInput,
        context: input.context,
        compiledContract: validation.data,
        compilerVersion: this.compilerVersion,
        modelProvider: modelResult.provider,
        modelName: modelResult.modelName,
        modelVersion: modelResult.modelVersion,
        latencyMs,
        usage: modelResult.usage,
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
          compilerVersion: this.compilerVersion,
          schemaVersion: validation.data.schemaVersion,
          usage: modelResult.usage,
        },
      };
    } catch (error) {
      logEvent("compilation_failed", { errorName: error instanceof Error ? error.name : "UnknownError" });
      throw error;
    }
  }
}

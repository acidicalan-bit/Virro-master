import type {
  IntentModel,
  IntentModelDescriptor,
} from "@/src/application/ports/intent-model";
import type { PragmaticAnalysis } from "@/src/domain/human-pragmatics";
import type { CompileIntentInput } from "@/src/domain/intent-contract";
import { HeuristicIntentModel } from "@/src/infrastructure/models/heuristic-intent-model";

export const HEURISTIC_BASELINE_REVISION = "1d3353c";
export const HEURISTIC_BASELINE_SYSTEM_VERSION = "heuristic-baseline-0.1.0";

export class FrozenHeuristicBaselineModel implements IntentModel {
  readonly descriptor: IntentModelDescriptor = {
    provider: "intent-lab",
    modelName: "contextual-heuristic",
    modelVersion: "0.1.0",
    systemInstructionVersion: HEURISTIC_BASELINE_SYSTEM_VERSION,
  };

  private readonly baseline = new HeuristicIntentModel();

  async compile(input: CompileIntentInput, pragmatics: PragmaticAnalysis) {
    const startedAt = performance.now();
    const result = await this.baseline.compile(input, pragmatics);
    return {
      ...result,
      providerLatencyMs: Math.max(0, Math.round(performance.now() - startedAt)),
      systemInstructionVersion: HEURISTIC_BASELINE_SYSTEM_VERSION,
    };
  }
}

import { createHash, randomInt } from "node:crypto";

import {
  IntentCompilationFailure,
  IntentCompiler,
} from "@/src/application/intent-compiler";
import type { IntentModel } from "@/src/application/ports/intent-model";
import type {
  BlindEvaluationCaseRecord,
  BlindEvaluationComparisonRecord,
  BlindEvaluationRepository,
  BlindEvaluationSessionRecord,
  BlindEvaluationSetRecord,
  IntentModelFailureRepository,
  IntentRunRecord,
  IntentRunRepository,
} from "@/src/application/ports/repositories";
import {
  BlindEvaluationSetImportSchema,
  BlindJudgmentInputSchema,
  type BlindEvaluationSetImport,
  type BlindJudgmentInput,
  type BlindResponse,
} from "@/src/domain/blind-evaluation";
import { HEURISTIC_BASELINE_REVISION } from "@/src/infrastructure/models/frozen-heuristic-baseline-model";

type CompilationReference =
  | { runId: string; failureId: null }
  | { runId: null; failureId: string };

export type BlindEvaluationSetSummary = Pick<
  BlindEvaluationSetRecord,
  "id" | "slug" | "name" | "description" | "sourceLabel" | "isDemo" | "caseCount" | "frozenAt"
>;

export type BlindComparisonView = {
  id: string;
  caseNumber: number;
  totalCases: number;
  case: {
    rawInput: string;
    context: string | null;
    domain: string | null;
  };
  responseA: BlindResponse;
  responseB: BlindResponse;
};

export type BlindSessionReveal = {
  baseline: {
    provider: string;
    model: string;
    modelVersion: string | null;
    revision: string;
    systemInstructionVersion: string;
  };
  candidate: {
    provider: string;
    model: string;
    modelVersion: string | null;
    systemInstructionVersion: string;
  };
  cases: Array<{
    comparisonId: string;
    externalId: string;
    responseASource: "BASELINE" | "CANDIDATE";
    responseBSource: "BASELINE" | "CANDIDATE";
    privateEvaluatorNotes: string | null;
    expectedHighLevelBehavior: string | null;
    responseAMetadata: RevealedRunMetadata | null;
    responseBMetadata: RevealedRunMetadata | null;
  }>;
};

type RevealedRunMetadata = {
  provider: string;
  model: string;
  modelVersion: string | null;
  latencyMs: number;
  providerLatencyMs: number | null;
  usage: IntentRunRecord["usage"];
  estimatedCostUsd: number | null;
  pricingVersion: string | null;
};

export type BlindSessionView = {
  sessionId: string;
  status: "IN_PROGRESS" | "COMPLETED";
  progress: { completed: number; total: number };
  comparison: BlindComparisonView | null;
  reveal: BlindSessionReveal | null;
};

export class BlindEvaluationCatalogService {
  constructor(private readonly evaluations: BlindEvaluationRepository) {}

  async importSet(untrustedInput: unknown): Promise<BlindEvaluationSetSummary> {
    const input = BlindEvaluationSetImportSchema.parse(untrustedInput);
    const contentHash = hashEvaluationSet(input);
    return toSetSummary(await this.evaluations.importSet(input, contentHash));
  }

  async listSets(): Promise<BlindEvaluationSetSummary[]> {
    return (await this.evaluations.listSets()).map(toSetSummary);
  }
}

export class BlindEvaluationService {
  constructor(
    private readonly baseline: IntentModel,
    private readonly candidate: IntentModel,
    private readonly evaluations: BlindEvaluationRepository,
    private readonly runs: IntentRunRepository,
    private readonly failures: IntentModelFailureRepository,
    private readonly compilerVersion = process.env.INTENT_COMPILER_VERSION?.trim() || "0.1.1",
    private readonly randomizeAFirst = () => randomInt(0, 2) === 0,
  ) {}

  async startSession(evaluationSetId: string): Promise<BlindSessionView> {
    const set = await this.evaluations.findSetById(evaluationSetId);
    if (!set) throw new Error("El set de evaluación no existe.");
    const baseline = requireDescriptor(this.baseline, "baseline");
    const candidate = requireDescriptor(this.candidate, "candidate");
    if (candidate.provider === baseline.provider && candidate.modelName === baseline.modelName) {
      throw new Error("La evaluación ciega requiere un candidato distinto del baseline.");
    }
    if (candidate.provider !== "openai") {
      throw new Error("Build 001.1 requiere OpenAI como candidato real.");
    }

    const session = await this.evaluations.createSession({
      evaluationSetId,
      compilerVersion: this.compilerVersion,
      baselineProvider: baseline.provider,
      baselineModel: baseline.modelName,
      baselineModelVersion: baseline.modelVersion,
      baselineRevision: HEURISTIC_BASELINE_REVISION,
      baselineSystemInstructionVersion: baseline.systemInstructionVersion,
      candidateProvider: candidate.provider,
      candidateModel: candidate.modelName,
      candidateModelVersion: candidate.modelVersion,
      candidateSystemInstructionVersion: candidate.systemInstructionVersion,
    });
    return this.getSessionView(session.id);
  }

  async getSessionView(sessionId: string): Promise<BlindSessionView> {
    let session = await this.requireSession(sessionId);
    const cases = await this.evaluations.listCases(session.evaluationSetId);
    const comparisons = await this.evaluations.listComparisons(session.id);
    const judgments = await Promise.all(
      comparisons.map((comparison) =>
        this.evaluations.findJudgmentByComparisonId(comparison.id),
      ),
    );
    const completed = judgments.filter(Boolean).length;

    if (completed === cases.length && cases.length > 0) {
      if (session.status !== "COMPLETED") {
        session = await this.evaluations.completeSession(session.id);
      }
      return {
        sessionId: session.id,
        status: "COMPLETED",
        progress: { completed, total: cases.length },
        comparison: null,
        reveal: await this.buildReveal(session, cases, comparisons),
      };
    }

    if (session.status === "COMPLETED") {
      throw new Error("La sesión completada tiene un conteo de juicios inconsistente.");
    }

    const openComparison = comparisons.find((_, index) => !judgments[index]);
    if (openComparison) {
      return {
        sessionId: session.id,
        status: "IN_PROGRESS",
        progress: { completed, total: cases.length },
        comparison: await this.buildComparisonView(openComparison, cases),
        reveal: null,
      };
    }

    const comparedCaseIds = new Set(comparisons.map((comparison) => comparison.evaluationCaseId));
    const nextCase = cases.find((item) => !comparedCaseIds.has(item.id));
    if (!nextCase) throw new Error("No quedan casos, pero la sesión no puede completarse.");

    this.assertFrozenVersions(session);
    const comparison = await this.compileComparison(session, nextCase);
    return {
      sessionId: session.id,
      status: "IN_PROGRESS",
      progress: { completed, total: cases.length },
      comparison: await this.buildComparisonView(comparison, cases),
      reveal: null,
    };
  }

  async submitJudgment(untrustedInput: unknown): Promise<BlindSessionView> {
    const input = BlindJudgmentInputSchema.parse(untrustedInput);
    const comparison = await this.evaluations.findComparisonById(input.comparisonId);
    if (!comparison) throw new Error("La comparación no existe.");
    const session = await this.requireSession(comparison.sessionId);
    if (session.status !== "IN_PROGRESS") throw new Error("La sesión ya está cerrada.");

    await this.evaluations.createJudgment(toJudgmentCreate(input));
    return this.getSessionView(session.id);
  }

  private async compileComparison(
    session: BlindEvaluationSessionRecord,
    evaluationCase: BlindEvaluationCaseRecord,
  ) {
    const input = { rawInput: evaluationCase.rawInput, context: evaluationCase.context };
    const baselineCompiler = new IntentCompiler(
      this.baseline,
      this.runs,
      session.compilerVersion,
      this.failures,
    );
    const candidateCompiler = new IntentCompiler(
      this.candidate,
      this.runs,
      session.compilerVersion,
      this.failures,
    );
    const [baseline, candidate] = await Promise.all([
      compileReference(baselineCompiler, input),
      compileReference(candidateCompiler, input),
    ]);
    const baselineFirst = this.randomizeAFirst();
    const responseA = baselineFirst ? baseline : candidate;
    const responseB = baselineFirst ? candidate : baseline;

    return this.evaluations.createComparison({
      sessionId: session.id,
      evaluationCaseId: evaluationCase.id,
      responseARunId: responseA.runId,
      responseAFailureId: responseA.failureId,
      responseASource: baselineFirst ? "BASELINE" : "CANDIDATE",
      responseBRunId: responseB.runId,
      responseBFailureId: responseB.failureId,
      responseBSource: baselineFirst ? "CANDIDATE" : "BASELINE",
    });
  }

  private async buildComparisonView(
    comparison: BlindEvaluationComparisonRecord,
    cases: BlindEvaluationCaseRecord[],
  ): Promise<BlindComparisonView> {
    const evaluationCase = cases.find((item) => item.id === comparison.evaluationCaseId);
    if (!evaluationCase) throw new Error("La comparación apunta a un caso inexistente.");
    const [responseA, responseB] = await Promise.all([
      this.loadBlindResponse(comparison.responseARunId, comparison.responseAFailureId),
      this.loadBlindResponse(comparison.responseBRunId, comparison.responseBFailureId),
    ]);
    return {
      id: comparison.id,
      caseNumber: evaluationCase.position + 1,
      totalCases: cases.length,
      case: {
        rawInput: evaluationCase.rawInput,
        context: evaluationCase.context,
        domain: evaluationCase.domain,
      },
      responseA,
      responseB,
    };
  }

  private async loadBlindResponse(
    runId: string | null,
    failureId: string | null,
  ): Promise<BlindResponse> {
    if (runId) {
      const run = await this.runs.findById(runId);
      if (!run) throw new Error("No se encontró el resultado de la comparación.");
      return { status: "SUCCESS", contract: run.compiledContract };
    }
    if (failureId) {
      const failure = await this.failures.findById(failureId);
      if (!failure) throw new Error("No se encontró el fallo de la comparación.");
      return {
        status: "PROVIDER_FAILURE",
        message: "Esta respuesta no produjo un Intent Contract válido.",
      };
    }
    throw new Error("La comparación no contiene un resultado válido.");
  }

  private async buildReveal(
    session: BlindEvaluationSessionRecord,
    cases: BlindEvaluationCaseRecord[],
    comparisons: BlindEvaluationComparisonRecord[],
  ): Promise<BlindSessionReveal> {
    return {
      baseline: {
        provider: session.baselineProvider,
        model: session.baselineModel,
        modelVersion: session.baselineModelVersion,
        revision: session.baselineRevision,
        systemInstructionVersion: session.baselineSystemInstructionVersion,
      },
      candidate: {
        provider: session.candidateProvider,
        model: session.candidateModel,
        modelVersion: session.candidateModelVersion,
        systemInstructionVersion: session.candidateSystemInstructionVersion,
      },
      cases: await Promise.all(
        comparisons.map(async (comparison) => {
          const evaluationCase = cases.find((item) => item.id === comparison.evaluationCaseId);
          if (!evaluationCase) throw new Error("La comparación apunta a un caso inexistente.");
          return {
            comparisonId: comparison.id,
            externalId: evaluationCase.externalId,
            responseASource: comparison.responseASource,
            responseBSource: comparison.responseBSource,
            privateEvaluatorNotes: evaluationCase.privateEvaluatorNotes,
            expectedHighLevelBehavior: evaluationCase.expectedHighLevelBehavior,
            responseAMetadata: await this.loadRevealedMetadata(comparison.responseARunId),
            responseBMetadata: await this.loadRevealedMetadata(comparison.responseBRunId),
          };
        }),
      ),
    };
  }

  private async loadRevealedMetadata(runId: string | null): Promise<RevealedRunMetadata | null> {
    if (!runId) return null;
    const run = await this.runs.findById(runId);
    if (!run) throw new Error("No se encontró un intent run revelado.");
    return {
      provider: run.modelProvider,
      model: run.modelName,
      modelVersion: run.modelVersion,
      latencyMs: run.latencyMs,
      providerLatencyMs: run.providerLatencyMs,
      usage: run.usage,
      estimatedCostUsd: run.estimatedCostUsd,
      pricingVersion: run.pricingVersion,
    };
  }

  private assertFrozenVersions(session: BlindEvaluationSessionRecord) {
    const baseline = requireDescriptor(this.baseline, "baseline");
    const candidate = requireDescriptor(this.candidate, "candidate");
    const currentCompilerVersion =
      process.env.INTENT_COMPILER_VERSION?.trim() || this.compilerVersion;
    if (
      currentCompilerVersion !== session.compilerVersion ||
      baseline.provider !== session.baselineProvider ||
      baseline.modelName !== session.baselineModel ||
      baseline.modelVersion !== session.baselineModelVersion ||
      baseline.systemInstructionVersion !== session.baselineSystemInstructionVersion ||
      candidate.provider !== session.candidateProvider ||
      candidate.modelName !== session.candidateModel ||
      candidate.modelVersion !== session.candidateModelVersion ||
      candidate.systemInstructionVersion !== session.candidateSystemInstructionVersion
    ) {
      throw new Error(
        "La configuración cambió después de iniciar la sesión; no se ejecutará un experimento con versiones mezcladas.",
      );
    }
  }

  private async requireSession(id: string) {
    const session = await this.evaluations.findSessionById(id);
    if (!session) throw new Error("La sesión de evaluación no existe.");
    return session;
  }
}

function hashEvaluationSet(input: BlindEvaluationSetImport): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function requireDescriptor(model: IntentModel, role: string) {
  if (!model.descriptor) {
    throw new Error(`El modelo ${role} no expone una identidad versionada.`);
  }
  return model.descriptor;
}

async function compileReference(
  compiler: IntentCompiler,
  input: { rawInput: string; context: string | null },
): Promise<CompilationReference> {
  try {
    const result = await compiler.compile(input);
    return { runId: result.runId, failureId: null };
  } catch (error) {
    if (error instanceof IntentCompilationFailure) {
      return { runId: null, failureId: error.failureId };
    }
    throw error;
  }
}

function toSetSummary(set: BlindEvaluationSetRecord): BlindEvaluationSetSummary {
  return {
    id: set.id,
    slug: set.slug,
    name: set.name,
    description: set.description,
    sourceLabel: set.sourceLabel,
    isDemo: set.isDemo,
    caseCount: set.caseCount,
    frozenAt: set.frozenAt,
  };
}

function toJudgmentCreate(input: BlindJudgmentInput) {
  return {
    comparisonId: input.comparisonId,
    preference: input.preference,
    ratingsA: input.ratingsA,
    ratingsB: input.ratingsB,
    evaluatorNotes: input.evaluatorNotes,
    errorTags: input.errorTags,
    correctedIntent: input.correctedIntent,
  };
}

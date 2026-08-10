import { createHash, randomInt } from "node:crypto";

import {
  IntentCompilationFailure,
  IntentCompiler,
} from "@/src/application/intent-compiler";
import type { IntentModel } from "@/src/application/ports/intent-model";
import type {
  BlindEvaluationCaseRecord,
  BlindEvaluationComparisonRecord,
  BlindEvaluationHumanIntentRecord,
  BlindEvaluationRepository,
  BlindEvaluationSessionRecord,
  BlindEvaluationSetRecord,
  BlindEvaluationStepRatingRecord,
  IntentModelFailureRecord,
  IntentModelFailureRepository,
  IntentRunRecord,
  IntentRunRepository,
} from "@/src/application/ports/repositories";
import {
  BlindEvaluationSetImportSchema,
  BlindJudgmentInputSchema,
  HumanIntentSubmissionSchema,
  StepRatingSubmissionSchema,
  type BlindEvaluationErrorTag,
  type BlindEvaluationSetImport,
  type BlindRatings,
  type BlindResponse,
  type EvaluationStep,
} from "@/src/domain/blind-evaluation";
import { HEURISTIC_BASELINE_REVISION } from "@/src/infrastructure/models/frozen-heuristic-baseline-model";
import type { InteractionMode, IntentContract } from "@/src/domain/intent-contract";

type CompilationReference =
  | { runId: string; failureId: null }
  | { runId: null; failureId: string };

export type BlindEvaluationSetSummary = Pick<
  BlindEvaluationSetRecord,
  "id" | "slug" | "name" | "description" | "sourceLabel" | "isDemo" | "caseCount" | "frozenAt"
>;

export type BlindCaseView = {
  rawInput: string;
  context: string | null;
  domain: string | null;
};

export type HumanIntentSummary = {
  intendedMeaning: string;
  expectedNextAction: InteractionMode;
  preservationNotes: string | null;
  recordedAt: string;
  lockedAt: string;
};

export type StepRatingSummary = {
  ratings: BlindRatings;
  errorTags: BlindEvaluationErrorTag[];
  evaluatorNotes: string | null;
  recordedAt: string;
};

export type BlindComparisonView = {
  id: string;
  sessionId: string;
  evaluationCaseId: string;
  caseNumber: number;
  totalCases: number;
  case: BlindCaseView;
  responseA: BlindResponse;
  responseB: BlindResponse;
};

export type BlindSessionMetrics = {
  humanIntentMatchScore: { baseline: number | null; candidate: number | null };
  interactionModeAccuracy: { baseline: number | null; candidate: number | null };
  humanPreservationScore: { baseline: number | null; candidate: number | null };
  averageIndependentScore: { baseline: number; candidate: number };
  bothGoodRate: number;
  bothBadRate: number;
  providerFailureRate: number;
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
  metrics: BlindSessionMetrics;
  cases: Array<{
    comparisonId: string;
    externalId: string;
    responseASource: "BASELINE" | "CANDIDATE";
    responseBSource: "BASELINE" | "CANDIDATE";
    privateEvaluatorNotes: string | null;
    expectedHighLevelBehavior: string | null;
    humanIntent: HumanIntentSummary | null;
    stepRating1: StepRatingSummary | null;
    stepRating2: StepRatingSummary | null;
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
  step: EvaluationStep | null;
  evaluationCaseId: string | null;
  case: BlindCaseView | null;
  humanIntent: HumanIntentSummary | null;
  comparison: BlindComparisonView | null;
  stepRating1: StepRatingSummary | null;
  stepRating2: StepRatingSummary | null;
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
    const session = await this.requireSession(sessionId);
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
        await this.evaluations.completeSession(session.id);
      }
      const completedSession = await this.evaluations.findSessionById(session.id);
      if (!completedSession) throw new Error("La sesión desapareció tras completarse.");
      return {
        sessionId: completedSession.id,
        status: "COMPLETED",
        progress: { completed, total: cases.length },
        step: null,
        evaluationCaseId: null,
        case: null,
        humanIntent: null,
        comparison: null,
        stepRating1: null,
        stepRating2: null,
        reveal: await this.buildReveal(completedSession, cases, comparisons),
      };
    }

    if (session.status === "COMPLETED") {
      throw new Error("La sesión completada tiene un conteo de juicios inconsistente.");
    }

    const openComparisonIndex = comparisons.findIndex(
      (_, index) => !judgments[index],
    );
    const openComparison =
      openComparisonIndex >= 0 ? comparisons[openComparisonIndex] : null;

    if (openComparison) {
      return this.buildActiveCaseView(session, cases, openComparison, completed);
    }

    const comparedCaseIds = new Set(comparisons.map((comparison) => comparison.evaluationCaseId));
    const nextCase = cases.find((item) => !comparedCaseIds.has(item.id));
    if (!nextCase) throw new Error("No quedan casos, pero la sesión no puede completarse.");

    return {
      sessionId: session.id,
      status: "IN_PROGRESS",
      progress: { completed, total: cases.length },
      step: "HUMAN_INTENT",
      evaluationCaseId: nextCase.id,
      case: toCaseView(nextCase),
      humanIntent: null,
      comparison: null,
      stepRating1: null,
      stepRating2: null,
      reveal: null,
    };
  }

  async submitHumanIntent(untrustedInput: unknown): Promise<BlindSessionView> {
    const input = HumanIntentSubmissionSchema.parse(untrustedInput);
    const session = await this.requireSession(input.sessionId);

    const cases = await this.evaluations.listCases(session.evaluationSetId);
    const evaluationCase = cases.find((item) => item.id === input.evaluationCaseId);
    if (!evaluationCase) {
      throw new Error("El caso de evaluación no pertenece a esta sesión.");
    }

    const existingIntent = await this.evaluations.findHumanIntentBySessionAndCaseId(
      input.sessionId,
      input.evaluationCaseId,
    );
    if (existingIntent) {
      throw new Error("El intent humano ya fue registrado e inmutablemente para este caso.");
    }

    this.assertFrozenVersions(session);
    const comparison = await this.compileComparison(session, evaluationCase);

    const humanIntent = await this.evaluations.createHumanIntent({
      sessionId: input.sessionId,
      evaluationCaseId: input.evaluationCaseId,
      intendedMeaning: input.intendedMeaning,
      expectedNextAction: input.expectedNextAction,
      preservationNotes: input.preservationNotes ?? null,
    });

    await this.evaluations.linkHumanIntentToComparison(humanIntent.id, comparison.id);

    return this.getSessionView(session.id);
  }

  async submitStepRating(untrustedInput: unknown): Promise<BlindSessionView> {
    const input = StepRatingSubmissionSchema.parse(untrustedInput);
    const comparison = await this.evaluations.findComparisonById(input.comparisonId);
    if (!comparison) throw new Error("La comparación no existe.");
    const session = await this.requireSession(comparison.sessionId);
    if (session.status !== "IN_PROGRESS") throw new Error("La sesión ya está cerrada.");

    const humanIntent = await this.evaluations.findHumanIntentByComparisonId(comparison.id);
    if (!humanIntent) throw new Error("El intent humano no está registrado.");

    const existingRatings = await this.evaluations.findStepRatingsByComparisonId(comparison.id);
    const expectedStep = existingRatings.length + 1;
    if (input.outputPosition !== expectedStep) {
      throw new Error("La calificación escalonada fuera de secuencia.");
    }

    await this.evaluations.createStepRating({
      comparisonId: comparison.id,
      outputPosition: input.outputPosition,
      ratings: input.ratings,
      errorTags: input.errorTags,
      evaluatorNotes: input.evaluatorNotes ?? null,
    });

    return this.getSessionView(session.id);
  }

  async submitJudgment(untrustedInput: unknown): Promise<BlindSessionView> {
    const input = BlindJudgmentInputSchema.parse(untrustedInput);
    const comparison = await this.evaluations.findComparisonById(input.comparisonId);
    if (!comparison) throw new Error("La comparación no existe.");
    const session = await this.requireSession(comparison.sessionId);
    if (session.status !== "IN_PROGRESS") throw new Error("La sesión ya está cerrada.");

    const stepRatings = await this.evaluations.findStepRatingsByComparisonId(comparison.id);
    if (stepRatings.length !== 2) {
      throw new Error("Ambas salidas deben calificarse antes del juicio final.");
    }

    const ratingA = stepRatings.find((r) => r.outputPosition === 1);
    const ratingB = stepRatings.find((r) => r.outputPosition === 2);
    if (!ratingA || !ratingB) {
      throw new Error("Las calificaciones escalonadas no están completas.");
    }

    await this.evaluations.createJudgment({
      comparisonId: input.comparisonId,
      preference: input.preference ?? null,
      ratingsA: ratingA.ratings,
      ratingsB: ratingB.ratings,
      evaluatorNotes: input.evaluatorNotes ?? null,
      errorTags: input.errorTags,
      correctedIntent: input.correctedIntent ?? null,
    });

    return this.getSessionView(session.id);
  }

  private async buildActiveCaseView(
    session: BlindEvaluationSessionRecord,
    cases: BlindEvaluationCaseRecord[],
    comparison: BlindEvaluationComparisonRecord,
    completed: number,
  ): Promise<BlindSessionView> {
    const evaluationCase = cases.find((item) => item.id === comparison.evaluationCaseId);
    if (!evaluationCase) throw new Error("La comparación apunta a un caso inexistente.");

    const humanIntentRecord = await this.evaluations.findHumanIntentByComparisonId(comparison.id);
    const stepRatingRecords = await this.evaluations.findStepRatingsByComparisonId(comparison.id);

    let step: EvaluationStep;

    if (!humanIntentRecord) {
      step = "HUMAN_INTENT";
    } else if (stepRatingRecords.length === 0) {
      step = "RATING_OUTPUT_1";
    } else if (stepRatingRecords.length === 1) {
      step = "RATING_OUTPUT_2";
    } else {
      step = "PREFERENCE";
    }

    let comparisonView: BlindComparisonView | null = null;
    if (step !== "HUMAN_INTENT") {
      comparisonView = await this.buildComparisonView(comparison, cases, session);
    }

    const stepRating1 = stepRatingRecords.find((r) => r.outputPosition === 1);
    const stepRating2 = stepRatingRecords.find((r) => r.outputPosition === 2);

    return {
      sessionId: session.id,
      status: "IN_PROGRESS",
      progress: { completed, total: cases.length },
      step,
      evaluationCaseId: comparison.evaluationCaseId,
      case: toCaseView(evaluationCase),
      humanIntent: humanIntentRecord ? toHumanIntentSummary(humanIntentRecord) : null,
      comparison: comparisonView,
      stepRating1: stepRating1 ? toStepRatingSummary(stepRating1) : null,
      stepRating2: stepRating2 ? toStepRatingSummary(stepRating2) : null,
      reveal: null,
    };
  }

  private async compileComparison(
    session: BlindEvaluationSessionRecord,
    evaluationCase: BlindEvaluationCaseRecord,
  ) {
    const input = {
      rawInput: evaluationCase.rawInput,
      context: evaluationCase.context,
      domain: evaluationCase.domain,
    };
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
    session: BlindEvaluationSessionRecord,
  ): Promise<BlindComparisonView> {
    const evaluationCase = cases.find((item) => item.id === comparison.evaluationCaseId);
    if (!evaluationCase) throw new Error("La comparación apunta a un caso inexistente.");
    assertDistinctResponseReferences(comparison);
    const [responseA, responseB] = await Promise.all([
      this.loadBlindResponse(
        comparison.responseARunId,
        comparison.responseAFailureId,
        comparison.responseASource,
        evaluationCase,
        session,
      ),
      this.loadBlindResponse(
        comparison.responseBRunId,
        comparison.responseBFailureId,
        comparison.responseBSource,
        evaluationCase,
        session,
      ),
    ]);
    return {
      id: comparison.id,
      sessionId: comparison.sessionId,
      evaluationCaseId: comparison.evaluationCaseId,
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
    source: "BASELINE" | "CANDIDATE",
    evaluationCase: BlindEvaluationCaseRecord,
    session: BlindEvaluationSessionRecord,
  ): Promise<BlindResponse> {
    if (runId) {
      const run = await this.runs.findById(runId);
      if (!run) throw new Error("No se encontró el resultado de la comparación.");
      assertRunMatchesComparison(run, source, evaluationCase, session);
      return { status: "SUCCESS", contract: run.compiledContract };
    }
    if (failureId) {
      const failure = await this.failures.findById(failureId);
      if (!failure) throw new Error("No se encontró el fallo de la comparación.");
      assertFailureMatchesComparison(failure, source, evaluationCase, session);
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
    const comparisonDetails = await Promise.all(
      comparisons.map(async (comparison) => {
        const evaluationCase = cases.find((item) => item.id === comparison.evaluationCaseId);
        if (!evaluationCase) throw new Error("La comparación apunta a un caso inexistente.");
        const humanIntent = await this.evaluations.findHumanIntentByComparisonId(comparison.id);
        const stepRatingRecords = await this.evaluations.findStepRatingsByComparisonId(comparison.id);
        const stepRating1 = stepRatingRecords.find((r) => r.outputPosition === 1) ?? null;
        const stepRating2 = stepRatingRecords.find((r) => r.outputPosition === 2) ?? null;

        const contractA = await this.loadContract(comparison.responseARunId);
        const contractB = await this.loadContract(comparison.responseBRunId);

        return {
          comparison,
          evaluationCase,
          humanIntent,
          stepRating1,
          stepRating2,
          contractA,
          contractB,
        };
      }),
    );

    const metrics = buildMetrics(session, comparisons, comparisonDetails);

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
      metrics,
      cases: await Promise.all(
        comparisonDetails.map(async (detail) => ({
          comparisonId: detail.comparison.id,
          externalId: detail.evaluationCase.externalId,
          responseASource: detail.comparison.responseASource,
          responseBSource: detail.comparison.responseBSource,
          privateEvaluatorNotes: detail.evaluationCase.privateEvaluatorNotes,
          expectedHighLevelBehavior: detail.evaluationCase.expectedHighLevelBehavior,
          humanIntent: detail.humanIntent ? toHumanIntentSummary(detail.humanIntent) : null,
          stepRating1: detail.stepRating1 ? toStepRatingSummary(detail.stepRating1) : null,
          stepRating2: detail.stepRating2 ? toStepRatingSummary(detail.stepRating2) : null,
          responseAMetadata: await this.loadRevealedMetadata(detail.comparison.responseARunId),
          responseBMetadata: await this.loadRevealedMetadata(detail.comparison.responseBRunId),
        })),
      ),
    };
  }

  private async loadContract(runId: string | null): Promise<IntentContract | null> {
    if (!runId) return null;
    const run = await this.runs.findById(runId);
    if (!run) return null;
    return run.compiledContract;
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
  input: { rawInput: string; context: string | null; domain: string | null },
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

function assertDistinctResponseReferences(comparison: BlindEvaluationComparisonRecord) {
  if (
    (comparison.responseARunId && comparison.responseARunId === comparison.responseBRunId) ||
    (comparison.responseAFailureId &&
      comparison.responseAFailureId === comparison.responseBFailureId)
  ) {
    throw new Error("La comparación reutiliza la misma respuesta para A y B.");
  }
}

function assertRunMatchesComparison(
  run: IntentRunRecord,
  source: "BASELINE" | "CANDIDATE",
  evaluationCase: BlindEvaluationCaseRecord,
  session: BlindEvaluationSessionRecord,
) {
  assertCaseIdentity(
    run.rawInput,
    run.context,
    run.compiledContract.rawInput,
    run.compiledContract.context,
    evaluationCase,
  );
  assertSourceIdentity(run.modelProvider, source, session);
}

function assertFailureMatchesComparison(
  failure: IntentModelFailureRecord,
  source: "BASELINE" | "CANDIDATE",
  evaluationCase: BlindEvaluationCaseRecord,
  session: BlindEvaluationSessionRecord,
) {
  if (
    failure.rawInput !== evaluationCase.rawInput ||
    failure.context !== evaluationCase.context
  ) {
    throw new Error("El fallo cargado pertenece a un caso de evaluación distinto.");
  }
  assertSourceIdentity(failure.modelProvider, source, session);
}

function assertCaseIdentity(
  runRawInput: string,
  runContext: string | null,
  contractRawInput: string,
  contractContext: string | null,
  evaluationCase: BlindEvaluationCaseRecord,
) {
  if (
    runRawInput !== evaluationCase.rawInput ||
    runContext !== evaluationCase.context ||
    contractRawInput !== evaluationCase.rawInput ||
    contractContext !== evaluationCase.context
  ) {
    throw new Error("El Intent Contract cargado pertenece a un caso de evaluación distinto.");
  }
}

function assertSourceIdentity(
  provider: string,
  source: "BASELINE" | "CANDIDATE",
  session: BlindEvaluationSessionRecord,
) {
  const expectedProvider =
    source === "BASELINE" ? session.baselineProvider : session.candidateProvider;
  if (provider !== expectedProvider) {
    throw new Error("La identidad A/B persistida no coincide con el run cargado.");
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

function toCaseView(c: BlindEvaluationCaseRecord): BlindCaseView {
  return {
    rawInput: c.rawInput,
    context: c.context,
    domain: c.domain,
  };
}

function toHumanIntentSummary(r: BlindEvaluationHumanIntentRecord): HumanIntentSummary {
  return {
    intendedMeaning: r.intendedMeaning,
    expectedNextAction: r.expectedNextAction as InteractionMode,
    preservationNotes: r.preservationNotes,
    recordedAt: r.recordedAt,
    lockedAt: r.lockedAt,
  };
}

function toStepRatingSummary(r: BlindEvaluationStepRatingRecord): StepRatingSummary {
  return {
    ratings: r.ratings,
    errorTags: r.errorTags,
    evaluatorNotes: r.evaluatorNotes,
    recordedAt: r.createdAt,
  };
}

function averageRating(r: BlindRatings): number {
  return (
    r.intendedMeaning +
    r.contextualUnderstanding +
    r.implicitExpectations +
    r.assumptionSafety +
    r.clarificationQuality +
    r.interactionMode +
    r.preservationIntent +
    r.overallUsefulness
  ) / 8;
}

function buildMetrics(
  _session: BlindEvaluationSessionRecord,
  comparisons: BlindEvaluationComparisonRecord[],
  details: Array<{
    comparison: BlindEvaluationComparisonRecord;
    humanIntent: BlindEvaluationHumanIntentRecord | null;
    stepRating1: BlindEvaluationStepRatingRecord | null;
    stepRating2: BlindEvaluationStepRatingRecord | null;
    contractA: IntentContract | null;
    contractB: IntentContract | null;
  }>,
): BlindSessionMetrics {
  const total = comparisons.length;
  if (total === 0) {
    return {
      humanIntentMatchScore: { baseline: null, candidate: null },
      interactionModeAccuracy: { baseline: null, candidate: null },
      humanPreservationScore: { baseline: null, candidate: null },
      averageIndependentScore: { baseline: 0, candidate: 0 },
      bothGoodRate: 0,
      bothBadRate: 0,
      providerFailureRate: 0,
    };
  }

  let failureCount = 0;
  let baselineScoreSum = 0;
  let candidateScoreSum = 0;
  let scoringCases = 0;
  let bothGood = 0;
  let bothBad = 0;
  let baselineIntentMatchSum = 0;
  let candidateIntentMatchSum = 0;
  let baselineIntentMatchCount = 0;
  let candidateIntentMatchCount = 0;
  let baselinePreservationSum = 0;
  let candidatePreservationSum = 0;
  let baselinePreservationCount = 0;
  let candidatePreservationCount = 0;
  let interactionModeBaselineYes = 0;
  let interactionModeCandidateYes = 0;
  let interactionModeBaselineTotal = 0;
  let interactionModeCandidateTotal = 0;

  for (const detail of details) {
    const isFailureA = detail.comparison.responseAFailureId !== null;
    const isFailureB = detail.comparison.responseBFailureId !== null;
    if (isFailureA) failureCount += 1;
    if (isFailureB) failureCount += 1;

    const ratingA = detail.stepRating1;
    const ratingB = detail.stepRating2;
    if (!ratingA || !ratingB) continue;

    const avgScoreA = averageRating(ratingA.ratings);
    const avgScoreB = averageRating(ratingB.ratings);

    const sourceA = detail.comparison.responseASource;
    const sourceB = detail.comparison.responseBSource;

    if (sourceA === "BASELINE") {
      baselineScoreSum += avgScoreA;
      candidateScoreSum += avgScoreB;
      baselineIntentMatchSum += ratingA.ratings.intendedMeaning;
      candidateIntentMatchSum += ratingB.ratings.intendedMeaning;
      baselinePreservationSum += ratingA.ratings.preservationIntent;
      candidatePreservationSum += ratingB.ratings.preservationIntent;
    } else {
      baselineScoreSum += avgScoreB;
      candidateScoreSum += avgScoreA;
      baselineIntentMatchSum += ratingB.ratings.intendedMeaning;
      candidateIntentMatchSum += ratingA.ratings.intendedMeaning;
      baselinePreservationSum += ratingB.ratings.preservationIntent;
      candidatePreservationSum += ratingA.ratings.preservationIntent;
    }
    baselineIntentMatchCount += 1;
    candidateIntentMatchCount += 1;
    baselinePreservationCount += 1;
    candidatePreservationCount += 1;

    scoringCases += 1;

    if (avgScoreA >= 1.5 && avgScoreB >= 1.5) bothGood += 1;
    if (avgScoreA <= 0.5 && avgScoreB <= 0.5) bothBad += 1;

    const contractA = detail.contractA;
    const contractB = detail.contractB;

    if (detail.humanIntent && detail.humanIntent.expectedNextAction) {
      if (sourceA === "BASELINE" && contractA) {
        interactionModeBaselineTotal += 1;
        if (contractA.recommendedInteractionMode === detail.humanIntent.expectedNextAction) {
          interactionModeBaselineYes += 1;
        }
      }
      if (sourceA === "CANDIDATE" && contractA) {
        interactionModeCandidateTotal += 1;
        if (contractA.recommendedInteractionMode === detail.humanIntent.expectedNextAction) {
          interactionModeCandidateYes += 1;
        }
      }
      if (sourceB === "BASELINE" && contractB) {
        interactionModeBaselineTotal += 1;
        if (contractB.recommendedInteractionMode === detail.humanIntent.expectedNextAction) {
          interactionModeBaselineYes += 1;
        }
      }
      if (sourceB === "CANDIDATE" && contractB) {
        interactionModeCandidateTotal += 1;
        if (contractB.recommendedInteractionMode === detail.humanIntent.expectedNextAction) {
          interactionModeCandidateYes += 1;
        }
      }
    }

  }

  return {
    humanIntentMatchScore: {
      baseline: baselineIntentMatchCount > 0
        ? baselineIntentMatchSum / baselineIntentMatchCount
        : null,
      candidate: candidateIntentMatchCount > 0
        ? candidateIntentMatchSum / candidateIntentMatchCount
        : null,
    },
    interactionModeAccuracy: {
      baseline: interactionModeBaselineTotal > 0
        ? interactionModeBaselineYes / interactionModeBaselineTotal
        : null,
      candidate: interactionModeCandidateTotal > 0
        ? interactionModeCandidateYes / interactionModeCandidateTotal
        : null,
    },
    humanPreservationScore: {
      baseline: baselinePreservationCount > 0
        ? baselinePreservationSum / baselinePreservationCount
        : null,
      candidate: candidatePreservationCount > 0
        ? candidatePreservationSum / candidatePreservationCount
        : null,
    },
    averageIndependentScore: {
      baseline: scoringCases > 0 ? baselineScoreSum / scoringCases : 0,
      candidate: scoringCases > 0 ? candidateScoreSum / scoringCases : 0,
    },
    bothGoodRate: total > 0 ? bothGood / total : 0,
    bothBadRate: total > 0 ? bothBad / total : 0,
    providerFailureRate: total > 0 ? failureCount / (total * 2) : 0,
  };
}

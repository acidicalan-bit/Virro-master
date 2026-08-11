import { benchmarkFixtures } from "@/src/fixtures/benchmark-cases";
import type {
  BenchmarkRepository,
  BlindEvaluationCaseRecord,
  BlindEvaluationComparisonRecord,
  BlindEvaluationHumanIntentRecord,
  BlindEvaluationJudgmentRecord,
  BlindEvaluationRepository,
  BlindEvaluationSessionRecord,
  BlindEvaluationSetRecord,
  BlindEvaluationStepRatingRecord,
  CreateBlindEvaluationComparison,
  CreateBlindEvaluationHumanIntent,
  CreateBlindEvaluationJudgment,
  CreateBlindEvaluationSession,
  CreateBlindEvaluationStepRating,
  CreateBenchmarkRun,
  CreateIntentFeedback,
  CreateIntentModelFailure,
  CreateIntentRun,
  IntentFeedbackRecord,
  IntentFeedbackRepository,
  IntentModelFailureRecord,
  IntentModelFailureRepository,
  IntentRunRecord,
  IntentRunRepository,
  RepositoryBundle,
} from "@/src/application/ports/repositories";
import type { BlindEvaluationSetImport } from "@/src/domain/blind-evaluation";
import { getInMemoryOutcomeRepositories } from "@/src/infrastructure/persistence/outcome/in-memory-outcome-repositories";

export class InMemoryIntentRunRepository implements IntentRunRepository {
  readonly records: IntentRunRecord[] = [];

  async create(input: CreateIntentRun): Promise<IntentRunRecord> {
    const record = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    this.records.push(record);
    return record;
  }

  async findById(id: string): Promise<IntentRunRecord | null> {
    return this.records.find((record) => record.id === id) ?? null;
  }
}

export class InMemoryIntentModelFailureRepository implements IntentModelFailureRepository {
  readonly records: IntentModelFailureRecord[] = [];

  async create(input: CreateIntentModelFailure): Promise<IntentModelFailureRecord> {
    const record = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    this.records.push(record);
    return record;
  }

  async findById(id: string): Promise<IntentModelFailureRecord | null> {
    return this.records.find((record) => record.id === id) ?? null;
  }
}

export class InMemoryIntentFeedbackRepository implements IntentFeedbackRepository {
  readonly records: IntentFeedbackRecord[] = [];

  async create(input: CreateIntentFeedback): Promise<IntentFeedbackRecord> {
    const record = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    this.records.push(record);
    return record;
  }
}

export class InMemoryBenchmarkRepository implements BenchmarkRepository {
  readonly runs: CreateBenchmarkRun[] = [];

  async listActive() {
    return benchmarkFixtures.filter((item) => item.active);
  }

  async saveRun(input: CreateBenchmarkRun): Promise<void> {
    this.runs.push(input);
  }
}

export class InMemoryBlindEvaluationRepository implements BlindEvaluationRepository {
  readonly sets: BlindEvaluationSetRecord[] = [];
  readonly cases: BlindEvaluationCaseRecord[] = [];
  readonly sessions: BlindEvaluationSessionRecord[] = [];
  readonly comparisons: BlindEvaluationComparisonRecord[] = [];
  readonly humanIntents: BlindEvaluationHumanIntentRecord[] = [];
  readonly stepRatings: BlindEvaluationStepRatingRecord[] = [];
  readonly judgments: BlindEvaluationJudgmentRecord[] = [];

  async importSet(
    input: BlindEvaluationSetImport,
    contentHash: string,
  ): Promise<BlindEvaluationSetRecord> {
    if (this.sets.some((set) => set.slug === input.slug || set.contentHash === contentHash)) {
      throw new Error("El set ya fue importado y permanece inmutable.");
    }
    const now = new Date().toISOString();
    const set: BlindEvaluationSetRecord = {
      id: crypto.randomUUID(),
      slug: input.slug,
      name: input.name,
      description: input.description,
      sourceLabel: input.source_label,
      isDemo: input.is_demo,
      contentHash,
      caseCount: input.cases.length,
      importedAt: now,
      frozenAt: now,
    };
    this.sets.push(set);
    input.cases.forEach((item, position) => {
      this.cases.push({
        id: crypto.randomUUID(),
        evaluationSetId: set.id,
        externalId: item.id,
        rawInput: item.raw_input,
        context: item.context,
        domain: item.domain,
        privateEvaluatorNotes: item.private_evaluator_notes,
        expectedHighLevelBehavior: item.expected_high_level_behavior,
        position,
      });
    });
    return set;
  }

  async listSets(): Promise<BlindEvaluationSetRecord[]> {
    return [...this.sets];
  }

  async findSetById(id: string): Promise<BlindEvaluationSetRecord | null> {
    return this.sets.find((set) => set.id === id) ?? null;
  }

  async listCases(setId: string): Promise<BlindEvaluationCaseRecord[]> {
    return this.cases
      .filter((item) => item.evaluationSetId === setId)
      .sort((left, right) => left.position - right.position);
  }

  async findCaseById(id: string): Promise<BlindEvaluationCaseRecord | null> {
    return this.cases.find((item) => item.id === id) ?? null;
  }

  async createSession(input: CreateBlindEvaluationSession): Promise<BlindEvaluationSessionRecord> {
    const session: BlindEvaluationSessionRecord = {
      ...input,
      id: crypto.randomUUID(),
      status: "IN_PROGRESS",
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    this.sessions.push(session);
    return session;
  }

  async findSessionById(id: string): Promise<BlindEvaluationSessionRecord | null> {
    return this.sessions.find((session) => session.id === id) ?? null;
  }

  async completeSession(id: string): Promise<BlindEvaluationSessionRecord> {
    const session = this.sessions.find((item) => item.id === id);
    if (!session) throw new Error("La sesión no existe.");
    session.status = "COMPLETED";
    session.completedAt = new Date().toISOString();
    return session;
  }

  async listComparisons(sessionId: string): Promise<BlindEvaluationComparisonRecord[]> {
    return this.comparisons.filter((comparison) => comparison.sessionId === sessionId);
  }

  async findComparisonById(id: string): Promise<BlindEvaluationComparisonRecord | null> {
    return this.comparisons.find((comparison) => comparison.id === id) ?? null;
  }

  async createComparison(
    input: CreateBlindEvaluationComparison,
  ): Promise<BlindEvaluationComparisonRecord> {
    const comparison = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.comparisons.push(comparison);
    return comparison;
  }

  async findJudgmentByComparisonId(
    comparisonId: string,
  ): Promise<BlindEvaluationJudgmentRecord | null> {
    return this.judgments.find((judgment) => judgment.comparisonId === comparisonId) ?? null;
  }

  async createJudgment(
    input: CreateBlindEvaluationJudgment,
  ): Promise<BlindEvaluationJudgmentRecord> {
    if (this.judgments.some((judgment) => judgment.comparisonId === input.comparisonId)) {
      throw new Error("Esta comparación ya fue evaluada.");
    }
    const judgment = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.judgments.push(judgment);
    return judgment;
  }

  async createHumanIntent(
    input: CreateBlindEvaluationHumanIntent,
  ): Promise<BlindEvaluationHumanIntentRecord> {
    const now = new Date().toISOString();
    const record: BlindEvaluationHumanIntentRecord = {
      ...input,
      id: crypto.randomUUID(),
      comparisonId: null,
      recordedAt: now,
      lockedAt: now,
    };
    this.humanIntents.push(record);
    return record;
  }

  async findHumanIntentBySessionAndCaseId(
    sessionId: string,
    evaluationCaseId: string,
  ): Promise<BlindEvaluationHumanIntentRecord | null> {
    return this.humanIntents.find(
      (item) => item.sessionId === sessionId && item.evaluationCaseId === evaluationCaseId,
    ) ?? null;
  }

  async linkHumanIntentToComparison(
    humanIntentId: string,
    comparisonId: string,
  ): Promise<void> {
    const record = this.humanIntents.find((item) => item.id === humanIntentId);
    if (!record) throw new Error("Intent humano no encontrado para enlazar.");
    record.comparisonId = comparisonId;
  }

  async findHumanIntentByComparisonId(
    comparisonId: string,
  ): Promise<BlindEvaluationHumanIntentRecord | null> {
    return this.humanIntents.find((item) => item.comparisonId === comparisonId) ?? null;
  }

  async createStepRating(
    input: CreateBlindEvaluationStepRating,
  ): Promise<BlindEvaluationStepRatingRecord> {
    const record: BlindEvaluationStepRatingRecord = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.stepRatings.push(record);
    return record;
  }

  async findStepRatingsByComparisonId(
    comparisonId: string,
  ): Promise<BlindEvaluationStepRatingRecord[]> {
    return this.stepRatings
      .filter((item) => item.comparisonId === comparisonId)
      .sort((left, right) => left.outputPosition - right.outputPosition);
  }
}

const outcomeRepos = getInMemoryOutcomeRepositories();

const memoryBundle: RepositoryBundle = {
  intentRuns: new InMemoryIntentRunRepository(),
  modelFailures: new InMemoryIntentModelFailureRepository(),
  feedback: new InMemoryIntentFeedbackRepository(),
  benchmarks: new InMemoryBenchmarkRepository(),
  blindEvaluations: new InMemoryBlindEvaluationRepository(),
  projects: outcomeRepos.projects,
  assets: outcomeRepos.assets,
  assetVersions: outcomeRepos.assetVersions,
  outcomeTransactions: outcomeRepos.outcomeTransactions,
  partialIntents: outcomeRepos.partialIntents,
  semanticPatches: outcomeRepos.semanticPatches,
  mutationLeases: outcomeRepos.mutationLeases,
  executionRuns: outcomeRepos.executionRuns,
  evidenceReceipts: outcomeRepos.evidenceReceipts,
  verificationRuns: outcomeRepos.verificationRuns,
  stateCommits: outcomeRepos.stateCommits,
  costRecords: outcomeRepos.costRecords,
  mediaStorage: outcomeRepos.mediaStorage,
  semanticSnapshots: outcomeRepos.semanticSnapshots,
  imageEvidence: outcomeRepos.imageEvidence,
  candidateAssets: outcomeRepos.candidateAssets,
  preservationRuns: outcomeRepos.preservationRuns,
  preservationEvidence: outcomeRepos.preservationEvidence,
  candidatePreferences: outcomeRepos.candidatePreferences,
  storageMode: "memory",
};

export function getInMemoryRepositories(): RepositoryBundle {
  return memoryBundle;
}

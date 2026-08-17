import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type {
  BlindEvaluationCaseRecord,
  BlindEvaluationComparisonRecord,
  BlindEvaluationHumanIntentRecord,
  BlindEvaluationJudgmentRecord,
  BlindEvaluationRepository,
  BlindEvaluationSessionRecord,
  BlindEvaluationSetRecord,
  BlindEvaluationStepRatingRecord,
  BenchmarkRepository,
  CreateBlindEvaluationComparison,
  CreateBlindEvaluationHumanIntent,
  CreateBlindEvaluationJudgment,
  CreateBlindEvaluationSession,
  CreateBlindEvaluationStepRating,
  CreateBenchmarkRun,
  CreateIntentFeedback,
  CreateIntentModelFailure,
  CreateIntentRun,
  IntentFeedbackRepository,
  IntentModelFailureRepository,
  IntentRunRepository,
  RepositoryBundle,
} from "@/src/application/ports/repositories";
import {
  BlindEvaluationErrorTagSchema,
  BlindPreferenceSchema,
  BlindRatingsSchema,
  type BlindEvaluationSetImport,
} from "@/src/domain/blind-evaluation";
import {
  SupabaseProjectRepository,
  SupabaseAssetRepository,
  SupabaseAssetVersionRepository,
  SupabaseOutcomeTransactionRepository,
  SupabasePartialIntentRepository,
  SupabaseSemanticPatchRepository,
  SupabaseMutationLeaseRepository,
  SupabaseExecutionRunRepository,
  SupabaseEvidenceReceiptRepository,
  SupabaseVerificationRunRepository,
  SupabaseCriterionEvidenceRepository,
  SupabaseStateCommitRepository,
  SupabaseCostRecordRepository,
  SupabaseMediaStorageRepository,
  SupabaseSemanticSnapshotRepository,
  SupabaseImageEvidenceRepository,
  SupabaseCandidateAssetRepository,
  SupabasePreservationRunRepository,
  SupabasePreservationEvidenceRepository,
  SupabaseCandidatePreferenceRepository,
} from "@/src/infrastructure/persistence/outcome/supabase-outcome-repositories";
import {
  fromBenchmarkCaseRow,
  fromIntentRunRow,
  toIntentRunInsert,
  type BenchmarkCaseRow,
  type IntentRunRow,
} from "@/src/infrastructure/persistence/database-mappers";
import { createTransientJwtRetryFetch } from "@/src/infrastructure/supabase/transient-jwt-retry-fetch";

class SupabaseIntentRunRepository implements IntentRunRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: CreateIntentRun) {
    const { data, error } = await this.client
      .from("intent_runs")
      .insert(toIntentRunInsert(input))
      .select("*")
      .single();

    if (error || !data) throw new Error("No se pudo persistir la compilación en Supabase.");
    return fromIntentRunRow(data as IntentRunRow);
  }

  async findById(id: string) {
    const { data, error } = await this.client
      .from("intent_runs")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error("No se pudo leer la compilación desde Supabase.");
    return data ? fromIntentRunRow(data as IntentRunRow) : null;
  }
}

class SupabaseIntentModelFailureRepository implements IntentModelFailureRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: CreateIntentModelFailure) {
    const { data, error } = await this.client
      .from("intent_model_failures")
      .insert({
        raw_input: input.rawInput,
        context: input.context,
        compiler_version: input.compilerVersion,
        model_provider: input.modelProvider,
        model_name: input.modelName,
        model_version: input.modelVersion,
        system_instruction_version: input.systemInstructionVersion,
        latency_ms: input.latencyMs,
        failure_type: input.failureType,
        failure_message: input.failureMessage,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error("No se pudo registrar el fallo del proveedor.");
    return fromFailureRow(data);
  }

  async findById(id: string) {
    const { data, error } = await this.client
      .from("intent_model_failures")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error("No se pudo leer el fallo del proveedor.");
    return data ? fromFailureRow(data) : null;
  }
}

class SupabaseIntentFeedbackRepository implements IntentFeedbackRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: CreateIntentFeedback) {
    const { data, error } = await this.client
      .from("intent_feedback")
      .insert({
        intent_run_id: input.intentRunId,
        accepted: input.accepted,
        corrected_interpretation: input.correctedInterpretation,
        feedback_tags: input.feedbackTags,
        notes: input.notes,
      })
      .select("*")
      .single();

    if (error || !data) throw new Error("No se pudo guardar el feedback en Supabase.");
    return {
      id: String(data.id),
      intentRunId: String(data.intent_run_id),
      accepted: Boolean(data.accepted),
      correctedInterpretation: data.corrected_interpretation ? String(data.corrected_interpretation) : null,
      feedbackTags: Array.isArray(data.feedback_tags) ? data.feedback_tags.map(String) : [],
      notes: data.notes ? String(data.notes) : null,
      createdAt: String(data.created_at),
    };
  }
}

class SupabaseBenchmarkRepository implements BenchmarkRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listActive() {
    const { data, error } = await this.client
      .from("benchmark_cases")
      .select("*")
      .eq("active", true)
      .order("slug");

    if (error || !data) throw new Error("No se pudieron leer los benchmarks de Supabase.");
    return (data as BenchmarkCaseRow[]).map(fromBenchmarkCaseRow);
  }

  async saveRun(input: CreateBenchmarkRun): Promise<void> {
    const { error } = await this.client.from("benchmark_runs").insert({
      benchmark_case_id: input.benchmarkCaseId,
      compiler_version: input.compilerVersion,
      model_provider: input.modelProvider,
      model_name: input.modelName,
      compiled_contract: input.compiledContract,
      evaluation: input.evaluation,
      passed: input.passed,
    });
    if (error) throw new Error("No se pudo persistir el benchmark run en Supabase.");
  }
}

class SupabaseBlindEvaluationRepository implements BlindEvaluationRepository {
  constructor(private readonly client: SupabaseClient) {}

  async importSet(input: BlindEvaluationSetImport, contentHash: string) {
    const { data: setData, error: setError } = await this.client
      .from("blind_evaluation_sets")
      .insert({
        slug: input.slug,
        name: input.name,
        description: input.description,
        source_label: input.source_label,
        is_demo: input.is_demo,
        content_hash: contentHash,
      })
      .select("*")
      .single();
    if (setError || !setData) {
      throw new Error("No se pudo importar el set; verifica que no exista previamente.");
    }

    const { error: casesError } = await this.client.from("blind_evaluation_cases").insert(
      input.cases.map((item, position) => ({
        evaluation_set_id: setData.id,
        external_id: item.id,
        raw_input: item.raw_input,
        context: item.context,
        domain: item.domain,
        private_evaluator_notes: item.private_evaluator_notes,
        expected_high_level_behavior: item.expected_high_level_behavior,
        position,
      })),
    );
    if (casesError) {
      await this.client.from("blind_evaluation_sets").delete().eq("id", setData.id);
      throw new Error("No se pudieron importar los casos del set.");
    }
    return fromSetRow({ ...setData, blind_evaluation_cases: [{ count: input.cases.length }] });
  }

  async listSets() {
    const { data, error } = await this.client
      .from("blind_evaluation_sets")
      .select("*, blind_evaluation_cases(count)")
      .order("imported_at", { ascending: false });
    if (error || !data) throw new Error("No se pudieron leer los sets de evaluación.");
    return data.map(fromSetRow);
  }

  async findSetById(id: string) {
    const { data, error } = await this.client
      .from("blind_evaluation_sets")
      .select("*, blind_evaluation_cases(count)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error("No se pudo leer el set de evaluación.");
    return data ? fromSetRow(data) : null;
  }

  async listCases(setId: string) {
    const { data, error } = await this.client
      .from("blind_evaluation_cases")
      .select("*")
      .eq("evaluation_set_id", setId)
      .order("position");
    if (error || !data) throw new Error("No se pudieron leer los casos de evaluación.");
    return data.map(fromCaseRow);
  }

  async findCaseById(id: string) {
    const { data, error } = await this.client
      .from("blind_evaluation_cases")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error("No se pudo leer el caso de evaluación.");
    return data ? fromCaseRow(data) : null;
  }

  async createSession(input: CreateBlindEvaluationSession) {
    const { data, error } = await this.client
      .from("blind_evaluation_sessions")
      .insert({
        evaluation_set_id: input.evaluationSetId,
        compiler_version: input.compilerVersion,
        baseline_provider: input.baselineProvider,
        baseline_model: input.baselineModel,
        baseline_model_version: input.baselineModelVersion,
        baseline_revision: input.baselineRevision,
        baseline_system_instruction_version: input.baselineSystemInstructionVersion,
        candidate_provider: input.candidateProvider,
        candidate_model: input.candidateModel,
        candidate_model_version: input.candidateModelVersion,
        candidate_system_instruction_version: input.candidateSystemInstructionVersion,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error("No se pudo crear la sesión de evaluación.");
    return fromSessionRow(data);
  }

  async findSessionById(id: string) {
    const { data, error } = await this.client
      .from("blind_evaluation_sessions")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error("No se pudo leer la sesión de evaluación.");
    return data ? fromSessionRow(data) : null;
  }

  async completeSession(id: string) {
    const { data, error } = await this.client
      .from("blind_evaluation_sessions")
      .update({ status: "COMPLETED", completed_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) throw new Error("No se pudo completar la sesión de evaluación.");
    return fromSessionRow(data);
  }

  async listComparisons(sessionId: string) {
    const { data, error } = await this.client
      .from("blind_evaluation_comparisons")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at");
    if (error || !data) throw new Error("No se pudieron leer las comparaciones.");
    return data.map(fromComparisonRow);
  }

  async findComparisonById(id: string) {
    const { data, error } = await this.client
      .from("blind_evaluation_comparisons")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error("No se pudo leer la comparación.");
    return data ? fromComparisonRow(data) : null;
  }

  async createComparison(input: CreateBlindEvaluationComparison) {
    const { data, error } = await this.client
      .from("blind_evaluation_comparisons")
      .insert({
        session_id: input.sessionId,
        evaluation_case_id: input.evaluationCaseId,
        response_a_run_id: input.responseARunId,
        response_a_failure_id: input.responseAFailureId,
        response_a_source: input.responseASource,
        response_b_run_id: input.responseBRunId,
        response_b_failure_id: input.responseBFailureId,
        response_b_source: input.responseBSource,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error("No se pudo guardar la comparación ciega.");
    return fromComparisonRow(data);
  }

  async findJudgmentByComparisonId(comparisonId: string) {
    const { data, error } = await this.client
      .from("blind_evaluation_judgments")
      .select("*")
      .eq("comparison_id", comparisonId)
      .maybeSingle();
    if (error) throw new Error("No se pudo leer el juicio humano.");
    return data ? fromJudgmentRow(data) : null;
  }

  async createJudgment(input: CreateBlindEvaluationJudgment) {
    const { data, error } = await this.client
      .from("blind_evaluation_judgments")
      .insert({
        comparison_id: input.comparisonId,
        preference: input.preference,
        ratings_a: input.ratingsA,
        ratings_b: input.ratingsB,
        evaluator_notes: input.evaluatorNotes,
        error_tags: input.errorTags,
        corrected_intent: input.correctedIntent,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error("No se pudo guardar el juicio humano.");
    return fromJudgmentRow(data);
  }

  async createHumanIntent(input: CreateBlindEvaluationHumanIntent) {
    const { data, error } = await this.client
      .from("blind_evaluation_human_intents")
      .insert({
        session_id: input.sessionId,
        evaluation_case_id: input.evaluationCaseId,
        intended_meaning: input.intendedMeaning,
        expected_next_action: input.expectedNextAction,
        preservation_notes: input.preservationNotes,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error("No se pudo guardar el intent humano.");
    return fromHumanIntentRow(data);
  }

  async findHumanIntentBySessionAndCaseId(sessionId: string, evaluationCaseId: string) {
    const { data, error } = await this.client
      .from("blind_evaluation_human_intents")
      .select("*")
      .eq("session_id", sessionId)
      .eq("evaluation_case_id", evaluationCaseId)
      .maybeSingle();
    if (error) throw new Error("No se pudo leer el intent humano.");
    return data ? fromHumanIntentRow(data) : null;
  }

  async linkHumanIntentToComparison(humanIntentId: string, comparisonId: string) {
    const { error } = await this.client
      .from("blind_evaluation_human_intents")
      .update({ comparison_id: comparisonId })
      .eq("id", humanIntentId);
    if (error) throw new Error("No se pudo enlazar el intent humano a la comparación.");
  }

  async findHumanIntentByComparisonId(comparisonId: string) {
    const { data, error } = await this.client
      .from("blind_evaluation_human_intents")
      .select("*")
      .eq("comparison_id", comparisonId)
      .maybeSingle();
    if (error) throw new Error("No se pudo leer el intent humano por comparación.");
    return data ? fromHumanIntentRow(data) : null;
  }

  async createStepRating(input: CreateBlindEvaluationStepRating) {
    const { data, error } = await this.client
      .from("blind_evaluation_step_ratings")
      .insert({
        comparison_id: input.comparisonId,
        output_position: input.outputPosition,
        ratings: input.ratings,
        error_tags: input.errorTags,
        evaluator_notes: input.evaluatorNotes,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error("No se pudo guardar la calificación escalonada.");
    return fromStepRatingRow(data);
  }

  async findStepRatingsByComparisonId(comparisonId: string) {
    const { data, error } = await this.client
      .from("blind_evaluation_step_ratings")
      .select("*")
      .eq("comparison_id", comparisonId)
      .order("output_position");
    if (error || !data) throw new Error("No se pudieron leer las calificaciones escalonadas.");
    return data.map(fromStepRatingRow);
  }
}

export function createSupabaseRepositories(ownerTenantId?: string): RepositoryBundle {
  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    throw new Error("Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el servidor.");
  }

  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: createTransientJwtRetryFetch() },
  });

  return {
    intentRuns: new SupabaseIntentRunRepository(client),
    modelFailures: new SupabaseIntentModelFailureRepository(client),
    feedback: new SupabaseIntentFeedbackRepository(client),
    benchmarks: new SupabaseBenchmarkRepository(client),
    blindEvaluations: new SupabaseBlindEvaluationRepository(client),
    projects: new SupabaseProjectRepository(client, ownerTenantId),
    assets: new SupabaseAssetRepository(client, ownerTenantId),
    assetVersions: new SupabaseAssetVersionRepository(client, ownerTenantId),
    outcomeTransactions: new SupabaseOutcomeTransactionRepository(client, ownerTenantId),
    partialIntents: new SupabasePartialIntentRepository(client, ownerTenantId),
    semanticPatches: new SupabaseSemanticPatchRepository(client, ownerTenantId),
    mutationLeases: new SupabaseMutationLeaseRepository(client, ownerTenantId),
    executionRuns: new SupabaseExecutionRunRepository(client, ownerTenantId),
    evidenceReceipts: new SupabaseEvidenceReceiptRepository(client, ownerTenantId),
    verificationRuns: new SupabaseVerificationRunRepository(client, ownerTenantId),
    criterionEvidence: new SupabaseCriterionEvidenceRepository(client, ownerTenantId),
    stateCommits: new SupabaseStateCommitRepository(client, ownerTenantId),
    costRecords: new SupabaseCostRecordRepository(client, ownerTenantId),
    mediaStorage: new SupabaseMediaStorageRepository(client, ownerTenantId),
    semanticSnapshots: new SupabaseSemanticSnapshotRepository(client, ownerTenantId),
    imageEvidence: new SupabaseImageEvidenceRepository(client, ownerTenantId),
    candidateAssets: new SupabaseCandidateAssetRepository(client, ownerTenantId),
    preservationRuns: new SupabasePreservationRunRepository(client, ownerTenantId),
    preservationEvidence: new SupabasePreservationEvidenceRepository(client, ownerTenantId),
    candidatePreferences: new SupabaseCandidatePreferenceRepository(client, ownerTenantId),
    storageMode: "supabase",
  };
}

function fromFailureRow(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    rawInput: String(row.raw_input),
    context: row.context === null ? null : String(row.context),
    compilerVersion: String(row.compiler_version),
    modelProvider: String(row.model_provider),
    modelName: String(row.model_name),
    modelVersion: row.model_version === null ? null : String(row.model_version),
    systemInstructionVersion: String(row.system_instruction_version),
    latencyMs: Number(row.latency_ms),
    failureType: String(row.failure_type),
    failureMessage: String(row.failure_message),
    createdAt: String(row.created_at),
  };
}

function fromSetRow(row: Record<string, unknown>): BlindEvaluationSetRecord {
  const countRelation = Array.isArray(row.blind_evaluation_cases)
    ? row.blind_evaluation_cases[0]
    : null;
  const count =
    countRelation && typeof countRelation === "object" && "count" in countRelation
      ? Number(countRelation.count)
      : 0;
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    description: row.description === null ? null : String(row.description),
    sourceLabel: String(row.source_label),
    isDemo: Boolean(row.is_demo),
    contentHash: String(row.content_hash),
    caseCount: count,
    importedAt: String(row.imported_at),
    frozenAt: String(row.frozen_at),
  };
}

function fromCaseRow(row: Record<string, unknown>): BlindEvaluationCaseRecord {
  return {
    id: String(row.id),
    evaluationSetId: String(row.evaluation_set_id),
    externalId: String(row.external_id),
    rawInput: String(row.raw_input),
    context: row.context === null ? null : String(row.context),
    domain: row.domain === null ? null : String(row.domain),
    privateEvaluatorNotes:
      row.private_evaluator_notes === null ? null : String(row.private_evaluator_notes),
    expectedHighLevelBehavior:
      row.expected_high_level_behavior === null
        ? null
        : String(row.expected_high_level_behavior),
    position: Number(row.position),
  };
}

function fromSessionRow(row: Record<string, unknown>): BlindEvaluationSessionRecord {
  return {
    id: String(row.id),
    evaluationSetId: String(row.evaluation_set_id),
    status: row.status === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS",
    compilerVersion: String(row.compiler_version),
    baselineProvider: String(row.baseline_provider),
    baselineModel: String(row.baseline_model),
    baselineModelVersion:
      row.baseline_model_version === null ? null : String(row.baseline_model_version),
    baselineRevision: String(row.baseline_revision),
    baselineSystemInstructionVersion: String(row.baseline_system_instruction_version),
    candidateProvider: String(row.candidate_provider),
    candidateModel: String(row.candidate_model),
    candidateModelVersion:
      row.candidate_model_version === null ? null : String(row.candidate_model_version),
    candidateSystemInstructionVersion: String(row.candidate_system_instruction_version),
    createdAt: String(row.created_at),
    completedAt: row.completed_at === null ? null : String(row.completed_at),
  };
}

function fromComparisonRow(row: Record<string, unknown>): BlindEvaluationComparisonRecord {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    evaluationCaseId: String(row.evaluation_case_id),
    responseARunId: row.response_a_run_id === null ? null : String(row.response_a_run_id),
    responseAFailureId:
      row.response_a_failure_id === null ? null : String(row.response_a_failure_id),
    responseASource: row.response_a_source === "BASELINE" ? "BASELINE" : "CANDIDATE",
    responseBRunId: row.response_b_run_id === null ? null : String(row.response_b_run_id),
    responseBFailureId:
      row.response_b_failure_id === null ? null : String(row.response_b_failure_id),
    responseBSource: row.response_b_source === "BASELINE" ? "BASELINE" : "CANDIDATE",
    createdAt: String(row.created_at),
  };
}

function fromJudgmentRow(row: Record<string, unknown>): BlindEvaluationJudgmentRecord {
  return {
    id: String(row.id),
    comparisonId: String(row.comparison_id),
    preference: row.preference === null ? null : BlindPreferenceSchema.parse(row.preference),
    ratingsA: BlindRatingsSchema.parse(row.ratings_a),
    ratingsB: BlindRatingsSchema.parse(row.ratings_b),
    evaluatorNotes: row.evaluator_notes === null ? null : String(row.evaluator_notes),
    errorTags: BlindEvaluationErrorTagSchema.array().parse(row.error_tags),
    correctedIntent: row.corrected_intent === null ? null : String(row.corrected_intent),
    createdAt: String(row.created_at),
  };
}

function fromHumanIntentRow(row: Record<string, unknown>): BlindEvaluationHumanIntentRecord {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    evaluationCaseId: String(row.evaluation_case_id),
    comparisonId: row.comparison_id === null ? null : String(row.comparison_id),
    intendedMeaning: String(row.intended_meaning),
    expectedNextAction: String(row.expected_next_action),
    preservationNotes: row.preservation_notes === null ? null : String(row.preservation_notes),
    recordedAt: String(row.recorded_at),
    lockedAt: String(row.locked_at),
  };
}

function fromStepRatingRow(row: Record<string, unknown>): BlindEvaluationStepRatingRecord {
  return {
    id: String(row.id),
    comparisonId: String(row.comparison_id),
    outputPosition: Number(row.output_position),
    ratings: BlindRatingsSchema.parse(row.ratings),
    errorTags: BlindEvaluationErrorTagSchema.array().parse(row.error_tags),
    evaluatorNotes: row.evaluator_notes === null ? null : String(row.evaluator_notes),
    createdAt: String(row.created_at),
  };
}

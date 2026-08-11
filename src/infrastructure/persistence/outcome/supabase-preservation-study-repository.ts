import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  PreservationStudyAcceptanceRecord,
  PreservationStudyCaseRecord,
  PreservationStudyIntentRecord,
  PreservationStudyPairwiseRecord,
  PreservationStudyPresentationRecord,
  PreservationStudyRatingRecord,
  PreservationStudyRecord,
  PreservationStudyRepository,
} from "@/src/application/ports/outcome/preservation-study-repository";
import {
  PixelHumanDivergenceTagSchema,
  StudyCandidateIdentitySchema,
  StudyCandidateLabelSchema,
  StudyCaseSnapshotSchema,
  StudyDerivedPreferenceSchema,
  StudyFailureTagSchema,
  StudyPairwisePreferenceSchema,
  StudyRatingsSchema,
  StudyTaskTypeSchema,
  StudyTopologySchema,
} from "@/src/domain/outcome/media/preservation-study";

export class SupabasePreservationStudyRepository implements PreservationStudyRepository {
  constructor(private readonly client: SupabaseClient) {}

  async ensureStudy(input: Omit<PreservationStudyRecord, "id" | "createdAt">) {
    const existing = await this.findStudyBySlug(input.slug);
    if (existing) return existing;
    const { data, error } = await this.client.from("preservation_value_studies").insert({
      slug: input.slug,
      name: input.name,
      protocol_version: input.protocolVersion,
      target_case_count: input.targetCaseCount,
    }).select("*").single();
    if (error || !data) throw new Error(`No se pudo crear el estudio: ${error?.message ?? "unknown"}`);
    return fromStudyRow(data);
  }

  async findStudyBySlug(slug: string) {
    const { data, error } = await this.client.from("preservation_value_studies").select("*").eq("slug", slug).maybeSingle();
    if (error) throw new Error(`No se pudo leer el estudio: ${error.message}`);
    return data ? fromStudyRow(data) : null;
  }

  async createCase(input: Omit<PreservationStudyCaseRecord, "id" | "createdAt">) {
    const { data, error } = await this.client.from("preservation_study_cases").insert({
      study_id: input.studyId,
      plan_case_id: input.planCaseId,
      topology: input.topology,
      task_type: input.taskType,
      transaction_id: input.transactionId,
      execution_run_id: input.executionRunId,
      preservation_run_id: input.preservationRunId,
      source_version_id: input.sourceVersionId,
      raw_candidate_id: input.rawCandidateId,
      preserved_candidate_id: input.preservedCandidateId,
      source_storage_key: input.sourceStorageKey,
      source_sha256: input.sourceSha256,
      source_width: input.sourceWidth,
      source_height: input.sourceHeight,
      raw_storage_key: input.rawStorageKey,
      raw_sha256: input.rawSha256,
      raw_width: input.rawWidth,
      raw_height: input.rawHeight,
      preserved_storage_key: input.preservedStorageKey,
      preserved_sha256: input.preservedSha256,
      preserved_width: input.preservedWidth,
      preserved_height: input.preservedHeight,
      instruction: input.instruction,
      roi: input.roi,
      coupled_band: input.coupledBand,
      provider: input.provider,
      model: input.model,
      raw_metrics: input.rawMetrics,
      preserved_metrics: input.preservedMetrics,
    }).select("*").single();
    if (error || !data) throw new Error(`No se pudo inscribir el caso: ${error?.message ?? "unknown"}`);
    return fromCaseRow(data);
  }

  async listCases(studyId: string) {
    const { data, error } = await this.client.from("preservation_study_cases").select("*").eq("study_id", studyId).order("created_at");
    if (error || !data) throw new Error(`No se pudieron leer los casos: ${error?.message ?? "unknown"}`);
    return data.map(fromCaseRow);
  }

  async findCaseById(id: string) {
    const { data, error } = await this.client.from("preservation_study_cases").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`No se pudo leer el caso: ${error.message}`);
    return data ? fromCaseRow(data) : null;
  }

  async findCaseByTransactionId(studyId: string, transactionId: string) {
    const { data, error } = await this.client.from("preservation_study_cases").select("*").eq("study_id", studyId).eq("transaction_id", transactionId).maybeSingle();
    if (error) throw new Error(`No se pudo consultar la transacción del estudio: ${error.message}`);
    return data ? fromCaseRow(data) : null;
  }

  async lockIntentAndPresentation(input: Parameters<PreservationStudyRepository["lockIntentAndPresentation"]>[0]) {
    const { data, error } = await this.client.rpc("lock_preservation_study_intent", {
      p_case_id: input.caseId,
      p_expected_change: input.intent.expectedChange,
      p_expected_preservation: input.intent.expectedPreservation,
      p_unacceptable_notes: input.intent.unacceptableNotes,
      p_candidate_a: input.candidateA,
      p_candidate_a_id: input.candidateAId,
      p_candidate_b: input.candidateB,
      p_candidate_b_id: input.candidateBId,
    });
    if (error || !data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error(`No se pudo bloquear intención y orden: ${error?.message ?? "invalid RPC response"}`);
    }
    const value = data as Record<string, unknown>;
    return {
      intent: fromIntentRow(value.intent as Record<string, unknown>),
      presentation: fromPresentationRow(value.presentation as Record<string, unknown>),
    };
  }

  async createRating(input: Omit<PreservationStudyRatingRecord, "id" | "lockedAt">) {
    const { data, error } = await this.client.from("preservation_study_ratings").insert({
      case_id: input.caseId,
      candidate_label: input.candidateLabel,
      ratings: input.ratings,
      failure_tags: input.failureTags,
      notes: input.notes,
    }).select("*").single();
    if (error || !data) throw new Error(`No se pudo bloquear la calificación: ${error?.message ?? "unknown"}`);
    return fromRatingRow(data);
  }

  async createPairwise(input: Omit<PreservationStudyPairwiseRecord, "id" | "lockedAt">) {
    const { data, error } = await this.client.from("preservation_study_pairwise").insert({
      case_id: input.caseId,
      preference: input.preference,
      derived_preference: input.derivedPreference,
      divergence_tags: input.divergenceTags,
      notes: input.notes,
    }).select("*").single();
    if (error || !data) throw new Error(`No se pudo bloquear la preferencia: ${error?.message ?? "unknown"}`);
    return fromPairwiseRow(data);
  }

  async createAcceptance(input: Omit<PreservationStudyAcceptanceRecord, "id" | "lockedAt">) {
    const { data, error } = await this.client.from("preservation_study_acceptances").insert({
      case_id: input.caseId,
      raw_accepted: input.rawAccepted,
      preserved_accepted: input.preservedAccepted,
    }).select("*").single();
    if (error || !data) throw new Error(`No se pudo bloquear la aceptación: ${error?.message ?? "unknown"}`);
    return fromAcceptanceRow(data);
  }

  async getCaseBundle(caseId: string) {
    const [studyCase, intentResult, presentationResult, ratingsResult, pairwiseResult, acceptanceResult] = await Promise.all([
      this.findCaseById(caseId),
      this.client.from("preservation_study_intents").select("*").eq("case_id", caseId).maybeSingle(),
      this.client.from("preservation_study_presentations").select("*").eq("case_id", caseId).maybeSingle(),
      this.client.from("preservation_study_ratings").select("*").eq("case_id", caseId).order("locked_at"),
      this.client.from("preservation_study_pairwise").select("*").eq("case_id", caseId).maybeSingle(),
      this.client.from("preservation_study_acceptances").select("*").eq("case_id", caseId).maybeSingle(),
    ]);
    if (!studyCase) return null;
    const errors = [intentResult.error, presentationResult.error, ratingsResult.error, pairwiseResult.error, acceptanceResult.error].filter(Boolean);
    if (errors.length) throw new Error(`No se pudo reconstruir el caso: ${errors[0]!.message}`);
    return {
      studyCase,
      intent: intentResult.data ? fromIntentRow(intentResult.data) : null,
      presentation: presentationResult.data ? fromPresentationRow(presentationResult.data) : null,
      ratings: (ratingsResult.data ?? []).map(fromRatingRow),
      pairwise: pairwiseResult.data ? fromPairwiseRow(pairwiseResult.data) : null,
      acceptance: acceptanceResult.data ? fromAcceptanceRow(acceptanceResult.data) : null,
    };
  }
}

function fromStudyRow(row: Record<string, unknown>): PreservationStudyRecord {
  return { id: String(row.id), slug: String(row.slug), name: String(row.name), protocolVersion: String(row.protocol_version), targetCaseCount: Number(row.target_case_count), createdAt: String(row.created_at) };
}

function fromCaseRow(row: Record<string, unknown>): PreservationStudyCaseRecord {
  const snapshot = StudyCaseSnapshotSchema.parse({
    transactionId: row.transaction_id, executionRunId: row.execution_run_id, preservationRunId: row.preservation_run_id,
    sourceVersionId: row.source_version_id, rawCandidateId: row.raw_candidate_id, preservedCandidateId: row.preserved_candidate_id,
    sourceStorageKey: row.source_storage_key, sourceSha256: row.source_sha256, sourceWidth: row.source_width, sourceHeight: row.source_height,
    rawStorageKey: row.raw_storage_key, rawSha256: row.raw_sha256, rawWidth: row.raw_width, rawHeight: row.raw_height,
    preservedStorageKey: row.preserved_storage_key, preservedSha256: row.preserved_sha256, preservedWidth: row.preserved_width, preservedHeight: row.preserved_height,
    instruction: row.instruction, roi: row.roi, coupledBand: row.coupled_band, provider: row.provider, model: row.model,
    rawMetrics: row.raw_metrics, preservedMetrics: row.preserved_metrics,
  });
  return { ...snapshot, id: String(row.id), studyId: String(row.study_id), planCaseId: row.plan_case_id === null ? null : String(row.plan_case_id), topology: StudyTopologySchema.parse(row.topology), taskType: StudyTaskTypeSchema.parse(row.task_type), createdAt: String(row.created_at) };
}

function fromIntentRow(row: Record<string, unknown>): PreservationStudyIntentRecord {
  return { id: String(row.id), caseId: String(row.case_id), expectedChange: String(row.expected_change), expectedPreservation: String(row.expected_preservation), unacceptableNotes: row.unacceptable_notes === null ? null : String(row.unacceptable_notes), lockedAt: String(row.locked_at) };
}

function fromPresentationRow(row: Record<string, unknown>): PreservationStudyPresentationRecord {
  return { id: String(row.id), caseId: String(row.case_id), candidateA: StudyCandidateIdentitySchema.parse(row.candidate_a), candidateAId: String(row.candidate_a_id), candidateB: StudyCandidateIdentitySchema.parse(row.candidate_b), candidateBId: String(row.candidate_b_id), randomizedAt: String(row.randomized_at) };
}

function fromRatingRow(row: Record<string, unknown>): PreservationStudyRatingRecord {
  return { id: String(row.id), caseId: String(row.case_id), candidateLabel: StudyCandidateLabelSchema.parse(row.candidate_label), ratings: StudyRatingsSchema.parse(row.ratings), failureTags: StudyFailureTagSchema.array().parse(row.failure_tags), notes: row.notes === null ? null : String(row.notes), lockedAt: String(row.locked_at) };
}

function fromPairwiseRow(row: Record<string, unknown>): PreservationStudyPairwiseRecord {
  return { id: String(row.id), caseId: String(row.case_id), preference: StudyPairwisePreferenceSchema.parse(row.preference), derivedPreference: StudyDerivedPreferenceSchema.parse(row.derived_preference), divergenceTags: PixelHumanDivergenceTagSchema.array().parse(row.divergence_tags), notes: row.notes === null ? null : String(row.notes), lockedAt: String(row.locked_at) };
}

function fromAcceptanceRow(row: Record<string, unknown>): PreservationStudyAcceptanceRecord {
  return { id: String(row.id), caseId: String(row.case_id), rawAccepted: Boolean(row.raw_accepted), preservedAccepted: Boolean(row.preserved_accepted), lockedAt: String(row.locked_at) };
}

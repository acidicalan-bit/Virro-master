import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type {
  BenchmarkRepository,
  CreateBenchmarkRun,
  CreateIntentFeedback,
  CreateIntentRun,
  IntentFeedbackRepository,
  IntentRunRepository,
  RepositoryBundle,
} from "@/src/application/ports/repositories";
import {
  fromBenchmarkCaseRow,
  fromIntentRunRow,
  toIntentRunInsert,
  type BenchmarkCaseRow,
  type IntentRunRow,
} from "@/src/infrastructure/persistence/database-mappers";

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

export function createSupabaseRepositories(): RepositoryBundle {
  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    throw new Error("Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el servidor.");
  }

  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  return {
    intentRuns: new SupabaseIntentRunRepository(client),
    feedback: new SupabaseIntentFeedbackRepository(client),
    benchmarks: new SupabaseBenchmarkRepository(client),
    storageMode: "supabase",
  };
}

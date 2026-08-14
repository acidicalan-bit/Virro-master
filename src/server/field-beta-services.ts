import "server-only";

import { createClient } from "@supabase/supabase-js";

import { FieldBetaService } from "@/src/application/outcome/media/field-beta-service";
import { SupabaseFieldBetaRepository } from "@/src/infrastructure/persistence/outcome/supabase-field-beta-repository";
import { createSupabaseRepositories } from "@/src/infrastructure/persistence/supabase-repositories";
import { SupabaseMediaObjectStore } from "@/src/infrastructure/storage/supabase-media-object-store";
import { createTransientJwtRetryFetch } from "@/src/infrastructure/supabase/transient-jwt-retry-fetch";
import { createPreservationVerificationService, resetPreservationVerificationServiceForTests } from "@/src/server/preservation-services";
import { DurableExecutionRecoveryContextLoader } from "@/src/application/outcome/recovery/execution-recovery-context-loader";

let service: FieldBetaService | null = null;

export function createFieldBetaService(): FieldBetaService {
  if (!isFieldBetaEnabled(process.env.FIELD_BETA_INTERNAL_ENABLED)) throw new Error("BUILD 005 field beta is disabled unless FIELD_BETA_INTERNAL_ENABLED=true.");
  if (service) return service;
  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) throw new Error("Supabase server credentials are required for BUILD 005.");
  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: createTransientJwtRetryFetch() },
  });
  const repositories = createSupabaseRepositories();
  const samplingRate = parseSamplingRate(process.env.FIELD_EVAL_SAMPLING_RATE);
  service = new FieldBetaService(
    createPreservationVerificationService(),
    repositories.candidateAssets,
    repositories.assetVersions,
    new SupabaseFieldBetaRepository(client),
    new SupabaseMediaObjectStore(client),
    undefined,
    samplingRate,
    Math.random,
    new DurableExecutionRecoveryContextLoader(repositories.executionRuns),
    undefined,
    repositories.criterionEvidence,
  );
  return service;
}

export function isFieldBetaEnabled(value: string | undefined): boolean {
  return value === "true";
}
function parseSamplingRate(value: string | undefined): number {
  if (!value?.trim()) return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) throw new Error("FIELD_EVAL_SAMPLING_RATE must be between 0 and 1.");
  return parsed;
}

export function resetFieldBetaServiceForTests(): void { service = null; resetPreservationVerificationServiceForTests(); }

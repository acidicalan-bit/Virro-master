import "server-only";

import { createClient } from "@supabase/supabase-js";

import { FieldBetaService } from "@/src/application/outcome/media/field-beta-service";
import { SupabaseFieldBetaRepository } from "@/src/infrastructure/persistence/outcome/supabase-field-beta-repository";
import { createSupabaseRepositories } from "@/src/infrastructure/persistence/supabase-repositories";
import { SupabaseMediaObjectStore } from "@/src/infrastructure/storage/supabase-media-object-store";
import { createTransientJwtRetryFetch } from "@/src/infrastructure/supabase/transient-jwt-retry-fetch";
import { createPreservationVerificationService, resetPreservationVerificationServiceForTests } from "@/src/server/preservation-services";
import { DurableExecutionRecoveryContextLoader } from "@/src/application/outcome/recovery/execution-recovery-context-loader";
import { getSupabasePrivilegedKey, getSupabaseUrl } from "@/src/infrastructure/supabase/config";
import type { AuthorityContext } from "@/src/domain/auth/authority";

const services = new Map<string, FieldBetaService>();

export function createFieldBetaService(authorityOrTenant: AuthorityContext | string = "internal-lab", legacyPrincipalId = "internal-evaluator"): FieldBetaService {
  const authority = typeof authorityOrTenant === "string" ? undefined : authorityOrTenant;
  const tenantId = typeof authorityOrTenant === "string" ? authorityOrTenant : authorityOrTenant.tenantId;
  const principalId = typeof authorityOrTenant === "string" ? legacyPrincipalId : authorityOrTenant.principalId;
  if (!isFieldBetaEnabled(process.env.FIELD_BETA_INTERNAL_ENABLED)) throw new Error("BUILD 005 field beta is disabled unless FIELD_BETA_INTERNAL_ENABLED=true.");
  const preservationVerificationService = createPreservationVerificationService(tenantId);
  if (!authority && process.env.NODE_ENV !== "test") throw new Error("Field Beta requires an authenticated tenant authority in non-test environments.");
  const existing = services.get(`${tenantId}:${principalId}`);
  if (existing) return existing;
  const url = getSupabaseUrl();
  const serviceRoleKey = getSupabasePrivilegedKey();
  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: createTransientJwtRetryFetch() },
  });
  const repositories = createSupabaseRepositories(tenantId);
  const samplingRate = parseSamplingRate(process.env.FIELD_EVAL_SAMPLING_RATE);
  const created = new FieldBetaService(
    preservationVerificationService,
    repositories.candidateAssets,
    repositories.assetVersions,
    new SupabaseFieldBetaRepository(client, tenantId),
    new SupabaseMediaObjectStore(client, "media", tenantId),
    undefined,
    samplingRate,
    Math.random,
    new DurableExecutionRecoveryContextLoader(repositories.executionRuns),
    undefined,
    repositories.criterionEvidence,
    tenantId,
    principalId,
    authority,
  );
  services.set(`${tenantId}:${principalId}`, created);
  return created;
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

export function resetFieldBetaServiceForTests(): void { services.clear(); resetPreservationVerificationServiceForTests(); }

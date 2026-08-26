import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { PreservationVerificationService } from "@/src/application/outcome/media/preservation-verification-service";
import type { ImageEditExecutor } from "@/src/application/ports/outcome/image-edit-executor-port";
import { FakeImageEditExecutor } from "@/src/infrastructure/executors/image/fake-image-edit-executor";
import { OpenAIImageEditExecutor } from "@/src/infrastructure/executors/image/openai-image-edit-executor";
import { ControlledFieldBetaImageEditExecutor } from "@/src/infrastructure/executors/image/controlled-field-beta-image-edit-executor";
import { createTenantSupabaseRepositories } from "@/src/infrastructure/persistence/supabase-repositories";
import { CompositingImagePreservationEngine } from "@/src/infrastructure/preservation/compositing-image-preservation-engine";
import { SupabaseMediaObjectStore } from "@/src/infrastructure/storage/supabase-media-object-store";
import { createTransientJwtRetryFetch } from "@/src/infrastructure/supabase/transient-jwt-retry-fetch";
import { SupabaseExecutionAttemptReservationRepository } from "@/src/infrastructure/persistence/outcome/supabase-execution-attempt-reservation-repository";
import { CanonicalFieldBetaProviderGateway } from "@/src/application/outcome/media/canonical-field-beta-provider-gateway";

const services = new Map<string, PreservationVerificationService>();

export function resetPreservationVerificationServiceForTests(): void { services.clear(); }

export function createPreservationVerificationService(ownerTenantId = "internal-lab"): PreservationVerificationService {
  const existing = services.get(ownerTenantId);
  if (existing) return existing;
  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) throw new Error("Supabase server credentials are required.");
  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: createTransientJwtRetryFetch({ supabaseUrl: url }) },
  });
  const repositories = createTenantSupabaseRepositories(ownerTenantId);
  const storage = new SupabaseMediaObjectStore(client, "media", ownerTenantId);
  const executor = createImageExecutor(client);
  const fieldBetaProviderGateway = new CanonicalFieldBetaProviderGateway(
    new SupabaseExecutionAttemptReservationRepository(client, ownerTenantId),
    executor,
  );
  const created = new PreservationVerificationService(
    repositories,
    executor,
    new CompositingImagePreservationEngine(),
    storage,
    undefined,
    fieldBetaProviderGateway,
  );
  services.set(ownerTenantId, created);
  return created;
}

function createImageExecutor(client: SupabaseClient): ImageEditExecutor {
  const provider = process.env.IMAGE_EDIT_PROVIDER?.trim();
  if (provider === "openai") return new OpenAIImageEditExecutor();
  if (provider === "controlled") {
    if (process.env.NODE_ENV === "production" || process.env.FIELD_BETA_CONTROLLED_EXECUTOR !== "true") {
      throw new Error("Controlled Field Beta executor requires explicit non-production authorization.");
    }
    return new ControlledFieldBetaImageEditExecutor();
  }
  if (provider === "fake") return new FakeImageEditExecutor(client);
  throw new Error('IMAGE_EDIT_PROVIDER must be explicitly set to "openai", "fake", or "controlled".');
}

import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { PreservationVerificationService } from "@/src/application/outcome/media/preservation-verification-service";
import type { ImageEditExecutor } from "@/src/application/ports/outcome/image-edit-executor-port";
import { FakeImageEditExecutor } from "@/src/infrastructure/executors/image/fake-image-edit-executor";
import { OpenAIImageEditExecutor } from "@/src/infrastructure/executors/image/openai-image-edit-executor";
import { createSupabaseRepositories } from "@/src/infrastructure/persistence/supabase-repositories";
import { CompositingImagePreservationEngine } from "@/src/infrastructure/preservation/compositing-image-preservation-engine";
import { SupabaseMediaObjectStore } from "@/src/infrastructure/storage/supabase-media-object-store";

let service: PreservationVerificationService | null = null;

export function createPreservationVerificationService(): PreservationVerificationService {
  if (service) return service;
  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) throw new Error("Supabase server credentials are required.");
  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const repositories = createSupabaseRepositories();
  const storage = new SupabaseMediaObjectStore(client);
  service = new PreservationVerificationService(
    repositories,
    createImageExecutor(client),
    new CompositingImagePreservationEngine(),
    storage,
  );
  return service;
}

function createImageExecutor(client: SupabaseClient): ImageEditExecutor {
  const provider = process.env.IMAGE_EDIT_PROVIDER?.trim();
  if (provider === "openai") return new OpenAIImageEditExecutor();
  if (provider === "fake") return new FakeImageEditExecutor(client);
  throw new Error('IMAGE_EDIT_PROVIDER must be explicitly set to "openai" or "fake".');
}

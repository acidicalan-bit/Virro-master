import "server-only";

import { createClient } from "@supabase/supabase-js";

import { PreservationStudyService } from "@/src/application/outcome/media/preservation-study-service";
import { SupabasePreservationStudyRepository } from "@/src/infrastructure/persistence/outcome/supabase-preservation-study-repository";
import { createPreservationVerificationService } from "@/src/server/preservation-services";

let service: PreservationStudyService | null = null;

export function createPreservationStudyService(): PreservationStudyService {
  if (service) return service;
  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) throw new Error("Supabase server credentials are required for the preservation study.");
  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  service = new PreservationStudyService(
    new SupabasePreservationStudyRepository(client),
    createPreservationVerificationService(),
  );
  return service;
}

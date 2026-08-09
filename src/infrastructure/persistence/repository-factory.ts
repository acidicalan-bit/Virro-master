import "server-only";

import type { RepositoryBundle } from "@/src/application/ports/repositories";
import { getInMemoryRepositories } from "@/src/infrastructure/persistence/in-memory-repositories";
import { createSupabaseRepositories } from "@/src/infrastructure/persistence/supabase-repositories";

let cached: RepositoryBundle | null = null;

export function createRepositories(): RepositoryBundle {
  if (cached) return cached;

  const hasSupabase = Boolean(
    (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  if (hasSupabase) {
    cached = createSupabaseRepositories();
    return cached;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Supabase es obligatorio en producción; configura las credenciales del servidor.");
  }

  cached = getInMemoryRepositories();
  return cached;
}

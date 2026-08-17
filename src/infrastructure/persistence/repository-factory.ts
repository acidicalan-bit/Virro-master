import "server-only";

import type { GlobalRepositoryBundle } from "@/src/application/ports/repositories";
import { getInMemoryRepositories } from "@/src/infrastructure/persistence/in-memory-repositories";
import { createSystemRepositories } from "@/src/infrastructure/persistence/supabase-repositories";

let cached: GlobalRepositoryBundle | null = null;

export function createRepositories(): GlobalRepositoryBundle {
  if (cached) return cached;

  const hasSupabase = Boolean(
    (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  if (hasSupabase) {
    cached = createSystemRepositories();
    return cached;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Supabase es obligatorio en producción; configura las credenciales del servidor.");
  }

  cached = getInMemoryRepositories();
  return cached;
}

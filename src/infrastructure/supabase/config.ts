import "server-only";

export type SupabaseKeyMigrationStatus = "NEW_KEYS_AVAILABLE" | "LEGACY_ONLY" | "MIXED";

export function getSupabaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  if (!value) throw new Error("SUPABASE_URL configuration is required.");
  return value;
}

export function getSupabasePublishableKey(): string {
  const preferred = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const legacy = process.env.SUPABASE_ANON_KEY?.trim();
  if (preferred) return preferred;
  if (legacy) return legacy;
  throw new Error("A Supabase publishable key is required.");
}

export function getSupabasePrivilegedKey(): string {
  const preferred = process.env.SUPABASE_SECRET_KEY?.trim();
  const legacy = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (preferred) return preferred;
  if (legacy) return legacy;
  throw new Error("A server-only Supabase privileged key is required.");
}

export function getSupabaseKeyMigrationStatus(): SupabaseKeyMigrationStatus {
  const hasNew = Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.SUPABASE_SECRET_KEY?.trim());
  const hasLegacy = Boolean(process.env.SUPABASE_ANON_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  return hasNew && hasLegacy ? "MIXED" : hasNew ? "NEW_KEYS_AVAILABLE" : "LEGACY_ONLY";
}

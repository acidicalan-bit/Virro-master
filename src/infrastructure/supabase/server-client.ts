import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getSupabasePrivilegedKey, getSupabasePublishableKey, getSupabaseUrl } from "@/src/infrastructure/supabase/config";

export async function createUserScopedSupabaseClient(request?: Request): Promise<SupabaseClient> {
  const bearer = request?.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (bearer) {
    return createClient(getSupabaseUrl(), getSupabasePublishableKey(), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${bearer}` } },
    });
  }
  const cookieStore = await cookies();
  return createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(values) {
        try { values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch { /* Server Components cannot mutate cookies. */ }
      },
    },
  });
}

export function createPrivilegedSupabaseClient(): SupabaseClient {
  return createClient(getSupabaseUrl(), getSupabasePrivilegedKey(), { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

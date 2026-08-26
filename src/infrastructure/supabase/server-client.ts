import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getSupabasePrivilegedKey, getSupabasePublishableKey, getSupabaseUrl } from "@/src/infrastructure/supabase/config";
import { createTransientJwtRetryFetch } from "@/src/infrastructure/supabase/transient-jwt-retry-fetch";

export async function createUserScopedSupabaseClient(request?: Request): Promise<SupabaseClient> {
  const url = getSupabaseUrl();
  const bearer = request?.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (bearer) {
    return createClient(url, getSupabasePublishableKey(), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${bearer}` }, fetch: createTransientJwtRetryFetch({ supabaseUrl: url }) },
    });
  }
  const cookieStore = await cookies();
  return createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    global: { fetch: createTransientJwtRetryFetch({ supabaseUrl: url }) },
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(values) {
        try { values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch { /* Server Components cannot mutate cookies. */ }
      },
    },
  });
}

export function createPrivilegedSupabaseClient(): SupabaseClient {
  const url = getSupabaseUrl();
  return createClient(url, getSupabasePrivilegedKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: createTransientJwtRetryFetch({ supabaseUrl: url }) },
  });
}

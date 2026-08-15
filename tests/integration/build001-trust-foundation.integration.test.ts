import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

const enabled = process.env.RUN_BUILD001_TRUST_INTEGRATION === "true"
  && Boolean(process.env.SUPABASE_URL)
  && Boolean(process.env.SUPABASE_ANON_KEY);

describe.skipIf(!enabled)("BUILD 001 deployed trust foundation", () => {
  it("exposes the canonical RPC but denies an unauthenticated caller", async () => {
    const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { error } = await client.rpc("commit_accepted_field_outcome", {
      p_field_outcome_id: "00000000-0000-4000-8000-000000000001",
    });
    expect(error?.message).toContain("TRUST_AUTHENTICATION_REQUIRED");
  });
});

// @vitest-environment node

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

const enabled = process.env.RUN_REAL_BUILD_004_READBACK === "1";
const transactionId = process.env.BUILD_004_TRANSACTION_ID?.trim();

describe.skipIf(!enabled)("BUILD 004 committed Supabase read-back", () => {
  it("proves the TIE decision, preserved-only v2 commit, immutable history, and Storage hashes", async () => {
    const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    expect(url, "SUPABASE_URL is required").toBeTruthy();
    expect(key, "SUPABASE_SERVICE_ROLE_KEY is required").toBeTruthy();
    expect(transactionId, "BUILD_004_TRANSACTION_ID is required").toBeTruthy();

    const client = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } });
    const transaction = await one(client.from("outcome_transactions").select("*").eq("id", transactionId!).single());
    const preference = await one(client.from("candidate_preferences").select("*").eq("transaction_id", transactionId!).single());
    const candidates = await many(client.from("candidate_assets").select("*").eq("transaction_id", transactionId!));
    const executionRuns = await many(client.from("execution_runs").select("*").eq("transaction_id", transactionId!));
    const preservationRun = await one(client.from("preservation_runs").select("*").eq("transaction_id", transactionId!).single());
    const verificationRuns = await many(client.from("verification_runs").select("*").eq("transaction_id", transactionId!));
    const stateCommit = await one(client.from("state_commits").select("*").eq("transaction_id", transactionId!).single());
    const asset = await one(client.from("assets").select("*").eq("id", transaction.asset_id).single());
    const versions = await many(client.from("asset_versions").select("*").eq("asset_id", transaction.asset_id).order("version_number"));

    const raw = candidates.find((candidate) => candidate.candidate_type === "RAW_PROVIDER");
    const preserved = candidates.find((candidate) => candidate.candidate_type === "PRESERVED");
    expect(raw).toBeTruthy();
    expect(preserved).toBeTruthy();
    expect(transaction.status).toBe("COMMITTED");
    expect(preference.preference).toBe("TIE");
    expect(preference.evaluation_tags).toContain("PIXEL_HUMAN_PERCEPTION_DIVERGENCE");
    expect(preference.human_accepted).toBe(true);
    expect(preference.accepted_candidate_id).toBe(preserved!.id);
    expect(raw!.committed).toBe(false);
    expect(preserved!.committed).toBe(true);
    expect(preserved!.raw_candidate_id).toBe(raw!.id);
    expect(preservationRun.raw_candidate_id).toBe(raw!.id);
    expect(preservationRun.preserved_candidate_id).toBe(preserved!.id);
    expect(executionRuns.filter((run) => run.status === "SUCCESS")).toHaveLength(1);
    expect(verificationRuns.some((run) => run.status === "PASSED")).toBe(true);
    expect(versions.map((version) => version.version_number)).toEqual([1, 2]);
    expect(stateCommit.previous_version_id).toBe(versions[0].id);
    expect(stateCommit.new_version_id).toBe(versions[1].id);
    expect(asset.current_version_id).toBe(versions[1].id);
    expect(versions[1].parent_version_id).toBe(versions[0].id);
    expect(versions[1].state.media.candidateType).toBe("PRESERVED");
    expect(versions[1].state.media.candidateId).toBe(preserved!.id);

    const smoke = JSON.parse(readFileSync(resolve(".build-004-smoke-report.json"), "utf8")) as Record<string, unknown>;
    const [sourceBytes, rawBytes, preservedBytes] = await Promise.all([
      download(client, String(smoke.sourceStorageKey)),
      download(client, raw!.storage_key),
      download(client, preserved!.storage_key),
    ]);
    expect(sha256(sourceBytes)).toBe(smoke.sourceHash);
    expect(sha256(rawBytes)).toBe(raw!.sha256);
    expect(sha256(preservedBytes)).toBe(preserved!.sha256);
    expect(versions[0].state.media.sha256).toBe(smoke.sourceHash);
    expect(versions[1].state.media.sha256).toBe(preserved!.sha256);

    const report = {
      ...smoke,
      humanPreference: preference.preference,
      humanAccepted: preference.human_accepted,
      evaluationTags: preference.evaluation_tags,
      evaluationNotes: preference.notes,
      commitResult: "COMMITTED_PRESERVED_AS_V2",
      stateCommitId: stateCommit.id,
      canonicalV1Id: versions[0].id,
      canonicalV1Hash: versions[0].state.media.sha256,
      canonicalV2Id: versions[1].id,
      canonicalV2Hash: versions[1].state.media.sha256,
      canonicalHeadId: asset.current_version_id,
      rawCommitted: raw!.committed,
      preservedCommitted: preserved!.committed,
      sourceReadBackHash: sha256(sourceBytes),
      rawReadBackHash: sha256(rawBytes),
      preservedReadBackHash: sha256(preservedBytes),
    };
    writeFileSync(resolve(".build-004-final-report.json"), JSON.stringify(report, null, 2), "utf8");
    console.log("BUILD_004_FINAL_READBACK", JSON.stringify(report));
  }, 30_000);
});

async function one<T extends Record<string, unknown>>(query: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await query;
  if (error || !data) throw new Error(error?.message ?? "Expected one Supabase row.");
  return data;
}

async function many<T extends Record<string, unknown>>(query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const { data, error } = await query;
  if (error || !data) throw new Error(error?.message ?? "Expected Supabase rows.");
  return data;
}

async function download(client: SupabaseClient, storageKey: string): Promise<Uint8Array> {
  const { data, error } = await client.storage.from("media").download(storageKey);
  if (error || !data) throw new Error(error?.message ?? `Could not download ${storageKey}.`);
  return new Uint8Array(await data.arrayBuffer());
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

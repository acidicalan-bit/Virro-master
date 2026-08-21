import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260820211000_build_002_c1_d0_r1_authority_marker_graph_coherence.sql"), "utf8");

describe("BUILD002-C1-D0 R1 authority marker isolation and graph coherence", () => {
  it("removes direct marker minting from service_role and keeps the marker append-only", () => {
    expect(migration).toMatch(/revoke insert on table public\.build002_readiness_authority_commits from service_role/);
    expect(migration).toContain("build002_readiness_authority_marker_graph_coherent");
    expect(migration).toContain("before insert on public.build002_readiness_authority_commits");
    expect(migration).toContain("if tg_op <> 'INSERT'");
  });

  it("checks the complete persisted graph before authority is accepted", () => {
    for (const phrase of [
      "v_snapshot.requirement_definition_hashes",
      "v_snapshot.signal_references",
      "build002_signal_requirements",
      "build002_signals",
      "build002_readiness_qualifications",
      "build002_signal_qualifications",
      "build002_qualification_signals",
      "q.dependency_snapshot_id is distinct from v_snapshot.id",
      "READINESS_AUTHORITY_SIGNAL_UNIVERSE_CHANGED",
      "v_profile_requirements",
      "v_persisted_requirement_hashes",
      "q.signal_content_hashes",
      "q.qualified_at is distinct from v_readiness.created_at",
    ]) expect(migration).toContain(phrase);
  });

  it("binds the canonical universe and authenticated marker reads without adding a migration", () => {
    expect(migration).toContain("grant select on table public.build002_readiness_authority_commits to authenticated");
    expect(migration).toContain("pg_get_functiondef('public.build002_commit_readiness_authority(uuid, jsonb)'::regprocedure)");
    expect(migration).toContain("requirement_definition_hash in (");
    expect(migration).toContain("v_snapshot->'requirementDefinitionHashes'");
    expect(migration).not.toMatch(/20260820212/);
  });

  it("does not add a second minting RPC or an operational path", () => {
    expect(migration).not.toMatch(/create\s+function\s+public\.build002_commit_readiness_authority/i);
    expect(migration).not.toMatch(/update\s+public\.outcome_transactions|isDelegable|executor\.|provider\./);
  });
});

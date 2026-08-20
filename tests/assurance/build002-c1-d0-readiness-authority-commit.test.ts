import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  currentDefaultEvaluator,
  evaluateReadinessValidity,
  isDelegable,
} from "@/src/domain/outcome/signal-readiness";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260820210000_build_002_c1_d0_readiness_authority_commit.sql"), "utf8");
const adapter = readFileSync(resolve(process.cwd(), "src/infrastructure/persistence/outcome/supabase-readiness-authority-commit-repository.ts"), "utf8");
const port = readFileSync(resolve(process.cwd(), "src/application/ports/outcome/readiness-authority-commit-repository.ts"), "utf8");

describe("BUILD002-C1-D0 atomic readiness authority boundary", () => {
  it("defines one immutable marker with exact relational bindings", () => {
    expect(migration).toContain("build002_readiness_authority_commits");
    expect(migration).toContain("build002-readiness-authority-commit-v0.1");
    expect(migration).toContain("references auth.users");
    expect(migration).toContain("unique (owner_tenant_id, outcome_transaction_id, readiness_id)");
    expect(migration).toContain("build002_readiness_authority_commit_immutable");
  });

  it("allows only the atomic service-role RPC to mint authority", () => {
    expect(migration).toMatch(/revoke all on table public\.build002_readiness_authority_commits from public, anon, authenticated, service_role/);
    expect(migration).toMatch(/grant select, insert on table public\.build002_readiness_authority_commits to service_role/);
    expect(migration).toMatch(/grant execute on function public\.build002_commit_readiness_authority\(uuid, jsonb\) to service_role/);
    expect(migration).toContain("before insert or update or delete");
  });

  it("locks every current-state boundary before the marker", () => {
    for (const phrase of [
      "from public.tenants where id = v_tenant for update",
      "from public.tenant_memberships",
      "for update;\n  if not found or v_tx.status",
      "from public.assets where id = v_tx.asset_id for update",
      "from public.asset_versions where id = v_tx.base_version_id for update",
    ]) expect(migration).toContain(phrase);
    expect(migration.indexOf("insert into public.build002_readiness_authority_commits")).toBeGreaterThan(migration.indexOf("insert into public.build002_delegation_readiness"));
  });

  it("does not add an HTTP or operational authority path", () => {
    expect(adapter).not.toMatch(/request\.json|isDelegable|executor\.|provider\./);
    expect(port).not.toContain("findLatestAuthoritativeReadiness");
    expect(migration).not.toMatch(/update public\.outcome_transactions|status\s*:=/);
  });

  it("keeps the current evaluator and validity precheck server-owned", () => {
    const evaluator = currentDefaultEvaluator();
    expect(evaluator.version).toBe("0.2.0");
    expect(evaluator.definitionHash).toBe("df4543bb4dae1b1e14e4d1569722aef619b292ab41354388e3f1878326af1746");
    expect(adapter).toContain("evaluateReadinessValidity");
    expect(adapter).toContain("currentDefaultEvaluator()");
    expect(typeof evaluateReadinessValidity).toBe("function");
    expect(typeof isDelegable).toBe("function");
  });

  it("keeps the adapter to one write RPC and readback only", () => {
    expect((adapter.match(/\.rpc\(/g) ?? []).length).toBe(1);
    expect(adapter).not.toMatch(/\.insert\(|\.update\(|\.delete\(/);
    expect(adapter).toContain("READINESS_AUTHORITY_READBACK_FAILED");
  });

  it("documents the C1-D0 non-atomicity boundary", () => {
    const doc = readFileSync(resolve(process.cwd(), "docs/builds/build-002/002-C1-D0/00_ATOMIC_READINESS_AUTHORITY_COMMIT.md"), "utf8");
    expect(doc).toContain("C1-D1");
    expect(doc).toContain("C1-D0");
    expect(doc).toContain("one PostgreSQL transaction");
    expect(doc).toContain("does not expose an HTTP route");
  });
});

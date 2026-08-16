// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { build001EvidenceSource } from "@/assurance/build-001-evidence-source.mts";
import { AssuranceManifestSourceSchema, createAssuranceManifest } from "@/src/assurance/development-evidence.mts";

const generated = JSON.parse(readFileSync(resolve("assurance/build-001-evidence-manifest.json"), "utf8"));
const registry = JSON.parse(readFileSync(resolve("assurance/environment-lanes.json"), "utf8")) as {
  schemaVersion: string;
  lanes: Array<{ testIdentifier: string; skippedReason: string; remainsUnproven: string[] }>;
};

describe("BUILD 001 machine-readable assurance manifest", () => {
  it("matches the deterministic generated representation", () => {
    const source = AssuranceManifestSourceSchema.parse(build001EvidenceSource);
    expect(generated).toEqual(createAssuranceManifest(source));
  });

  it("represents F1 before and after without contradiction", () => {
    expect(status("BUILD-001-F1-BEFORE", "atomic-commit")).toBe("FAILED");
    expect(status("BUILD-001", "atomic-commit")).toBe("PROVEN");
  });

  it("represents mixed F2 evidence without promoting deployed cache", () => {
    expect(status("BUILD-001-F2", "legacy-route-isolation")).toBe("PROVEN");
    expect(status("BUILD-001-F2", "f1-sql-regression")).toBe("PROVEN");
    expect(status("BUILD-001-F2", "deployed-cache-retirement")).toBe("UNKNOWN");
  });

  it("does not collapse remote gaps into an aggregate PASS", () => {
    expect(generated.summary.allCurrentCriteriaProven).toBe(false);
    expect(generated.summary.currentCounts.NOT_PROVEN).toBeGreaterThan(0);
    expect(generated.summary.currentCounts.SKIPPED).toBeGreaterThan(0);
    expect(generated.summary.currentCounts.UNKNOWN).toBeGreaterThan(0);
    expect(generated.summary.historicalCounts.FAILED).toBe(1);
  });

  it("keeps static RLS evidence semantically incompatible with the remote RLS claim", () => {
    const evaluation = generated.evaluations.find((item: { buildId: string; criterionId: string }) =>
      item.buildId === "BUILD-001" && item.criterionId === "deployed-rls",
    );
    expect(generated.schemaVersion).toBe("virro-development-assurance-v4");
    expect(evaluation.status).toBe("NOT_PROVEN");
    expect(evaluation.compatibleEvidenceIds).toEqual([]);
    expect(evaluation.incompatibilities[0].reasons).toEqual(expect.arrayContaining([
      "BOUNDARY_ID_MISMATCH",
      "ENVIRONMENT_CLASS_MISMATCH",
      "EVIDENCE_LEVEL_BELOW_MINIMUM",
    ]));
  });

  it("binds compatible F1 and F2 evidence to versioned criterion definitions", () => {
    for (const [buildId, criterionId] of [["BUILD-001", "atomic-commit"], ["BUILD-001-F2", "legacy-route-isolation"]]) {
      const evaluation = generated.evaluations.find((item: { buildId: string; criterionId: string }) =>
        item.buildId === buildId && item.criterionId === criterionId,
      );
      expect(evaluation.status).toBe("PROVEN");
      expect(evaluation.criterionVersion).toBe(1);
      expect(evaluation.criterionDefinitionHash).toMatch(/^[0-9a-f]{64}$/);
      expect(evaluation.compatibleEvidenceIds.length).toBeGreaterThan(0);
      expect(evaluation.independenceAssessments[0].status).toBe("AUTOMATED_GATE");
      expect(evaluation.provenanceAssessments[0]).toMatchObject({
        claimedClass: "DECLARED_ONLY",
        status: "VALID",
      });
    }
  });

  it("preserves a reason and unproven controls for every environment lane", () => {
    expect(registry.schemaVersion).toBe("virro-environment-lanes-v1");
    expect(registry.lanes).toHaveLength(5);
    for (const lane of registry.lanes) {
      expect(lane.testIdentifier).toBeTruthy();
      expect(lane.skippedReason).toBeTruthy();
      expect(lane.remainsUnproven.length).toBeGreaterThan(0);
    }
  });
});

function status(buildId: string, criterionId: string): string | undefined {
  return generated.evaluations.find((item: { buildId: string; criterionId: string }) => item.buildId === buildId && item.criterionId === criterionId)?.status;
}

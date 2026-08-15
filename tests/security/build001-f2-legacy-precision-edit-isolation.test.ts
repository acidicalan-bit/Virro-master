// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const legacy = vi.hoisted(() => ({
  factory: vi.fn(),
  getExperiment: vi.fn(),
  recordPreference: vi.fn(),
  approvePreserved: vi.fn(),
}));

vi.mock("@/src/server/preservation-services", () => ({
  createPreservationVerificationService: legacy.factory,
}));

import { GET, POST } from "@/app/api/precision-edit/route";

describe("BUILD 001-F2 legacy precision-edit canonical isolation", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalFlag = process.env.INTERNAL_LEGACY_ROUTES_ENABLED;

  beforeEach(() => {
    vi.clearAllMocks();
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
    process.env.INTERNAL_LEGACY_ROUTES_ENABLED = "true";
    legacy.factory.mockImplementation(() => {
      throw new Error("PRIVILEGED_LEGACY_SERVICE_REACHED");
    });
  });

  afterEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = originalNodeEnv;
    if (originalFlag === undefined) delete process.env.INTERNAL_LEGACY_ROUTES_ENABLED;
    else process.env.INTERNAL_LEGACY_ROUTES_ENABLED = originalFlag;
  });

  it("denies unauthenticated lookup even when the development flag is enabled", async () => {
    const response = await GET(new Request(`http://localhost/api/precision-edit?transactionId=${FOREIGN_TRANSACTION}`));

    await expectRetired(response);
    expect(legacy.factory).not.toHaveBeenCalled();
    expect(legacy.getExperiment).not.toHaveBeenCalled();
  });

  it.each([
    ["forged tenant/project/resource", {
      action: "runExperiment", tenantId: FOREIGN_TENANT, projectId: FOREIGN_PROJECT,
      projectName: "forged", assetName: "forged", instruction: "forged", sourceMimeType: "image/png",
      sourceBase64: "AA==", policy: {},
    }],
    ["foreign candidates and evidence", {
      action: "recordPreference", transactionId: FOREIGN_TRANSACTION, rawCandidateId: FOREIGN_RAW,
      preservedCandidateId: FOREIGN_PRESERVED, evidenceId: FOREIGN_EVIDENCE, preference: "PRESERVED",
    }],
    ["legacy output to canonical verifier", {
      action: "verifyLegacy", transactionId: FOREIGN_TRANSACTION, candidateId: FOREIGN_PRESERVED,
    }],
    ["legacy output to Human Acceptance", {
      action: "recordPreference", transactionId: FOREIGN_TRANSACTION, rawCandidateId: FOREIGN_RAW,
      preservedCandidateId: FOREIGN_PRESERVED, preference: "PRESERVED", humanAccepted: true,
    }],
    ["legacy output to canonical commit", { action: "approvePreserved", transactionId: FOREIGN_TRANSACTION }],
    ["foreign transaction rejection", { action: "reject", transactionId: FOREIGN_TRANSACTION }],
  ])("denies %s before parsing or privileged access", async (_label, payload) => {
    const response = await POST(new Request("http://localhost/api/precision-edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }));

    await expectRetired(response);
    expect(legacy.factory).not.toHaveBeenCalled();
    expect(legacy.recordPreference).not.toHaveBeenCalled();
    expect(legacy.approvePreserved).not.toHaveBeenCalled();
  });

  it("prevents the first persistent write even when the legacy service would fail afterward", async () => {
    let persistentWrites = 0;
    const runExperiment = vi.fn(async () => {
      persistentWrites += 1;
      throw new Error("FAILURE_AFTER_FIRST_PERSISTENT_WRITE");
    });
    legacy.factory.mockReturnValue({ runExperiment });

    const response = await POST(new Request("http://localhost/api/precision-edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "runExperiment", projectName: "legacy", assetName: "legacy" }),
    }));

    await expectRetired(response);
    expect(legacy.factory).not.toHaveBeenCalled();
    expect(runExperiment).not.toHaveBeenCalled();
    expect(persistentWrites).toBe(0);
  });

  it("removes supported application reachability and points to the authenticated successor", () => {
    const page = read("app/precision-edit-lab/page.tsx");
    const layout = read("app/layout.tsx");
    const successor = read("app/api/field-beta/route.ts");

    expect(page).toContain('redirect("/field-beta")');
    expect(layout).not.toContain('href="/precision-edit-lab"');
    expect(layout).toContain('href="/field-beta"');
    expect(successor).toContain("resolveRequestAuthority(request)");
    expect(successor).toContain("createCanonicalOutcomeCommitService(request)");
  });
});

const FOREIGN_TRANSACTION = "70000000-0000-4000-8000-000000000007";
const FOREIGN_TENANT = "20000000-0000-4000-8000-000000000002";
const FOREIGN_PROJECT = "40000000-0000-4000-8000-000000000004";
const FOREIGN_RAW = "a0000000-0000-4000-8000-00000000000a";
const FOREIGN_PRESERVED = "b0000000-0000-4000-8000-00000000000b";
const FOREIGN_EVIDENCE = "e0000000-0000-4000-8000-00000000000e";

async function expectRetired(response: Response): Promise<void> {
  expect(response.status).toBe(410);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual({
    error: "Legacy precision-edit is retired; use the authenticated Field Beta API.",
    code: "LEGACY_CANONICAL_PATH_DISABLED",
    successor: "/api/field-beta",
  });
}

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

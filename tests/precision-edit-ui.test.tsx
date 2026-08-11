import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PrecisionEditLab } from "@/src/ui/precision-edit-lab";

const rawCandidateId = "11111111-1111-4111-8111-111111111111";
const preservedCandidateId = "22222222-2222-4222-8222-222222222222";
const transactionId = "33333333-3333-4333-8333-333333333333";

const metrics = {
  methodologyVersion: "pixel-diff-zones-v0.1",
  meanTotalPixelDiff: 0.2,
  changedPixelRatioTotal: 0.8,
  meanCorePixelDiff: 0.4,
  changedPixelRatioCore: 0.9,
  meanCoupledPixelDiff: 0.2,
  changedPixelRatioCoupled: 0.5,
  meanLockedOutsidePixelDiff: 0.1,
  changedPixelRatioLockedOutside: 0.7,
};

const experiment = {
  transactionId,
  executionRunId: "44444444-4444-4444-8444-444444444444",
  preservationRunId: "55555555-5555-4555-8555-555555555555",
  assetId: "66666666-6666-4666-8666-666666666666",
  sourceVersionId: "77777777-7777-4777-8777-777777777777",
  rawCandidateId,
  preservedCandidateId,
  source: { storageKey: "source.png", url: "data:image/png;base64,AA==", sha256: "a".repeat(64), width: 10, height: 10 },
  raw: { id: rawCandidateId, candidateType: "RAW_PROVIDER", storageKey: "raw.png", url: "data:image/png;base64,AA==", sha256: "b".repeat(64), width: 10, height: 10 },
  preserved: { id: preservedCandidateId, candidateType: "PRESERVED", storageKey: "preserved.png", url: "data:image/png;base64,AA==", sha256: "c".repeat(64), width: 10, height: 10 },
  policy: {
    policyVersion: "preservation-policy-v0.1",
    coreRoi: { x: 0.2, y: 0.2, width: 0.3, height: 0.3 },
    coupledBand: { unit: "NORMALIZED_MIN_DIMENSION", size: 0.04 },
    outsideMode: "HARD_PRESERVE",
    blendMode: "FEATHERED",
    editRegionChangeThreshold: 0.001,
  },
  zones: {
    imageWidth: 10,
    imageHeight: 10,
    core: { x0: 2, y0: 2, x1: 5, y1: 5 },
    expanded: { x0: 1, y0: 1, x1: 6, y1: 6 },
    coupledBandPixels: 1,
    counts: { core: 9, coupled: 16, lockedOutside: 75 },
  },
  rawEvidence: metrics,
  preservedEvidence: { ...metrics, changedPixelRatioTotal: 0.2, changedPixelRatioLockedOutside: 0, meanLockedOutsidePixelDiff: 0 },
  outsideChangeReduction: 0.7,
  totalChangeReduction: 0.6,
  machineVerification: {
    methodologyVersion: "creative-assertions-v0.1",
    status: "PASSED",
    assertions: [
      "SOURCE_IMMUTABLE",
      "DIMENSIONS_MATCH",
      "RAW_CANDIDATE_EXISTS",
      "PRESERVED_CANDIDATE_EXISTS",
      "PROVENANCE_VALID",
      "LOCKED_OUTSIDE_EXACTLY_PRESERVED",
      "EDIT_REGION_HAS_CHANGE",
    ].map((type) => ({ type, required: true, passed: true, evidence: {} })),
  },
  provider: "openai",
  model: "gpt-image-2",
  providerLatencyMs: 800,
  preservationLatencyMs: 5,
  verificationLatencyMs: 2,
  costUsd: null,
};

describe("Precision Edit Lab BUILD 004 UI", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("runs one comparison, records preference separately, then commits PRESERVED", async () => {
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:source") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    const actions: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const payload = JSON.parse(String(init?.body)) as { action: string };
      actions.push(payload.action);
      if (payload.action === "runExperiment") return { ok: true, json: async () => ({ experiment }) } as Response;
      if (payload.action === "recordPreference") return { ok: true, json: async () => ({ preference: { preference: "RAW" } }) } as Response;
      if (payload.action === "approvePreserved") return { ok: true, json: async () => ({ commit: { newVersion: { id: "88888888-8888-4888-8888-888888888888" } } }) } as Response;
      throw new Error(`Unexpected action: ${payload.action}`);
    }));

    render(<PrecisionEditLab />);
    const file = new File([new Uint8Array([1, 2, 3])], "source.png", { type: "image/png" });
    Object.defineProperty(file, "arrayBuffer", { value: async () => new Uint8Array([1, 2, 3]).buffer });
    fireEvent.change(screen.getByLabelText("Imagen fuente PNG"), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Generar comparación preservada" }));

    expect(await screen.findByRole("heading", { name: "RAW PROVIDER OUTPUT" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "PRESERVED OUTPUT" })).toBeInTheDocument();
    expect(screen.getByText("LOCKED_OUTSIDE_EXACTLY_PRESERVED")).toBeInTheDocument();
    expect(screen.getAllByText("70.00%").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "RAW mejor" }));
    expect(await screen.findByRole("button", { name: "Aprobar PRESERVED y hacer commit" })).toBeInTheDocument();
    expect(screen.queryByText(/comprometido como versión/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Aprobar PRESERVED y hacer commit" }));
    expect(await screen.findByText(/PRESERVED comprometido como versión/)).toBeInTheDocument();
    await waitFor(() => expect(actions).toEqual(["runExperiment", "recordPreference", "approvePreserved"]));
  });
});

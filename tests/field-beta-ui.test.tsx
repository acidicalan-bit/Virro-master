import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FieldBetaLab } from "@/src/ui/field-beta-lab";

describe("BUILD 005-B Field Beta Lab", () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("executes a real API-shaped run and records YES separately", async () => {
    const actions: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const payload = JSON.parse(String(init?.body)) as { action: string };
      actions.push(payload.action);
      if (payload.action === "run") return { ok: true, json: async () => ({ result: { fieldOutcome: { id: "11111111-1111-4111-8111-111111111111", outcomeSku: "precision-edit-v0", blueprintVersion: 1, blueprintHash: "a".repeat(64), taskSpecVersion: 1, taskSpecHash: "b".repeat(64), provider: "fixture", model: "fixture", policyVersion: "preservation-policy-v0.1", providerCostUsd: null, machineVerificationStatus: "PASSED", sameSpecStatus: "BLOCKED" }, semanticStatus: { machineVerificationStatus: "PASSED", machineSameSpecStatus: "PASSED", humanAcceptanceStatus: "PENDING", outcomeAcceptanceStatus: "AWAITING_HUMAN", commitEligibilityStatus: "NOT_ELIGIBLE" }, delivered: { url: "data:image/png;base64,AA==", width: 1, height: 1 }, source: { url: "data:image/png;base64,AA==" }, humanFeedback: null } }) } as Response;
      return { ok: true, json: async () => ({ feedback: { humanAccepted: true } }) } as Response;
    }));
    render(<FieldBetaLab />);
    const file = new File([new Uint8Array([1, 2, 3])], "source.png", { type: "image/png" });
    Object.defineProperty(file, "arrayBuffer", { value: async () => new Uint8Array([1, 2, 3]).buffer });
    fireEvent.change(screen.getByLabelText("Fuente PNG"), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Ejecutar Field Beta" }));
    expect(await screen.findByText("precision-edit-v0")).toBeInTheDocument();
    expect(screen.getByText("UNKNOWN")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "YES" }));
    expect(await screen.findByText("INTERNAL_HUMAN_SMOKE: YES")).toBeInTheDocument();
    await waitFor(() => expect(actions).toEqual(["run", "feedback"]));
  });
});

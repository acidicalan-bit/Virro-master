import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { IntentLab } from "@/src/ui/intent-lab";
import { validContract } from "@/tests/helpers";

describe("Intent Lab critical path", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("compiles, displays a validated contract, and persists feedback", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/compile") {
        return {
          ok: true,
          json: async () => ({
            contract: validContract(),
            runId: "09016489-1647-4f3b-9e9a-c7f1d8d858c2",
            storageMode: "supabase",
            metadata: { provider: "test", modelName: "mock", modelVersion: null, latencyMs: 4, providerLatencyMs: 2, compilerVersion: "0.1.1", systemInstructionVersion: "test-system-1", schemaVersion: "1.0.0", usage: null, estimatedCostUsd: null, pricingVersion: null },
          }),
        } as Response;
      }
      if (url === "/api/feedback") {
        return { ok: true, json: async () => ({ saved: true }) } as Response;
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<IntentLab />);
    fireEvent.change(screen.getByLabelText("Tu instrucción"), { target: { value: "Más limpio." } });
    fireEvent.change(screen.getByLabelText(/Contexto/), { target: { value: "diseño" } });
    fireEvent.click(screen.getByRole("button", { name: "Compilar intención" }));

    expect(await screen.findByText("Simplificar el diseño.")).toBeInTheDocument();
    expect(screen.getByText("Reducir ruido y mejorar la jerarquía.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Correcta" }));
    expect(await screen.findByText("Feedback guardado.")).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});

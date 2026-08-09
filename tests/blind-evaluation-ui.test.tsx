import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { BlindSessionView } from "@/src/application/blind-evaluation-service";
import { BlindEvaluationLab } from "@/src/ui/blind-evaluation-lab";
import { validContract } from "@/tests/helpers";

const comparisonSession: BlindSessionView = {
  sessionId: "09016489-1647-4f3b-9e9a-c7f1d8d858c2",
  status: "IN_PROGRESS",
  progress: { completed: 0, total: 1 },
  comparison: {
    id: "1bbd6ea7-b0f0-48df-8100-ae84c2505340",
    sessionId: "09016489-1647-4f3b-9e9a-c7f1d8d858c2",
    evaluationCaseId: "2bbd6ea7-b0f0-48df-8100-ae84c2505340",
    caseNumber: 1,
    totalCases: 1,
    case: { rawInput: "Está raro.", context: "landing page", domain: "diseño web" },
    responseA: { status: "SUCCESS", contract: validContract({ interpretedIntent: "Interpretación A", interpretedMeaning: "Significado explicado A" }) },
    responseB: { status: "SUCCESS", contract: validContract({ interpretedIntent: "Interpretación B", interpretedMeaning: "Significado explicado B" }) },
  },
  reveal: null,
};

const completedSession: BlindSessionView = {
  ...comparisonSession,
  status: "COMPLETED",
  progress: { completed: 1, total: 1 },
  comparison: null,
  reveal: {
    baseline: { provider: "intent-lab", model: "contextual-heuristic", modelVersion: "0.1.0", revision: "1d3353c", systemInstructionVersion: "heuristic-baseline-0.1.0" },
    candidate: { provider: "openai", model: "gpt-5.6-luna", modelVersion: null, systemInstructionVersion: "intent-compiler-system-1.0.0" },
    cases: [{ comparisonId: "1bbd6ea7-b0f0-48df-8100-ae84c2505340", externalId: "unseen-1", responseASource: "CANDIDATE", responseBSource: "BASELINE", privateEvaluatorNotes: "private", expectedHighLevelBehavior: "expected", responseAMetadata: null, responseBMetadata: null }],
  },
};

describe("blind evaluation UI", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("does not reveal providers until all ratings and the judgment are submitted", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/blind-eval/sets") return { ok: true, json: async () => ({ sets: [{ id: "8903ae4b-32cc-44bd-9586-a1c364e1250d", slug: "blind", name: "Blind set", description: null, sourceLabel: "external", isDemo: false, caseCount: 1, frozenAt: "2026-08-09T00:00:00Z" }] }) } as Response;
      if (url === "/api/blind-eval/sessions") return { ok: true, json: async () => ({ session: comparisonSession }) } as Response;
      if (url === "/api/blind-eval/judgments") return { ok: true, json: async () => ({ session: completedSession }) } as Response;
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<BlindEvaluationLab />);
    fireEvent.click(await screen.findByRole("button", { name: "Iniciar sesión ciega" }));
    expect(await screen.findByText("Interpretación A")).toBeInTheDocument();
    expect(screen.queryByText("gpt-5.6-luna")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("A claramente mejor"));
    for (const select of screen.getAllByRole("combobox")) fireEvent.change(select, { target: { value: "2" } });
    const panel = screen.getByRole("heading", { name: "¿Cuál entendió mejor?" }).closest("section");
    expect(panel).not.toBeNull();
    fireEvent.click(within(panel as HTMLElement).getByRole("button", { name: "Guardar evaluación" }));

    expect(await screen.findByText("Identidades reveladas")).toBeInTheDocument();
    expect(screen.getByText("gpt-5.6-luna")).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  });

  it("maps interpretedIntent to the card heading and interpretedMeaning to its explanatory text", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/blind-eval/sets") return { ok: true, json: async () => ({ sets: [{ id: "8903ae4b-32cc-44bd-9586-a1c364e1250d", slug: "blind", name: "Blind set", description: null, sourceLabel: "external", isDemo: true, caseCount: 1, frozenAt: "2026-08-09T00:00:00Z" }] }) } as Response;
      if (url === "/api/blind-eval/sessions") return { ok: true, json: async () => ({ session: comparisonSession }) } as Response;
      throw new Error(`Unexpected request: ${url}`);
    }));

    render(<BlindEvaluationLab />);
    fireEvent.click(await screen.findByRole("button", { name: "Iniciar sesión ciega" }));
    const responseA = (await screen.findAllByText("Response A"))[0].closest("article");
    expect(responseA).not.toBeNull();
    expect(within(responseA as HTMLElement).getByRole("heading", { name: "Interpretación A" })).toBeInTheDocument();
    const meaning = within(responseA as HTMLElement).getByText("Significado explicado A");
    expect(meaning.tagName).toBe("P");
    expect(meaning).toHaveClass("response-meaning");
    expect(within(responseA as HTMLElement).getByText("Intención interpretada")).toBeInTheDocument();
    expect(within(responseA as HTMLElement).getByText("Significado interpretado")).toBeInTheDocument();
  });

  it("advances to the next comparison and resets judgment state instead of retaining stale output", async () => {
    const firstSession: BlindSessionView = {
      ...comparisonSession,
      progress: { completed: 0, total: 2 },
      comparison: comparisonSession.comparison
        ? { ...comparisonSession.comparison, totalCases: 2 }
        : null,
    };
    const secondSession: BlindSessionView = {
      ...comparisonSession,
      progress: { completed: 1, total: 2 },
      comparison: comparisonSession.comparison
        ? {
            ...comparisonSession.comparison,
            id: "3bbd6ea7-b0f0-48df-8100-ae84c2505340",
            evaluationCaseId: "4bbd6ea7-b0f0-48df-8100-ae84c2505340",
            caseNumber: 2,
            totalCases: 2,
            case: { rawInput: "Quita el vaso de la mesa.", context: null, domain: "image_editing" },
            responseA: { status: "SUCCESS", contract: validContract({ interpretedIntent: "Quitar únicamente el vaso", interpretedMeaning: "Eliminar el vaso y preservar la mesa." }) },
            responseB: { status: "SUCCESS", contract: validContract({ interpretedIntent: "Editar el objeto indicado", interpretedMeaning: "Aplicar una edición local al vaso." }) },
          }
        : null,
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/blind-eval/sets") return { ok: true, json: async () => ({ sets: [{ id: "8903ae4b-32cc-44bd-9586-a1c364e1250d", slug: "blind", name: "Blind set", description: null, sourceLabel: "external", isDemo: true, caseCount: 2, frozenAt: "2026-08-09T00:00:00Z" }] }) } as Response;
      if (url === "/api/blind-eval/sessions") return { ok: true, json: async () => ({ session: firstSession }) } as Response;
      if (url === "/api/blind-eval/judgments") return { ok: true, json: async () => ({ session: secondSession }) } as Response;
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<BlindEvaluationLab />);
    fireEvent.click(await screen.findByRole("button", { name: "Iniciar sesión ciega" }));
    expect(await screen.findByText("Interpretación A")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Empate"));
    for (const select of screen.getAllByRole("combobox")) fireEvent.change(select, { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar evaluación" }));

    expect(await screen.findByRole("heading", { name: "“Quita el vaso de la mesa.”" })).toBeInTheDocument();
    expect(screen.getByText("Quitar únicamente el vaso")).toBeInTheDocument();
    expect(screen.queryByText("Interpretación A")).not.toBeInTheDocument();
    expect(screen.getAllByRole("combobox").every((select) => (select as HTMLSelectElement).value === "")).toBe(true);
    expect(screen.getByLabelText("Empate")).not.toBeChecked();
  });
});
